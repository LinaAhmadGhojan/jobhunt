"use strict";
const D = window.JOBHUNT, B = window.BOARDS, P = D.profile;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEY = "jobhunt-v1";
let store = { status: {}, snap: {} };
try { store = { ...store, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { /* first run */ }
let serverOk = false, saveTimer = null;
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode */ }
  if (!serverOk) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fetch("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(store) }).catch(() => {}), 150);
};
/** load the saved state from the file on disk (data/state.json) via the local server; merge anything kept only in this browser */
async function loadState() {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("no server");
    const remote = await res.json();
    store = { status: { ...store.status, ...(remote.status || {}) }, snap: { ...store.snap, ...(remote.snap || {}) } };
    serverOk = true; save();
  } catch { serverOk = false; }
}
const snapOf = (j) => ({ id: j.id, title: j.title, company: j.company, location: j.location, salary: j.salary, url: j.url, source: j.source, posted: j.posted, kind: j.kind, region: j.region, score: j.score, contacts: j.contacts, matched: j.matched, description: j.description, tags: j.tags, at: Date.now() });
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 1800); };
const copy = async (text) => { try { await navigator.clipboard.writeText(text); } catch { const a = document.createElement("textarea"); a.value = text; document.body.append(a); a.select(); document.execCommand("copy"); a.remove(); } toast("تم النسخ ✔"); };

const NOW = new Date(D.generated).getTime();
const ageDays = (j) => (j.posted ? (NOW - new Date(j.posted)) / 864e5 : 99);
const ago = (j) => {
  if (!j.posted) return "تاريخ غير معروف";
  const h = (Date.now() - new Date(j.posted)) / 36e5;
  if (h < 1) return "الآن"; if (h < 24) return `قبل ${Math.round(h)} ساعة`; const d = Math.round(h / 24);
  return d === 1 ? "أمس" : `قبل ${d} أيام`;
};
const PRETTY = { laravel: "Laravel", php: "PHP", vue: "Vue.js", "vue.js": "Vue.js", vuejs: "Vue.js", nextjs: "Next.js", "next.js": "Next.js", react: "React", typescript: "TypeScript", fastapi: "FastAPI", python: "Python", erp: "ERP", "full stack": "Full-Stack", "full-stack": "Full-Stack", fullstack: "Full-Stack", backend: "Back-end", "back-end": "Back-end", "back end": "Back-end", mysql: "MySQL", "rest api": "REST APIs", restful: "REST APIs", api: "APIs", tailwind: "Tailwind", docker: "Docker", javascript: "JavaScript", postgres: "PostgreSQL", sql: "SQL", inertia: "Inertia", livewire: "Livewire", nuxt: "Nuxt" };
const skillsOf = (j) => { const s = [...new Set((j.matched || []).map((k) => PRETTY[k] || k))].slice(0, 6); return s.length ? s.join(", ") : "Laravel, Vue.js, Next.js, FastAPI"; };
const REG = { target: ["🎯 منطقتك المستهدفة", "t"], worldwide: ["🌐 عالمي", "w"], local: ["⚠ يتطلب إقامة/تصريح عمل بالدولة", "o"], open: ["🌍 ريموت (المنطقة غير محددة)", "o"], online: ["💻 مشروع أونلاين", "w"] };
const SRC_ORDER = [...new Set(D.jobs.map((j) => j.source))].sort();

/* ───────── header KPIs ───────── */
const jobsAll = D.jobs.filter((j) => j.kind === "job"), freeAll = D.jobs.filter((j) => j.kind === "freelance");
const nApplied = () => Object.values(store.status).filter((s) => s === "applied").length;
function kpis() {
  const w = jobsAll.filter((j) => ageDays(j) <= 7);
  $("#kpis").innerHTML = [[jobsAll.length, "وظيفة (30 يوم)"], [w.length, "آخر 7 أيام"], [jobsAll.filter((j) => j.region === "target").length, "منطقتك"], [jobsAll.filter((j) => j.contacts.emails.length).length, "فيها إيميل"], [freeAll.length, "عمل حر"], [nApplied(), "قدّمتِ"]]
    .map(([n, l]) => `<div class="kpi"><b>${n}</b><span>${l}</span></div>`).join("");
  if (serverOk && !$("#refresh")) { const b = document.createElement("button"); b.id = "refresh"; b.className = "btn sm"; b.textContent = "↻ تحديث الوظائف الآن"; b.onclick = async () => { b.disabled = true; b.textContent = "جارٍ التحديث… (دقيقتين)"; try { await fetch("/api/refresh", { method: "POST" }); } catch { /* ignore */ } location.reload(); }; $("#updated").after(b); }
  $("#updated").textContent = `آخر تحديث: ${new Date(D.generated).toLocaleString("ar")} — شغّلي run.bat كل يوم لتجديد النتائج`;
}

/* ───────── cards ───────── */
function card(j) {
  const st = store.status[j.id], [rl, rc] = REG[j.region] || ["", ""];
  const c = j.contacts;
  const mail = c.emails[0] ? `<a href="mailto:${esc(c.emails[0])}">✉ ${esc(c.emails[0])}</a>` : "";
  const wa = c.whatsapp[0] ? `<a href="${esc(c.whatsapp[0])}" target="_blank" rel="noreferrer">WhatsApp</a>` : "";
  const ph = c.phones[0] ? `<span>📞 ${esc(c.phones[0])}</span>` : "";
  const sc = j.score >= 70 ? "hi" : j.score >= 45 ? "mid" : "";
  return `<article class="card ${st === "applied" || st === "skip" ? "done" : ""}" data-id="${esc(j.id)}">
    <div class="row1"><div><h3 class="title">${esc(j.title)}</h3><div class="company">${esc(j.company || "—")}</div></div><div class="score ${sc}" title="درجة التوافق مع سيرتك">${j.score}</div></div>
    <div class="meta">
      ${ageDays(j) <= 1.2 ? '<span class="b new">جديد</span>' : ""}<span class="b ${rc}">${rl}</span><span class="b">📍 ${esc(j.location.slice(0, 48))}</span>
      ${j.salary ? `<span class="b sal">💰 ${esc(j.salary)}</span>` : '<span class="b">💰 غير معلن</span>'}<span class="b">🕒 ${ago(j)}</span><span class="b">${esc(j.source)}</span>${j.bids != null ? `<span class="b">${j.bids} عروض</span>` : ""}${st ? `<span class="b">${{ saved: "⭐ محفوظ", applied: "✅ قدّمتِ", skip: "🚫 تجاهل" }[st]}</span>` : ""}
    </div>
    <div class="tags">${(j.matched || []).map((m) => `<span>${esc(PRETTY[m] || m)}</span>`).join("")}</div>
    <div class="desc">${esc(j.description.slice(0, 240))}</div>
    ${mail || wa || ph ? `<div class="contact">${mail}${wa}${ph}</div>` : ""}
    <div class="actions"><button class="btn p" data-open="${esc(j.id)}">✍️ رسالة + تفاصيل</button><a class="btn" href="${esc(j.url)}" target="_blank" rel="noreferrer">فتح الإعلان ↗</a>
      <button class="btn sm" data-st="saved" data-id="${esc(j.id)}">⭐</button><button class="btn sm" data-st="applied" data-id="${esc(j.id)}">✅ قدّمت</button><button class="btn sm" data-st="skip" data-id="${esc(j.id)}">🚫</button></div>
  </article>`;
}

/* ───────── filters ───────── */
function loadSrc(k) { try { return new Set(JSON.parse(localStorage.getItem("jobhunt-src-" + k)) || []); } catch { return new Set(); } }
const saveSrc = (k, set) => { try { localStorage.setItem("jobhunt-src-" + k, JSON.stringify([...set])); } catch { /* ignore */ } };
const F = { jobs: { q: "", days: 7, region: "", src: loadSrc("jobs"), min: 0, sal: false, con: false, hide: true, nolocal: true, sort: "score", limit: 120 }, free: { q: "", days: 30, region: "", src: loadSrc("free"), min: 0, sal: false, con: false, hide: true, nolocal: true, sort: "new", limit: 120 } };
function filterUI(box, key, pool) {
  const f = F[key];
  const sources = Object.entries(pool.reduce((m, j) => ((m[j.source] = (m[j.source] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  box.innerHTML = `
    <div class="srcbar" id="${key}bar">
      <label class="sitesel">الموقع
        <select id="${key}site">
          <option value="*">كل المواقع (${pool.length})</option>
          <optgroup label="نتائج داخل الأداة">${sources.map(([sn, n]) => `<option value="src:${esc(sn)}" ${f.src.has(sn) ? "selected" : ""}>${esc(sn)} (${n})</option>`).join("")}</optgroup>
          <optgroup label="بحث مباشر — بيفتح الموقع بنتائج جاهزة ↗">${extList(key).map((b, i) => `<option value="ext:${i}">${esc(b.name)} ↗</option>`).join("")}</optgroup>
        </select>
      </label>
      <small class="lo">LinkedIn / Indeed / Glassdoor / Bayt / GulfTalent / Jooble بتمنع الجمع الآلي، فاختيارها بيفتح صفحة نتائجها بكلمة البحث اللي كتبتيها (أو "Laravel Developer").</small>
    </div>
    <label>بحث<input type="search" id="${key}q" placeholder="laravel, dubai, react…" value="${esc(f.q)}"></label>
    <label>تاريخ النشر<div class="chips">${[1, 3, 7, 14, 30].map((d) => `<button class="chip ${f.days === d ? "on" : ""}" data-days="${d}">${d === 1 ? "24 ساعة" : d + " أيام"}</button>`).join("")}</div></label>
    <label>المنطقة<select id="${key}r"><option value="">الكل</option>${Object.entries(REG).filter(([k]) => pool.some((j) => j.region === k)).map(([k, v]) => `<option value="${k}" ${f.region === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></label>
    <label>أدنى توافق: <b id="${key}mv">${f.min}</b><input type="range" id="${key}m" min="0" max="90" step="5" value="${f.min}"></label>
    <label>ترتيب<select id="${key}o"><option value="score" ${f.sort === "score" ? "selected" : ""}>الأنسب</option><option value="new" ${f.sort === "new" ? "selected" : ""}>الأحدث</option><option value="sal" ${f.sort === "sal" ? "selected" : ""}>فيها راتب أولاً</option></select></label>
    <label class="chk"><input type="checkbox" id="${key}sal" ${f.sal ? "checked" : ""}> فيها راتب</label>
    <label class="chk"><input type="checkbox" id="${key}con" ${f.con ? "checked" : ""}> فيها وسيلة تواصل</label>
    <label class="chk"><input type="checkbox" id="${key}nolocal" ${f.nolocal ? "checked" : ""}> إخفاء اللي بدها إقامة بدولة معينة</label>
    <label class="chk"><input type="checkbox" id="${key}hide" ${f.hide ? "checked" : ""}> إخفاء ما قدّمت/تجاهلت</label>
    ${key === "jobs" ? '<button class="btn sm" id="csv">⬇ تصدير CSV</button>' : ""}`;
  const bind = (id, fn) => { const e = $("#" + key + id, box); if (e) e.oninput = e.onchange = fn; };
  bind("q", (e) => { f.q = e.target.value; f.limit = 120; draw(key, pool); });
  bind("r", (e) => { f.region = e.target.value; draw(key, pool); });
  $("#" + key + "site", box).onchange = (e) => {
    const v = e.target.value;
    if (v.startsWith("ext:")) {
      const bd = extList(key)[+v.slice(4)], q = ($("#" + key + "q", box).value || "").trim() || (key === "jobs" ? "Laravel Developer" : "Laravel");
      window.open(key === "jobs" ? bd.url(B.countries[0], q) : bd.url(q), "_blank", "noopener");
      e.target.value = f.src.size ? "src:" + [...f.src][0] : "*"; // stay on the current selection
      return;
    }
    f.src.clear(); if (v.startsWith("src:")) f.src.add(v.slice(4));
    saveSrc(key, f.src); f.limit = 120; draw(key, pool);
  };
  bind("m", (e) => { f.min = +e.target.value; $("#" + key + "mv", box).textContent = f.min; draw(key, pool); });
  bind("o", (e) => { f.sort = e.target.value; draw(key, pool); });
  bind("sal", (e) => { f.sal = e.target.checked; draw(key, pool); });
  bind("con", (e) => { f.con = e.target.checked; draw(key, pool); });
  bind("nolocal", (e) => { f.nolocal = e.target.checked; draw(key, pool); });
  bind("hide", (e) => { f.hide = e.target.checked; draw(key, pool); });
  box.querySelectorAll("[data-days]").forEach((b) => (b.onclick = () => { f.days = +b.dataset.days; box.querySelectorAll("[data-days]").forEach((x) => x.classList.toggle("on", x === b)); draw(key, pool); }));
  const csv = $("#csv", box); if (csv) csv.onclick = () => exportCsv(select(key, pool));
}
/** big boards that forbid scraping: shown as chips that open their own search (remote, last week) with the text typed in the search box */
const extList = (key) => (key === "jobs" ? B.boards.filter((b) => b.linkOnly || /Wuzzuf|Naukrigulf|Monster/.test(b.name)) : B.freelanceBoards.slice(0, 8));
function select(key, pool) {
  const f = F[key], q = f.q.toLowerCase().trim();
  let r = pool.filter((j) => ageDays(j) <= f.days && j.score >= f.min && (!f.region || j.region === f.region) && (!f.src.size || f.src.has(j.source))
    && (!f.sal || j.salary) && (!f.con || j.contacts.emails.length || j.contacts.whatsapp.length || j.contacts.phones.length)
    && (!f.nolocal || j.region !== "local") && (!f.hide || !["applied", "skip"].includes(store.status[j.id])) && (!q || `${j.title} ${j.company} ${j.location} ${j.tags.join(" ")} ${j.description}`.toLowerCase().includes(q)));
  const by = { score: (a, b) => b.score - a.score || (b.posted > a.posted ? 1 : -1), new: (a, b) => (b.posted > a.posted ? 1 : -1), sal: (a, b) => !!b.salary - !!a.salary || b.score - a.score };
  return r.sort(by[f.sort]);
}
function draw(key, pool) {
  const rows = select(key, pool), f = F[key], list = $(key === "jobs" ? "#listJobs" : "#listFree");
  $(key === "jobs" ? "#countJobs" : "#countFree").textContent = `${rows.length} نتيجة مطابقة${rows.length > f.limit ? ` — عرض أول ${f.limit}` : ""}`;
  list.innerHTML = rows.slice(0, f.limit).map(card).join("") + (rows.length > f.limit ? `<button class="btn g" id="more${key}">عرض المزيد (${rows.length - f.limit})</button>` : "") || '<div class="notice">لا نتائج بهذه الفلاتر — جرّبي توسيع «تاريخ النشر» أو خفض «أدنى توافق».</div>';
  const more = $("#more" + key); if (more) more.onclick = () => { f.limit += 120; draw(key, pool); };
}
function exportCsv(rows) {
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = ["title,company,location,salary,posted,source,score,email,url", ...rows.map((j) => [j.title, j.company, j.location, j.salary, j.posted.slice(0, 10), j.source, j.score, j.contacts.emails[0] || "", j.url].map(q).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "jobs.csv"; a.click();
}

/* ───────── drawer: details + message generator ───────── */
const TYPES = { job: [["job_en", "✉ إيميل (EN)"], ["job_ar", "✉ إيميل (AR)"], ["whatsapp_en", "💬 واتساب (EN)"], ["whatsapp_ar", "💬 واتساب (AR)"]], freelance: [["freelance_en", "رسالة عرض (EN)"], ["freelance_ar", "رسالة عرض (AR)"], ["whatsapp_en", "💬 واتساب (EN)"], ["whatsapp_ar", "💬 واتساب (AR)"]] };
const fill = (tpl, j) => tpl.replace(/\{(\w+)\}/g, (_, k) => ({ role: j.title, company: j.company && !/client|poster/i.test(j.company) ? j.company : "your team", skills: skillsOf(j), name: P.name, email: P.email, phone: P.phone, portfolio: P.portfolio, github: P.github, linkedin: P.linkedin, cvUrl: P.cvUrl }[k] ?? ""));
function openDrawer(id) {
  const j = D.jobs.find((x) => x.id === id); if (!j) return;
  const types = TYPES[j.kind]; let cur = types[0][0];
  const c = j.contacts, email = c.emails[0] || "", phone = (c.whatsapp[0]?.match(/\d{8,}/) || c.phones[0]?.replace(/[^\d]/g, "") || "");
  $("#drawerBody").innerHTML = `
    <h2>${esc(j.title)}</h2><div class="company">${esc(j.company || "—")} · ${esc(j.location)}</div>
    <div class="meta" style="margin-top:8px"><span class="b ${(REG[j.region] || [])[1]}">${(REG[j.region] || [""])[0]}</span><span class="b">${j.salary ? "💰 " + esc(j.salary) : "💰 الراتب غير معلن"}</span><span class="b">🕒 ${ago(j)}</span><span class="b">${esc(j.source)}</span><span class="b">توافق ${j.score}/100</span></div>
    <div class="sec"><h3>معلومات التواصل</h3><div class="contact">${email ? `<a href="mailto:${esc(email)}">✉ ${esc(email)}</a>` : ""}${c.whatsapp.map((w) => `<a href="${esc(w)}" target="_blank">WhatsApp</a>`).join("")}${c.phones.map((p) => `<span>📞 ${esc(p)}</span>`).join("")}${c.telegram.map((t) => `<a href="${esc(t)}" target="_blank">Telegram</a>`).join("")}${!email && !c.whatsapp.length && !c.phones.length ? `<span>لا يوجد إيميل/رقم معلن — التقديم عبر رابط الإعلان</span>` : ""}</div>
      <p style="margin:8px 0"><a class="btn p" href="${esc(j.url)}" target="_blank" rel="noreferrer">فتح الإعلان والتقديم ↗</a></p></div>
    <div class="sec"><h3>وصف الوظيفة</h3><div class="full">${esc(j.description)}</div></div>
    <div class="sec"><h3>الرسالة الجاهزة (عدّليها قبل الإرسال)</h3>
      <div class="seg" id="seg">${types.map(([k, l], i) => `<button class="chip ${i ? "" : "on"}" data-t="${k}">${l}</button>`).join("")}</div>
      <textarea class="msg" id="msg"></textarea>
      <div class="actions" style="margin-top:8px"><button class="btn p" id="cp">📋 نسخ الرسالة</button><a class="btn" id="mailto" href="#">✉ فتح في الإيميل</a><a class="btn" id="wa" href="#" target="_blank" rel="noreferrer">💬 فتح واتساب</a></div>
      <p class="muted">${email ? "" : "ما في إيميل معلن: انسخي الرسالة والصقيها بنموذج التقديم أو برسالة LinkedIn."}</p></div>
    <div class="sec"><h3>حالة الطلب</h3><div class="actions"><button class="btn" data-st="saved" data-id="${esc(j.id)}">⭐ حفظ</button><button class="btn" data-st="applied" data-id="${esc(j.id)}">✅ قدّمت</button><button class="btn" data-st="skip" data-id="${esc(j.id)}">🚫 تجاهل</button></div></div>`;
  const render = () => {
    const txt = fill(P.templates[cur], j); $("#msg").value = txt;
    const subj = (txt.match(/^Subject:\s*(.+)/) || [])[1] || `Application: ${j.title}`;
    $("#mailto").href = `mailto:${email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(txt.replace(/^Subject:.*\n\n?/, ""))}`;
    $("#wa").href = `https://wa.me/${phone}?text=${encodeURIComponent($("#msg").value)}`;
  };
  $("#seg").onclick = (e) => { const b = e.target.closest("[data-t]"); if (!b) return; cur = b.dataset.t; $("#seg").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b)); render(); };
  $("#msg").oninput = () => { $("#wa").href = `https://wa.me/${phone}?text=${encodeURIComponent($("#msg").value)}`; };
  $("#cp").onclick = () => copy($("#msg").value);
  render(); $("#drawer").hidden = false; $(".drawer-in").scrollTop = 0;
}
$("#closeDrawer").onclick = () => ($("#drawer").hidden = true);
$("#drawer").onclick = (e) => { if (e.target.id === "drawer") $("#drawer").hidden = true; };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#drawer").hidden = true; });

/* status buttons + open drawer (event delegation) */
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-open]"); if (o) return openDrawer(o.dataset.open);
  const s = e.target.closest("[data-st]"); if (!s) return;
  const id = s.dataset.id, st = s.dataset.st;
  const jj = D.jobs.find((x) => x.id === id) || store.snap[id];
  if (store.status[id] === st) { delete store.status[id]; if (st !== "saved" && st !== "applied") delete store.snap[id]; } else { store.status[id] = st; if (jj) store.snap[id] = { ...snapOf(jj), at: store.snap[id]?.at || Date.now(), st: st }; }
  save(); kpis(); toast({ saved: "تم الحفظ ⭐", applied: "سُجّل كمُقدَّم ✅", skip: "تم التجاهل" }[st]); redraw(); if (!$("#drawer").hidden) $("#drawer").hidden = true;
});

/* ───────── tabs ───────── */
function boardsTab() {
  const el = $("#tab-boards");
  const ck = (id, arr, key = "label") => `<select id="${id}">${arr.map((x, i) => `<option value="${i}">${esc(x[key] || x.ar)}</option>`).join("")}</select>`;
  el.innerHTML = `
    <div class="notice">مواقع <b>LinkedIn · Indeed · Glassdoor · Jooble · Bayt · GulfTalent</b> تمنع الجمع الآلي، فبنبني لك رابط البحث الجاهز (ريموت + آخر أسبوع) وبيفتح النتائج مباشرة. فعّلي كمان <b>Job Alerts</b> على كل موقع ليوصلك الجديد على الإيميل يومياً.</div>
    <div class="filters"><div class="srcbar" id="bg"><b>نوع الموقع:</b>${B.groups.map(([k, l], i) => `<button class="chip ${i ? "" : "on"}" data-g="${k}">${esc(l)}</button>`).join("")}</div><label>الوظيفة${ck("bk", B.keywords)}</label><label>الدولة${ck("bc", B.countries, "ar")}</label><label>ابحثي عن موقع<input type="search" id="bs" placeholder="linkedin, bayt, upwork…"></label></div>
    <h3>🔎 مواقع التوظيف</h3><div id="bt"></div>
    <h3 style="margin-top:26px">🧑‍💻 مواقع العمل الحر</h3><div id="bf"></div>
    <h3 style="margin-top:26px">📣 منشورات "مطلوب مبرمج" على السوشيال (الأحدث)</h3><div id="bp"></div>`;
  const paint = () => {
    const k = B.keywords[+$("#bk").value], c = B.countries[+$("#bc").value];
    const g = $("#bg .on").dataset.g, nm = $("#bs").value.toLowerCase().trim(), show = (b) => (g === "all" || b.group === g) && (!nm || b.name.toLowerCase().includes(nm));
    $("#bt").innerHTML = `<table class="bt"><tr><th>الموقع</th><th>ملاحظة</th><th>رابط البحث: ${esc(k.label)} — ${esc(c.ar)}</th></tr>${B.boards.filter(show).map((b) => `<tr><td><b>${esc(b.name)}</b>${b.linkOnly ? ' <span class="b o" title="الموقع بيمنع الجمع الآلي — بيفتح البحث فقط">رابط بحث فقط</span>' : ""}</td><td>${esc(b.note)}</td><td><a href="${esc(b.url(c, k.label))}" target="_blank" rel="noreferrer">افتحي النتائج ↗</a></td></tr>`).join("")}</table>`;
    $("#bf").innerHTML = `<table class="bt"><tr><th>الموقع</th><th>ملاحظة</th><th>بحث: ${esc(k.label)}</th></tr>${B.freelanceBoards.filter(show).map((b) => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.note)}</td><td><a href="${esc(b.url(k.label))}" target="_blank" rel="noreferrer">افتحي ↗</a></td></tr>`).join("")}</table>`;
    $("#bp").innerHTML = `<table class="bt"><tr><th>ماذا تبحثين</th>${B.postSearches.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr>${B.postQueries.map((q) => `<tr><td>${esc(q.ar)}</td>${B.postSearches.map((s) => `<td><a href="${esc(s.url(q.q))}" target="_blank" rel="noreferrer">بحث ↗</a></td>`).join("")}</tr>`).join("")}</table>`;
  };
  $("#bk").onchange = $("#bc").onchange = $("#bs").oninput = paint;
  $("#bg").onclick = (e) => { const x = e.target.closest("[data-g]"); if (!x) return; $("#bg").querySelectorAll("[data-g]").forEach((y) => y.classList.toggle("on", y === x)); paint(); };
  paint();
}
function gulfTab() {
  const el = $("#tab-gulf");
  const base = P.portfolio.replace(/\/$/, "");
  const msgAr = (s, city) => `السلام عليكم،\nمعكم لينا، مطورة أنظمة ومواقع (Laravel / Vue / Next.js) بخبرة أكثر من 4 سنوات.\nلاحظت أن نشاطكم (${s.ar}) في ${city} يمكن أن يستفيد من: ${s.offer}.\nجهّزت مثالاً يعمل مباشرة تقدرون تجربونه الآن: ${base}/${s.demoUrl}\nيسعدني أعرض عليكم نسخة مخصصة لعملكم بدون أي التزام — هل يناسبكم نتحدث 10 دقائق؟\nلينا غوجان — ${P.email}`;
  const msgEn = (s, city) => `Hello,\nI'm Lina, a full-stack developer (Laravel / Vue / Next.js) with 4+ years of experience.\nI believe your business in ${city} could benefit from: ${s.offer}.\nI built a working example you can try right now: ${base}/${s.demoUrl}\nI'd be glad to show you a version tailored to your business, no commitment — do you have 10 minutes this week?\nLina Ghojan — ${P.email}`;
  el.innerHTML = `<div class="notice">هنا ما في "إعلانات" جاهزة: هي <b>قائمة عملاء محتملين</b>. اختاري المدينة، افتحي خرائط غوغل لتجدي النشاطات (مطاعم، عقارات…) خاصة اللي ما عندها موقع أو موقعها قديم، وراسليهم برسالة جاهزة مرفقة بمشروعك الحي المناسب. وعلى تبويب «مواقع التوظيف» في قسم المنشورات ابحثي عن اللي كتب "مطلوب مبرمج".</div>
    <div class="filters"><label>المدينة<select id="gc">${B.cities.map((c, i) => `<option value="${i}">${c.ar} — ${c.en}</option>`).join("")}</select></label></div>
    <div class="grid2" id="gg"></div>`;
  const paint = () => {
    const city = B.cities[+$("#gc").value];
    $("#gg").innerHTML = B.segments.map((s, i) => `<div class="panel"><h3>${s.icon} ${esc(s.ar)}</h3><p class="muted">العرض: ${esc(s.offer)}</p>
      <p class="muted">مشروعك المناسب: <a href="${base}/${s.demoUrl}" target="_blank">${esc(s.demo)}</a></p>
      <div class="actions"><a class="btn p" target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/${encodeURIComponent(s.maps + " in " + city.en)}">🗺 ابحثي عنهم بالخريطة</a>
      <a class="btn" target="_blank" rel="noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(s.maps + " " + city.en + " instagram")}">📷 إنستغرام</a></div>
      <div class="actions" style="margin-top:8px"><button class="btn sm" data-c="ar" data-i="${i}">📋 رسالة عربية</button><button class="btn sm" data-c="en" data-i="${i}">📋 English message</button></div></div>`).join("");
    $("#gg").onclick = (e) => { const b = e.target.closest("[data-c]"); if (!b) return; const s = B.segments[+b.dataset.i]; copy((b.dataset.c === "ar" ? msgAr : msgEn)(s, b.dataset.c === "ar" ? city.ar : city.en)); };
  };
  $("#gc").onchange = paint; paint();
}
function savedTab() {
  const rows = Object.entries(store.status).filter(([, v]) => v === "saved" || v === "applied").map(([id, v]) => ({ ...(D.jobs.find((x) => x.id === id) || store.snap[id] || { id, title: id, url: "#", company: "", location: "", salary: "", description: "", tags: [], matched: [], contacts: { emails: [], phones: [], whatsapp: [], telegram: [] }, score: 0, region: "", posted: "" }), _at: store.snap[id]?.at || 0 }))
    .sort((a, b) => b._at - a._at);
  const applied = rows.filter((j) => store.status[j.id] === "applied").length;
  $("#tab-saved").innerHTML = rows.length
    ? `<div class="notice">${serverOk ? "✔ محفوظ على جهازك في <b>data/state.json</b> — ما بيضيع حتى لو غيّرتي المتصفح أو شغّلتي run.bat كل يوم." : "⚠ الحفظ مؤقت بهالمتصفح فقط. شغّلي <b>run.bat</b> (بيفتح localhost:4600) ليتحفظ على ملف بجهازك."}</div><p class="muted">${applied} قدّمتِ عليها · ${rows.length - applied} محفوظة</p><div class="list">${rows.map(card).join("")}</div>`
    : '<div class="notice">لسا ما حفظتِ أو قدّمتِ على شي. اضغطي ⭐ أو ✅ على أي وظيفة.</div>';
}

let tab = "jobs";
function redraw() { if (tab === "jobs") draw("jobs", jobsAll); else if (tab === "free") draw("free", freeAll); else if (tab === "saved") savedTab(); }
$("#tabs").onclick = (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab;
  document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== "tab-" + tab));
  redraw(); window.scrollTo(0, 0);
};
async function init() { await loadState(); kpis(); filterUI($("#fJobs"), "jobs", jobsAll); filterUI($("#fFree"), "free", freeAll); boardsTab(); gulfTab(); draw("jobs", jobsAll); draw("free", freeAll); }
init();
