export type Expert = {
  name: string;
  title: string;
  specialty: string;
};

export type TeamBucket = {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  summary: string;
  whatWeDo: string[];
  howWeHelp: string[];
  experts: Expert[];
};

export const teamBuckets: TeamBucket[] = [
  {
    slug: "economic-impact-studies",
    name: "Economic Impact Studies",
    shortName: "EIS",
    accent: "#b22c2e",
    summary:
      "Quantify direct, indirect, and induced impacts for board-level decisions and public-private alignment.",
    whatWeDo: [
      "Economic and fiscal impact modeling",
      "Scenario planning and market sensitivity",
      "Policy narrative and stakeholder-ready reporting"
    ],
    howWeHelp: [
      "Define project scope and assumptions",
      "Build model and validate against market benchmarks",
      "Deliver executive narrative with defensible numbers"
    ],
    experts: [
      { name: "Morgan Hale", title: "Managing Director", specialty: "Regional economics" },
      { name: "Brianna Cross", title: "Principal Analyst", specialty: "Impact modeling" },
      { name: "David Park", title: "Senior Consultant", specialty: "Public finance strategy" }
    ]
  },
  {
    slug: "aerospace-defense",
    name: "Aerospace & Defense",
    shortName: "A&D",
    accent: "#ebaa1f",
    summary:
      "Location strategy for mission-critical operations where talent, infrastructure, and risk posture matter most.",
    whatWeDo: [
      "Defense-ready labor and supplier mapping",
      "Security and infrastructure risk screening",
      "Incentive alignment for sensitive projects"
    ],
    howWeHelp: [
      "Filter locations for operational readiness",
      "Evaluate risk, resilience, and access-to-talent factors",
      "Support executive selection and implementation plan"
    ],
    experts: [
      { name: "Avery Cole", title: "Practice Lead", specialty: "Aerospace location strategy" },
      { name: "Nina Romero", title: "Senior Advisor", specialty: "Defense compliance landscape" },
      { name: "Gavin Stone", title: "Director", specialty: "Industrial real estate alignment" }
    ]
  },
  {
    slug: "data-analytics",
    name: "Data & Analytics",
    shortName: "D&A",
    accent: "#b5d9ee",
    summary:
      "Translate market, labor, cost, and competitive intelligence into decisions leadership can act on fast.",
    whatWeDo: [
      "Custom location scoring frameworks",
      "Workforce and wage analytics",
      "Executive-ready dashboards and models"
    ],
    howWeHelp: [
      "Identify decision drivers and data requirements",
      "Model opportunities and downside risk",
      "Present clear options with confidence ranges"
    ],
    experts: [
      { name: "Leah Kim", title: "Director of Analytics", specialty: "Decision models" },
      { name: "Marcus Wynn", title: "Senior Data Scientist", specialty: "Forecasting and scoring" },
      { name: "Evelyn Frost", title: "Consultant", specialty: "Labor intelligence" }
    ]
  },
  {
    slug: "data-centers",
    name: "Data Centers",
    shortName: "DC",
    accent: "#7cc8a1",
    summary:
      "Site strategy for power, latency, permitting, and long-term scalability across hyperscale and enterprise needs.",
    whatWeDo: [
      "Power and utility feasibility screening",
      "Permitting and entitlement strategy",
      "Infrastructure timeline and risk planning"
    ],
    howWeHelp: [
      "Shortlist viable markets with infrastructure depth",
      "Align utility, jurisdiction, and schedule constraints",
      "Negotiate favorable location economics"
    ],
    experts: [
      { name: "Chris Dalton", title: "Practice Lead", specialty: "Mission-critical facilities" },
      { name: "Harper Lane", title: "Senior Consultant", specialty: "Utility strategy" },
      { name: "Noah Price", title: "Analyst", specialty: "Permitting and timeline risk" }
    ]
  },
  {
    slug: "incentives",
    name: "Incentives",
    shortName: "INC",
    accent: "#b22c2e",
    summary:
      "Build and negotiate incentive packages that support long-term outcomes without compromising execution speed.",
    whatWeDo: [
      "Incentive opportunity scanning by jurisdiction",
      "Negotiation strategy and package structuring",
      "Compliance and performance tracking support"
    ],
    howWeHelp: [
      "Identify high-value opportunities early",
      "Lead negotiations with public-sector stakeholders",
      "Protect value through post-award governance"
    ],
    experts: [
      { name: "Taylor Brooks", title: "Partner", specialty: "Incentive negotiations" },
      { name: "Jordan Reese", title: "Director", specialty: "Public-sector strategy" },
      { name: "Camden Shaw", title: "Manager", specialty: "Compliance and reporting" }
    ]
  },
  {
    slug: "strategic-growth",
    name: "Strategic Growth",
    shortName: "SG",
    accent: "#8b7df2",
    summary:
      "Placeholder expansion team for future service packaging or vertical specialization as priorities evolve.",
    whatWeDo: [
      "New-practice incubation",
      "Cross-team offer design",
      "Market expansion planning"
    ],
    howWeHelp: [
      "Test new service concepts with target clients",
      "Develop pilot engagement frameworks",
      "Scale validated offers across the platform"
    ],
    experts: [
      { name: "Future Lead", title: "Practice Lead", specialty: "To be assigned" },
      { name: "Future Expert", title: "Senior Advisor", specialty: "To be assigned" },
      { name: "Future Analyst", title: "Analyst", specialty: "To be assigned" }
    ]
  }
];
