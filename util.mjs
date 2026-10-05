// Shared helpers for all sources.
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 JobSearchPersonal/1.0";

export async function get(url, { json = true, headers = {}, timeout = 30000, retries = 1 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: json ? "application/json" : "*/*", ...headers }, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (i === retries) throw new Error(`${url.slice(0, 80)} → ${e.message}`);
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&#x27;": "'", "&#x2F;": "/", "&ndash;": "–", "&mdash;": "—" };
export const decode = (s = "") => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#x27|#x2F|ndash|mdash);/g, (m) => ENT[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
export const strip = (html = "") => decode(String(html).replace(/<(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

export function contacts(text = "") {
  const emails = [...new Set((text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).filter((e) => !/\.(png|jpg|gif|svg|webp)$/i.test(e) && !/example\.com|sentry\.io|wixpress/i.test(e)))];
  const phones = [...new Set((text.match(/(?:\+|00)\d[\d\s().-]{8,16}\d/g) || []).map((p) => p.replace(/\s+/g, " ").trim()))].slice(0, 3);
  const wa = [...new Set((text.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s"'<>)]+/g) || []))];
  const tg = [...new Set((text.match(/https?:\/\/t\.me\/[^\s"'<>)]+/g) || []))];
  return { emails: emails.slice(0, 3), phones, whatsapp: wa.slice(0, 2), telegram: tg.slice(0, 2) };
}

/** minimal RSS / Atom reader (no deps) */
export function parseFeed(xml) {
  const pick = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? decode(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()) : "";
  };
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return blocks.map((b) => ({
    title: pick(b, "title"),
    link: pick(b, "link") || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "",
    description: pick(b, "description") || pick(b, "content") || pick(b, "summary"),
    date: pick(b, "pubDate") || pick(b, "published") || pick(b, "updated"),
    region: pick(b, "region"),
    category: pick(b, "category"),
    type: pick(b, "type"),
    raw: b,
  }));
}

export function salaryText({ min, max, currency, period }) {
  const f = (n) => (n >= 1000 ? Math.round(n / 100) / 10 + "k" : String(n));
  if (!min && !max) return "";
  const cur = currency ? currency + " " : "$";
  return `${cur}${min ? f(min) : ""}${min && max ? " – " : ""}${max ? f(max) : ""}${period ? " / " + period : ""}`.trim();
}

/** pull a salary range out of free text: "$80k-120k", "$4,000 - $6,000/month", "AED 15,000" … */
export function salaryFromText(text = "") {
  const m = text.match(/(?:USD|US\$|\$|AED|SAR|QAR|KWD|JOD|TRY|MYR|€|£)\s?\d[\d,.]*\s?[kK]?(?:\s?(?:-|–|—|to)\s?(?:USD|US\$|\$|AED|SAR|QAR|KWD|JOD|TRY|MYR|€|£)?\s?\d[\d,.]*\s?[kK]?)?(?:\s?(?:\/|per)\s?(?:hr|hour|month|mo|year|yr|annum))?/);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

export const toIso = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toISOString() : ""; };
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
