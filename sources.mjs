// One function per source. Each returns an array of raw jobs: { source, kind, title, company, location, tags, salary, url, description, posted, contacts, locationList? }
// Only public, no-login endpoints are used (official APIs / RSS). A failing source never stops the run.
import { get, strip, decode, contacts, parseFeed, salaryText, salaryFromText, toIso, pause } from "./util.mjs";

const job = (o) => ({ kind: "job", tags: [], salary: { text: "" }, location: "", company: "", description: "", contacts: contacts(o.description || ""), ...o });

/* ───────────── remote job boards (employment) ───────────── */

async function remotive(p) {
  const out = new Map();
  for (const q of p.queries) {
    const j = await get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=100`);
    for (const x of j.jobs || []) out.set(x.id, job({
      source: "Remotive", title: x.title, company: x.company_name, location: x.candidate_required_location, tags: x.tags || [],
      salary: { text: x.salary || "" }, url: x.url, description: strip(x.description).slice(0, 4000), posted: toIso(x.publication_date), jobType: x.job_type,
    }));
    await pause(300);
  }
  return [...out.values()];
}

async function remoteok(p) {
  const out = new Map();
  for (const tag of ["php", "laravel", "vue", "react", "next", "python", "fullstack", "backend", "typescript", "dev"]) {
    try {
      const j = await get(`https://remoteok.com/api?tag=${tag}`);
      for (const x of j.slice(1)) out.set(x.id, job({
        source: "RemoteOK", title: x.position, company: x.company, location: x.location || "Worldwide", tags: x.tags || [],
        salary: { min: x.salary_min || 0, max: x.salary_max || 0, currency: "USD", period: "year", text: x.salary_min ? salaryText({ min: x.salary_min, max: x.salary_max, currency: "$", period: "year" }) : "" },
        url: x.url || x.apply_url, description: strip(x.description).slice(0, 4000), posted: toIso(x.date),
      }));
    } catch { /* tag without results */ }
    await pause(400);
  }
  return [...out.values()];
}

async function himalayas(p) {
  const out = new Map();
  for (const q of ["laravel", "php", "vue", "react", "next.js", "python", "fastapi", "full stack", "backend", "typescript", "erp", "web developer"]) {
    for (let page = 1; page <= 4; page++) {
      try {
        const j = await get(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&sort=recent&page=${page}`);
        if (!j.jobs?.length) break;
        for (const x of j.jobs) out.set(x.guid || x.applicationLink || x.title + x.companyName, job({
          source: "Himalayas", title: x.title, company: x.companyName, location: (x.locationRestrictions || []).join(", ") || "Worldwide", locationList: x.locationRestrictions || [],
          tags: [...(x.categories || []), ...(x.seniority || [])], salary: { min: x.minSalary || 0, max: x.maxSalary || 0, currency: x.currency || "USD", period: "year", text: x.minSalary ? salaryText({ min: x.minSalary, max: x.maxSalary, currency: x.currency || "USD", period: "year" }) : "" },
          url: x.applicationLink || x.guid, description: strip(x.description || x.excerpt).slice(0, 4000), posted: toIso(x.pubDate ? x.pubDate * 1000 : ""), jobLevel: (x.seniority || []).join(","),
        }));
      } catch { break; }
      await pause(300);
    }
  }
  return [...out.values()];
}

async function workingNomads() {
  const j = await get("https://www.workingnomads.com/api/exposed_jobs/");
  return j.map((x) => job({
    source: "Working Nomads", title: x.title, company: x.company_name, location: x.location || "Anywhere", tags: String(x.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    url: x.url, description: strip(x.description).slice(0, 4000), posted: toIso(x.pub_date),
  }));
}

async function weWorkRemotely() {
  const out = [];
  for (const cat of ["remote-back-end-programming-jobs", "remote-full-stack-programming-jobs", "remote-front-end-programming-jobs", "remote-programming-jobs"]) {
    try {
      for (const f of parseFeed(await get(`https://weworkremotely.com/categories/${cat}.rss`, { json: false }))) {
        const [company, ...rest] = f.title.split(": ");
        out.push(job({ source: "We Work Remotely", title: rest.join(": ") || f.title, company, location: f.region || "Anywhere", tags: [f.category].filter(Boolean), url: f.link, description: strip(f.description).slice(0, 4000), posted: toIso(f.date) }));
      }
    } catch { /* feed down */ }
  }
  return out;
}

async function larajobs() {
  return parseFeed(await get("https://larajobs.com/feed", { json: false })).map((f) => {
    const [company, ...rest] = f.title.split(" - ");
    return job({ source: "LaraJobs", title: rest.join(" - ") || f.title, company, location: /remote/i.test(f.title + f.description) ? "Remote" : "", tags: ["laravel", "php"], url: f.link, description: strip(f.description).slice(0, 4000), posted: toIso(f.date) });
  });
}

const CC = { AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", JO: "Jordan", TR: "Turkey", MY: "Malaysia", EG: "Egypt", LB: "Lebanon", MA: "Morocco", TN: "Tunisia", PK: "Pakistan", IN: "India" };
async function vuejobs() {
  return parseFeed(await get("https://vuejobs.com/feed", { json: false })).map((f) => {
    const company = (f.description.match(/Employer:\s*<?\/?\w*>?\s*([^<\n]+)/) || [])[1]?.trim() || "";
    let loc = (f.description.match(/Location:\s*<?\/?\w*>?\s*([^<\n]+)/) || [])[1]?.trim() || "";
    loc = loc.replace(/,\s*([A-Z]{2})$/, (m, cc) => ", " + (CC[cc] || cc));
    const body = strip(f.description);
    return job({ source: "VueJobs", title: f.title, company, location: /remote/i.test(f.title + " " + body.slice(0, 400)) && !loc ? "Remote" : loc, tags: ["vue"], url: f.link.split("?")[0], description: body.slice(0, 4000), posted: toIso(f.date) });
  });
}

async function remoteYeah() {
  return parseFeed(await get("https://remoteyeah.com/rss.xml", { json: false })).map((f) => {
    const loc = (f.description.match(/Locations?:\s*([^<]+)/) || [])[1]?.trim() || "";
    const sk = (f.description.match(/Skills:\s*([^<]+)/) || [])[1] || "";
    return job({ source: "RemoteYeah", title: f.title.replace(/^Remote\s+/i, "").replace(/\s+at\s+.+$/, ""), company: (f.raw.match(/<company>\s*([^<]+)</) || [])[1]?.trim() || (f.title.match(/ at (.+)$/) || [])[1] || "", location: loc || "Remote", tags: sk.split(",").map((x) => x.trim()).filter(Boolean), url: f.link, description: strip(f.description).slice(0, 4000), posted: toIso(f.date) });
  });
}

async function noDesk() {
  return parseFeed(await get("https://nodesk.co/remote-jobs/index.xml", { json: false })).map((f) => job({
    source: "NoDesk", title: f.title.replace(/\s+at\s+.+$/, ""), company: (f.title.match(/ at (.+)$/) || [])[1] || "", location: "Remote", url: f.link, description: strip(f.description).slice(0, 3000), posted: toIso(f.date),
  }));
}

async function workingNomadsSearch(p) {
  const out = new Map();
  for (const q of p.queries) {
    try {
      const j = await get(`https://workingnomads.com/jobsapi/_search?q=${encodeURIComponent(q)}&size=100`);
      for (const h of j.hits?.hits || []) {
        const x = h._source;
        out.set(x.id, job({ source: "Working Nomads", title: x.title, company: x.company, location: x.location || "Anywhere", tags: String(x.tags || "").split(",").map((t) => t.trim()).filter(Boolean), url: "https://www.workingnomads.com/jobs/" + x.slug, description: strip(x.description).slice(0, 4000), posted: toIso(x.pub_date) }));
      }
    } catch { /* no results */ }
    await pause(250);
  }
  return [...out.values()];
}

/** Jooble (aggregates Gulf / Turkey / Malaysia boards). Free API key: https://jooble.org/api/about  ->  set JOOBLE_KEY */
async function jooble(p) {
  const key = process.env.JOOBLE_KEY;
  if (!key) throw new Error("skipped — set JOOBLE_KEY (free at jooble.org/api/about)");
  const out = [];
  const places = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Turkey", "Malaysia"];
  for (const location of places) for (const q of ["laravel remote", "php remote", "vue remote", "full stack remote", "react remote", "python remote", "backend remote"]) {
    const res = await fetch(`https://jooble.org/api/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keywords: q, location, page: 1 }) });
    if (!res.ok) continue;
    for (const x of (await res.json()).jobs || []) out.push(job({ source: "Jooble", title: strip(x.title), company: x.company, location: x.location + " · " + location, tags: [], salary: { text: x.salary || "" }, url: x.link, description: strip(x.snippet).slice(0, 2000), posted: toIso(x.updated) }));
    await pause(300);
  }
  return out;
}

/** Adzuna (UAE not covered; Turkey/Malaysia absent) – optional: ADZUNA_ID + ADZUNA_KEY (free at developer.adzuna.com) */
async function adzuna(p) {
  const id = process.env.ADZUNA_ID, key = process.env.ADZUNA_KEY;
  if (!id || !key) throw new Error("skipped — set ADZUNA_ID and ADZUNA_KEY");
  const out = [];
  for (const q of ["laravel", "php developer", "vue developer", "full stack developer"]) for (const c of ["gb", "ca", "au", "sg", "za", "in"]) {
    try {
      const j = await get(`https://api.adzuna.com/v1/api/jobs/${c}/search/1?app_id=${id}&app_key=${key}&results_per_page=50&what=${encodeURIComponent(q + " remote")}`);
      for (const x of j.results || []) out.push(job({ source: "Adzuna", title: x.title, company: x.company?.display_name, location: (x.location?.display_name || "") + " · remote", salary: { min: x.salary_min || 0, max: x.salary_max || 0, currency: "", period: "year", text: x.salary_min ? salaryText({ min: Math.round(x.salary_min), max: Math.round(x.salary_max || 0), currency: "", period: "year" }) : "" }, url: x.redirect_url, description: strip(x.description).slice(0, 2000), posted: toIso(x.created) }));
    } catch { /* ignore */ }
  }
  return out;
}

async function pythonJobs() {
  return parseFeed(await get("https://www.python.org/jobs/feed/rss/", { json: false })).filter((f) => /remote|anywhere|telecommut/i.test(f.title + f.description)).map((f) => job({
    source: "Python.org", title: f.title.replace(/^.*?,\s*/, "") || f.title, company: (f.title.match(/^([^,]+),/) || [])[1] || "", location: "Remote", tags: ["python"], url: f.link, description: strip(f.description).slice(0, 4000), posted: toIso(f.date),
  }));
}

/** Hacker News "Who is hiring?" — hundreds of remote jobs per month, many with a direct e-mail address */
async function hackerNews() {
  const list = await get("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10");
  const threads = list.hits.filter((h) => /^Ask HN: Who is hiring\?/i.test(h.title)).slice(0, 2);
  const out = [];
  for (const t of threads) {
    for (let page = 0; page < 8; page++) {
      const j = await get(`https://hn.algolia.com/api/v1/search?tags=comment,story_${t.objectID}&hitsPerPage=1000&page=${page}`);
      for (const c of j.hits) {
        if (String(c.parent_id) !== String(t.objectID) || !c.comment_text) continue;
        const text = strip(c.comment_text);
        if (!/remote|anywhere|worldwide/i.test(text.slice(0, 600))) continue;
        const parts = text.split("\n")[0].split("|").map((s) => s.trim());
        out.push(job({
          source: "HN Who's Hiring", title: parts[1] || parts[0].slice(0, 90), company: parts[0].slice(0, 60), location: parts.find((x) => /remote|onsite|hybrid|anywhere|worldwide|[A-Z][a-z]+,/i.test(x)) || "Remote",
          tags: [], salary: { text: salaryFromText(text.slice(0, 800)) }, url: `https://news.ycombinator.com/item?id=${c.objectID}`, description: text.slice(0, 4000), posted: toIso(c.created_at),
        }));
      }
      if (page + 1 >= j.nbPages) break;
    }
  }
  return out;
}

/* ───────────── freelance projects ───────────── */

async function freelancer(p) {
  const out = new Map();
  for (const q of p.freelanceQueries) {
    try {
      const j = await get(`https://www.freelancer.com/api/projects/0.1/projects/active/?query=${encodeURIComponent(q)}&limit=40&compact=true&job_details=true&full_description=true&sort_field=submitdate`);
      for (const x of j.result?.projects || []) {
        const bids = x.bid_stats?.bid_count ?? 0;
        if (bids > 40) continue; // too crowded
        const b = x.budget || {};
        out.set(x.id, job({
          source: "Freelancer.com", kind: "freelance", title: x.title, company: "Freelancer.com client", location: "Remote (online project)", tags: (x.jobs || []).map((s) => s.name).slice(0, 8),
          salary: { min: b.minimum || 0, max: b.maximum || 0, currency: x.currency?.code || "USD", period: x.type === "hourly" ? "hour" : "fixed", text: b.minimum ? salaryText({ min: b.minimum, max: b.maximum, currency: x.currency?.code || "USD", period: x.type === "hourly" ? "hour" : "fixed" }) : "" },
          url: `https://www.freelancer.com/projects/${x.seo_url}`, description: strip(x.description || x.preview_description).slice(0, 3000), posted: toIso(x.time_submitted ? x.time_submitted * 1000 : ""), bids,
        }));
      }
    } catch { /* query without results */ }
    await pause(400);
  }
  return [...out.values()];
}

async function reddit() {
  const out = [];
  for (const sub of ["forhire", "hiring", "remotejs", "DeveloperJobs"]) {
    try {
      for (const f of parseFeed(await get(`https://www.reddit.com/r/${sub}/new/.rss`, { json: false }))) {
        if (sub === "forhire" && !/\[hiring\]/i.test(f.title)) continue;
        const text = strip(f.description);
        out.push(job({ source: `Reddit r/${sub}`, kind: "freelance", title: f.title.replace(/^\[hiring\]\s*/i, ""), company: "Reddit poster", location: /remote/i.test(f.title + text) ? "Remote" : "", tags: [], salary: { text: salaryFromText(f.title + " " + text) }, url: f.link, description: text.slice(0, 3000), posted: toIso(f.date) }));
      }
    } catch { /* subreddit feed blocked */ }
    await pause(700);
  }
  return out;
}

/* ───────────── LinkedIn (public "guest" search pages, low volume) ─────────────
   LinkedIn has no jobs API. This reads the same public result pages you see when logged out (remote filter, last 7 days),
   a few polite requests per run. It is against LinkedIn's terms for automated use, so it is optional (LINKEDIN=off to disable)
   and it stops by itself if LinkedIn rate-limits. Job descriptions are not fetched. */
async function linkedin(p) {
  if ((process.env.LINKEDIN || "").toLowerCase() === "off") throw new Error("skipped — LINKEDIN=off");
  const queries = ["laravel", "php developer", "vue.js developer", "next.js developer", "react developer", "full stack developer", "backend developer", "software engineer", "web developer", "python fastapi", "erp developer"];
  const places = [["Worldwide", 3], ["United Arab Emirates", 3], ["Saudi Arabia", 3], ["Qatar", 2], ["Kuwait", 2], ["Bahrain", 2], ["Oman", 2], ["Jordan", 2], ["Turkey", 2], ["Malaysia", 2]];
  const out = new Map();
  let blocked = false;
  const attr = (s, re) => decode((s.match(re) || [])[1] || "").replace(/\s+/g, " ").trim();
  for (const [place, pages] of places) for (const q of queries) for (let pg = 0; pg < pages && !blocked; pg++) {
    try {
      const html = await get(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(place)}&f_WT=2&f_TPR=r604800&sortBy=DD&start=${pg * 25}`, { json: false, retries: 0 });
      for (const card of html.split("<li>").slice(1)) {
        const id = (card.match(/jobPosting:(\d+)/) || [])[1];
        const title = attr(card, /base-search-card__title[^>]*>\s*([^<]+)/);
        if (!id || !title) continue;
        out.set(id, job({
          source: "LinkedIn", title, company: attr(card, /base-search-card__subtitle[^>]*>[\s\S]*?<a[^>]*>\s*([^<]+)/) || attr(card, /base-search-card__subtitle[^>]*>\s*([^<]+)/),
          location: attr(card, /job-search-card__location[^>]*>\s*([^<]+)/) || place, tags: [q], url: `https://www.linkedin.com/jobs/view/${id}`,
          description: `LinkedIn · ${q} · ${place}`, posted: toIso((card.match(/datetime="([^"]+)"/) || [])[1]), contacts: { emails: [], phones: [], whatsapp: [], telegram: [] },
        }));
      }
    } catch (e) { if (/429|999|403/.test(e.message)) blocked = true; }
    await pause(900);
  }
  if (!out.size) throw new Error("no results (LinkedIn may be rate-limiting this connection — try later)");
  return [...out.values()];
}

/* ───────────── JSearch API (Google for Jobs): Indeed · LinkedIn · Glassdoor · Bayt · GulfTalent · ZipRecruiter … ─────────────
   Indeed / Glassdoor / Bayt / GulfTalent block every automated request (Cloudflare), so the only clean way to get them inside
   the tool is an aggregator API. Free plan (~200 requests / month): https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
   Put the key in jobhunt/.env →  JSEARCH_KEY=...    (JSEARCH_MAX = requests per run, default 30) */
async function jsearch(p) {
  const key = process.env.JSEARCH_KEY;
  if (!key) throw new Error("skipped — add JSEARCH_KEY to .env to get Indeed / Glassdoor / Bayt / GulfTalent results (see README)");
  const max = Number(process.env.JSEARCH_MAX || 30);
  const places = ["", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Turkey", "Malaysia"];
  const queries = ["laravel developer", "php developer", "vue.js developer", "full stack developer"];
  const out = new Map();
  let calls = 0;
  for (const q of queries) for (const place of places) {
    if (calls++ >= max) break;
    try {
      const j = await get(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${q} remote${place ? " in " + place : ""}`)}&page=1&num_pages=1&date_posted=week&remote_jobs_only=true`, { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" } });
      for (const x of j.data || []) {
        const sal = x.job_min_salary ? salaryText({ min: Math.round(x.job_min_salary), max: Math.round(x.job_max_salary || 0), currency: x.job_salary_currency || "USD", period: (x.job_salary_period || "").toLowerCase() }) : "";
        out.set(x.job_id, job({
          source: (x.job_publisher || "JSearch").replace(/\.com$/i, "").replace(/^www\./, ""), title: x.job_title, company: x.employer_name,
          location: [x.job_city, x.job_state, x.job_country].filter(Boolean).join(", ") || (x.job_is_remote ? "Remote" : ""), tags: x.job_required_skills || [],
          salary: { min: x.job_min_salary || 0, max: x.job_max_salary || 0, currency: x.job_salary_currency || "USD", period: (x.job_salary_period || "").toLowerCase(), text: sal },
          url: x.job_apply_link || x.job_google_link, description: strip(x.job_description).slice(0, 4000), posted: toIso(x.job_posted_at_datetime_utc),
        }));
      }
    } catch (e) { if (/429|403/.test(e.message)) return [...out.values()]; }
    await pause(400);
  }
  return [...out.values()];
}

export const SOURCES = { linkedin, jsearch, remotive, remoteok, himalayas, workingNomadsSearch, weWorkRemotely, larajobs, vuejobs, remoteYeah, noDesk, pythonJobs, hackerNews, jooble, adzuna, freelancer, reddit };
