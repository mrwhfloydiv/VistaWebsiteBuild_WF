export type Expert = {
  name: string;
  title: string;
  specialty: string;
  bio: string;
  photo: string;        // path under /headshots/
  linkedin?: string;
  email?: string;
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

/* ────────────────────────────────────────────────
   People directory — single source of truth
   ──────────────────────────────────────────────── */

const mattSamler: Expert = {
  name: "Matt Samler",
  title: "Managing Partner",
  specialty: "Site selection & incentive negotiation",
  bio: "Matt leads Vista Site Selection with nearly 20 years of expertise in incentive negotiation, site selection, and real estate strategy. He has secured over $1 billion in incentives and facilitated site selection for millions of square feet of projects across nearly every U.S. state. His project experience spans aerospace, automotive manufacturing, headquarters relocations, distribution operations, and high-growth technology companies.",
  photo: "matt-samler.jpg",
  linkedin: "https://www.linkedin.com/in/matthewsamler/",
  email: "mtsamler@vistasiteselection.com",
};

const chrisMagill: Expert = {
  name: "Chris Magill",
  title: "Partner & Managing Director",
  specialty: "Site selection & economic development strategy",
  bio: "Chris assists companies in achieving growth through site selection and economic development strategies. He has extensive experience consulting and structuring tax credit, grant, and loan-financing solutions for capital investment projects across 20 states. Prior to Vista, Chris served as Economic Development Director for Ice Miller LLP and Executive Director for the Ohio Tax Credit Authority at the Ohio Department of Development. Named to the Columbus Business First 2022 40 Under 40 class.",
  photo: "chris-magill.jpg",
  linkedin: "https://www.linkedin.com/in/chrismagill",
  email: "cmagill@vistasiteselection.com",
};

const jeffTroan: Expert = {
  name: "Jeff Troan",
  title: "Managing Director, Site Selection",
  specialty: "Aerospace, defense & global site selection",
  bio: "Jeff brings four decades of experience in business development, real estate, site selection, and economic development. He specializes in aerospace and defense sector location strategy, employing advanced data analytics to help clients identify locations with the workforce demographics they require. His global experience spans projects across the U.S., Europe, and beyond, with dual U.S.-EU citizenship providing unique international perspective.",
  photo: "jeff-troan.jpg",
  linkedin: "https://www.linkedin.com/in/jeff-troan-b7638a320/",
};

const evanStair: Expert = {
  name: "Evan Stair",
  title: "Managing Director, Analytics",
  specialty: "Data analytics, GIS & spatial intelligence",
  bio: "Evan has spent his career analyzing, visualizing, and presenting complex data to help businesses make confident site selection decisions. He has participated in several million square feet of site selection projects across the U.S., Canada, Mexico, Latin America, the Caribbean, United Kingdom, Asia, and the Philippines. His passion for maps and spatial data drives Vista's in-house data science and GIS capabilities.",
  photo: "evan-stair.jpg",
  linkedin: "https://www.linkedin.com/in/elsdata/",
};

const julieMiller: Expert = {
  name: "Julie Miller, CCIP",
  title: "Managing Director, Incentives & Compliance",
  specialty: "Incentive negotiations & compliance management",
  bio: "Julie brings 20 years of site selection experience to her role leading Vista's incentives and compliance practice. She has overseen site selection and compliance for manufacturing and distribution centers, aerospace facilities, and renewable energy projects, managing more than $600 million in incentive packages. Prior to Vista, Julie held leadership roles in location and incentive strategy at Altus Group and Jones Lang LaSalle (JLL).",
  photo: "julie-miller.jpg",
  linkedin: "https://www.linkedin.com/in/julie-miller-ccip/",
};

const jamesMaples: Expert = {
  name: "James Maples, Ph.D.",
  title: "Lead Economist",
  specialty: "Economic impact modeling & IMPLAN",
  bio: "James is one of fewer than 40 individuals certified as economists in the use of IMPLAN, the leading economic impact modeling software. He has completed nearly 100 economic impact studies across manufacturing, retail, housing, non-profits, recreation, and policy. Prior to Vista, he spent a decade as a professor at the University of Tennessee and Eastern Kentucky University, and served as the economic impact expert for NOAA.",
  photo: "james-maples.jpg",
  linkedin: "https://www.linkedin.com/in/james-maples-560a70119/",
};

const andreaDishler: Expert = {
  name: "Andrea Dishler",
  title: "Sr. Vice President, Project Management",
  specialty: "Defense sector project leadership",
  bio: "Andrea is a dynamic leader with over two decades in the defense sector, excelling in engineering and project management. She holds an active DoD clearance and is known for steering cross-functional teams to deliver complex projects efficiently. Prior to Vista, Andrea served as a Project Manager at L3Harris Technologies, leading critical missile defense programs and cultivating relationships with key defense stakeholders.",
  photo: "andrea-dishler.jpg",
  linkedin: "https://www.linkedin.com/in/andrea-dishler/",
};

const janieHanna: Expert = {
  name: "Janie Hanna",
  title: "Vice President, Program Management",
  specialty: "Incentive program management & compliance",
  bio: "Janie assists clients with developing economic development strategies, procuring tax and development incentives, and managing incentive programs across the lifetime of a project. Her expertise ensures that clients maximize the value of their incentive packages while maintaining full compliance with program requirements.",
  photo: "janie-hanna.jpg",
};

const williamFloyd: Expert = {
  name: "William Floyd",
  title: "Senior Vice President",
  specialty: "Data acquisition, analytics & GIS mapping",
  bio: "William brings more than a decade of expertise in data acquisition, analytics, and consumer research. Specializing in GIS mapping, he excels at sorting demographic datasets and identifying trends, transforming complex data into clear, actionable insights. He leverages Vista's proprietary data analysis software to provide essential data for informed decision-making. A custom cartographer turned creative problem-solver.",
  photo: "william-floyd.jpg",
  linkedin: "https://www.linkedin.com/in/whfiv/",
};

const macSmith: Expert = {
  name: "Mac Smith",
  title: "Analyst",
  specialty: "Data analysis & market research",
  bio: "Mac supports Vista's analytics practice with research, data analysis, and market intelligence. He contributes to the team's location scoring frameworks, workforce analytics, and client-ready deliverables that drive confident site selection decisions.",
  photo: "mac-smith.jpg",
};

const taylorBlanks: Expert = {
  name: "Taylor Blanks",
  title: "Program Support Manager",
  specialty: "Program coordination & client support",
  bio: "Taylor manages program support operations at Vista, coordinating across teams to ensure seamless project delivery. She plays a key role in keeping complex, multi-stakeholder engagements on track and on budget.",
  photo: "taylor-blanks.jpg",
};

/* ────────────────────────────────────────────────
   Team buckets
   ──────────────────────────────────────────────── */

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
    experts: [chrisMagill, jamesMaples]
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
    experts: [jeffTroan, julieMiller, chrisMagill, andreaDishler, evanStair, janieHanna, taylorBlanks]
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
    experts: [evanStair, williamFloyd, macSmith]
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
    experts: [mattSamler, evanStair, williamFloyd, macSmith]
  },
  {
    slug: "incentives-compliance",
    name: "Incentives & Compliance",
    shortName: "I&C",
    accent: "#b22c2e",
    summary:
      "Build and negotiate incentive packages that support long-term outcomes, then manage compliance across the life of the project.",
    whatWeDo: [
      "Incentive opportunity scanning by jurisdiction",
      "Negotiation strategy and package structuring",
      "Post-award compliance tracking and reporting"
    ],
    howWeHelp: [
      "Identify high-value opportunities early",
      "Lead negotiations with public-sector stakeholders",
      "Protect value through post-award governance"
    ],
    experts: [julieMiller, chrisMagill, jeffTroan, andreaDishler, janieHanna, taylorBlanks]
  },
  {
    slug: "leadership",
    name: "Leadership",
    shortName: "LEAD",
    accent: "#d4a853",
    summary:
      "Executive leadership driving firm strategy, client relationships, and cross-practice alignment across Vista.",
    whatWeDo: [
      "Firm-wide strategy and vision",
      "Key client relationship management",
      "Cross-practice coordination and governance"
    ],
    howWeHelp: [
      "Set strategic direction and growth priorities",
      "Ensure delivery excellence across all engagements",
      "Align teams around client outcomes and market opportunity"
    ],
    experts: [mattSamler, chrisMagill, evanStair, jeffTroan]
  }
];
