export const resumeData = {
  meta: {
    name: "Ashton Hawkins",
    title: "Digital Experience & Growth Leader",
    location: "San Francisco Bay Area",
    email: "ashtonhawkins@gmail.com",
    website: "https://www.ashtonhawkins.com",
    links: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/ashtonhawkins" },
      { label: "Writing", url: "https://www.ashtonhawkins.com/writing" },
      { label: "Now", url: "https://www.ashtonhawkins.com/now" }
    ]
  },
  positioning:
    "I build high-performing web experiences and the digital operations behind them—experimentation, CRO/SEO, taxonomy & structured data, content systems, analytics, and platform/process modernization. I turn messy ecosystems into compounding, organic-led growth.",
  highlights: [
    {
      value: "~30%",
      label: "Brand engagement lift",
      context: "via organic-led acquisition and content/taxonomy improvements"
    },
    {
      value: "+20%",
      label: "YoY category sales",
      context: "after catalog and merchandising improvements"
    },
    { value: "7", label: "Team members led", context: "plus a multi-vendor SaaS stack and provider agreements" },
    { value: "+177%", label: "Digital category traffic", context: "Walmart 'Project Windex' award" }
  ],
  experience: [
    {
      role: "Portfolio lead, Web Experience & Optimization",
      employer_public: "Healthcare ecommerce (confidential)",
      employer_full: "Two healthcare ecommerce businesses",
      location: "Remote",
      dates: { startYear: "2022", endYear: null },
      summary:
        "Operate across two healthcare ecommerce orgs leading web experience, experimentation, SEO/IA, performance, analytics, and day-to-day site ops.",
      bullets: [
        "Built a modernization framework across platforms, automation, and KPI dashboards.",
        "Shifted to organic-led acquisition while reducing paid spend; increased engagement.",
        "Owned SaaS P&L and vendor agreements; led cross-org implementations.",
        "Stood up onboarding/training and a durable shipping cadence."
      ],
      confidential: true
    },
    {
      role: "Site Operations Manager, Digital Merchandising",
      employer_public: "Walmart",
      employer_full: "Walmart",
      location: "SF Bay Area & Remote",
      dates: { startYear: "2020", endYear: "2021" },
      bullets: [
        "Managed a multi-$B digital category end-to-end (SEO, UX/CX, content, taxonomy, analytics, paid search, merchandising).",
        "Delivered +20% YoY category sales via catalog and merchandising improvements.",
        "Led 5 Site Merchants + 2 Content Managers; OKRs and operating rhythms."
      ],
      confidential: false
    },
    {
      role: "Optimization & Structured Data Lead",
      employer_public: "Walmart eCommerce",
      employer_full: "Walmart eCommerce",
      location: "San Francisco Bay Area",
      dates: { startYear: "2018", endYear: "2020" },
      bullets: [
        "Led CRO and site-speed programs; codified technical/experience best practices.",
        "Rebuilt IA for Home/Patio & Garden; improved internal search and browse.",
        "Implemented attribution to automate merchandising and increase external relevance."
      ],
      confidential: false
    },
    {
      role: "Consultant",
      employer_public: "Cultivox Communications",
      employer_full: "Cultivox Communications",
      location: "Remote",
      dates: { startYear: "2014", endYear: "2018" },
      bullets: [
        "Strategy frameworks for small enterprises: brand, content, CX, analytics.",
        "Templates and trainings to improve digital execution and policy understanding."
      ],
      confidential: false
    }
  ],
  caseStudies: [
    {
      name: "Healthcare ecommerce modernization",
      context: "Portfolio (confidential)",
      problem: "Fragmented stack, paid-heavy acquisition, weak visibility into KPIs.",
      approach: [
        "Experimentation program",
        "Taxonomy/structured data unification",
        "Content standards",
        "Performance tuning"
      ],
      outcomes: [
        "~30% engagement lift with lower paid spend",
        "Faster releases with fewer regressions"
      ]
    },
    {
      name: "Category growth at scale",
      context: "Walmart",
      problem: "Flat growth in a core digital category.",
      approach: [
        "Catalog quality fixes",
        "On-page SEO & merchandising automation",
        "Analytics-driven roadmap"
      ],
      outcomes: [
        "+20% YoY category sales",
        "Improved search/browse journeys"
      ]
    },
    {
      name: "Project Windex",
      context: "Walmart (award-winning)",
      problem: "Outdated omnichannel experience for window shopping.",
      approach: [
        "Customer journey redesign",
        "Omnichannel taxonomy & content",
        "Performance & SEO improvements"
      ],
      outcomes: [
        "+177% digital category traffic",
        "Improved revenue & profit"
      ]
    }
  ],
  competencies: [
    "Ecommerce strategy",
    "Experimentation/CRO",
    "SEO",
    "Information architecture & taxonomy",
    "Analytics & dashboards",
    "Web merchandising",
    "SaaS stack ownership",
    "Org enablement & training"
  ],
  keywords: [
    "Core Web Vitals (LCP/CLS/INP)",
    "semantic search & vector search",
    "Consent Mode v2",
    "first-party data",
    "GA4 BigQuery",
    "server-side tagging",
    "predictive personalization",
    "AI-assisted merchandising",
    "taxonomy/IA",
    "catalog quality",
    "feature flags",
    "edge rendering",
    "structured data (schema.org)"
  ],
  awards: [
    {
      name: "Digital & Tech Team of the Year",
      issuer: "Walmart",
      year: "2021",
      notes: "Project Windex — +177% digital category traffic"
    }
  ],
  education: [
    { school: "College of Charleston", credential: "BA, English / Political Science" },
    { school: "University of Northampton", credential: "Political Strategy (2008)" }
  ],
  privacy: {
    defaultConfidential: true,
    rules: {
      datesPrecisionWhenConfidential: "year",
      employerLabelFieldWhenConfidential: "employer_public"
    }
  }
} as const;
