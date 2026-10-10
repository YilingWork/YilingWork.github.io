// e-PI RA Portal — front end (no framework). All data come from the Apps Script API after Google sign-in.
// User text is always passed through esc() or textContent.
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

// invite link ?invite=<code>: keep it for the sign-in call, then clean the address bar
{ const q = new URLSearchParams(location.search);
  if (q.has("invite")) { store.set("invite", q.get("invite"), true); history.replaceState(null, "", location.pathname + location.hash); } }

let S = null, SCHEMA = null, MANUAL = null;

async function api(action, data = {}) {
  let r;
  try {
    r = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action, session: store.get("session"), ...data }) });
  } catch { throw Object.assign(new Error("No connection. Check your internet and try again."), { code: 0 }); }
  const j = await r.json().catch(() => ({ ok: false, error: "Unexpected server reply." }));
  if (!j.ok) throw Object.assign(new Error(j.error || "Error"), { code: j.code });
  return j;
}
function toast(msg, ms = 2600) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Saving…"; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

async function load() {
  try {
    if (!store.get("session")) return renderLogin();
    S = await api("state");
    render();
  } catch (e) {
    if (e.code === 401) { store.set("session", null); return renderLogin(e.message === "Please sign in." ? "" : e.message); }
    $("#app").innerHTML = `<main><p class="bad">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></main>`;
  }
}
async function refresh() { try { S = await api("state"); render(); } catch (e) { toast(e.message); } }

// ------------------------------------------------------------------ sign-in
async function renderLogin(msg = "") {
  const inv = store.get("invite", true);
  $("#app").innerHTML = `<main class="login">
    <div class="lbl">e-PI study · Indonesian &amp; Vietnamese teams</div>
    <h1>RA Portal</h1>
    <p class="sub">${inv ? "Welcome! Sign in with the Google account you want to use for this study. After this first time, always sign in with the same account." : "Sign in with the Google account linked to your name. The first time, use the personal invite link from the PI."}</p>
    ${msg ? `<p class="note err">${esc(msg)}</p>` : ""}
    ${IN_APP ? `<div class="note warn"><b>Please open this page in Chrome or Safari.</b> Google sign-in does not work inside chat apps. Copy the link and paste it into Chrome or Safari.<div class="btns"><button class="btn sm" id="cplink">Copy link</button></div></div>` : ""}
    <div id="gbtn" style="margin:22px 0 10px;min-height:44px"></div>
    <p class="sub faint">Only research team members can sign in. The portal shows no study data before sign-in.</p>
  </main>`;
  const cp = $("#cplink");
  if (cp) cp.onclick = async () => {
    const u = location.origin + location.pathname + (inv ? "?invite=" + encodeURIComponent(inv) : "");
    try { await navigator.clipboard.writeText(u); toast("Link copied"); } catch { toast(u, 10000); }
  };
  await new Promise((ok, no) => {
    if (window.google?.accounts?.id) return ok();
    const sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client"; sc.async = true; sc.onload = ok; sc.onerror = () => no();
    document.head.appendChild(sc);
  }).catch(() => { $("#gbtn").innerHTML = `<p class="bad">Google sign-in could not load. Check your connection and reload.</p>`; });
  if (!window.google?.accounts?.id) return;
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: async (r) => {
      $("#gbtn").innerHTML = `<p class="sub">Signing in…</p>`;
      try {
        const j = await api("signin", { credential: r.credential, invite: store.get("invite", true) });
        store.set("session", j.session); store.set("invite", null, true);
        load();
      } catch (e) { renderLogin(e.message); }
    },
  });
  google.accounts.id.renderButton($("#gbtn"), { theme: "outline", size: "large", text: "signin_with", shape: "pill", locale: "en" });
}
async function signOut() {
  try { await api("signout"); } catch {}
  store.set("session", null); S = null;
  try { google.accounts.id.disableAutoSelect(); } catch {}
  renderLogin();
}

// ------------------------------------------------------------------ shell
const ROUTES = [["home", "Home"], ["refusal", "Refusal Log"], ["onsite", "On-site Record"], ["entry", "Data Entry"], ["manual", "Manual"]];
const isAdmin = () => S?.me?.role === "Admin";
function render() {
  const route = (location.hash.slice(1) || "home").split("/")[0];
  const tabs = ROUTES.concat(isAdmin() ? [["admin", "Admin"]] : []);
  $("#app").innerHTML = `
    <header class="top"><div class="topin">
      <div class="brand"><b>e-PI RA Portal</b><span>Shin Kong Hospital · B1 outpatient pharmacy</span></div>
      <nav class="tabs">${tabs.map(([k, v]) => `<a href="#${k}" class="${k === route ? "on" : ""}">${v}</a>`).join("")}</nav>
      <div class="who"><span>${esc(S.me.short || S.me.name)}</span><button class="btn sm" id="out">Sign out</button></div>
    </div></header>
    <main id="view"></main>`;
  $("#out").onclick = signOut;
  const view = { home: viewHome, refusal: viewRefusal, onsite: viewOnsite, entry: viewEntry, manual: viewManual, admin: viewAdmin }[route] || viewHome;
  view($("#view"));
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { if (S) render(); });

// ------------------------------------------------------------------ home
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
function viewHome(v) {
  const m = S.my, me = S.me;
  const todo = [];
  if (m.mismatches.length) todo.push(`<li><a href="#entry/check">${m.mismatches.length} entry difference${m.mismatches.length > 1 ? "s" : ""} to check against the paper questionnaire</a></li>`);
  if (m.toReturn.length) todo.push(`<li>Ready to return to the PI office (F1046): <span class="mono">${m.toReturn.map(esc).join(", ")}</span></li>`);
  const coverNo = m.todayOnsite.filter((r) => r.cover !== "Yes");
  if (coverNo.length) todo.push(`<li>Cover marks not done today: <span class="mono">${coverNo.map((r) => esc(r.serial)).join(", ")}</span>. Complete them before you leave.</li>`);
  const myQueue = S.queue.filter((q) => !q.mine).length;
  if (myQueue) todo.push(`<li><a href="#entry">${myQueue} questionnaire${myQueue > 1 ? "s" : ""} waiting for data entry</a></li>`);

  v.innerHTML = `
    <h1>Hello, ${esc(me.short || me.name)}</h1>
    <p class="lead">${esc(S.today)}${me.team ? ` · ${esc(me.team)} team` : ""}</p>
    <div class="grid two">
      ${me.q ? `<section class="card"><h2>My next serial numbers</h2>
        <div class="serials">
          <div class="serial"><div class="t">Questionnaire (cover mark C4)</div><div class="n">${m.nextQ ?? "—"}</div><div class="t">Range ${me.q[0]}–${me.q[1]}</div></div>
          <div class="serial"><div class="t">Refusal</div><div class="n">${m.nextR ?? "—"}</div><div class="t">Range ${me.r[0]}–${me.r[1]}</div></div>
        </div>
        ${m.nextQ == null || m.nextR == null ? `<p class="note warn">A range is used up. Ask the PI for a new range.</p>` : ""}
        <div class="btns"><a class="btn pri" href="#onsite">+ On-site record</a><a class="btn" href="#refusal">+ Refusal</a></div>
        <p class="sub" style="margin-top:10px">Today: ${m.todayOnsite.length} questionnaire${m.todayOnsite.length === 1 ? "" : "s"}, ${m.todayRefusals.length} refusal${m.todayRefusals.length === 1 ? "" : "s"}.</p>
      </section>` : ""}
      <section class="card"><h2>To do</h2>${todo.length ? `<ul class="todo">${todo.join("")}</ul>` : `<p class="empty">Nothing waiting. Thank you!</p>`}</section>

      <section class="card span2"><h2>Collection progress</h2>
        <div class="teams">${S.teams.map((t) => {
          const rr = t.done + t.refusals ? Math.round((t.done / (t.done + t.refusals)) * 100) : null;
          return `<div class="team ${t.team === "Vietnamese" ? "vi" : "id"}">
            <div class="lbl">${esc(t.team)}</div>
            <div class="big">${t.done} <small>/ ${t.target} questionnaires</small></div>
            <div class="bar"><i style="width:${pct(t.done, t.target)}%"></i></div>
            <div class="kv"><span>Today <b>${t.today}</b></span><span>Refusals <b>${t.refusals}</b></span><span>Response rate <b>${rr == null ? "—" : rr + "%"}</b></span><span>Late responders <b>${t.late}</b></span></div>
          </div>`;
        }).join("")}</div>
        <h3>By research assistant</h3>
        <div class="tw"><table><thead><tr><th>RA</th><th>Team</th><th class="num">Today</th><th class="num">Questionnaires</th><th class="num">Refusals</th></tr></thead><tbody>
        ${S.people.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.team)}</td><td class="num">${p.today}</td><td class="num">${p.done}</td><td class="num">${p.refusals}</td></tr>`).join("")}
        </tbody></table></div>
      </section>

      <section class="card span2"><h2>Shift schedule</h2>${schedHtml()}</section>

      <section class="card"><h2>Data entry progress</h2>
        <div class="kv" style="font-size:15px;gap:6px 18px">
          <span>Not entered <b>${S.entry.none}</b></span><span>Entered once <b>${S.entry.one}</b></span><span>Entered twice <b>${S.entry.two}</b></span>
          <span>Differences to check <b>${S.entry.openMismatches}</b></span><span>Returned to PI office <b>${S.entry.returned}</b></span>
        </div>
      </section>

      <section class="card"><h2>${isAdmin() ? "Daily summary (all RAs)" : "My daily summary"}</h2>
        <p class="sub" style="margin-bottom:8px">Made automatically from your on-site records and refusals. No separate daily report is needed.</p>
        ${S.daily.length ? `<div class="tw"><table><thead><tr><th>Date</th>${isAdmin() ? "<th>RA</th>" : ""}<th>Questionnaires</th><th>Refusals</th><th>Cover marks missing</th></tr></thead><tbody>
        ${S.daily.map((d) => `<tr><td class="mono">${esc(d.date)}</td>${isAdmin() ? `<td>${esc(d.collector)}</td>` : ""}<td>${d.q} <span class="faint mono">${esc(d.qSpan)}</span></td><td>${d.r} <span class="faint mono">${esc(d.rSpan)}</span></td><td class="${d.coverNo ? "bad" : ""}">${d.coverNo}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty">No records yet.</p>`}
      </section>
    </div>`;
}
function schedHtml() {
  const s = S.schedule;
  if (!s) return `<p class="empty">The schedule is not available.</p>`;
  const key = (S.me.short || "").toLowerCase();
  const mine = (c) => key && S.me.role === "RA" && c.toLowerCase().split(/\n/).some((l) => l.includes(key));
  return `${s.title ? `<p class="sub" style="margin-bottom:6px"><b>${esc(s.title)}</b></p>` : ""}
    <div class="tw"><table class="sched"><thead><tr>${s.grid[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
    ${s.grid.slice(1).map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th>${esc(c)}</th>` : `<td class="${mine(c) ? "me" : ""}">${esc(c)}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>
    ${S.me.role === "RA" ? `<p class="sub" style="margin-top:6px">Your shifts are highlighted.</p>` : ""}
    ${s.notes.concat(s.after).filter((n) => !/^https?:|RA portal/.test(n)).map((n) => `<p class="sub">${esc(n)}</p>`).join("")}`;
}

// ------------------------------------------------------------------ shared form bits
async function schema() { return SCHEMA || (SCHEMA = await api("schema")); }
function radios(name, opts, val, other) {
  return `<div class="opts">${opts.map((o) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o)}" ${val === o ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}
    ${other ? `<label class="opt"><input type="radio" name="${name}" value="__other" ${val && val.startsWith("Other: ") ? "checked" : ""}><span style="flex:1">Other: <input type="text" data-other="${name}" value="${val && val.startsWith("Other: ") ? esc(val.slice(7)) : ""}" style="margin-top:4px"></span></label>` : ""}</div>`;
}
function checks(name, opts, vals = [], other) {
  const oth = vals.find((v) => v.startsWith("Other: "));
  return `<div class="opts">${opts.map((o) => `<label class="opt"><input type="checkbox" name="${name}" value="${esc(o)}" ${vals.includes(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}
    ${other ? `<label class="opt"><input type="checkbox" name="${name}" value="__other" ${oth ? "checked" : ""}><span style="flex:1">Other: <input type="text" data-other="${name}" value="${oth ? esc(oth.slice(7)) : ""}" style="margin-top:4px"></span></label>` : ""}</div>`;
}
function getRadio(form, name) {
  const el = $(`input[name="${CSS.escape(name)}"]:checked`, form);
  if (!el) return "";
  if (el.value === "__other") { const t = $(`[data-other="${CSS.escape(name)}"]`, form).value.trim(); return t ? "Other: " + t : ""; }
  return el.value;
}
function getChecks(form, name) {
  return $$(`input[name="${CSS.escape(name)}"]:checked`, form).map((el) => {
    if (el.value !== "__other") return el.value;
    const t = $(`[data-other="${CSS.escape(name)}"]`, form).value.trim(); return t ? "Other: " + t : "";
  }).filter(Boolean);
}
async function delRecord(kind, serial) {
  if (!confirmInline(`del-${kind}-${serial}`)) return;
  try { await api("record.delete", { kind, serial }); toast(`Deleted ${serial}`); await refresh(); }
  catch (e) { toast(e.message, 4000); }
}
// two-tap confirmation without browser dialogs
const armed = {};
function confirmInline(k) {
  if (armed[k]) { delete armed[k]; return true; }
  armed[k] = 1; toast("Tap Delete again to confirm."); setTimeout(() => delete armed[k], 4000); return false;
}

// ------------------------------------------------------------------ refusal log
async function viewRefusal(v) {
  const me = S.me, sc = await schema(), o = sc.refusal;
  if (!me.r) { v.innerHTML = `<h1>Refusal Log</h1><p class="note info">You do not have a refusal serial range. This page is for research assistants.</p>`; return; }
  v.innerHTML = `
    <h1>Refusal Log</h1>
    <p class="lead">Record each person who declines, immediately. Do not log people who were not eligible (under 18, emergency visit, prefers the Chinese version).</p>
    <form class="card" id="rf">
      <div class="f"><label class="q" for="rs">Serial number</label><div class="h">Your next refusal number is filled in. Range ${me.r[0]}–${me.r[1]}.</div>
        <input class="serialin" id="rs" type="text" inputmode="numeric" maxlength="4" value="${S.my.nextR ?? ""}"></div>
      <div class="f"><span class="q">Gender (your observation)</span>${radios("gender", o.gender)}</div>
      <div class="f"><span class="q">Estimated age group (do not ask)</span>${radios("age", o.age)}</div>
      <div class="f"><span class="q">Main reason for declining</span>${radios("reason", o.reason, "", true)}</div>
      <div class="f"><span class="q">Quick question</span>
        <div class="note info">"That's fine, thank you! Just one last question: the government has a new way to look up medicine information. Would you like to learn more about it?" (say it in your language, item B1)</div>
        ${radios("quick", o.quick)}<div class="h" style="margin-top:6px">"Not interested" is an answer to the quick question, not a reason for declining.</div></div>
      <div class="formbar"><button class="btn pri" id="rsave">Save refusal</button><span class="sub" id="rmsg"></span></div>
    </form>
    ${todayList("Today's refusals", S.my.todayRefusals, (r) => `${esc(r.reason)} · ${esc(r.quick)}`, "refusal")}`;
  $("#rf").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = $("#rf"), b = $("#rsave");
    const body = { serial: $("#rs").value.trim(), gender: getRadio(f, "gender"), age: getRadio(f, "age"), reason: getRadio(f, "reason"), quick: getRadio(f, "quick") };
    const miss = [["gender", "Gender"], ["age", "Age group"], ["reason", "Main reason"], ["quick", "Quick question"]].filter(([k]) => !body[k]).map(([, l]) => l);
    if (miss.length) return toast("Please answer: " + miss.join(", "));
    busy(b, true);
    try { const j = await api("refusal.add", body); toast(`Saved refusal ${j.saved}`); await refresh(); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  };
}
function todayList(title, rows, desc, kind) {
  return `<section class="card" style="margin-top:16px"><h2>${title}</h2>${rows.length ? `<div class="tw"><table><tbody>
    ${rows.map((r) => `<tr><td class="mono">${esc(r.serial)}</td><td class="mono faint">${esc(r.time)}</td><td>${desc(r)}</td>
    <td style="text-align:right">${r.deletable === false ? "" : `<button class="btn sm danger" onclick="delRecord('${kind}','${esc(r.serial)}')">Delete</button>`}</td></tr>`).join("")}
    </tbody></table></div><p class="sub" style="margin-top:6px">Made a mistake? Delete it and enter it again (today only).</p>` : `<p class="empty">None yet today.</p>`}</section>`;
}

// ------------------------------------------------------------------ on-site record
async function viewOnsite(v) {
  const me = S.me, sc = await schema(), o = sc.onsite;
  if (!me.q) { v.innerHTML = `<h1>On-site Record</h1><p class="note info">You do not have a questionnaire serial range. This page is for research assistants.</p>`; return; }
  v.innerHTML = `
    <h1>On-site Record</h1>
    <p class="lead">One record for each returned questionnaire, right after you give the gift and write the cover marks.</p>
    <form class="card" id="of">
      <div class="f"><label class="q" for="os">Serial number (C4, written on the cover)</label><div class="h">Your next number is filled in. Range ${me.q[0]}–${me.q[1]}. Language: ${esc(me.team)}.</div>
        <input class="serialin" id="os" type="text" inputmode="numeric" maxlength="4" value="${S.my.nextQ ?? ""}"></div>
      <div class="f"><span class="q">C1 Mode of completion</span>${radios("c1", o.c1)}</div>
      <div class="f"><span class="q">C2 Response timing</span><div class="h">Early = agreed readily. Late = agreed only after consideration (based on Step 2).</div>${radios("c2", o.c2)}</div>
      <div class="f"><span class="q">On-site check (Step 6): what did you find?</span><div class="h">Tick all that apply. All "3" answers are acceptable; do not challenge them.</div>${checks("chk", o.check)}</div>
      <div class="f"><span class="q">Follow-up</span>${radios("follow", o.follow)}</div>
      <div class="f"><label class="opt"><input type="checkbox" id="gift"><span><b>Gift given.</b> Every respondent who returns the questionnaire receives the gift, whether or not they made changes.</span></label></div>
      <div class="f"><span class="q">Cover marks C1–C4 written on the questionnaire?</span>${radios("cover", ["Yes", "No"], "Yes")}</div>
      <div class="f"><label class="q" for="onotes">Notes (optional)</label><div class="h">For example: respondent declined to complete Q30–Q33; assisted only for Part 3.</div><textarea id="onotes" maxlength="1000"></textarea></div>
      <div class="formbar"><button class="btn pri" id="osave">Save on-site record</button></div>
    </form>
    ${todayList("Today's questionnaires", S.my.todayOnsite, (r) => `${esc(short(r.c1))} · ${esc(r.c2.split(" (")[0])}${r.cover !== "Yes" ? ' · <span class="bad">cover marks missing</span>' : ""}`, "onsite")}`;
  const f = $("#of");
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
    const body = { serial: $("#os").value.trim(), c1: getRadio(f, "c1"), c2: getRadio(f, "c2"), checks: getChecks(f, "chk"), follow: getRadio(f, "follow"),
      gift: $("#gift").checked, cover: getRadio(f, "cover"), notes: $("#onotes").value };
    const miss = [["c1", "C1"], ["c2", "C2"], ["follow", "Follow-up"], ["cover", "Cover marks"]].filter(([k]) => !body[k]).map(([, l]) => l);
    if (!body.checks.length) miss.push("On-site check");
    if (miss.length) return toast("Please answer: " + miss.join(", "));
    if (!body.gift) return toast("Please give the gift and tick \"Gift given\".");
    busy(b, true);
    try { const j = await api("onsite.add", body); toast(`Saved questionnaire ${j.saved}`); await refresh(); }
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

async function viewEntry(v) {
  const sub = location.hash.split("/")[1];
  if (sub === "check") return viewCheck(v);
  const draftSerial = store.get("entry-serial");
  const queue = S.queue;
  v.innerHTML = `
    <h1>Data Entry</h1>
    <p class="lead">Every paper questionnaire is entered twice, by two different people, independently. Enter exactly what is on the paper.</p>
    ${S.my.mismatches.length ? `<p class="note warn"><a href="#entry/check">${S.my.mismatches.length} difference${S.my.mismatches.length > 1 ? "s" : ""} to check against the paper</a></p>` : ""}
    <section class="card" id="start"><h2>Start an entry</h2>
      <div class="f"><label class="q" for="es">Serial number on the cover</label><input class="serialin" id="es" type="text" inputmode="numeric" maxlength="4" value="${esc(draftSerial || "")}"></div>
      <button class="btn pri" id="ego">Start</button>
      ${draftSerial ? `<p class="sub" style="margin-top:8px">You have an unsaved draft for ${esc(draftSerial)}. Press Start to continue it.</p>` : ""}
    </section>
    <div id="eform"></div>
    <section class="card" style="margin-top:16px"><h2>Waiting for data entry</h2><p class="sub" style="margin-bottom:6px">Tap a serial number to start.</p>
      ${queue.length ? `<div class="tw"><table><thead><tr><th>Serial</th><th>Collector</th><th>Date</th><th>Entries</th></tr></thead><tbody>
      ${queue.map((q) => `<tr><td class="mono">${q.mine ? esc(q.serial) : `<a href="#entry/${esc(q.serial)}">${esc(q.serial)}</a>`}</td><td>${esc(q.collector)}</td><td class="mono" style="white-space:nowrap">${esc(q.date.slice(5))}</td><td>${q.entries}/2 ${q.mine ? '<span class="tag">you entered</span>' : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">Nothing waiting.</p>`}
    </section>
    <section class="card" style="margin-top:16px"><h2>My entries</h2>
      ${S.my.entries.length ? `<div class="tw"><table><tbody>${S.my.entries.map((e) => `<tr><td class="mono">${esc(e.serial)}</td><td>Entry ${esc(e.round)}</td><td class="mono faint">${esc(e.at)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">None yet.</p>`}
    </section>`;
  $("#ego").onclick = async () => {
    const serial = $("#es").value.trim(), b = $("#ego");
    if (!/^\d{4}$/.test(serial)) return toast("Type the 4-digit serial number.");
    busy(b, true, "Checking…");
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
    <h2>Serial ${esc(c.serial)} · Entry ${c.round} of 2</h2>
    <div class="kv"><span>Collector <b>${esc(c.collector)}</b></span><span>Language <b>${esc(c.language)}</b></span><span>On-site record <b>${esc(c.date)}</b></span></div>
    <p class="note info">Blank item: choose "Not answered". Unclear mark (two boxes, between boxes, crossed out): choose "Not answered" and describe it in "Problems found".</p>`;
  fields.forEach((f, i) => {
    if (f.sec && f.k !== "Q15") html += `<div class="sec">${esc(f.sec)}</div>`;
    if (f.t === "scale") {
      if (i === scaleStart) html += `<div class="sec">${esc(f.sec)}</div><p class="sub">Enter the NUMBER of the column ticked: 5 = strongly agree … 1 = strongly disagree. Check the numbers printed on the paper.</p>`;
      if ((i - scaleStart) % 10 === 0) html += `<div class="scale head"><span></span>${["1", "2", "3", "4", "5"].map((n) => `<span>${n}</span>`).join("")}<span>Not answered</span></div>`;
      html += `<div class="scale" data-k="${f.k}"><b>${f.k}</b>${f.o.map((o) => `<label title="${esc(o)}"><input type="radio" name="${f.k}" value="${esc(o)}" ${draft[f.k] === o ? "checked" : ""}></label>`).join("")}</div>`;
      return;
    }
    html += `<div class="f" data-k="${esc(f.k)}"><span class="q">${esc(f.l)}${f.opt ? ' <span class="faint">(optional)</span>' : ""}</span>${f.h ? `<div class="h">${esc(f.h)}</div>` : ""}`;
    if (f.t === "mc") html += radios(f.k, f.o, draft[f.k], f.other);
    else if (f.t === "cb") html += checks(f.k, f.o, draft[f.k] || [], f.other);
    else if (f.t === "date") html += `<input type="date" name="${f.k}" value="${esc(draft[f.k] || "")}">`;
    else html += `<textarea name="${f.k}" maxlength="3000">${esc(draft[f.k] || "")}</textarea>`;
    if (f.k === "validity") html += `<div id="vsug"></div>`;
    html += `</div>`;
  });
  html += `<div class="formbar"><button class="btn pri" id="esave">Save entry ${c.round}</button><button type="button" class="btn" id="ecancel">Cancel</button><span class="sub" id="emsg"></span></div></form>`;
  box.innerHTML = html;
  const form = $("#ef");

  const collect = () => {
    const a = {};
    fields.forEach((f) => {
      if (f.t === "cb") a[f.k] = getChecks(form, f.k);
      else if (f.t === "mc" || f.t === "scale") a[f.k] = getRadio(form, f.k);
      else a[f.k] = (form.elements[f.k]?.value || "").trim();
    });
    return a;
  };
  const scaleVals = (a) => Array.from({ length: 34 }, (_, i) => a["Q" + (15 + i)] || "");
  const suggest = () => {
    const a = collect(), r = validity(scaleVals(a));
    const why = [r.a && "(a) 4 or more blanks in Q15–Q48", r.b && "(b) Q23, Q34 and Q45 all blank", r.c && "(c) 12 or more identical non-3 answers in a row"].filter(Boolean);
    $("#vsug").innerHTML = r.unanswered ? `<p class="note info">Suggestion appears when all of Q15–Q48 are entered (${r.unanswered} left).</p>`
      : why.length ? `<p class="note warn">By the study rules this questionnaire looks <b>invalid</b>: ${why.join("; ")}. Check the paper, then choose the matching option.</p>`
      : `<p class="note ok">By the study rules this questionnaire looks <b>valid</b>.</p>`;
    store.set(key, JSON.stringify(a));
  };
  form.addEventListener("change", suggest);
  form.addEventListener("input", (e) => { if (e.target.matches("textarea,input[type=text]")) store.set(key, JSON.stringify(collect())); });
  // "Not answered" is exclusive in multiple-answer items
  form.addEventListener("change", (e) => {
    const t = e.target;
    if (t.type !== "checkbox" || !t.checked) return;
    const group = $$(`input[name="${CSS.escape(t.name)}"]`, form);
    if (t.value === NA) group.forEach((x) => { if (x !== t) x.checked = false; });
    else group.forEach((x) => { if (x.value === NA) x.checked = false; });
  });
  suggest();
  $("#ecancel").onclick = () => { store.set("entry-serial", null); render(); };
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const a = collect();
    const missing = fields.filter((f) => !f.opt && (f.t === "cb" ? !a[f.k].length : !a[f.k])).map((f) => f.k);
    $$(".scale", form).forEach((el) => el.classList.toggle("miss", missing.includes(el.dataset.k)));
    if (missing.length) {
      toast(`Not answered yet: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`, 4500);
      const el = $(`[data-k="${CSS.escape(missing[0])}"]`, form); el && el.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const r = validity(scaleVals(a)), vchoice = a.validity;
    const expect = r.a || r.b || r.c ? "Invalid" : "Valid";
    if (!vchoice.startsWith(expect) && !vchoice.startsWith("Unsure") && $("#emsg").dataset.warned !== "1") {
      $("#emsg").dataset.warned = "1";
      $("#emsg").innerHTML = `<span class="bad">Your validity choice differs from the rule check. Check again, then press Save once more to keep your choice.</span>`;
      return;
    }
    const b = $("#esave");
    busy(b, true);
    try {
      const j = await api("entry.add", { serial: c.serial, answers: a });
      store.set(key, null); store.set("entry-serial", null);
      toast(j.round === 2 ? (j.differences ? `Saved. ${j.differences} difference(s) found; the collector will check them.` : "Saved. Both entries agree.") : `Saved entry 1 for ${j.saved}.`, 4500);
      await refresh();
    } catch (e) { busy(b, false); toast(e.message, 5000); }
  };
}

// differences between entry 1 and entry 2: the collector checks the paper and records the correct value
async function viewCheck(v) {
  const sc = await schema(), list = S.my.mismatches;
  const byLabel = Object.fromEntries(sc.entry.map((f) => [f.l, f]));
  v.innerHTML = `<h1>Check entry differences</h1>
    <p class="lead">The two entries differ for these items. Look at the <b>original paper questionnaire</b> and choose what is written there. Do not answer from memory.</p>
    <p><a href="#entry">← Data Entry</a></p>
    ${list.length ? list.map((m) => {
      const f = byLabel[m.field] || { t: "para" };
      let input;
      if (f.t === "mc" || f.t === "scale") input = `<select data-row="${m.row}"><option value="">Choose what the paper shows…</option>${f.o.map((o) => `<option ${m.correct === o ? "selected" : ""}>${esc(o)}</option>`).join("")}${f.other ? `<option value="__other">Other (type below)</option>` : ""}</select>${f.other ? `<input type="text" data-oth="${m.row}" placeholder="Other: text as written" style="margin-top:6px">` : ""}`;
      else if (f.t === "cb") input = `<div data-cbrow="${m.row}">${checks("cb" + m.row, f.o, (m.correct || "").split("; ").filter(Boolean), f.other)}</div>`;
      else if (f.t === "date") input = `<input type="date" data-row="${m.row}" value="${esc(m.correct)}">`;
      else input = `<textarea data-row="${m.row}">${esc(m.correct)}</textarea>`;
      return `<div class="mm card"><div><b class="mono">${esc(m.serial)}</b> · ${esc(m.field)} ${m.correct ? `<span class="tag ok">checked by ${esc(m.by)}</span>` : `<span class="tag warn">to check</span>`}</div>
        <div class="vals"><span class="faint">Entry 1</span><span>${esc(m.e1) || '<span class="faint">(empty)</span>'}</span><span class="faint">Entry 2</span><span>${esc(m.e2) || '<span class="faint">(empty)</span>'}</span></div>
        ${input}<div class="btns"><button class="btn pri sm" data-save="${m.row}" data-t="${f.t}">Save</button></div></div>`;
    }).join("") : `<p class="empty">Nothing to check.</p>`}`;
  $$("[data-save]", v).forEach((b) => (b.onclick = async () => {
    const row = b.dataset.save, t = b.dataset.t, card = b.closest(".mm");
    let value;
    if (t === "cb") value = getChecks(card, "cb" + row);
    else {
      value = $(`[data-row="${row}"]`, card).value;
      if (value === "__other") { const o = $(`[data-oth="${row}"]`, card).value.trim(); value = o ? "Other: " + o : ""; }
    }
    if (!value || (Array.isArray(value) && !value.length)) return toast("Choose the value written on the paper.");
    busy(b, true);
    try { await api("mismatch.fix", { row, value }); toast("Saved"); S = await api("state"); viewCheck(v); }
    catch (e) { busy(b, false); toast(e.message, 4500); }
  }));
}

// ------------------------------------------------------------------ manual
async function viewManual(v) {
  v.innerHTML = `<p class="sub">Loading the manual…</p>`;
  try { MANUAL = MANUAL || (await api("manual")).html; } catch (e) { v.innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
  v.innerHTML = `<div class="manual"><nav class="toc card" id="toc"></nav><article class="doc" id="doc">${MANUAL}</article></div>`;
  const toc = $("#toc");
  toc.innerHTML = `<b style="display:block;margin-bottom:6px">Contents</b>` + $$("#doc h2").map((h, i) => {
    h.id = h.id || "m" + i;
    return `<a href="#manual" data-to="${esc(h.id)}">${esc(h.textContent)}</a>`;
  }).join("");
  $$("a[data-to]", toc).forEach((a) => (a.onclick = (e) => { e.preventDefault(); document.getElementById(a.dataset.to).scrollIntoView({ behavior: "smooth" }); }));
  $$("#doc a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
}

// ------------------------------------------------------------------ admin
function viewAdmin(v) {
  if (!isAdmin()) { location.hash = "home"; return; }
  const A = S.admin;
  v.innerHTML = `<h1>Admin</h1>
    <p class="lead">Only the PI and 子芸 see this page. Data sheet: <a href="${esc(A.sheetUrl)}" target="_blank" rel="noopener">PI-only spreadsheet</a></p>
    <div class="grid">
    <section class="card"><h2>People and invite links</h2>
      <p class="sub" style="margin-bottom:8px">Each link works once: the first Google account that signs in with it is linked to that person. Reset makes a new link and signs the person out.</p>
      <div class="tw"><table><thead><tr><th>Name</th><th>Role</th><th>Linked account</th><th>Invite link</th><th></th></tr></thead><tbody>
      ${A.users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${u.email ? `${esc(u.email)}<div class="faint" style="font-size:12px">${esc(u.boundAt)}</div>` : '<span class="faint">not yet</span>'}</td>
        <td>${u.email ? "" : `<button class="btn sm" data-copy="${esc(u.invite)}">Copy link</button>`}</td>
        <td><button class="btn sm danger" data-reset="${esc(u.name)}">Reset</button></td></tr>`).join("")}
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

    <section class="card"><h2>Download (CSV)</h2>
      <div class="btns">${[["final", "Final dataset (agreed entries)"], ["entries", "All entries"], ["mismatches", "Differences"], ["onsite", "On-site records"], ["refusals", "Refusals"], ["returned", "Returned"]].map(([k, l]) => `<button class="btn sm" data-exp="${k}">${l}</button>`).join("")}</div>
      <p class="sub" style="margin-top:8px">Final dataset: one row per questionnaire entered twice; status "pending" until every difference is checked and confirmed.</p>
    </section></div>`;
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
