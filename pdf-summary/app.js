// 文獻段落中文大意產生器
// 流程：pdf.js 讀出文字位置 → 切段 → 經 Apps Script 呼叫 Claude 寫大意 → 使用者檢查修改 → pdf-lib 產生加註 PDF

const CONFIG = {
  // 部署 Apps Script 網頁應用程式後填入網址
  endpoint: "https://script.google.com/macros/s/AKfycbxTnde2_PFeSouvyX8FIz9PuBC6K-OcFh06ofIQm-Ufj4CS8agKeOywP2l-j_klpu66EQ/exec",
  fontUrl: "NotoSansTC-subset.ttf",
  margin: 200,          // 左右各加寬的邊欄寬度（pt）
  fontSize: 8.3,
  lineHeight: 11.2,
  red: [0.82, 0, 0],
  batchChars: 5000,     // 每批送出的原文字數上限
  batchParas: 10,       // 每批段落數上限
  concurrency: 3,       // 同時送出的批次數
};
const CONT = "（本段續接，大意標在本段另一部分旁）";
const MOCK = new URLSearchParams(location.search).has("mock");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const $ = (id) => document.getElementById(id);
let state = { file: null, bytes: null, pages: [], units: [], fontBytes: null };

// ---------- 1. 讀取 PDF 並切段 ----------

async function extractLayout(bytes) {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [vx0, vy0, vx1, vy1] = page.view;
    const W = vx1 - vx0, H = vy1 - vy0;
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const [a, b, c, d, e, f] = it.transform;
      if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) continue; // 旋轉文字（橫式表格）略過
      const size = Math.abs(d) || Math.abs(a);
      const x0 = e - vx0, x1 = x0 + it.width;
      const top = H - (f - vy0) - size;
      items.push({ str: it.str, x0, x1, top, bottom: top + size, size });
    }
    pages.push({ W, H, lines: buildLines(items) });
  }
  return pages;
}

function buildLines(items) {
  // 先依垂直位置分列（上標引用編號會併入同一列），再依水平間距切開左右欄
  const center = (it) => (it.top + it.bottom) / 2;
  items.sort((p, q) => center(p) - center(q));
  const rows = [];
  for (const it of items) {
    const row = rows.find((r) => Math.abs(r.center - center(it)) < Math.max(r.size, it.size) * 0.6);
    if (row) {
      row.items.push(it);
      if (it.size > row.size) { row.size = it.size; row.center = center(it); }
    } else rows.push({ center: center(it), size: it.size, items: [it] });
  }
  // 欄間距：整頁幾乎沒有任何文字覆蓋的垂直空白帶（左右對齊造成的字間空白會被其他行的文字蓋過）
  const cover = {};
  let minX = Infinity, maxX = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x0); maxX = Math.max(maxX, it.x1);
    for (let x = Math.ceil(it.x0); x <= Math.floor(it.x1); x++) cover[x] = (cover[x] || 0) + 1;
  }
  const quiet = Math.max(3, items.length * 0.03);
  const isGutter = (a, b) => {
    for (let x = Math.ceil(a); x <= Math.floor(b); x++)
      if ((cover[x] || 0) <= quiet && x > minX + 30 && x < maxX - 30) return true;
    return false;
  };
  const lines = [];
  for (const r of rows) {
    r.items.sort((p, q) => p.x0 - q.x0);
    let ln = null;
    for (const it of r.items) {
      const gutter = ln && it.x0 - ln.x1 >= 8 && isGutter(ln.x1, it.x0);
      if (ln && !gutter) {
        const gap = it.x0 - ln.x1;
        ln.text += (gap > 1 && !ln.text.endsWith(" ") && !it.str.startsWith(" ") ? " " : "") + it.str;
        ln.x1 = Math.max(ln.x1, it.x1);
        ln.top = Math.min(ln.top, it.top);
        ln.bottom = Math.max(ln.bottom, it.bottom);
        ln.size = Math.max(ln.size, it.size);
      } else {
        if (ln) lines.push(ln);
        ln = { ...it, text: it.str };
      }
    }
    if (ln) lines.push(ln);
  }
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/­\s?/g, "").replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text)
    .sort((p, q) => p.top - q.top || p.x0 - q.x0);
}

function bodyFontSize(pages) {
  const hist = {};
  for (const p of pages)
    for (const l of p.lines) {
      const k = Math.round(l.size * 2) / 2;
      hist[k] = (hist[k] || 0) + l.text.length;
    }
  return +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
}

// 頁首頁尾：在 3 頁以上重複出現（忽略數字）、位於頁面上下緣的文字
function repeatedMargins(pages) {
  const key = (t) => t.replace(/\d+/g, "#").slice(0, 60);
  const count = {};
  for (const pg of pages) {
    const seen = new Set();
    for (const l of pg.lines) {
      if (l.top > pg.H * 0.12 && l.top < pg.H * 0.85) continue;
      const k = key(l.text);
      if (!seen.has(k)) { seen.add(k); count[k] = (count[k] || 0) + 1; }
    }
  }
  return (l, pg) => (l.top < pg.H * 0.12 || l.top > pg.H * 0.85) && count[key(l.text)] >= 3;
}

function segment(pages) {
  const body = bodyFontSize(pages);
  const isMargin = repeatedMargins(pages);
  const paras = [];
  let inRefs = false;
  pages.forEach((pg, pi) => {
    const mid = pg.W / 2;
    const lines = pg.lines.filter(
      (l) => !isMargin(l, pg) &&
        !((l.top < pg.H * 0.05 || l.bottom > pg.H * 0.95) && l.size < body * 0.95)
    );
    // 依每行起點分兩組：從左半部開始（單欄、全寬、左欄）與從右半部開始（右欄、側欄）
    const groups = { L: [], R: [] };
    for (const l of lines) groups[l.x0 >= mid - 8 ? "R" : "L"].push(l);
    const order = [...groups.L.map((l) => ["L", l]), ...groups.R.map((l) => ["R", l])];
    const mode = (arr) => {
      const h = {};
      for (const v of arr) h[Math.round(v)] = (h[Math.round(v)] || 0) + 1;
      const best = Object.entries(h).sort((a, b) => b[1] - a[1])[0];
      return best ? +best[0] : 0;
    };
    const left = {}, justified = {};
    for (const k of ["L", "R"]) {
      left[k] = mode(groups[k].map((l) => l.x0));
      // 左右對齊的版面才用「上一行較短」判斷段落結束；靠左排版（右側參差）不適用
      const edge = mode(groups[k].map((l) => l.x1));
      justified[k] = groups[k].length > 0 &&
        groups[k].filter((l) => Math.abs(l.x1 - edge) <= 3).length / groups[k].length > 0.4;
    }

    let cur = null, prevReg = null;
    for (const [reg, l] of order) {
      const indent = l.x0 > left[reg] + 5 && l.x0 < left[reg] + 40;
      const gap = cur ? l.top - cur.bottom : 0;
      const prevShort = cur && justified[reg] && cur.lastX1 < cur.maxX1 - 25;
      const startsUpper = /^[A-Z•“"]/.test(l.text);
      const newPara =
        !cur || reg !== prevReg || gap > Math.max(4, l.size * 0.55) || gap < -2 ||
        Math.abs(l.size - cur.size) > 0.4 || (indent && !cur.indented) ||
        (prevShort && startsUpper);
      if (newPara) {
        if (cur) paras.push(cur);
        cur = { page: pi, region: reg, top: l.top, bottom: l.bottom, size: l.size,
                text: l.text, indented: indent, lastX1: l.x1, maxX1: l.x1 };
      } else {
        cur.text = cur.text.endsWith("-") ? cur.text.slice(0, -1) + l.text : cur.text + " " + l.text;
        cur.bottom = l.bottom; cur.lastX1 = l.x1; cur.indented = indent;
        cur.maxX1 = Math.max(cur.maxX1, l.x1);
      }
      prevReg = reg;
    }
    if (cur) paras.push(cur);
  });

  // 分類：參考文獻之後不處理；小字、太短的略過；圖表說明保留
  const units = [];
  for (const p of paras) {
    const t = p.text;
    if (/^(references|reference list|bibliography|參考文獻)\b/i.test(t)) { inRefs = true; units.push({ kind: "refs", parts: [p] }); continue; }
    if (inRefs) continue;
    const caption = /^(Table|TABLE|Fig\.?|Figure|FIGURE|Box)\s*[\dA-Z]{0,3}\s*[.:]?\s+[A-Z]/.test(t) && t.length < 600;
    if (caption) { units.push({ kind: "caption", parts: [p] }); continue; }
    if (t.length < 60 || p.size < body * 0.85) continue;
    // 小節標題：較短且沒有任何句號
    if (t.length < 160 && !/[.?!]/.test(t)) continue;
    // 表格與圖中文字：數字比例高，或沒有任何完整句子
    const letters = (t.match(/[A-Za-z]/g) || []).length, digits = (t.match(/\d/g) || []).length;
    const lowerWords = (t.match(/(^|\s)[a-z][a-z-]{1,}/g) || []).length;
    const prose = /[a-z\])\d][.?!]["”’)]?(\s|$)/.test(t) || lowerWords >= 8;
    if (digits > letters * 0.25 || !prose) continue;
    // 跨欄、跨頁續接：前一段沒有句尾標點、這段小寫開頭
    const prev = units[units.length - 1];
    const last = prev && prev.parts.at(-1);
    if (prev && prev.kind === "body" && Math.abs(last.size - p.size) < 0.5 &&
        !/[.?!:;)"”’]$/.test(last.text) && /^[a-z(\d]/.test(t)) {
      const lp = prev.parts.at(-1);
      if (lp.page === p.page && lp.region === p.region && p.top - lp.bottom < 30) {
        lp.bottom = p.bottom; lp.text += " " + p.text;
      } else prev.parts.push(p);
      continue;
    }
    units.push({ kind: "body", parts: [p] });
  }
  units.forEach((u, i) => {
    u.id = "p" + (i + 1);
    u.text = u.parts.map((p) => p.text).join(" ");
    u.summary = u.kind === "refs" ? "參考文獻（不逐條摘要）。" : "";
  });
  return units;
}

// ---------- 2. 呼叫 Apps Script（Claude） ----------

async function callBackend(payload) {
  const res = await fetch(CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避免瀏覽器預檢請求
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error("伺服器回應異常（" + res.status + "）：" + raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)); }
  if (!data.ok) throw new Error(data.error || "伺服器錯誤");
  return data;
}

function makeBatches(units) {
  const todo = units.filter((u) => u.kind !== "refs");
  const batches = [];
  let cur = [], chars = 0;
  for (const u of todo) {
    const len = Math.min(u.text.length, 6000);
    if (cur.length && (chars + len > CONFIG.batchChars || cur.length >= CONFIG.batchParas)) {
      batches.push(cur); cur = []; chars = 0;
    }
    cur.push(u); chars += len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

async function summarize(units, password, onProgress) {
  const batches = makeBatches(units);
  const usage = { input: 0, output: 0, failed: 0, lastError: "" };
  if (MOCK) {
    for (const u of units) if (u.kind !== "refs") u.summary = "（測試）" + u.text.slice(0, 40);
    onProgress(batches.length, batches.length);
    return usage;
  }
  let start;
  for (let attempt = 0; ; attempt++) {
    try { start = await callBackend({ action: "start", password, batches: batches.length }); break; }
    catch (err) {
      if (attempt >= 2 || /密碼|上限|過長/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  if (start.model) $("modelName").textContent = start.model;
  let done = 0, next = 0;
  async function worker() {
    while (next < batches.length) {
      const b = batches[next++];
      const payload = {
        action: "summarize", password, token: start.token,
        paragraphs: b.map((u) => ({ id: u.id, kind: u.kind, text: u.text.slice(0, 6000) })),
      };
      // 偶發的連線或伺服器錯誤，最多重試兩次
      let data = null;
      for (let attempt = 0; ; attempt++) {
        try {
          data = await callBackend(payload);
          if (!Array.isArray(data.items)) throw new Error("回應缺少大意內容");
          break;
        } catch (err) {
          if (/密碼|上限|過期/.test(err.message)) throw err;
          if (attempt >= 2) { data = null; usage.failed += b.length; usage.lastError = err.message; break; }
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      if (!data) { onProgress(++done, batches.length); continue; }
      for (const it of data.items) {
        const u = units.find((x) => x.id === it.id);
        if (u) u.summary = it.summary;
      }
      usage.input += data.usage.input_tokens || 0;
      usage.output += data.usage.output_tokens || 0;
      onProgress(++done, batches.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONFIG.concurrency, batches.length) }, worker));
  return usage;
}

// ---------- 3. 產生加註 PDF ----------

const SUBSTITUTE = { "≥": "≧", "≤": "≦", "−": "-", "—": "－", " ": " ", " ": " " };

function cleanText(text, charset) {
  return [...text].map((ch) => {
    const s = SUBSTITUTE[ch] ?? ch;
    return charset.has(s.codePointAt(0)) ? s : "?";
  }).join("");
}

function wrap(text, font, size, width) {
  const toks = text.match(/[A-Za-z0-9.,%/:;()\-–'"+=<>≧≦²]+|\s|./gu) || [];
  const lines = [];
  let cur = "";
  for (const t of toks) {
    if (t === " " && !cur) continue;
    if (font.widthOfTextAtSize(cur + t, size) <= width) cur += t;
    else { lines.push(cur.trimEnd()); cur = t.trimStart(); }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function buildPdf(units, pages) {
  const { PDFDocument, rgb } = PDFLib;
  const src = await PDFDocument.load(state.bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  if (!state.fontBytes) state.fontBytes = await (await fetch(CONFIG.fontUrl)).arrayBuffer();
  // pdf-lib 的字型裁切會讓這套中文字型缺字，因此嵌入已預先裁成 Big5 字集的完整字型檔
  const font = await out.embedFont(state.fontBytes, { subset: false });
  const charset = new Set(font.getCharacterSet());
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const M = CONFIG.margin, red = rgb(...CONFIG.red);

  // 每則大意放在最高的那一部分旁，其餘部分放「續接」
  const notes = pages.map(() => []);
  for (const u of units) {
    const text = (u.summary || "").trim();
    if (!text) continue;
    const best = u.parts.reduce((a, b) => (b.bottom - b.top > a.bottom - a.top ? b : a));
    for (const p of u.parts) notes[p.page].push({ p, text: p === best ? text : CONT });
  }

  // 排一側的所有大意；超出頁面底部時縮小字級重排
  function layoutSide(items, pg, side, scale) {
    const [tx0, tx1] = side === "L" ? [14, M + 28] : [M + pg.W - 26, 2 * M + pg.W - 14];
    const placed = [];
    let last = 0;
    for (const { p, text } of items) {
      const size = (text === CONT ? CONFIG.fontSize - 1 : CONFIG.fontSize) * scale;
      const lh = CONFIG.lineHeight * scale;
      let y = Math.max(p.top + size, last + 6 * scale + size);
      const lines = [];
      for (const ln of wrap(cleanText(text, charset), font, size, tx1 - tx0)) { lines.push({ ln, y }); y += lh; }
      placed.push({ p, size, x: tx0, lines });
      last = y - lh + 3;
    }
    return { placed, bottom: last };
  }

  pages.forEach((pg, i) => {
    const page = out.addPage([pg.W + 2 * M, pg.H]);
    page.drawPage(embedded[i], { x: M, y: 0, width: pg.W, height: pg.H });
    const sorted = notes[i].sort((a, b) => a.p.top - b.p.top);
    for (const side of ["L", "R"]) {
      const items = sorted.filter(({ p }) => (p.region === "R" ? "R" : "L") === side);
      let res;
      for (const scale of [1, 0.9, 0.8, 0.7]) {
        res = layoutSide(items, pg, side, scale);
        if (res.bottom < pg.H - 8) break;
      }
      const lx = side === "L" ? M + 34 : M + pg.W - 32;
      for (const { p, size, x, lines } of res.placed) {
        page.drawLine({ start: { x: lx, y: pg.H - p.top }, end: { x: lx, y: pg.H - p.bottom }, thickness: 0.8, color: red });
        for (const { ln, y } of lines) page.drawText(ln, { x, y: pg.H - y, size, font, color: red });
      }
    }
  });
  return out.save();
}

// ---------- 4. 介面 ----------

function setStatus(msg, isError) {
  $("status").textContent = msg;
  $("status").className = isError ? "status err" : "status";
}

function renderTable(units) {
  const tbody = $("rows");
  tbody.innerHTML = "";
  for (const u of units) {
    if (u.kind === "refs") continue;
    const tr = document.createElement("tr");
    const where = u.parts.map((p) => `第 ${p.page + 1} 頁${p.region === "L" ? "左欄" : p.region === "R" ? "右欄" : ""}`).join("、");
    tr.innerHTML = `<td class="where">${where}</td><td class="orig"></td><td><textarea rows="4"></textarea></td>`;
    tr.querySelector(".orig").textContent = u.text.slice(0, 220) + (u.text.length > 220 ? "…" : "");
    const ta = tr.querySelector("textarea");
    ta.value = u.summary;
    ta.addEventListener("input", () => (u.summary = ta.value));
    tbody.appendChild(tr);
  }
  $("review").hidden = false;
}

$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  state.file = f;
  state.bytes = new Uint8Array(await f.arrayBuffer());
  $("review").hidden = true;
  setStatus("讀取 PDF 中…");
  try {
    state.pages = await extractLayout(state.bytes);
    state.units = segment(state.pages);
    const n = state.units.filter((u) => u.kind !== "refs").length;
    if (n === 0) throw new Error("讀不到文字，可能是掃描型 PDF，本工具不適用。");
    setStatus(`共 ${state.pages.length} 頁，切出 ${n} 個段落。按「產生中文大意」開始。`);
    $("run").disabled = false;
  } catch (err) {
    setStatus(err.message, true);
  }
});

$("run").addEventListener("click", async () => {
  const pw = $("password").value.trim();
  if (!pw && !MOCK) return setStatus("請輸入密碼。", true);
  $("run").disabled = true;
  try {
    const usage = await summarize(state.units, pw, (d, t) =>
      setStatus(`撰寫大意中：第 ${d}／${t} 批完成…`)
    );
    renderTable(state.units);
    const cost = usage.input || usage.output ? `（本次用量：輸入 ${usage.input} token、輸出 ${usage.output} token）` : "";
    const warn = usage.failed ? `有 ${usage.failed} 段大意產生失敗（${usage.lastError}），表格中留空，可手動填寫或重新執行。` : "";
    setStatus(`${warn}大意完成，請檢查下表，必要時直接修改，再按「產生 PDF」。${cost}`, !!usage.failed);
  } catch (err) {
    setStatus("發生錯誤：" + err.message, true);
  } finally {
    $("run").disabled = false;
  }
});

$("build").addEventListener("click", async () => {
  $("build").disabled = true;
  setStatus("產生 PDF 中…");
  try {
    const bytes = await buildPdf(state.units, state.pages);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = state.file.name.replace(/\.pdf$/i, "") + "_中文段落大意.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setStatus("完成，已下載。");
  } catch (err) {
    setStatus("產生 PDF 失敗：" + err.message, true);
  } finally {
    $("build").disabled = false;
  }
});
