// node collect.mjs [--cv path/to/cv.docx] [--only remotive,himalayas] [--max 600]
// Collects remote jobs + freelance projects from public sources, keeps the ones that fit the CV and the target regions,
// scores them and writes data/jobs.json + site/data.js (open site/index.html afterwards).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SOURCES } from "./sources.mjs";
import { contacts, salaryFromText } from "./util.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const profile = JSON.parse(fs.readFileSync(path.join(here, "profile.json"), "utf8"));
// optional API keys live in jobhunt/.env (never committed): JSEARCH_KEY=…  JOOBLE_KEY=…  ADZUNA_ID=…  ADZUNA_KEY=…  LINKEDIN=off
try {
  for (const line of fs.readFileSync(path.join(here, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env: fine */ }

/* ── 1. CV → skills ───────────────────────────────────────── */
const cvPath = arg("cv", fs.existsSync(path.join(here, "cv/cv.docx")) ? path.join(here, "cv/cv.docx") : "");
let cvSkills = [];
if (cvPath && fs.existsSync(cvPath)) {
  let text = "";
  if (/\.docx$/i.test(cvPath)) {
    const AdmZip = createRequire(import.meta.url)("adm-zip");
    text = new AdmZip(cvPath).readAsText("word/document.xml").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, " ");
  } else text = fs.readFileSync(cvPath, "utf8");
  const low = text.toLowerCase();
  cvSkills = Object.keys(profile.skills).filter((k) => new RegExp(`(^|[^a-z])${k.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(low));
  console.log(`CV: ${path.basename(cvPath)} → skills found: ${cvSkills.join(", ")}`);
  // a CV that mentions a skill lifts its weight a little; skills missing from the CV keep their base weight
  for (const k of cvSkills) profile.skills[k] = profile.skills[k] + 1;
}

/* ── 2. run sources ───────────────────────────────────────── */
const only = arg("only", "") ? arg("only").split(",") : null;
const names = Object.keys(SOURCES).filter((n) => !only || only.includes(n));
const raw = [];
const report = {};
await Promise.all(names.map(async (n) => {
  const t0 = Date.now();
  try {
    const rows = await SOURCES[n](profile);
    report[n] = { ok: true, count: rows.length, ms: Date.now() - t0 };
    raw.push(...rows);
  } catch (e) {
    report[n] = { ok: false, error: e.message.slice(0, 120), count: 0 };
  }
  console.log(`  ${report[n].ok ? "✔" : "✖"} ${n.padEnd(14)} ${String(report[n].count).padStart(5)} ${report[n].error ?? ""}`);
}));

/* ── 3. classify, score, filter ───────────────────────────── */
const esc = (w) => w.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
const rx = (words) => new RegExp(`(^|[^a-z0-9])(${words.map(esc).join("|")})([^a-z0-9]|$)`, "i");
const R = {
  target: rx(profile.targetCountries), world: rx(["worldwide", "anywhere", "global", "globally", "any location", "all countries", "work from anywhere", "world"]),
  remote: rx(["remote", "remotely", "work from home", "wfh", "telecommute"]), restricted: rx(profile.restrictedWords), restrictedDesc: new RegExp(profile.restrictedDescription.map(esc).join("|"), "i"),
  excludeTitle: rx(profile.excludeTitle), core: rx(profile.core), seniorHard: /\b(1[0-9]|[89])\+?\s*(years|yrs)\b/i,
};
const SKILLS = Object.entries(profile.skills).map(([k, w]) => [k, w, rx([k])]);

function region(j) {
  const loc = (j.location || "").toLowerCase(), desc = (j.description || "").slice(0, 2500).toLowerCase();
  if (j.kind === "freelance") return "online";
  if (R.restrictedDesc.test(desc)) return "restricted";
  // A single named country (e.g. "United Arab Emirates") means the candidate must live / hold a work permit there → "local".
  // Broad regions (MENA / EMEA / Middle East / GCC) stay "target"; "worldwide / anywhere" stays "worldwide".
  const broad = rx(["mena", "emea", "mea", "middle east", "gcc", "gulf", "arab world"]);
  if (j.locationList?.length) { if (j.locationList.some((c) => broad.test(c))) return "target"; return j.locationList.some((c) => R.target.test(c)) ? "local" : "restricted"; }
  if (broad.test(loc)) return "target";
  if (R.target.test(loc)) return R.world.test(loc) ? "worldwide" : "local";
  if (R.world.test(loc)) return "worldwide";
  if (R.restricted.test(loc)) return "restricted";
  // "Russian Federation (Remote)", "Remote (Poland)" … a named place that is not a target → the employer restricts the location
  const rest = loc.replace(/remote(ly)?|hybrid|on-?site|work from home|wfh|telecommute|full[- ]?time|only|[()\-–/,]/gi, " ").replace(/\s+/g, " ").trim();
  if (rest.length > 2) return "restricted";
  if (!loc || R.remote.test(loc)) return R.remote.test(loc + " " + desc.slice(0, 300)) || j.source === "Remotive" ? "open" : "unknown";
  return "restricted";
}

const COUNTRY_WORDS = {
  "الإمارات": ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah"],
  "السعودية": ["saudi", "riyadh", "jeddah", "dammam", "khobar", "ksa", "mecca", "medina"],
  "قطر": ["qatar", "doha"], "الكويت": ["kuwait"], "البحرين": ["bahrain", "manama"], "عُمان": ["oman", "muscat"],
  "الأردن": ["jordan", "amman"], "تركيا": ["turkey", "türkiye", "turkiye", "istanbul", "ankara", "izmir"],
  "ماليزيا": ["malaysia", "kuala lumpur", "penang", "selangor", "johor", "putrajaya"],
};
const COUNTRY_RX = Object.entries(COUNTRY_WORDS).map(([name, words]) => [name, rx(words)]);
const countryOf = (j) => { const t = ((j.location || "") + " " + (j.locationList || []).join(" ")).toLowerCase(); return (COUNTRY_RX.find(([, re]) => re.test(t)) || [""])[0]; };

const now = Date.now();
const MAX_DAYS = Number(arg("days", 30)); // the site shows the last 7 days by default; the file keeps up to 30
const keep = [];
const drops = {};
const drop = (j, why) => { const k = j.source + " · " + why; drops[k] = (drops[k] || 0) + 1; };
for (const j of raw) {
  if (!j.title || !j.url) { drop(j, "no title/url"); continue; }
  const title = j.title.toLowerCase();
  if (R.excludeTitle.test(title)) { drop(j, "excluded title"); continue; }
  const text = `${title} ${(j.tags || []).join(" ")} ${(j.description || "").slice(0, 1500)}`.toLowerCase();
  const head = `${title} ${(j.tags || []).join(" ")}`.toLowerCase();
  const coreHead = R.core.test(head), coreBody = (text.match(new RegExp(R.core.source, "gi")) || []).length;
  if (!coreHead && coreBody < 3) { drop(j, "not relevant"); continue; }
  if (R.seniorHard.test(text.slice(0, 1200))) { drop(j, "too senior"); continue; }
  const reg = region(j);
  if (reg === "restricted") { drop(j, "region restricted"); continue; }
  if (reg === "unknown" && j.kind !== "freelance") { drop(j, "location unknown"); continue; }

  let score = 0; const matched = [];
  for (const [k, w, re] of SKILLS) {
    const inHead = re.test(head), inBody = re.test(text);
    if (inHead || inBody) { score += inHead ? w * 1.5 : w * 0.8; matched.push(k); }
  }
  const age = j.posted ? (now - new Date(j.posted)) / 864e5 : 30;
  if (age > MAX_DAYS) { drop(j, "older than " + MAX_DAYS + "d"); continue; }
  score += age <= 3 ? 4 : age <= 7 ? 3 : age <= 14 ? 2 : age <= 30 ? 1 : -2;
  score += reg === "target" ? 6 : reg === "worldwide" ? 3 : reg === "local" ? -12 : 0;
  if (j.salary?.text || j.salary?.min) score += 2;
  const c = j.contacts || contacts(j.description);
  if (c.emails.length || c.whatsapp.length || c.phones.length) score += 3;
  if (/senior|sr\./.test(title)) score -= 2;
  if (/lead|manager/.test(title)) score -= 3;
  if (j.kind === "freelance" && j.bids != null) score += j.bids < 10 ? 3 : j.bids < 25 ? 1 : -1;

  keep.push({
    id: (j.title + "|" + (j.company || "")).toLowerCase().replace(/[^a-z0-9|]+/g, "").slice(0, 120), source: j.source, kind: j.kind, title: j.title.slice(0, 140), company: (j.company || "").slice(0, 80),
    location: j.location || "Remote", region: reg, remote: true, salary: j.salary?.text || salaryFromText(j.description || "").slice(0, 60), tags: [...new Set((j.tags || []).map((t) => String(t).toLowerCase()))].slice(0, 8),
    url: j.url, description: (j.description || "").slice(0, 900), posted: j.posted || "", contacts: c, matched: [...new Set(matched)].slice(0, 8),
    country: countryOf(j), level: j.jobLevel || "", bids: j.bids ?? null, score: Math.max(1, Math.min(100, Math.round(score * 2.4))),
  });
}

// de-duplicate (same title + company across sources), keep the best score
const best = new Map();
for (const j of keep) {
  const k = (j.title + "|" + j.company).toLowerCase().replace(/[^a-z0-9|]+/g, "");
  if (!best.has(k) || best.get(k).score < j.score) best.set(k, j);
}
const max = Number(arg("max", 1500));
const all = [...best.values()].sort((a, b) => b.score - a.score || (b.posted > a.posted ? 1 : -1));
const jobs = all.filter((j) => j.kind === "job").slice(0, max);
const free = all.filter((j) => j.kind === "freelance").slice(0, 250);
const out = { generated: new Date().toISOString(), profile: { name: profile.name, email: profile.email, phone: profile.phone, portfolio: profile.portfolio, github: profile.github, linkedin: profile.linkedin, cvUrl: profile.cvUrl, templates: profile.templates, skills: cvSkills }, report, jobs: [...jobs, ...free] };

fs.mkdirSync(path.join(here, "data"), { recursive: true });
fs.writeFileSync(path.join(here, "data/jobs.json"), JSON.stringify(out));
fs.writeFileSync(path.join(here, "site/data.js"), "window.JOBHUNT = " + JSON.stringify(out) + ";\n");
if (args.includes("--debug")) console.log(Object.entries(drops).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}\t${k}`).join("\n"));
const by = (k) => jobs.reduce((m, j) => ((m[j[k]] = (m[j[k]] || 0) + 1), m), {});
console.log(`\nraw ${raw.length} → kept ${all.length}  |  jobs ${jobs.length}, freelance ${free.length}`);
console.log("regions:", JSON.stringify(by("region")), " sources:", JSON.stringify(by("source")));
console.log("with salary:", jobs.filter((j) => j.salary).length, " with contact e-mail:", jobs.filter((j) => j.contacts.emails.length).length);
