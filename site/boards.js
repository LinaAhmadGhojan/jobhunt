/* Ready-made search links for the big job boards (they forbid scraping, so the site builds the search for you — one click opens the
   results already filtered to remote + the last 7 days). Edit the lists below to add countries / keywords / sites. */
window.BOARDS = (() => {
  const enc = encodeURIComponent;
  const countries = [
    { id: "world", ar: "أي مكان (ريموت عالمي)", en: "Remote", indeed: "www", jooble: "jooble.org", bayt: "international", li: "Worldwide" },
    { id: "ae", ar: "الإمارات", en: "United Arab Emirates", indeed: "ae", jooble: "ae.jooble.org", bayt: "uae", li: "United Arab Emirates", naukri: "uae" },
    { id: "sa", ar: "السعودية", en: "Saudi Arabia", indeed: "sa", jooble: "sa.jooble.org", bayt: "saudi-arabia", li: "Saudi Arabia", naukri: "saudi-arabia" },
    { id: "qa", ar: "قطر", en: "Qatar", indeed: "qa", jooble: "qa.jooble.org", bayt: "qatar", li: "Qatar", naukri: "qatar" },
    { id: "kw", ar: "الكويت", en: "Kuwait", indeed: "kw", jooble: "kw.jooble.org", bayt: "kuwait", li: "Kuwait", naukri: "kuwait" },
    { id: "bh", ar: "البحرين", en: "Bahrain", indeed: "bh", jooble: "bh.jooble.org", bayt: "bahrain", li: "Bahrain", naukri: "bahrain" },
    { id: "om", ar: "عُمان", en: "Oman", indeed: "om", jooble: "om.jooble.org", bayt: "oman", li: "Oman", naukri: "oman" },
    { id: "jo", ar: "الأردن", en: "Jordan", indeed: "jo", jooble: "jo.jooble.org", bayt: "jordan", li: "Jordan" },
    { id: "tr", ar: "تركيا", en: "Turkey", indeed: "tr", jooble: "tr.jooble.org", bayt: "international", li: "Turkey" },
    { id: "my", ar: "ماليزيا", en: "Malaysia", indeed: "malaysia", jooble: "my.jooble.org", bayt: "international", li: "Malaysia" },
  ];
  const keywords = [
    { id: "laravel", label: "Laravel Developer" }, { id: "php", label: "PHP Developer" }, { id: "vue", label: "Vue.js Developer" },
    { id: "next", label: "Next.js Developer" }, { id: "full", label: "Full Stack Developer" }, { id: "back", label: "Backend Developer" },
    { id: "python", label: "Python FastAPI Developer" }, { id: "erp", label: "ERP Developer" }, { id: "web", label: "Web Developer" },
  ];
  const google = (site, kw, extra = "") => `https://www.google.com/search?q=${enc(`site:${site} ${kw} remote ${extra}`.trim())}&tbs=qdr:w`;

  // each board: name, kind, builder(country, keyword) -> url
  const boards = [
    { name: "LinkedIn", note: "ريموت + آخر أسبوع", url: (c, k) => `https://www.linkedin.com/jobs/search/?keywords=${enc(k)}&location=${enc(c.li)}&f_WT=2&f_TPR=r604800&sortBy=DD` },
    { name: "Indeed", note: "آخر 7 أيام", url: (c, k) => `https://${c.indeed}.indeed.com/jobs?q=${enc(k + " remote")}&fromage=7&sort=date` },
    { name: "Glassdoor", note: "ريموت، آخر 7 أيام", url: (c, k) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${enc(k + " remote")}&fromAge=7&remoteWorkType=1` },
    { name: "Jooble", note: "بوابة تجمّع مواقع", url: (c, k) => `https://${c.jooble}/SearchResult?ukw=${enc(k + " remote")}&date=3` },
    { name: "Bayt.com", note: "أكبر موقع عربي", url: (c, k) => `https://www.bayt.com/en/${c.bayt}/jobs/${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jobs/?jobPostingDate=7` },
    { name: "GulfTalent", note: "بحث غوغل لآخر أسبوع", url: (c, k) => google("gulftalent.com", k, c.id === "world" ? "" : c.en) },
    { name: "Naukrigulf", note: "الخليج", url: (c, k) => (c.naukri ? `https://www.naukrigulf.com/${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jobs-in-${c.naukri}` : google("naukrigulf.com", k, c.en)) },
    { name: "Wuzzuf", note: "مصر + ريموت", url: (c, k) => `https://wuzzuf.net/search/jobs/?q=${enc(k + " remote")}&a=hpb` },
    { name: "Akhtaboot / Tanqeeb", note: "الأردن", url: (c, k) => google("akhtaboot.com", k) },
    { name: "Kariyer.net", note: "تركيا", url: (c, k) => google("kariyer.net", k, "remote OR uzaktan") },
    { name: "JobStreet / Hiredly", note: "ماليزيا", url: (c, k) => `https://www.jobstreet.com.my/${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jobs` },
    { name: "Dubizzle Jobs", note: "الإمارات", url: (c, k) => google("dubizzle.com", k, "jobs") },
    { name: "Himalayas", note: "ريموت عالمي", url: (c, k) => `https://himalayas.app/jobs?q=${enc(k)}` },
    { name: "We Work Remotely", note: "ريموت عالمي", url: (c, k) => `https://weworkremotely.com/remote-jobs/search?term=${enc(k)}` },
    { name: "Wellfound (AngelList)", note: "ستارتب", url: (c, k) => `https://wellfound.com/role/r/${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
    // ── more general / aggregator boards
    { name: "Monster Gulf", note: "الخليج", url: (c, k) => google("monstergulf.com", k, c.en) },
    { name: "Careerjet", note: "تجميع", url: (c, k) => `https://www.careerjet.com/search/jobs?s=${enc(k + " remote")}&l=${enc(c.id === "world" ? "" : c.en)}&nw=7` },
    { name: "Talent.com", note: "تجميع", url: (c, k) => `https://www.talent.com/jobs?k=${enc(k + " remote")}&l=${enc(c.id === "world" ? "" : c.en)}` },
    { name: "ZipRecruiter", note: "ريموت", url: (c, k) => `https://www.ziprecruiter.com/jobs-search?search=${enc(k)}&l=Remote&days=7` },
    { name: "SimplyHired", note: "ريموت", url: (c, k) => `https://www.simplyhired.com/search?q=${enc(k)}&l=remote&t=7` },
    { name: "Dice", note: "تقنية", url: (c, k) => `https://www.dice.com/jobs?q=${enc(k)}&filters.workplaceTypes=Remote&filters.postedDate=SEVEN` },
    { name: "Built In", note: "تقنية", url: (c, k) => `https://builtin.com/jobs/remote?search=${enc(k)}` },
    { name: "Jobgether", note: "ريموت", url: (c, k) => `https://jobgether.com/search-offers?keyword=${enc(k)}` },
    // ── remote-only boards
    { name: "Remotive", note: "ريموت", url: (c, k) => `https://remotive.com/remote-jobs/software-dev?search=${enc(k)}` },
    { name: "RemoteOK", note: "ريموت", url: (c, k) => `https://remoteok.com/remote-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jobs` },
    { name: "Working Nomads", note: "ريموت", url: (c, k) => `https://www.workingnomads.com/jobs?q=${enc(k)}` },
    { name: "Remote.co", note: "ريموت", url: (c, k) => `https://remote.co/remote-jobs/search/?search_keywords=${enc(k)}` },
    { name: "FlexJobs", note: "مدفوع", url: (c, k) => `https://www.flexjobs.com/search?search=${enc(k)}` },
    { name: "JustRemote", note: "ريموت", url: (c, k) => `https://justremote.co/remote-developer-jobs` },
    { name: "Jobspresso", note: "ريموت", url: (c, k) => `https://jobspresso.co/?s=${enc(k)}` },
    { name: "Dynamite Jobs", note: "ريموت", url: (c, k) => `https://dynamitejobs.com/remote-jobs?q=${enc(k)}` },
    { name: "Remote Rocketship", note: "ريموت", url: (c, k) => `https://www.remoterocketship.com/?search=${enc(k)}` },
    { name: "NoDesk", note: "ريموت", url: (c, k) => `https://nodesk.co/remote-jobs/?q=${enc(k)}` },
    { name: "Arc.dev", note: "مطورين ريموت", url: (c, k) => `https://arc.dev/remote-jobs?q=${enc(k)}` },
    { name: "Turing", note: "مطورين ريموت", url: (c, k) => `https://www.turing.com/jobs?search=${enc(k)}` },
    { name: "Torre", note: "ريموت", url: (c, k) => `https://torre.ai/search/jobs?q=${enc(k)}&remote=true` },
    { name: "Work at a Startup (YC)", note: "ستارتب", url: (c, k) => `https://www.workatastartup.com/jobs?query=${enc(k)}&remote=yes` },
    { name: "Otta / Welcome to the Jungle", note: "ستارتب", url: (c, k) => google("welcometothejungle.com", k) },
    { name: "LaraJobs", note: "Laravel فقط", url: (c, k) => `https://larajobs.com/?s=${enc(k)}` },
    { name: "VueJobs", note: "Vue فقط", url: (c, k) => `https://vuejobs.com/jobs?q=${enc(k)}` },
    { name: "Python.org Jobs", note: "Python", url: (c, k) => `https://www.python.org/jobs/?q=${enc(k)}&remote=on` },
    { name: "Hacker News — Who is hiring", note: "إيميلات مباشرة", url: (c, k) => `https://hnhiring.com/search?q=${enc(k + " remote")}` },
    // ── Gulf / MENA / Turkey / Malaysia local boards (Google site: search, last week)
    { name: "Tanqeeb", note: "الشرق الأوسط", url: (c, k) => google("tanqeeb.com", k, c.en) },
    { name: "Emirates Jobs / JobsInDubai", note: "الإمارات", url: (c, k) => google("jobsindubai.com", k) },
    { name: "Qatar Living Jobs", note: "قطر", url: (c, k) => google("qatarliving.com", k, "jobs") },
    { name: "Q8 / Kuwait jobs", note: "الكويت", url: (c, k) => google("q8careers.com OR kuwait.jobsora.com", k) },
    { name: "Bahrain Jobs", note: "البحرين", url: (c, k) => google("bahrainjobs.com OR bayt.com/en/bahrain", k) },
    { name: "Oman Jobs", note: "عُمان", url: (c, k) => google("omanjobs.com OR bayt.com/en/oman", k) },
    { name: "Mihnati / Taqat / Tamheer", note: "السعودية", url: (c, k) => google("mihnati.com OR taqat.sa OR tamheer.sa", k) },
    { name: "Jordan Jobs / Wadhefa", note: "الأردن", url: (c, k) => google("jordanjobs.net OR wadhefa.com OR akhtaboot.com", k) },
    { name: "Yenibiris / SecretCV", note: "تركيا", url: (c, k) => google("yenibiris.com OR secretcv.com", k, "remote OR uzaktan") },
    { name: "Maukerja / Jobs.my / Monster MY", note: "ماليزيا", url: (c, k) => google("maukerja.my OR jobs.my OR monster.com.my", k) },
    { name: "Glassdoor — الخليج", note: "", url: (c, k) => google("glassdoor.com", k, c.en) },
  ];

  const freelanceBoards = [
    { name: "مستقل Mostaql", note: "أكبر موقع مشاريع عربي (عملاء خليجيين)", url: (k) => `https://mostaql.com/projects?keyword=${enc(k)}&sort=latest` },
    { name: "نفذلي Nafezly", note: "مشاريع عربية", url: (k) => `https://nafezly.com/projects?search=${enc(k)}` },
    { name: "خمسات Khamsat", note: "اعرضي خدماتك + طلبات", url: (k) => `https://khamsat.com/community/requests?query=${enc(k)}` },
    { name: "Upwork", note: "الأحدث أولاً", url: (k) => `https://www.upwork.com/nx/search/jobs/?q=${enc(k)}&sort=recency` },
    { name: "Freelancer", note: "مشاريع بالميزانية", url: (k) => `https://www.freelancer.com/jobs/?keyword=${enc(k)}` },
    { name: "PeoplePerHour", note: "", url: (k) => `https://www.peopleperhour.com/freelance-jobs?q=${enc(k)}` },
    { name: "Guru", note: "", url: (k) => `https://www.guru.com/d/jobs/q/${enc(k)}/` },
    { name: "Fiverr", note: "اعرضي خدمة ثابتة", url: (k) => `https://www.fiverr.com/search/gigs?query=${enc(k)}` },
    { name: "Workana", note: "عربي/إنجليزي", url: (k) => `https://www.workana.com/en/jobs?query=${enc(k)}&publication=1d` },
    { name: "Freelancermap", note: "", url: (k) => `https://www.freelancermap.com/projects?query=${enc(k)}` },
    { name: "Truelancer", note: "", url: (k) => `https://www.truelancer.com/freelance-jobs?q=${enc(k)}` },
    { name: "Toptal", note: "نخبة — تقديم كمطورة", url: () => `https://www.toptal.com/freelance-jobs/developers` },
    { name: "Gun.io", note: "عقود ريموت", url: () => `https://gun.io/find-work/` },
    { name: "Contra", note: "مستقلين بدون عمولة", url: (k) => `https://contra.com/opportunities?search=${enc(k)}` },
    { name: "Malt", note: "أوروبا/خليج", url: (k) => `https://www.malt.com/s?q=${enc(k)}` },
    { name: "Codeable", note: "WordPress / WooCommerce", url: () => `https://www.codeable.io/developers/apply/` },
    { name: "Crossover", note: "ريموت بدوام", url: (k) => `https://www.crossover.com/jobs?search=${enc(k)}` },
    { name: "Reddit r/forhire", note: "[HIRING] جديد", url: () => `https://www.reddit.com/r/forhire/search/?q=%5BHIRING%5D&restrict_sr=1&sort=new` },
    { name: "Dubizzle خدمات / Haraj", note: "الخليج — إعلانات", url: (k) => `https://www.google.com/search?q=${enc("site:haraj.com.sa OR site:dubizzle.com مطلوب مبرمج " + k)}&tbs=qdr:w` },
  ];

  // where Gulf business owners post "I need a website / developer" (open the search, newest first)
  const postSearches = [
    { name: "LinkedIn — منشورات (آخر أسبوع)", url: (q) => `https://www.linkedin.com/search/results/content/?keywords=${enc(q)}&datePosted=%22past-week%22&sortBy=%22date_posted%22` },
    { name: "X / Twitter — الأحدث", url: (q) => `https://x.com/search?q=${enc(q)}&f=live` },
    { name: "Facebook (عبر غوغل) — مجموعات", url: (q) => `https://www.google.com/search?q=${enc(`site:facebook.com ${q}`)}&tbs=qdr:w` },
    { name: "Telegram (عبر غوغل)", url: (q) => `https://www.google.com/search?q=${enc(`site:t.me ${q}`)}&tbs=qdr:w` },
    { name: "Instagram (عبر غوغل)", url: (q) => `https://www.google.com/search?q=${enc(`site:instagram.com ${q}`)}&tbs=qdr:w` },
    { name: "Reddit", url: (q) => `https://www.reddit.com/search/?q=${enc(q)}&sort=new&t=week` },
  ];
  const postQueries = [
    { ar: "مطلوب مبرمج موقع (خليجي)", q: "مطلوب مبرمج موقع الكتروني" },
    { ar: "مطلوب مطور لارافل", q: "مطلوب مطور لارافل OR \"Laravel\" عن بعد" },
    { ar: "مطلوب تصميم موقع عقارات", q: "مطلوب تصميم موقع عقارات" },
    { ar: "مطلوب موقع/تطبيق مطعم", q: "مطلوب موقع مطعم OR \"نظام مطعم\" OR \"تطبيق مطعم\"" },
    { ar: "مطلوب متجر إلكتروني", q: "مطلوب متجر الكتروني OR \"تصميم متجر\"" },
    { ar: "مطلوب موقع محل عطور", q: "مطلوب موقع متجر عطور" },
    { ar: "freelance developer needed (EN)", q: "\"looking for a developer\" laravel OR vue OR nextjs UAE OR Saudi OR Qatar OR Kuwait" },
    { ar: "مطلوب نظام ERP / محاسبة", q: "مطلوب نظام ERP OR \"نظام محاسبة\" OR \"نظام مخازن\"" },
  ];

  // Gulf business segments: what to offer from the live portfolio + message
  const segments = [
    { id: "realestate", ar: "مكاتب عقارات", icon: "🏢", offer: "موقع عقارات بخريطة وبحث وفلاتر + لوحة تحكم للوكلاء", demo: "real-estate (قيد التجهيز) / Booking SaaS", demoUrl: "booking-saas/", maps: "real estate agency" },
    { id: "restaurant", ar: "مطاعم وكافيهات", icon: "🍽️", offer: "منيو QR + شاشة مطبخ مباشرة + مخزون وتقارير مبيعات", demo: "Restaurant OS", demoUrl: "restaurant-os/", maps: "restaurant" },
    { id: "store", ar: "متاجر إلكترونية", icon: "🛍️", offer: "متجر كامل (سلة، دفع، تتبّع) + لوحة إدارة", demo: "وصلة + LumeCare", demoUrl: "wasla/", maps: "online store" },
    { id: "perfume", ar: "محلات عطور وتجميل", icon: "🧴", offer: "واجهة متجر أنيقة للعطور/التجميل مع سلة وروتين منتجات", demo: "Skincare Store", demoUrl: "skincare-demo/", maps: "perfume shop" },
    { id: "clinic", ar: "عيادات ومراكز طبية", icon: "🦷", offer: "حجز مواعيد + سجلات مرضى + فواتير + طابور حيّ", demo: "Dental Clinic", demoUrl: "dental-clinic/", maps: "dental clinic" },
    { id: "pharmacy", ar: "صيدليات", icon: "💊", offer: "مخزون بالدفعات وتنبيه انتهاء + نقطة بيع", demo: "Pharmacy Manager", demoUrl: "pharmacy-manager/", maps: "pharmacy" },
    { id: "salon", ar: "صالونات / نوادي / حجوزات", icon: "💇", offer: "نظام حجز متعدد الفروع مع اشتراكات", demo: "Booking SaaS", demoUrl: "booking-saas/", maps: "salon" },
    { id: "factory", ar: "مصانع وشركات إنتاج", icon: "🏭", offer: "نظام تصنيع: أوامر إنتاج، مواد خام، تتبّع دفعات وسيريال", demo: "MFP Manufacturing", demoUrl: "manufacturing/", maps: "factory" },
    { id: "logistics", ar: "شركات نقل وشحن", icon: "🚚", offer: "بوالص، توزيع سائقين، تتبّع مباشر، فواتير", demo: "Masar Logistics", demoUrl: "masar-logistics/", maps: "logistics company" },
    { id: "school", ar: "مدارس ومراكز تعليم", icon: "🎓", offer: "منصة دورات واختبارات ولوحات للمعلم والطالب", demo: "Education Platform / Gamified Learning", demoUrl: "edu-platform/", maps: "training center" },
  ];
  const cities = [
    { ar: "دبي", en: "Dubai" }, { ar: "أبوظبي", en: "Abu Dhabi" }, { ar: "الرياض", en: "Riyadh" }, { ar: "جدة", en: "Jeddah" }, { ar: "الدمام", en: "Dammam" },
    { ar: "الدوحة", en: "Doha" }, { ar: "الكويت", en: "Kuwait City" }, { ar: "المنامة", en: "Manama" }, { ar: "مسقط", en: "Muscat" }, { ar: "عمّان", en: "Amman" },
    { ar: "إسطنبول", en: "Istanbul" }, { ar: "كوالالمبور", en: "Kuala Lumpur" },
  ];
  // group every board so the dashboard can filter by site type
  const G = {
    major: ["LinkedIn", "Indeed", "Glassdoor", "Jooble", "Bayt", "GulfTalent", "Naukrigulf", "Monster Gulf", "Careerjet", "Talent.com", "ZipRecruiter", "SimplyHired", "Dice", "Built In", "Jobgether"],
    remote: ["Himalayas", "We Work Remotely", "Remotive", "RemoteOK", "Working Nomads", "Remote.co", "FlexJobs", "JustRemote", "Jobspresso", "Dynamite", "Remote Rocketship", "NoDesk", "Arc.dev", "Turing", "Torre", "Work at a Startup", "Otta", "LaraJobs", "VueJobs", "Python.org", "Hacker News", "Wellfound"],
    gulf: ["Wuzzuf", "Akhtaboot", "Tanqeeb", "Dubizzle", "Emirates Jobs", "Qatar Living", "Q8", "Bahrain Jobs", "Oman Jobs", "Mihnati", "Jordan Jobs", "Glassdoor — الخليج"],
    tm: ["Kariyer", "Yenibiris", "JobStreet", "Maukerja"],
  };
  const groupOf = (name) => Object.entries(G).find(([, l]) => l.some((x) => name.includes(x)))?.[0] || "remote";
  boards.forEach((b) => { b.group = groupOf(b.name); b.linkOnly = G.major.some((x) => b.name.includes(x)); });
  freelanceBoards.forEach((b) => { b.group = "freelance"; });
  const groups = [["all", "الكل"], ["major", "المواقع الكبيرة (LinkedIn, Indeed, Bayt…)"], ["remote", "ريموت فقط"], ["gulf", "الخليج / الأردن / مصر"], ["tm", "تركيا وماليزيا"], ["freelance", "عمل حر"]];
  return { countries, keywords, boards, freelanceBoards, postSearches, postQueries, segments, cities, groups };
})();
