// e-PI RA Portal — front end (no framework). All data come from the Apps Script API after Google sign-in.
// User text is always passed through esc() or textContent.
// Interface language: English, or Chinese for people whose Users row has UI language "zh" (their invite link carries &lang=zh).
// Stored values (options, "Other: " prefix) stay English; only what is shown is translated.
const API_URL = window.EPI_API || "https://script.google.com/macros/s/AKfycbyi1jDW-FY7Gi0a9_IxOrSb0GPqC0u-LDR7Gw7G77mscI18akemo6w3jbjmgfCeDplbyw/exec";
const CLIENT_ID = "892311339811-55stugtunf57otp8q7h0p2k467a5uv6l.apps.googleusercontent.com";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get: (k, ss) => { try { return (ss ? sessionStorage : localStorage).getItem(k); } catch { return null; } },
  set: (k, v, ss) => { try { const s = ss ? sessionStorage : localStorage; v == null ? s.removeItem(k) : s.setItem(k, v); } catch {} },
};
const NA = "Not answered｜未填寫";
const short = (s) => String(s).split("｜")[0];

// Google blocks sign-in inside chat-app browsers (LINE, Facebook, Instagram, WeChat…). LINE can be told to open the system browser.
const UA = navigator.userAgent || "";
const IN_APP = /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger|Zalo|WhatsApp|; wv\)/i.test(UA);
if (/\bLine\//i.test(UA) && !/openExternalBrowser=1/.test(location.search)) {
  location.replace(location.pathname + (location.search ? location.search + "&" : "?") + "openExternalBrowser=1" + location.hash);
}

// invite link ?invite=<code>[&lang=zh]: keep them for the sign-in call, then clean the address bar
{ const q = new URLSearchParams(location.search);
  if (q.get("lang") === "zh") store.set("lang", "zh");
  if (q.has("invite")) { store.set("invite", q.get("invite"), true); history.replaceState(null, "", location.pathname + location.hash); } }

let S = null, SCHEMA = null, MANUAL = null, SLIDES = null;

// ------------------------------------------------------------------ language
const ZH = () => (S ? S.me.ui === "zh" : store.get("lang") === "zh");
const t = (en, zh) => (ZH() ? zh : en);
const TEAM_ZH = { Vietnamese: "越南文", Indonesian: "印尼文", Both: "越南文＋印尼文" };
const teamName = (x) => (ZH() ? TEAM_ZH[x] || x : x === "Both" ? "Vietnamese & Indonesian" : x);
// display labels for on-site and refusal options (wording follows 收案紀錄項目_中英印越對照)
const OPT_ZH = {
  "Self-completed": "自填", "Completed with research assistant": "助理代填",
  "Early (agreed readily)": "早期（主動配合）", "Late (agreed after consideration)": "晚期（考慮後才填）",
  "No problems found": "未發現問題", "Missing answers (4+ blanks in Q15–Q48)": "漏答（Q15–Q48 有 4 題以上空白）",
  "Q23, Q34 and Q45 all blank": "Q23、Q34、Q45 皆空白", "12+ identical non-3 answers in a row": "連續 12 題以上相同且不是 3 的答案",
  "Q14 skip rule not followed": "未依 Q14 跳題規則作答",
  "Not needed": "不需要", "Respondent completed or corrected": "填答者已補填或更正", "Respondent partly completed": "填答者部分補填",
  "Respondent declined to change": "填答者不願更改",
  Yes: "是", No: "否", Male: "男", Female: "女",
  "No time": "沒時間", "Feeling unwell": "身體不適", "Does not want to use electronic devices": "不想用電子產品",
  "Privacy concerns": "隱私疑慮", "Language barrier": "語言障礙", "Poor eyesight": "視力不佳",
  "Would like to learn more": "想了解", "Not interested": "不想了解", "No response": "未回覆",
};
const lab = (o) => (ZH() && OPT_ZH[o]) || o;
const labOther = (v) => (ZH() && /^Other: /.test(v) ? "其他：" + v.slice(7) : lab(v));
// server messages shown in Chinese for Chinese-interface users; anything not listed stays as sent
const FIELD_ZH = { "C1 Mode of completion": "C1 填答方式", "C2 Response timing": "C2 回覆時機", "On-site check": "現場檢查", "Follow-up": "後續處理",
  "Cover marks done": "封面標記", Gender: "性別", "Estimated age group": "預估年齡層", "Main reason for declining": "主要拒絕原因", "Quick question": "快問快答" };
const KIND_ZH = { questionnaire: "問卷", refusal: "拒絕紀錄" };
const ERR_ZH = [
  [/^No connection\./, () => "沒有網路連線，請檢查網路後再試一次。"],
  [/^Server error\./, () => "伺服器錯誤，請再試一次；一直發生請告訴主持人。"],
  [/^Please sign in\.$/, () => "請登入。"],
  [/^Your session has expired/, () => "登入已過期，請重新登入。"],
  [/^Your account link was reset/, () => "你的帳號綁定已被重設，請用邀請連結重新登入。"],
  [/^Sign-in failed/, () => "登入失敗，請再試一次。"],
  [/^Your Google account email is not verified/, () => "你的 Google 帳號電子郵件尚未驗證。"],
  [/^This invite link is not valid/, () => "這個邀請連結無效，請向主持人索取新連結。"],
  [/^This Google account is already linked to (.+?)\. /, (m) => `這個 Google 帳號已綁定給 ${m[1]}。請不要用邀請連結直接登入，或改用其他 Google 帳號。`],
  [/^This invite link has already been used/, () => "這個邀請連結已被其他 Google 帳號使用，請主持人重設。"],
  [/^This Google account \((.+?)\) is not linked/, (m) => `這個 Google 帳號（${m[1]}）尚未綁定。第一次登入請使用你的個人邀請連結。`],
  [/^The server is busy/, () => "伺服器忙碌中，請稍後再試。"],
  [/^(.+): please choose an option\.$/, (m) => `${FIELD_ZH[m[1]] || m[1]}：請選擇一個選項。`],
  [/^On-site check: tick at least one box\.$/, () => "現場檢查：至少勾選一項。"],
  [/^On-site check: "No problems found"/, () => "現場檢查：「未發現問題」不能和其他問題一起勾。"],
  [/^Every respondent who returns the questionnaire receives the gift/, () => "每位交回問卷的填答者都要給禮品，請勾選「已給禮品」。"],
  [/^Serial (\d+) is not in your (\w+) range \((.+)\)\.$/, (m) => `流水號 ${m[1]} 不在你的${KIND_ZH[m[2]] || m[2]}區間（${m[3]}）內。`],
  [/^Serial (\d+) has already been used\.$/, (m) => `流水號 ${m[1]} 已經用過了。`],
  [/^Choose the questionnaire language first\.$/, () => "請先選擇問卷語言。"],
  [/^You do not have a (\w+) serial range\.$/, (m) => `你沒有${KIND_ZH[m[1]] || m[1]}流水號區間。`],
  [/^You do not have a (\w+) range for (\w+)\.$/, (m) => `你沒有${TEAM_ZH[m[2]] || m[2]}的${KIND_ZH[m[1]] || m[1]}區間。`],
  [/^Record not found\. Reload/, () => "找不到這筆紀錄，請重新整理頁面再試一次。"],
  [/^Record not found\.$/, () => "找不到這筆紀錄。"],
  [/^You can only delete your own records from today/, () => "只能刪除自己今天的紀錄；更早的請找主持人。"],
  [/^This questionnaire already has a data entry/, () => "這份問卷已經有人登錄，請找主持人。"],
  [/^Serial (\d+) has no on-site record yet/, (m) => `流水號 ${m[1]} 還沒有當場紀錄，收案者要先新增當場紀錄。`],
  [/^Serial (\d+) has already been entered twice/, (m) => `流水號 ${m[1]} 已經登錄兩次了。`],
  [/^You already entered serial (\d+)\./, (m) => `你已經登錄過流水號 ${m[1]}，第二次登錄必須由另一個人做。`],
  [/^Item not found\.$/, () => "找不到這個項目。"],
  [/^Only the collector of this questionnaire can check it/, () => "只有這份問卷的收案者可以核對。"],
  [/^Already confirmed by the PI/, () => "主持人已確認過了。"],
  [/^Date: choose today or an earlier day/, () => "日期：請選今天或更早的日子。"],
  [/^You can add work hours for the last (\d+) days only/, (m) => `只能補登最近 ${m[1]} 天的工時，更早的請找主持人。`],
  [/^Start and end: use the time picker/, () => "開始與結束時間：請用時間選擇器。"],
  [/^End time must be later than start time/, () => "結束時間必須晚於開始時間。"],
  [/^Work description: write a short description/, () => "工作內容：請簡短說明。"],
  [/^This period overlaps a period you already logged for (.+)\.$/, (m) => `這個時段和你 ${m[1]} 已登記的時段重疊。`],
  [/^You can only delete your own work hours from the last (\d+) days/, (m) => `只能刪除自己最近 ${m[1]} 天的工時。`],
  [/^View only: you are viewing as (.+?)\./, (m) => `僅供檢視：你正在以 ${m[1]} 的身分檢視，請回到自己的畫面再修改。`],
];
const trErr = (msg) => {
  if (!ZH()) return msg;
  for (const [re, f] of ERR_ZH) { const m = re.exec(msg); if (m) return f(m); }
  return msg;
};

// Admin "view as": state is loaded for another person; every write is blocked in the browser.
const VIEW_OK = { state: 1, schema: 1, manual: 1, slides: 1, signout: 1 };
async function api(action, data = {}) {
  const va = store.get("viewAs", true);
  if (va && !VIEW_OK[action]) throw Object.assign(new Error(trErr(`View only: you are viewing as ${va}. Go back to your own view to make changes.`)), { code: 0 });
  if (va && action === "state") data = { ...data, viewAs: va };
  let r;
  try {
    r = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action, session: store.get("session"), ...data }) });
  } catch { throw Object.assign(new Error(trErr("No connection. Check your internet and try again.")), { code: 0 }); }
  const j = await r.json().catch(() => ({ ok: false, error: "Unexpected server reply." }));
  if (!j.ok) throw Object.assign(new Error(trErr(j.error || "Error")), { code: j.code });
  return j;
}
function toast(msg, ms = 2600) {
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || t("Saving…", "儲存中…"); btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

async function load() {
  try {
    if (!store.get("session")) return renderLogin();
    S = await api("state");
    if (!S.viewAs) store.set("lang", S.me.ui === "zh" ? "zh" : null);   // remembered for the next sign-in page on this device
    document.documentElement.lang = ZH() ? "zh-Hant" : "en";
    render();
  } catch (e) {
    if (store.get("viewAs", true)) { store.set("viewAs", null, true); return load(); }
    if (e.code === 401) { store.set("session", null); return renderLogin(/^(Please sign in\.|請登入。)$/.test(e.message) ? "" : e.message); }
    $("#app").innerHTML = `<main><p class="bad">${esc(e.message)}</p><button class="btn" onclick="location.reload()">${t("Try again", "再試一次")}</button></main>`;
  }
}
async function refresh() { try { S = await api("state"); render(); } catch (e) { toast(e.message); } }

// ------------------------------------------------------------------ sign-in
async function renderLogin(msg = "") {
  const inv = store.get("invite", true);
  document.documentElement.lang = ZH() ? "zh-Hant" : "en";
  $("#app").innerHTML = `<main class="login">
    <div class="lbl">${t("e-PI study · Indonesian &amp; Vietnamese teams", "電子仿單研究 · 印尼文與越南文組")}</div>
    <h1>${t("RA Portal", "研究助理收案網站")}</h1>
    <p class="sub">${inv ? t("Welcome! Sign in with the Google account you want to use for this study. After this first time, always sign in with the same account.", "歡迎！請用你要在這個研究使用的 Google 帳號登入。第一次登入之後，每次都要用同一個帳號登入。")
      : t("Sign in with the Google account linked to your name. The first time, use the personal invite link from the PI.", "請用已綁定你名字的 Google 帳號登入。第一次登入請使用主持人給你的個人邀請連結。")}</p>
    ${msg ? `<p class="note err">${esc(msg)}</p>` : ""}
    ${IN_APP ? `<div class="note warn">${t("<b>Please open this page in Chrome or Safari.</b> Google sign-in does not work inside chat apps. Copy the link and paste it into Chrome or Safari.", "<b>請用 Chrome 或 Safari 開啟這個網頁。</b>Google 登入無法在聊天 App 內使用，請複製連結貼到 Chrome 或 Safari。")}<div class="btns"><button class="btn sm" id="cplink">${t("Copy link", "複製連結")}</button></div></div>` : ""}
    <div id="gbtn" style="margin:22px 0 10px;min-height:44px"></div>
    <p class="sub faint">${t("Only research team members can sign in. The portal shows no study data before sign-in.", "只有研究團隊成員可以登入。登入前網站不會顯示任何研究資料。")}</p>
  </main>`;
  const cp = $("#cplink");
  if (cp) cp.onclick = async () => {
    const u = location.origin + location.pathname + (inv ? "?invite=" + encodeURIComponent(inv) + (ZH() ? "&lang=zh" : "") : "");
    try { await navigator.clipboard.writeText(u); toast(t("Link copied", "已複製連結")); } catch { toast(u, 10000); }
  };
  await new Promise((ok, no) => {
    if (window.google?.accounts?.id) return ok();
    const sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client"; sc.async = true; sc.onload = ok; sc.onerror = () => no();
    document.head.appendChild(sc);
  }).catch(() => { $("#gbtn").innerHTML = `<p class="bad">${t("Google sign-in could not load. Check your connection and reload.", "Google 登入無法載入，請檢查網路後重新整理。")}</p>`; });
  if (!window.google?.accounts?.id) return;
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: async (r) => {
      $("#gbtn").innerHTML = `<p class="sub">${t("Signing in…", "登入中…")}</p>`;
      try {
        const j = await api("signin", { credential: r.credential, invite: store.get("invite", true) });
        store.set("session", j.session); store.set("invite", null, true);
        load();
      } catch (e) { renderLogin(e.message); }
    },
  });
  google.accounts.id.renderButton($("#gbtn"), { theme: "outline", size: "large", text: "signin_with", shape: "pill", locale: ZH() ? "zh-TW" : "en" });
}
async function signOut() {
  try { await api("signout"); } catch {}
  store.set("session", null); store.set("viewAs", null, true); S = null;
  try { google.accounts.id.disableAutoSelect(); } catch {}
  renderLogin();
}

// ------------------------------------------------------------------ shell
const ROUTES = [["home", "Home", "首頁"], ["refusal", "Refusal Log", "拒絕紀錄"], ["onsite", "On-site Record", "當場紀錄"], ["entry", "Data Entry", "登錄問卷"],
  ["work", "Work Log", "工時"], ["posters", "Posters", "招募海報"], ["manual", "Manual", "手冊"], ["slides", "Slides", "簡報"]];
const isAdmin = () => S?.me?.role === "Admin";
function render() {
  const route = (location.hash.slice(1) || "home").split("/")[0];
  const tabs = ROUTES.map(([k, en, zh]) => [k, t(en, zh)]).concat(isAdmin() ? [["admin", "Admin"]] : []);
  $("#app").innerHTML = `
    <header class="top"><div class="topin">
      <div class="brand"><b>${t("e-PI RA Portal", "電子仿單收案網站")}</b><span>${t("Shin Kong Hospital · B1 outpatient pharmacy", "新光醫院 · B1 門診藥局")}</span></div>
      <nav class="tabs">${tabs.map(([k, v]) => `<a href="#${k}" class="${k === route ? "on" : ""}">${v}</a>`).join("")}</nav>
      <div class="who"><span>${esc(S.me.short || S.me.name)}</span><button class="btn sm" id="out">${t("Sign out", "登出")}</button></div>
    </div></header>
    ${S.viewAs ? `<div class="note warn" style="margin:0;border-radius:0;text-align:center">Viewing as <b>${esc(S.me.name)}</b> (view only) · <button class="btn sm" id="vaexit">Back to my view</button></div>` : ""}
    <main id="view"></main>`;
  $("#out").onclick = signOut;
  if (S.viewAs) $("#vaexit").onclick = () => { store.set("viewAs", null, true); location.hash = "admin"; load(); };
  const view = { home: viewHome, refusal: viewRefusal, onsite: viewOnsite, entry: viewEntry, work: viewWork, posters: viewPosters, manual: viewManual, slides: viewSlides, admin: viewAdmin }[route] || viewHome;
  view($("#view"));
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { if (S) render(); });

// serial ranges by language; older server replies without `ranges` fall back to the single team
const myRanges = () => S.me.ranges || (S.me.q ? { [S.me.team]: { q: S.me.q, r: S.me.r } } : {});
const myNext = () => S.my.next || { [S.me.team]: { q: S.my.nextQ, r: S.my.nextR } };

// ------------------------------------------------------------------ home
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
function viewHome(v) {
  const m = S.my, me = S.me, R = myRanges(), N = myNext(), langs = Object.keys(R);
  const todo = [];
  if (m.mismatches.length) todo.push(`<li><a href="#entry/check">${t(`${m.mismatches.length} entry difference${m.mismatches.length > 1 ? "s" : ""} to check against the paper questionnaire`, `${m.mismatches.length} 個登錄差異要對照紙本問卷核對`)}</a></li>`);
  if (m.toReturn.length) todo.push(`<li>${t("Ready to return to the PI office (F814):", "可以交回主持人辦公室（F814）：")} <span class="mono">${m.toReturn.map(esc).join(", ")}</span></li>`);
  const coverNo = m.todayOnsite.filter((r) => r.cover !== "Yes");
  if (coverNo.length) todo.push(`<li>${t("Cover marks not done today:", "今天還沒完成封面標記：")} <span class="mono">${coverNo.map((r) => esc(r.serial)).join(", ")}</span>${t(". Complete them before you leave.", "。離開前請完成。")}</li>`);
  const myQueue = S.queue.filter((q) => !q.mine).length;
  if (myQueue) todo.push(`<li><a href="#entry">${t(`${myQueue} questionnaire${myQueue > 1 ? "s" : ""} waiting for data entry`, `${myQueue} 份問卷等待登錄`)}</a></li>`);
  const usedUp = langs.some((l) => (R[l].q && N[l]?.q == null) || (R[l].r && N[l]?.r == null));

  v.innerHTML = `
    <h1>${t("Hello", "你好")}, ${esc(me.short || me.name)}</h1>
    <p class="lead">${esc(S.today)}${me.team ? ` · ${esc(teamName(me.team))}${t(" team", "組")}` : ""}</p>
    ${workReminder()}
    <div class="grid two">
      ${langs.length ? `<section class="card"><h2>${t("My next serial numbers", "我的下一個流水號")}</h2>
        ${langs.map((l) => `${langs.length > 1 ? `<h3 style="margin:8px 0 4px">${esc(teamName(l))}</h3>` : ""}<div class="serials">
          ${R[l].q ? `<div class="serial"><div class="t">${t("Questionnaire (cover mark C4)", "問卷（封面 C4）")}</div><div class="n">${N[l]?.q ?? "—"}</div><div class="t">${t("Range", "區間")} ${R[l].q[0]}–${R[l].q[1]}</div></div>` : ""}
          ${R[l].r ? `<div class="serial"><div class="t">${t("Refusal", "拒絕紀錄")}</div><div class="n">${N[l]?.r ?? "—"}</div><div class="t">${t("Range", "區間")} ${R[l].r[0]}–${R[l].r[1]}</div></div>` : ""}
        </div>`).join("")}
        ${usedUp ? `<p class="note warn">${t("A range is used up. Ask the PI for a new range.", "有區間已經用完，請向主持人索取新區間。")}</p>` : ""}
        <div class="btns"><a class="btn pri" href="#onsite">${t("+ On-site record", "＋ 當場紀錄")}</a><a class="btn" href="#refusal">${t("+ Refusal", "＋ 拒絕紀錄")}</a></div>
        <p class="sub" style="margin-top:10px">${t(`Today: ${m.todayOnsite.length} questionnaire${m.todayOnsite.length === 1 ? "" : "s"}, ${m.todayRefusals.length} refusal${m.todayRefusals.length === 1 ? "" : "s"}.`, `今天：問卷 ${m.todayOnsite.length} 份、拒絕 ${m.todayRefusals.length} 位。`)}</p>
      </section>` : ""}
      <section class="card"><h2>${t("To do", "待辦")}</h2>${todo.length ? `<ul class="todo">${todo.join("")}</ul>` : `<p class="empty">${t("Nothing waiting. Thank you!", "目前沒有待辦，謝謝你！")}</p>`}</section>

      <section class="card span2"><h2>${t("Collection progress", "收案進度")}</h2>
        <div class="teams">${S.teams.map((tm) => {
          const rr = tm.done + tm.refusals ? Math.round((tm.done / (tm.done + tm.refusals)) * 100) : null;
          return `<div class="team ${tm.team === "Vietnamese" ? "vi" : "id"}">
            <div class="lbl">${esc(teamName(tm.team))}</div>
            <div class="big">${tm.done} <small>/ ${tm.target} ${t("questionnaires", "份問卷")}</small></div>
            <div class="bar"><i style="width:${pct(tm.done, tm.target)}%"></i></div>
            <div class="kv"><span>${t("Today", "今天")} <b>${tm.today}</b></span><span>${t("Refusals", "拒絕")} <b>${tm.refusals}</b></span><span>${t("Response rate", "回應率")} <b>${rr == null ? "—" : rr + "%"}</b></span><span>${t("Late responders", "晚期回覆")} <b>${tm.late}</b></span></div>
          </div>`;
        }).join("")}</div>
        <h3>${t("By research assistant", "各研究助理")}</h3>
        <div class="tw"><table><thead><tr><th>${t("RA", "助理")}</th><th>${t("Team", "組別")}</th><th class="num">${t("Today", "今天")}</th><th class="num">${t("Questionnaires", "問卷")}</th><th class="num">${t("Refusals", "拒絕")}</th></tr></thead><tbody>
        ${S.people.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(teamName(p.team))}</td><td class="num">${p.today}</td><td class="num">${p.done}</td><td class="num">${p.refusals}</td></tr>`).join("")}
        </tbody></table></div>
      </section>

      <section class="card span2" id="schedsec">${schedSection()}</section>

      <section class="card"><h2>${t("Data entry progress", "登錄進度")}</h2>
        <div class="kv" style="font-size:15px;gap:6px 18px">
          <span>${t("Not entered", "未登錄")} <b>${S.entry.none}</b></span><span>${t("Entered once", "已登錄一次")} <b>${S.entry.one}</b></span><span>${t("Entered twice", "已登錄兩次")} <b>${S.entry.two}</b></span>
          <span>${t("Differences to check", "待核對差異")} <b>${S.entry.openMismatches}</b></span><span>${t("Returned to PI office", "已交回主持人辦公室")} <b>${S.entry.returned}</b></span>
        </div>
      </section>

      <section class="card"><h2>${isAdmin() ? "Daily summary (all RAs)" : t("My daily summary", "我的每日摘要")}</h2>
        <p class="sub" style="margin-bottom:8px">${t("Made automatically from your on-site records and refusals. No separate daily report is needed.", "由你的當場紀錄與拒絕紀錄自動彙整，不需要另外填每日回報。")}</p>
        ${S.daily.length ? `<div class="tw"><table><thead><tr><th>${t("Date", "日期")}</th>${isAdmin() ? "<th>RA</th>" : ""}<th>${t("Questionnaires", "問卷")}</th><th>${t("Refusals", "拒絕")}</th><th>${t("Cover marks missing", "缺封面標記")}</th></tr></thead><tbody>
        ${S.daily.map((d) => `<tr><td class="mono">${esc(d.date)}</td>${isAdmin() ? `<td>${esc(d.collector)}</td>` : ""}<td>${d.q} <span class="faint mono">${esc(d.qSpan)}</span></td><td>${d.r} <span class="faint mono">${esc(d.rSpan)}</span></td><td class="${d.coverNo ? "bad" : ""}">${d.coverNo}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty">${t("No records yet.", "還沒有紀錄。")}</p>`}
      </section>
    </div>`;
  bindSched();
}
let SCHED_EDIT = false;
const canEditSched = () => !S.viewAs;   // 2026-10-22: every signed-in RA can edit the schedule
const teamTag = (l) => (/^ID\b/.test(l) ? "tm tm-id" : /^VI\b/.test(l) ? "tm tm-vi" : "tm");
const teamCode = (team) => (team === "Indonesian" ? "ID: " : team === "Vietnamese" ? "VI: " : "");
const lineIs = (l, short) => { const r = l.replace(/^(ID|VI)\b\s*:?\s*/i, "").trim().toLowerCase(), k = short.toLowerCase(); return r === k || r.startsWith(k + " "); };
const schedWeeks = () => S.schedules || (S.schedule ? [S.schedule] : []);   // 2026-10-29: this week + next week, one sheet tab each
function schedSection() {
  const ws = schedWeeks();
  return `<div class="cardhead"><h2>${t("Shift schedule", "班表")}</h2></div>
    ${ws.length ? ws.map((w, i) => schedHtml(w, i)).join("") : `<p class="empty">${t("The schedule is not available.", "目前無法顯示班表。")}</p>`}
    ${ws.length ? schedFoot(ws) : ""}`;
}
function schedHtml(s, wi) {
  const key = (S.me.short || "").toLowerCase();
  const lines = (c) => c.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const mine = (c) => key && lines(c.toLowerCase()).some((l) => l.includes(key));
  const ras = S.people.concat(S.admins || []);   // admins (PI, 子芸) can be scheduled too
  const cell = (c, ri, ci) => {
    const ls = lines(c);
    if (!SCHED_EDIT) return `<td class="${mine(c) ? "me" : ""}">${ls.map((l) => `<span class="${teamTag(l)}${mine(l) ? " mine" : ""}">${esc(l)}</span>`).join("<br>")}</td>`;
    const own = isAdmin() ? null : S.me.short;   // an RA edits only their own name
    const avail = ras.filter((p) => (!own || p.short === own) && !ls.some((l) => lineIs(l, p.short)));
    return `<td class="edit">${ls.map((l) => `<span class="${teamTag(l)}">${esc(l)}${own && !lineIs(l, own) ? "" : `<button class="x" title="${t("Remove", "移除")}" data-sdel="${wi},${ri},${ci}" data-line="${esc(l)}">×</button>`}</span>`).join("")}
      ${avail.length ? `<select class="sadd" data-sadd="${wi},${ri},${ci}"><option value="">＋ ${t("Add", "新增")}</option>${avail.map((p) => `<option value="${esc(p.short)}">${teamCode(p.team)}${esc(p.short)}</option>`).join("")}</select>` : ""}</td>`;
  };
  const when = s.start ? (s.start === mondayOf(S.today) ? t("This week", "本週") : t("Next week", "下週")) : "";
  const title = (s.title || "").replace(/^.*?—\s*/, "");   // drop the "e-PI … Teams —" prefix
  const editBtn = canEditSched() ? `<button class="btn sm ${SCHED_EDIT ? "pri" : ""}" data-sedit="1">${SCHED_EDIT ? t("Done", "完成") : t("Edit", "編輯")}</button>` : "";
  const copyBtn = canEditSched() && wi > 0 && S.me.short ? `<button class="btn sm" data-scopy="${wi}" title="${t("Adds your shifts from this week to this schedule; shifts already there are kept.", "把你本週的班加進這張班表；已有的保留。")}">${t("Copy my shifts from this week", "複製我本週的班")}</button>` : "";
  return `<div class="cardhead" style="margin:${wi ? 14 : 0}px 0 6px"><p class="sub" style="margin:0">${when ? `<span class="tm">${when}</span> ` : ""}<b>${esc(title)}</b></p><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${copyBtn}${editBtn}</span></div>
    <div class="tw"><table class="sched"><thead><tr>${s.grid[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
    ${s.grid.slice(1).map((r, ri) => `<tr>${r.map((c, i) => i === 0 ? `<th>${esc(c)}</th>` : cell(c, ri + 1, i)).join("")}</tr>`).join("")}
    </tbody></table></div>`;
}
function schedFoot(ws) {
  const s = ws[0];
  return `${SCHED_EDIT ? `<p class="sub" style="margin-top:6px">${t("Changes are saved immediately and shown to everyone. Each change is recorded with your name.", "修改會立即儲存並顯示給所有人；每次修改都會記錄修改者。")}</p>` : ""}
    <p class="sub" style="margin-top:6px">${S.me.role === "RA" ? t("Your shifts are highlighted. Press Edit to add or remove your own name.", "標色的是你的班。按「編輯」可新增或移除自己的名字（只能改自己的）。") : t("Your shifts are highlighted. Press Edit to add or remove anyone, including yourself.", "標色的是你的班。按「編輯」可新增或移除任何人的名字，包括自己。")}
    ${t("Next week's schedule appears automatically; please fill in your shifts for next week during this week.", "下週班表會自動出現，請在本週內填好下週的班。")}</p>
    ${s.notes.concat(s.after).filter((n) => !/^https?:|RA portal|^Shifts per person/i.test(n)).map((n) => `<p class="sub">${esc(n)}</p>`).join("")}`;
}
const mondayOf = (ymd) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
function bindSched() {
  const sec = $("#schedsec");
  if (!sec) return;
  const redraw = () => { sec.innerHTML = schedSection(); bindSched(); };
  const save = async (data) => {
    $$("button,select", sec).forEach((x) => (x.disabled = true));
    try { const j = await api("schedule.edit", data); S.schedule = j.schedule; S.schedules = j.schedules; toast(t("Schedule saved", "班表已儲存")); }
    catch (e) { toast(e.message); }
    redraw();
  };
  $$("[data-sedit]", sec).forEach((b) => (b.onclick = () => { SCHED_EDIT = !SCHED_EDIT; redraw(); }));
  const sheetOf = (wi) => schedWeeks()[Number(wi)]?.sheet;
  $$("[data-scopy]", sec).forEach((b) => (b.onclick = async () => {
    $$("button,select", sec).forEach((x) => (x.disabled = true));
    try {
      const j = await api("schedule.copy", { from: sheetOf(0), to: sheetOf(b.dataset.scopy) });
      S.schedule = j.schedule; S.schedules = j.schedules;
      toast(j.added ? t(`${j.added} shift${j.added > 1 ? "s" : ""} copied`, `已複製 ${j.added} 個班`) : t("Nothing to copy: you have no shifts this week, or they are already there.", "沒有可複製的班：你本週沒有排班，或下週已經有了。"));
    } catch (e) { toast(e.message); }
    redraw();
  }));
  $$("[data-sdel]", sec).forEach((b) => (b.onclick = () => { const [wi, row, col] = b.dataset.sdel.split(","); save({ sheet: sheetOf(wi), row, col, op: "remove", line: b.dataset.line }); }));
  $$("[data-sadd]", sec).forEach((sl) => (sl.onchange = () => { if (!sl.value) return; const [wi, row, col] = sl.dataset.sadd.split(","); save({ sheet: sheetOf(wi), row, col, op: "add", name: sl.value }); }));
}

// ------------------------------------------------------------------ shared form bits
async function schema() { return SCHEMA || (SCHEMA = await api("schema")); }
function radios(name, opts, val, other) {
  return `<div class="opts">${opts.map((o) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o)}" ${val === o ? "checked" : ""}><span>${esc(lab(o))}</span></label>`).join("")}
    ${other ? `<label class="opt"><input type="radio" name="${name}" value="__other" ${val && val.startsWith("Other: ") ? "checked" : ""}><span style="flex:1">${t("Other:", "其他：")} <input type="text" data-other="${name}" value="${val && val.startsWith("Other: ") ? esc(val.slice(7)) : ""}" style="margin-top:4px"></span></label>` : ""}</div>`;
}
function checks(name, opts, vals = [], other) {
  const oth = vals.find((v) => v.startsWith("Other: "));
  return `<div class="opts">${opts.map((o) => `<label class="opt"><input type="checkbox" name="${name}" value="${esc(o)}" ${vals.includes(o) ? "checked" : ""}><span>${esc(lab(o))}</span></label>`).join("")}
    ${other ? `<label class="opt"><input type="checkbox" name="${name}" value="__other" ${oth ? "checked" : ""}><span style="flex:1">${t("Other:", "其他：")} <input type="text" data-other="${name}" value="${oth ? esc(oth.slice(7)) : ""}" style="margin-top:4px"></span></label>` : ""}</div>`;
}
function getRadio(form, name) {
  const el = $(`input[name="${CSS.escape(name)}"]:checked`, form);
  if (!el) return "";
  if (el.value === "__other") { const x = $(`[data-other="${CSS.escape(name)}"]`, form).value.trim(); return x ? "Other: " + x : ""; }
  return el.value;
}
function getChecks(form, name) {
  return $$(`input[name="${CSS.escape(name)}"]:checked`, form).map((el) => {
    if (el.value !== "__other") return el.value;
    const x = $(`[data-other="${CSS.escape(name)}"]`, form).value.trim(); return x ? "Other: " + x : "";
  }).filter(Boolean);
}
async function delRecord(kind, serial) {
  if (!confirmInline(`del-${kind}-${serial}`)) return;
  try { await api("record.delete", { kind, serial }); toast(t(`Deleted ${serial}`, `已刪除 ${serial}`)); await refresh(); }
  catch (e) { toast(e.message, 4000); }
}
// two-tap confirmation without browser dialogs
const armed = {};
function confirmInline(k) {
  if (armed[k]) { delete armed[k]; return true; }
  armed[k] = 1; toast(t("Tap Delete again to confirm.", "再按一次刪除以確認。")); setTimeout(() => delete armed[k], 4000); return false;
}
/**
 * Serial number block for the on-site record and refusal forms. kind "q" or "r".
 * One-language RAs get their next number filled in, as before. Two-language RAs choose the language first; the number appears after that.
 */
function serialBlock(kind, id, label) {
  const R = myRanges(), N = myNext(), langs = Object.keys(R).filter((l) => R[l][kind]);
  const hint = (l) => t(`Your next number is filled in. Range ${R[l][kind][0]}–${R[l][kind][1]}.`, `已帶入你的下一個號碼。區間 ${R[l][kind][0]}–${R[l][kind][1]}。`) + (kind === "q" ? t(` Language: ${teamName(l)}.`, `語言：${teamName(l)}。`) : "");
  if (langs.length < 2) {
    const l = langs[0];
    return `<div class="f"><label class="q" for="${id}">${label}</label><div class="h">${hint(l)}</div>
      <input class="serialin" id="${id}" type="text" inputmode="numeric" maxlength="4" value="${N[l]?.[kind] ?? ""}"></div>`;
  }
  return `<div class="f"><span class="q">${t("Questionnaire language", "問卷語言")}</span><div class="h">${t("Choose the language first. Your serial number then appears.", "先選語言，才會出現流水號。")}</div>
      <div class="opts">${langs.map((l) => `<label class="opt"><input type="radio" name="slang" value="${esc(l)}"><span>${esc(teamName(l))}</span></label>`).join("")}</div></div>
    <div class="f" id="${id}-box" hidden><label class="q" for="${id}">${label}</label><div class="h" id="${id}-h"></div>
      <input class="serialin" id="${id}" type="text" inputmode="numeric" maxlength="4" value=""></div>`;
}
function bindSerialBlock(form, kind, id) {
  const N = myNext();
  $$('input[name="slang"]', form).forEach((x) => (x.onchange = () => {
    const l = x.value, R = myRanges();
    $(`#${id}-box`).hidden = false;
    $(`#${id}-h`).textContent = t(`Your next ${l} number is filled in. Range ${R[l][kind][0]}–${R[l][kind][1]}.`, `已帶入你的下一個${teamName(l)}號碼。區間 ${R[l][kind][0]}–${R[l][kind][1]}。`);
    $(`#${id}`).value = N[l]?.[kind] ?? "";
  }));
}
// language of the record: chosen on the form (two-language RAs) or the only one
const serialLang = (form) => getRadio(form, "slang") || undefined;
const needsLang = (kind) => Object.keys(myRanges()).filter((l) => myRanges()[l][kind]).length > 1;

// ------------------------------------------------------------------ refusal log
async function viewRefusal(v) {
  const sc = await schema(), o = sc.refusal;
  if (!Object.keys(myRanges()).some((l) => myRanges()[l].r)) { v.innerHTML = `<h1>${t("Refusal Log", "拒絕紀錄")}</h1><p class="note info">${t("You do not have a refusal serial range. This page is for research assistants.", "你沒有拒絕紀錄流水號區間，這一頁是給研究助理用的。")}</p>`; return; }
  v.innerHTML = `
    <h1>${t("Refusal Log", "拒絕紀錄")}</h1>
    <p class="lead">${t("Record each person who declines, immediately. Do not log people who were not eligible (under 18, emergency visit, prefers the Chinese version).", "每位拒絕的人都要立即記錄。不符合資格的人（未滿 18 歲、急診、想填中文版）不要記錄。")}</p>
    <form class="card" id="rf">
      ${serialBlock("r", "rs", t("Serial number", "流水號"))}
      <div class="f"><span class="q">${t("Gender (your observation)", "性別（你的觀察）")}</span>${radios("gender", o.gender)}</div>
      <div class="f"><span class="q">${t("Estimated age group (do not ask)", "預估年齡層（不要詢問）")}</span>${radios("age", o.age)}</div>
      <div class="f"><span class="q">${t("Main reason for declining", "主要拒絕原因")}</span>${radios("reason", o.reason, "", true)}</div>
      <div class="f"><span class="q">${t("Quick question", "快問快答")}</span>
        <div class="note info">${t(`"That's fine, thank you! Just one last question: the government has a new way to look up medicine information. Would you like to learn more about it?" (say it in your language, item B1)`, "「沒關係，謝謝你！最後一個問題：政府有新的藥品資訊查詢管道，你是否會想了解？」（用對方的語言說，項目 B1）")}</div>
        ${radios("quick", o.quick)}<div class="h" style="margin-top:6px">${t(`"Not interested" is an answer to the quick question, not a reason for declining.`, "「不想了解」是快問快答的答案，不是拒絕原因。")}</div></div>
      <div class="formbar"><button class="btn pri" id="rsave">${t("Save refusal", "儲存拒絕紀錄")}</button><span class="sub" id="rmsg"></span></div>
    </form>
    ${todayList(t("Today's refusals", "今天的拒絕紀錄"), S.my.todayRefusals, (r) => `${esc(labOther(r.reason))} · ${esc(lab(r.quick))}`, "refusal")}`;
  bindSerialBlock($("#rf"), "r", "rs");
  $("#rf").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = $("#rf"), b = $("#rsave");
    if (needsLang("r") && !serialLang(f)) return toast(t("Choose the questionnaire language first.", "請先選擇問卷語言。"));
    const body = { team: serialLang(f), serial: $("#rs").value.trim(), gender: getRadio(f, "gender"), age: getRadio(f, "age"), reason: getRadio(f, "reason"), quick: getRadio(f, "quick") };
    const miss = [["gender", "Gender", "性別"], ["age", "Age group", "年齡層"], ["reason", "Main reason", "拒絕原因"], ["quick", "Quick question", "快問快答"]].filter(([k]) => !body[k]).map(([, en, zh]) => t(en, zh));
    if (miss.length) return toast(t("Please answer: ", "請填寫：") + miss.join(t(", ", "、")));
    busy(b, true);
    try { const j = await api("refusal.add", body); toast(t(`Saved refusal ${j.saved}`, `已儲存拒絕紀錄 ${j.saved}`)); await refresh(); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  };
}
function todayList(title, rows, desc, kind) {
  return `<section class="card" style="margin-top:16px"><h2>${title}</h2>${rows.length ? `<div class="tw"><table><tbody>
    ${rows.map((r) => `<tr><td class="mono">${esc(r.serial)}</td><td class="mono faint">${esc(r.time)}</td><td>${desc(r)}</td>
    <td style="text-align:right">${r.deletable === false ? "" : `<button class="btn sm danger" onclick="delRecord('${kind}','${esc(r.serial)}')">${t("Delete", "刪除")}</button>`}</td></tr>`).join("")}
    </tbody></table></div><p class="sub" style="margin-top:6px">${t("Made a mistake? Delete it and enter it again (today only).", "輸入錯了？刪除後重新輸入（限當天）。")}</p>` : `<p class="empty">${t("None yet today.", "今天還沒有。")}</p>`}</section>`;
}

// ------------------------------------------------------------------ work log
function workReminder() {
  const miss = S.my.work.missing;
  if (!miss.length) return "";
  const past = miss.filter((d) => d !== S.today);
  return `<a class="note warn" href="#work" style="display:block;text-decoration:none;color:inherit;margin:0 0 16px">
    <b>${miss.includes(S.today) ? t("Work hours not logged for today.", "今天還沒登記工時。") : t("Work hours not logged.", "有工時還沒登記。")}</b>
    ${miss.includes(S.today) ? t("Log today's hours and a short description before you leave.", "離開前請登記今天的工時和簡短說明。") : ""}
    ${past.length ? `${t("Missing:", "缺少：")} <span class="mono">${past.map(esc).join(", ")}</span>${t(".", "。")}` : ""} <u>${t("Open Work Log →", "前往工時 →")}</u></a>`;
}
function viewWork(v) {
  const w = S.my.work;
  const hrs = (a, b) => { const m = (x) => { const r = /^(\d\d):(\d\d)$/.exec(x || ""); return r ? +r[1] * 60 + +r[2] : null; }; const p = m(a), q = m(b); return p != null && q != null && q > p ? ((q - p) / 60).toFixed(2) : ""; };
  const dflt = w.missing.filter((d) => d !== S.today).slice(-1)[0] || S.today;
  v.innerHTML = `
    <h1>${t("Work Log", "工時")}</h1>
    <p class="lead">${t("Record each work period: shifts at the pharmacy, data entry, training and meetings. Add a separate period for each part of the day (for example, morning and evening shifts).", "記錄每一段工作時間：藥局值班、登錄問卷、訓練和開會。同一天不同時段要分開登記（例如早班和晚班）。")}</p>
    ${w.missing.length ? `<p class="note warn">${t("Days with work but no hours logged:", "有工作但還沒登記工時的日子：")} <span class="mono">${w.missing.map(esc).join(", ")}</span></p>` : ""}
    <form class="card" id="wf">
      <div class="f"><label class="q" for="wd">${t("Date", "日期")}</label><div class="h">${w.cutoff ? t(`Today or up to ${esc(w.cutoff)}. Older days: ask the PI.`, `今天到 ${esc(w.cutoff)} 之間。更早的請找主持人。`) : t("Today or up to 7 days ago. Older days: ask the PI.", "今天到 7 天前之間。更早的請找主持人。")}</div>
        <input id="wd" type="date" value="${esc(dflt)}" min="${esc(w.cutoff)}" max="${esc(S.today)}" style="max-width:220px"></div>
      <div class="f" style="display:flex;gap:12px;flex-wrap:wrap">
        <div><label class="q" for="ws" style="display:block">${t("Start", "開始")}</label><input id="ws" type="time" step="300" style="width:150px"></div>
        <div><label class="q" for="we" style="display:block">${t("End", "結束")}</label><input id="we" type="time" step="300" style="width:150px"></div>
        <div><span class="q">${t("Hours", "時數")}</span><div class="mono" id="wh" style="font-size:22px;padding-top:4px">—</div></div>
      </div>
      <div class="f"><label class="q" for="wdesc">${t("What did you do?", "做了什麼？")}</label><div class="h">${t(`One or two lines. For example: "Morning shift at B1 pharmacy, 6 questionnaires, 3 refusals" or "Data entry, serials 4012–4020".`, "一兩行即可。例如：「B1 藥局早班，問卷 6 份、拒絕 3 位」或「登錄問卷，流水號 4012–4020」。")}</div>
        <textarea id="wdesc" maxlength="500"></textarea></div>
      <div class="formbar"><button class="btn pri" id="wsave">${t("Save work period", "儲存工時")}</button></div>
    </form>
    <section class="card" style="margin-top:16px"><h2>${t("My work periods (last 31 days)", "我的工時（最近 31 天）")}</h2>
      <p class="sub" style="margin-bottom:6px">${t("This month:", "本月：")} <b>${(+w.monthHours).toFixed(2)}</b> ${t("hours", "小時")}</p>
      ${w.list.length ? `<div class="tw"><table><thead><tr><th>${t("Date", "日期")}</th><th>${t("Time", "時間")}</th><th class="num">${t("Hours", "時數")}</th><th>${t("Description", "說明")}</th><th></th></tr></thead><tbody>
      ${w.list.map((r) => `<tr><td class="mono" style="white-space:nowrap">${esc(r.date)}</td><td class="mono" style="white-space:nowrap">${esc(r.start)}–${esc(r.end)}</td><td class="num">${esc(r.hours)}</td><td>${esc(r.desc)}</td>
        <td style="text-align:right">${r.deletable ? `<button class="btn sm danger" data-wdel="${r.row}" data-d="${esc(r.date)}" data-s="${esc(r.start)}">${t("Delete", "刪除")}</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div><p class="sub" style="margin-top:6px">${t("Made a mistake? Delete it and add it again (last 7 days only).", "輸入錯了？刪除後重新登記（限最近 7 天）。")}</p>` : `<p class="empty">${t("Nothing logged yet.", "還沒有登記。")}</p>`}
    </section>`;
  const f = $("#wf");
  const upd = () => { $("#wh").textContent = hrs($("#ws").value, $("#we").value) || "—"; };
  $("#ws").oninput = upd; $("#we").oninput = upd;
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const body = { date: $("#wd").value, start: $("#ws").value, end: $("#we").value, desc: $("#wdesc").value.trim() };
    if (!body.date || !body.start || !body.end) return toast(t("Please fill in the date, start and end.", "請填寫日期、開始和結束時間。"));
    if (!hrs(body.start, body.end)) return toast(t("End time must be later than start time.", "結束時間必須晚於開始時間。"));
    if (body.desc.length < 5) return toast(t("Please write a short description.", "請簡短說明工作內容。"));
    const b = $("#wsave");
    busy(b, true);
    try { const j = await api("work.add", body); toast(t(`Saved ${j.hours} hours on ${j.saved}`, `已儲存 ${j.saved} ${j.hours} 小時`)); await refresh(); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  };
  $$("[data-wdel]", v).forEach((b) => (b.onclick = async () => {
    if (!confirmInline("wdel-" + b.dataset.wdel)) return;
    try { await api("work.delete", { row: b.dataset.wdel, date: b.dataset.d, start: b.dataset.s }); toast(t("Deleted", "已刪除")); await refresh(); }
    catch (e) { toast(e.message, 4000); }
  }));
}

// ------------------------------------------------------------------ on-site record
async function viewOnsite(v) {
  const sc = await schema(), o = sc.onsite;
  if (!Object.keys(myRanges()).some((l) => myRanges()[l].q)) { v.innerHTML = `<h1>${t("On-site Record", "當場紀錄")}</h1><p class="note info">${t("You do not have a questionnaire serial range. This page is for research assistants.", "你沒有問卷流水號區間，這一頁是給研究助理用的。")}</p>`; return; }
  v.innerHTML = `
    <h1>${t("On-site Record", "當場紀錄")}</h1>
    <p class="lead">${t("One record for each returned questionnaire, right after you give the gift and write the cover marks.", "每回收一份問卷記錄一筆，在給完禮品、寫好封面標記後立即記錄。")}</p>
    <form class="card" id="of">
      ${serialBlock("q", "os", t("Serial number (C4, written on the cover)", "流水號（封面 C4）"))}
      <div class="f"><span class="q">${t("C1 Mode of completion", "C1 填答方式")}</span>${radios("c1", o.c1)}</div>
      <div class="f"><span class="q">${t("C2 Response timing", "C2 回覆時機")}</span><div class="h">${t("Early = agreed readily. Late = agreed only after consideration (based on Step 2).", "早期＝主動配合；晚期＝考慮後才同意填寫（依步驟 2 判斷）。")}</div>${radios("c2", o.c2)}</div>
      <div class="f"><span class="q">${t("On-site check (Step 6): what did you find?", "現場檢查（步驟 6）：發現什麼？")}</span><div class="h">${t(`Tick all that apply. All "3" answers are acceptable; do not challenge them.`, "符合的都要勾。全部答「3」也可以接受，不要質疑填答者。")}</div>${checks("chk", o.check)}</div>
      <div class="f"><span class="q">${t("Follow-up", "後續處理")}</span>${radios("follow", o.follow)}</div>
      <div class="f"><label class="opt"><input type="checkbox" id="gift"><span>${t("<b>Gift given.</b> Every respondent who returns the questionnaire receives the gift, whether or not they made changes.", "<b>已給禮品。</b>每位交回問卷的填答者都要給禮品，不論有沒有修改答案。")}</span></label></div>
      <div class="f"><span class="q">${t("Cover marks C1–C4 written on the questionnaire?", "問卷封面已寫好 C1–C4 標記？")}</span>${radios("cover", ["Yes", "No"], "Yes")}</div>
      <div class="f"><label class="q" for="onotes">${t("Notes (optional)", "備註（選填）")}</label><div class="h">${t("For example: respondent declined to complete Q30–Q33; assisted only for Part 3.", "例如：填答者不願填寫 Q30–Q33；只有第三部分由助理協助。")}</div><textarea id="onotes" maxlength="1000"></textarea></div>
      <div class="formbar"><button class="btn pri" id="osave">${t("Save on-site record", "儲存當場紀錄")}</button></div>
    </form>
    ${todayList(t("Today's questionnaires", "今天的問卷"), S.my.todayOnsite, (r) => `${esc(ZH() ? lab(r.c1) : short(r.c1))} · ${esc(ZH() ? lab(r.c2).split("（")[0] : r.c2.split(" (")[0])}${r.cover !== "Yes" ? ` · <span class="bad">${t("cover marks missing", "缺封面標記")}</span>` : ""}`, "onsite")}`;
  const f = $("#of");
  bindSerialBlock(f, "q", "os");
  f.addEventListener("change", (e) => {
    if (e.target.name !== "chk") return;
    const none = o.check[0];
    if (e.target.value === none && e.target.checked) $$('input[name="chk"]', f).forEach((x) => { if (x.value !== none) x.checked = false; });
    else if (e.target.checked) $$('input[name="chk"]', f).forEach((x) => { if (x.value === none) x.checked = false; });
    const onlyNone = getChecks(f, "chk").join() === none;
    if (onlyNone) $$('input[name="follow"]', f).forEach((x) => (x.checked = x.value === o.follow[0]));
  });
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const b = $("#osave");
    if (needsLang("q") && !serialLang(f)) return toast(t("Choose the questionnaire language first.", "請先選擇問卷語言。"));
    const body = { team: serialLang(f), serial: $("#os").value.trim(), c1: getRadio(f, "c1"), c2: getRadio(f, "c2"), checks: getChecks(f, "chk"), follow: getRadio(f, "follow"),
      gift: $("#gift").checked, cover: getRadio(f, "cover"), notes: $("#onotes").value };
    const miss = [["c1", "C1", "C1"], ["c2", "C2", "C2"], ["follow", "Follow-up", "後續處理"], ["cover", "Cover marks", "封面標記"]].filter(([k]) => !body[k]).map(([, en, zh]) => t(en, zh));
    if (!body.checks.length) miss.push(t("On-site check", "現場檢查"));
    if (miss.length) return toast(t("Please answer: ", "請填寫：") + miss.join(t(", ", "、")));
    if (!body.gift) return toast(t(`Please give the gift and tick "Gift given".`, "請給禮品並勾選「已給禮品」。"));
    busy(b, true);
    try { const j = await api("onsite.add", body); toast(t(`Saved questionnaire ${j.saved}`, `已儲存問卷 ${j.saved}`)); await refresh(); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  };
}

// ------------------------------------------------------------------ data entry
// §9.2 validity rules, applied to Q15–Q48 values ("1".."5" or NA)
function validity(vals) {
  const a = vals.filter((x) => x === NA).length >= 4;
  const b = ["Q23", "Q34", "Q45"].every((k) => vals[+k.slice(1) - 15] === NA);
  let run = 1, c = false;
  for (let i = 1; i < vals.length; i++) {
    run = vals[i] && vals[i] !== NA && vals[i] === vals[i - 1] ? run + 1 : 1;
    if (run >= 12 && vals[i] !== "3") c = true;
  }
  return { a, b, c, unanswered: vals.filter((x) => !x).length };
}
window.validity = validity; // used by tests

// Chinese help texts for the entry form, by field key (English ones come from Entry.gs)
const HELP_ZH = {
  notes: "照封面原文抄寫，沒有就留空。",
  Q5: "紙本勾「其他」時，選「其他」並照原文輸入。",
  "Q14-1": "紙本勾了哪些就全部勾選；「其他」照原文輸入；跳答或空白請選「Not answered｜未填寫」。",
  "Q14-2": "紙本勾了哪些就全部勾選；「其他」照原文輸入；跳答或空白請選「Not answered｜未填寫」。",
  "Q49-1": "紙本勾了哪些就全部勾選；「其他」照原文輸入。",
  Q50: "照原文、原語言輸入，不要翻譯。空白就輸入「未填寫」。",
  Q51: "照原文、原語言輸入，不要翻譯。空白就輸入「未填寫」。",
  problems: "題號＋看到的情況＋你怎麼登錄。沒有就留空。",
};

async function viewEntry(v) {
  const sub = location.hash.split("/")[1];
  if (sub === "check") return viewCheck(v);
  const draftSerial = store.get("entry-serial");
  const queue = S.queue;
  v.innerHTML = `
    <h1>${t("Data Entry", "登錄問卷")}</h1>
    <p class="lead">${t("Every paper questionnaire is entered twice, by two different people, independently. Enter exactly what is on the paper.", "每份紙本問卷由兩個不同的人各自獨立登錄一次。紙本上寫什麼就登錄什麼。")}</p>
    ${S.my.mismatches.length ? `<p class="note warn"><a href="#entry/check">${t(`${S.my.mismatches.length} difference${S.my.mismatches.length > 1 ? "s" : ""} to check against the paper`, `${S.my.mismatches.length} 個差異要對照紙本核對`)}</a></p>` : ""}
    <section class="card" id="start"><h2>${t("Start an entry", "開始登錄")}</h2>
      <div class="f"><label class="q" for="es">${t("Serial number on the cover", "封面上的流水號")}</label><input class="serialin" id="es" type="text" inputmode="numeric" maxlength="4" value="${esc(draftSerial || "")}"></div>
      <button class="btn pri" id="ego">${t("Start", "開始")}</button>
      ${draftSerial ? `<p class="sub" style="margin-top:8px">${t(`You have an unsaved draft for ${esc(draftSerial)}. Press Start to continue it.`, `你有 ${esc(draftSerial)} 尚未儲存的草稿，按「開始」繼續。`)}</p>` : ""}
    </section>
    <div id="eform"></div>
    <section class="card" style="margin-top:16px"><h2>${t("Waiting for data entry", "等待登錄")}</h2><p class="sub" style="margin-bottom:6px">${t("Tap a serial number to start.", "點流水號開始登錄。")}</p>
      ${queue.length ? `<div class="tw"><table><thead><tr><th>${t("Serial", "流水號")}</th><th>${t("Collector", "收案者")}</th><th>${t("Date", "日期")}</th><th>${t("Entries", "登錄次數")}</th></tr></thead><tbody>
      ${queue.map((q) => `<tr><td class="mono">${q.mine ? esc(q.serial) : `<a href="#entry/${esc(q.serial)}">${esc(q.serial)}</a>`}</td><td>${esc(q.collector)}</td><td class="mono" style="white-space:nowrap">${esc(q.date.slice(5))}</td><td>${q.entries}/2 ${q.mine ? `<span class="tag">${t("you entered", "你已登錄")}</span>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">${t("Nothing waiting.", "目前沒有。")}</p>`}
    </section>
    <section class="card" style="margin-top:16px"><h2>${t("My entries", "我的登錄")}</h2>
      ${S.my.entries.length ? `<div class="tw"><table><tbody>${S.my.entries.map((e) => `<tr><td class="mono">${esc(e.serial)}</td><td>${t(`Entry ${esc(e.round)}`, `第 ${esc(e.round)} 次`)}</td><td class="mono faint">${esc(e.at)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">${t("None yet.", "還沒有。")}</p>`}
    </section>`;
  $("#ego").onclick = async () => {
    const serial = $("#es").value.trim(), b = $("#ego");
    if (!/^\d{4}$/.test(serial)) return toast(t("Type the 4-digit serial number.", "請輸入 4 位數流水號。"));
    busy(b, true, t("Checking…", "檢查中…"));
    try {
      const [c, sc] = await Promise.all([api("entry.check", { serial }), schema()]);
      busy(b, false);
      $("#start").hidden = true;
      entryForm($("#eform"), c, sc.entry);
    } catch (e) { busy(b, false); toast(e.message, 5000); }
  };
  if (/^\d{4}$/.test(sub || "")) { $("#es").value = sub; $("#ego").click(); }
}

function entryForm(box, c, fields) {
  const key = "entry-draft-" + c.serial;
  let draft = {};
  try { draft = JSON.parse(store.get(key) || "{}"); } catch {}
  store.set("entry-serial", c.serial);
  const scaleStart = fields.findIndex((f) => f.k === "Q15");
  let html = `<form class="card" id="ef" autocomplete="off">
    <h2>${t(`Serial ${esc(c.serial)} · Entry ${c.round} of 2`, `流水號 ${esc(c.serial)} · 第 ${c.round} 次登錄（共 2 次）`)}</h2>
    <div class="kv"><span>${t("Collector", "收案者")} <b>${esc(c.collector)}</b></span><span>${t("Language", "語言")} <b>${esc(teamName(c.language))}</b></span><span>${t("On-site record", "當場紀錄")} <b>${esc(c.date)}</b></span></div>
    <p class="note info">${t(`Blank item: choose "Not answered". Unclear mark (two boxes, between boxes, crossed out): choose "Not answered" and describe it in "Problems found".`, "空白題：選「未填寫」。勾選不清楚（勾兩格、勾在格子中間、塗改）：選「未填寫」，並在「登錄問題」說明。")}</p>`;
  fields.forEach((f, i) => {
    if (f.sec && f.k !== "Q15") html += `<div class="sec">${esc(f.sec)}</div>`;
    if (f.t === "scale") {
      if (i === scaleStart) html += `<div class="sec">${esc(f.sec)}</div><p class="sub">${t("Enter the NUMBER of the column ticked: 5 = strongly agree … 1 = strongly disagree. Check the numbers printed on the paper.", "輸入勾選欄位的「數字」：5＝非常同意……1＝非常不同意。請對照紙本上印的數字。")}</p>`;
      if ((i - scaleStart) % 10 === 0) html += `<div class="scale head"><span></span>${["1", "2", "3", "4", "5"].map((n) => `<span>${n}</span>`).join("")}<span>${t("Not answered", "未填寫")}</span></div>`;
      html += `<div class="scale" data-k="${f.k}"><b>${f.k}</b>${f.o.map((o) => `<label title="${esc(o)}"><input type="radio" name="${f.k}" value="${esc(o)}" ${draft[f.k] === o ? "checked" : ""}></label>`).join("")}</div>`;
      return;
    }
    if (c.fixed && f.k in c.fixed) {
      html += `<div class="f" data-k="${esc(f.k)}"><span class="q">${esc(f.l)}</span><div class="h">${t("From the on-site record. Not entered again.", "沿用當場紀錄，不必再輸入。")}</div><div class="opt" style="cursor:default"><b>${esc(c.fixed[f.k])}</b></div></div>`;
      return;
    }
    const help = (ZH() && HELP_ZH[f.k]) || f.h;
    html += `<div class="f" data-k="${esc(f.k)}"><span class="q">${esc(f.l)}${f.opt ? ` <span class="faint">${t("(optional)", "（選填）")}</span>` : ""}</span>${help ? `<div class="h">${esc(help)}</div>` : ""}`;
    if (f.t === "mc") html += radios(f.k, f.o, draft[f.k], f.other);
    else if (f.t === "cb") html += checks(f.k, f.o, draft[f.k] || [], f.other);
    else if (f.t === "date") html += `<input type="date" name="${f.k}" value="${esc(draft[f.k] || c.date || "")}">`;
    else html += `<textarea name="${f.k}" maxlength="3000">${esc(draft[f.k] || "")}</textarea>`;
    if (f.k === "validity") html += `<div id="vsug"></div>`;
    html += `</div>`;
  });
  html += `<div class="formbar"><button class="btn pri" id="esave">${t(`Save entry ${c.round}`, `儲存第 ${c.round} 次登錄`)}</button><button type="button" class="btn" id="ecancel">${t("Cancel", "取消")}</button><span class="sub" id="emsg"></span></div></form>`;
  box.innerHTML = html;
  const form = $("#ef");

  const collect = () => {
    const a = {};
    fields.forEach((f) => {
      if (c.fixed && f.k in c.fixed) a[f.k] = c.fixed[f.k];
      else if (f.t === "cb") a[f.k] = getChecks(form, f.k);
      else if (f.t === "mc" || f.t === "scale") a[f.k] = getRadio(form, f.k);
      else a[f.k] = (form.elements[f.k]?.value || "").trim();
    });
    return a;
  };
  const scaleVals = (a) => Array.from({ length: 34 }, (_, i) => a["Q" + (15 + i)] || "");
  const suggest = () => {
    const a = collect(), r = validity(scaleVals(a));
    const why = [r.a && t("(a) 4 or more blanks in Q15–Q48", "(a) Q15–Q48 有 4 題以上空白"), r.b && t("(b) Q23, Q34 and Q45 all blank", "(b) Q23、Q34、Q45 皆空白"), r.c && t("(c) 12 or more identical non-3 answers in a row", "(c) 連續 12 題以上相同且不是 3 的答案")].filter(Boolean);
    $("#vsug").innerHTML = r.unanswered ? `<p class="note info">${t(`Suggestion appears when all of Q15–Q48 are entered (${r.unanswered} left).`, `Q15–Q48 全部輸入後會顯示建議（還剩 ${r.unanswered} 題）。`)}</p>`
      : why.length ? `<p class="note warn">${t("By the study rules this questionnaire looks <b>invalid</b>: ", "依研究規則，這份問卷看起來<b>無效</b>：")}${why.join(t("; ", "；"))}${t(". Check the paper, then choose the matching option.", "。請核對紙本後選擇相符的選項。")}</p>`
      : `<p class="note ok">${t("By the study rules this questionnaire looks <b>valid</b>.", "依研究規則，這份問卷看起來<b>有效</b>。")}</p>`;
    store.set(key, JSON.stringify(a));
  };
  form.addEventListener("change", suggest);
  form.addEventListener("input", (e) => { if (e.target.matches("textarea,input[type=text]")) store.set(key, JSON.stringify(collect())); });
  // "Not answered" is exclusive in multiple-answer items
  form.addEventListener("change", (e) => {
    const x = e.target;
    if (x.type !== "checkbox" || !x.checked) return;
    const group = $$(`input[name="${CSS.escape(x.name)}"]`, form);
    if (x.value === NA) group.forEach((y) => { if (y !== x) y.checked = false; });
    else group.forEach((y) => { if (y.value === NA) y.checked = false; });
  });
  suggest();
  $("#ecancel").onclick = () => { store.set("entry-serial", null); render(); };
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const a = collect();
    const missing = fields.filter((f) => !f.opt && (f.t === "cb" ? !a[f.k].length : !a[f.k])).map((f) => f.k);
    $$(".scale", form).forEach((el) => el.classList.toggle("miss", missing.includes(el.dataset.k)));
    if (missing.length) {
      toast(`${t("Not answered yet: ", "還沒填：")}${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`, 4500);
      const el = $(`[data-k="${CSS.escape(missing[0])}"]`, form); el && el.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const r = validity(scaleVals(a)), vchoice = a.validity;
    const expect = r.a || r.b || r.c ? "Invalid" : "Valid";
    if (!vchoice.startsWith(expect) && !vchoice.startsWith("Unsure") && $("#emsg").dataset.warned !== "1") {
      $("#emsg").dataset.warned = "1";
      $("#emsg").innerHTML = `<span class="bad">${t("Your validity choice differs from the rule check. Check again, then press Save once more to keep your choice.", "你選的有效性和規則檢查結果不同。請再核對一次，確定要保留你的選擇就再按一次儲存。")}</span>`;
      return;
    }
    const b = $("#esave");
    busy(b, true);
    try {
      const j = await api("entry.add", { serial: c.serial, answers: a });
      store.set(key, null); store.set("entry-serial", null);
      toast(j.round === 2 ? (j.differences ? t(`Saved. ${j.differences} difference(s) found; the collector will check them.`, `已儲存。發現 ${j.differences} 個差異，收案者會核對。`) : t("Saved. Both entries agree.", "已儲存。兩次登錄一致。")) : t(`Saved entry 1 for ${j.saved}.`, `已儲存 ${j.saved} 第 1 次登錄。`), 4500);
      await refresh();
    } catch (e) { busy(b, false); toast(e.message, 5000); }
  };
}

// differences between entry 1 and entry 2: the collector checks the paper and records the correct value
async function viewCheck(v) {
  const sc = await schema(), list = S.my.mismatches;
  const byLabel = Object.fromEntries(sc.entry.map((f) => [f.l, f]));
  v.innerHTML = `<h1>${t("Check entry differences", "核對登錄差異")}</h1>
    <p class="lead">${t("The two entries differ for these items. Look at the <b>original paper questionnaire</b> and choose what is written there. Do not answer from memory.", "這些題目兩次登錄不一致。請看<b>紙本問卷原件</b>，選擇紙本上寫的答案，不要憑記憶回答。")}</p>
    <p><a href="#entry">${t("← Data Entry", "← 登錄問卷")}</a></p>
    ${list.length ? list.map((m) => {
      const f = byLabel[m.field] || { t: "para" };
      let input;
      if (f.t === "mc" || f.t === "scale") input = `<select data-row="${m.row}"><option value="">${t("Choose what the paper shows…", "選擇紙本上的答案…")}</option>${f.o.map((o) => `<option ${m.correct === o ? "selected" : ""}>${esc(o)}</option>`).join("")}${f.other ? `<option value="__other">${t("Other (type below)", "其他（在下方輸入）")}</option>` : ""}</select>${f.other ? `<input type="text" data-oth="${m.row}" placeholder="${t("Other: text as written", "其他：照原文輸入")}" style="margin-top:6px">` : ""}`;
      else if (f.t === "cb") input = `<div data-cbrow="${m.row}">${checks("cb" + m.row, f.o, (m.correct || "").split("; ").filter(Boolean), f.other)}</div>`;
      else if (f.t === "date") input = `<input type="date" data-row="${m.row}" value="${esc(m.correct)}">`;
      else input = `<textarea data-row="${m.row}">${esc(m.correct)}</textarea>`;
      return `<div class="mm card"><div><b class="mono">${esc(m.serial)}</b> · ${esc(m.field)} ${m.correct ? `<span class="tag ok">${t(`checked by ${esc(m.by)}`, `${esc(m.by)} 已核對`)}</span>` : `<span class="tag warn">${t("to check", "待核對")}</span>`}</div>
        <div class="vals"><span class="faint">${t("Entry 1", "第 1 次")}</span><span>${esc(m.e1) || `<span class="faint">${t("(empty)", "（空白）")}</span>`}</span><span class="faint">${t("Entry 2", "第 2 次")}</span><span>${esc(m.e2) || `<span class="faint">${t("(empty)", "（空白）")}</span>`}</span></div>
        ${input}<div class="btns"><button class="btn pri sm" data-save="${m.row}" data-t="${f.t}">${t("Save", "儲存")}</button></div></div>`;
    }).join("") : `<p class="empty">${t("Nothing to check.", "沒有要核對的項目。")}</p>`}`;
  $$("[data-save]", v).forEach((b) => (b.onclick = async () => {
    const row = b.dataset.save, ft = b.dataset.t, card = b.closest(".mm");
    let value;
    if (ft === "cb") value = getChecks(card, "cb" + row);
    else {
      value = $(`[data-row="${row}"]`, card).value;
      if (value === "__other") { const o = $(`[data-oth="${row}"]`, card).value.trim(); value = o ? "Other: " + o : ""; }
    }
    if (!value || (Array.isArray(value) && !value.length)) return toast(t("Choose the value written on the paper.", "請選擇紙本上寫的答案。"));
    busy(b, true);
    try { await api("mismatch.fix", { row, value }); toast(t("Saved", "已儲存")); S = await api("state"); viewCheck(v); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  }));
}

// ------------------------------------------------------------------ manual
async function viewManual(v) {
  v.innerHTML = `<p class="sub">${t("Loading the manual…", "手冊載入中…")}</p>`;
  try { MANUAL = MANUAL || (await api("manual")).html; } catch (e) { v.innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
  v.innerHTML = `${ZH() ? `<p class="note info">研究助理手冊目前只有英文版。</p>` : ""}<div class="manual"><nav class="toc card" id="toc"></nav><article class="doc" id="doc">${MANUAL}</article></div>`;
  const toc = $("#toc");
  toc.innerHTML = `<b style="display:block;margin-bottom:6px">${t("Contents", "目錄")}</b>` + $$("#doc h2").map((h, i) => {
    h.id = h.id || "m" + i;
    return `<a href="#manual" data-to="${esc(h.id)}">${esc(h.textContent)}</a>`;
  }).join("");
  $$("a[data-to]", toc).forEach((a) => (a.onclick = (e) => { e.preventDefault(); document.getElementById(a.dataset.to).scrollIntoView({ behavior: "smooth" }); }));
  $$("#doc a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
}

// ------------------------------------------------------------------ posters
// IRB-approved recruitment posters (static files in posters/), shown on site when someone asks
// [code, button label, file base]; Chinese shows the IRB approval letter (the Chinese poster has expired)
const POSTERS = [["zh", "中文 · IRB 核准函", "irb-zh"], ["id", "Bahasa Indonesia", "poster-id"], ["vi", "Tiếng Việt", "poster-vi"]];
function viewPosters(v) {
  const def = S.me.team === "Indonesian" ? "id" : "vi";
  let cur = store.get("poster", true) || def;
  if (!POSTERS.some(([k]) => k === cur)) cur = def;
  v.innerHTML = `<h1>${t("Recruitment Posters", "招募海報")}</h1>
    <p class="lead">${t("Approved by the Shin Kong Hospital Institutional Review Board (IRB). Show this to anyone who asks about the study. Choose the language below; “中文” shows the IRB approval letter.", "已經新光醫院人體研究倫理委員會（IRB）核准。現場有人詢問或質疑時，可以出示這張海報。請在下方選擇語言；「中文」是 IRB 核准公文。")}</p>
    <nav class="tabs plang" aria-label="${t("Poster language", "海報語言")}">${POSTERS.map(([k, n]) => `<a href="#posters" data-pl="${k}" lang="${k === "zh" ? "zh-Hant" : k}">${n}</a>`).join("")}</nav>
    <div class="btns"><a class="btn sm" id="ppdf" target="_blank" rel="noopener">${t("Open PDF", "開啟 PDF")}</a></div>
    <a id="pfull" target="_blank" rel="noopener"><img id="pimg" class="poster" alt=""></a>`;
  const show = (k) => {
    cur = k; store.set("poster", k, true);
    $$("[data-pl]", v).forEach((a) => a.classList.toggle("on", a.dataset.pl === k));
    const [, n, f] = POSTERS.find(([x]) => x === k);
    $("#pimg").src = `posters/${f}.jpg`;
    $("#pimg").alt = (k === "zh" ? t("IRB approval letter", "IRB 核准函") : t("Recruitment poster", "招募海報")) + " (" + n + ")";
    $("#pfull").href = `posters/${f}.jpg`;
    $("#ppdf").href = `posters/${f}.pdf`;
  };
  $$("[data-pl]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); show(a.dataset.pl); }));
  show(cur);
}

// ------------------------------------------------------------------ slides
async function viewSlides(v) {
  v.innerHTML = `<p class="sub">${t("Loading the slides…", "簡報載入中…")}</p>`;
  try { SLIDES = SLIDES || (await api("slides")).html; } catch (e) { v.innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
  v.innerHTML = `<h1>${t("Meeting Slides", "會議簡報")}</h1>
    <p class="lead">${t("RA meeting, 12 October 2026, based on the Field Manual. Click the slide, then use ← → to change slides (on a phone, use the ‹ › buttons). Press N for speaker notes.", "2026 年 10 月 12 日研究助理會議簡報（依研究助理手冊製作，英文）。點一下投影片後用 ← → 換頁（手機用 ‹ › 按鈕），按 N 顯示講者備註。")}</p>
    <div class="btns"><button class="btn sm" id="snew">${t("Open in a new tab", "在新分頁開啟")}</button></div>
    <div class="deck"><iframe id="deckf" title="Meeting slides" allow="fullscreen"></iframe></div>`;
  $("#deckf").srcdoc = SLIDES;
  $("#snew").onclick = () => window.open(URL.createObjectURL(new Blob([SLIDES], { type: "text/html" })), "_blank");
}

// ------------------------------------------------------------------ admin
function viewAdmin(v) {
  if (!isAdmin()) { location.hash = "home"; return; }
  const A = S.admin;
  v.innerHTML = `<h1>Admin</h1>
    <p class="lead">Only the PI and 子芸 see this page. Data sheet: <a href="${esc(A.sheetUrl)}" target="_blank" rel="noopener">PI-only spreadsheet</a></p>
    <div class="grid">
    <section class="card"><h2>People and invite links</h2>
      <p class="sub" style="margin-bottom:8px">"View as" shows a research assistant's pages as they see them (view only). Each link works once: the first Google account that signs in with it is linked to that person. Reset makes a new link and signs the person out.</p>
      <div class="tw"><table><thead><tr><th>Name</th><th>Role</th><th>Linked account</th><th>Invite link</th><th></th></tr></thead><tbody>
      ${A.users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${u.email ? `${esc(u.email)}<div class="faint" style="font-size:12px">${esc(u.boundAt)}</div>` : '<span class="faint">not yet</span>'}</td>
        <td>${u.email ? "" : `<button class="btn sm" data-copy="${esc(u.invite)}">Copy link</button>`}</td>
        <td style="white-space:nowrap">${u.role === "RA" ? `<button class="btn sm" data-viewas="${esc(u.name)}">View as</button> ` : ""}<button class="btn sm danger" data-reset="${esc(u.name)}">Reset</button></td></tr>`).join("")}
      </tbody></table></div></section>

    <section class="card"><h2>Entry differences</h2>
      ${S.my.mismatches.length ? `<div class="tw"><table><thead><tr><th></th><th>Serial</th><th>Item</th><th>Entry 1</th><th>Entry 2</th><th>Correct value</th></tr></thead><tbody>
      ${S.my.mismatches.map((m) => `<tr><td>${m.correct ? `<input type="checkbox" data-mm="${m.row}">` : ""}</td><td class="mono">${esc(m.serial)}</td><td>${esc(m.field)}</td><td>${esc(m.e1)}</td><td>${esc(m.e2)}</td><td>${m.correct ? `${esc(m.correct)}<div class="faint" style="font-size:12px">${esc(m.by)}</div>` : '<span class="tag warn">collector to check</span>'}</td></tr>`).join("")}
      </tbody></table></div><div class="btns"><button class="btn pri sm" id="mconf">Confirm ticked</button><a class="btn sm" href="#entry/check">Check items myself</a></div>` : `<p class="empty">No open differences.</p>`}
    </section>

    <section class="card"><h2>Questionnaires returned to the PI office</h2>
      ${A.readyToReturn.length ? `<p class="sub">Entered twice, not yet marked as returned. Tick the ones you received.</p>
      <div class="opts" style="margin-top:8px">${A.readyToReturn.map((r) => `<label class="opt"><input type="checkbox" data-ret="${esc(r.serial)}"><span><span class="mono">${esc(r.serial)}</span> · ${esc(r.collector)}${r.open ? ' <span class="tag warn">differences open</span>' : ""}</span></label>`).join("")}</div>
      <div class="btns"><button class="btn pri sm" id="retgo">Mark as returned</button></div>` : `<p class="empty">Nothing waiting.</p>`}
      <p class="sub" style="margin-top:8px">Returned so far: ${A.returned.length}</p>
    </section>

    <section class="card"><h2>Work hours by month</h2>
      ${A.work.length ? `<div class="tw"><table><thead><tr><th>Month</th><th>Name</th><th class="num">Days</th><th class="num">Hours</th></tr></thead><tbody>
      ${A.work.map((x) => `<tr><td class="mono">${esc(x.month)}</td><td>${esc(x.name)}</td><td class="num">${x.days}</td><td class="num">${x.hours.toFixed(2)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">No work hours logged yet.</p>`}
      <p class="sub" style="margin-top:8px">Details: download "Work log" below.</p>
    </section>

    <section class="card"><h2>Download (CSV)</h2>
      <div class="btns">${[["final", "Final dataset (agreed entries)"], ["entries", "All entries"], ["mismatches", "Differences"], ["onsite", "On-site records"], ["refusals", "Refusals"], ["returned", "Returned"], ["worklog", "Work log"]].map(([k, l]) => `<button class="btn sm" data-exp="${k}">${l}</button>`).join("")}</div>
      <p class="sub" style="margin-top:8px">Final dataset: one row per questionnaire entered twice; status "pending" until every difference is checked and confirmed.</p>
    </section></div>`;
  $$("[data-viewas]", v).forEach((b) => (b.onclick = () => { store.set("viewAs", b.dataset.viewas, true); location.hash = "home"; load(); }));
  $$("[data-copy]", v).forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast("Link copied"); } catch { toast(b.dataset.copy, 8000); } }));
  $$("[data-reset]", v).forEach((b) => (b.onclick = async () => {
    if (!confirmInline("reset-" + b.dataset.reset)) return;
    busy(b, true, "…");
    try { await api("admin.reset", { name: b.dataset.reset }); toast("Reset. Copy the new link."); await refresh(); } catch (e) { busy(b, false); toast(e.message); }
  }));
  const mc = $("#mconf");
  if (mc) mc.onclick = async () => {
    const rows = $$("[data-mm]:checked", v).map((x) => x.dataset.mm);
    if (!rows.length) return toast("Tick the items to confirm.");
    busy(mc, true);
    try { const j = await api("admin.confirm", { rows }); toast(`Confirmed ${j.confirmed}`); await refresh(); } catch (e) { busy(mc, false); toast(e.message); }
  };
  const rg = $("#retgo");
  if (rg) rg.onclick = async () => {
    const serials = $$("[data-ret]:checked", v).map((x) => x.dataset.ret);
    if (!serials.length) return toast("Tick the questionnaires you received.");
    busy(rg, true);
    try { const j = await api("admin.returned", { serials }); toast(`Marked ${j.marked}`); await refresh(); } catch (e) { busy(rg, false); toast(e.message); }
  };
  $$("[data-exp]", v).forEach((b) => (b.onclick = async () => {
    busy(b, true, "…");
    try {
      const { rows } = await api("admin.export", { table: b.dataset.exp });
      const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `epi-foreign-${b.dataset.exp}-${S.today}.csv`; a.click();
    } catch (e) { toast(e.message); }
    busy(b, false);
  }));
}

load();
