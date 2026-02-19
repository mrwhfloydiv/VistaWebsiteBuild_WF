import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ColorRGB = [number, number, number];

type RingConfig = {
  radiusFactor: number;
  ellipseRatio: number;
  ellipseRatioMobile: number;
  speedMultiplier: number;
  tiltOffset: number;
  strokeAlpha: number;
};

type MotionConfig = {
  sequenceHeightDesktop: number;
  sequenceHeightMobile: number;
  animation: {
    revealDuration: number;
    revealY: number;
    magneticScale: number;
  };
  stars: {
    desktopCount: number;
    mobileCount: number;
    depth: number;
    baseSpeed: number;
    warpBoost: number;
  };
  orbit: {
    start: number;
    full: number;
    radiusDesktop: number;
    radiusMobile: number;
    rings: RingConfig[];
  };
};

type PartialMotionConfig = Partial<Omit<MotionConfig, "animation" | "stars" | "orbit">> & {
  animation?: Partial<MotionConfig["animation"]>;
  stars?: Partial<MotionConfig["stars"]>;
  orbit?: Partial<Omit<MotionConfig["orbit"], "rings">> & { rings?: RingConfig[] };
};

type StageTheme = {
  base: ColorRGB;
  hazeA: ColorRGB;
  hazeB: ColorRGB;
  palette: ColorRGB[];
};

type Star = {
  x: number;
  y: number;
  z: number;
  size: number;
  tint: number;
  prevX: number;
  prevY: number;
  initialized: boolean;
  isVLogo: boolean;    // true → draw as tiny V mark instead of circle
  rotation: number;    // slow spin for V logos (radians)
};


const hexToRGB = (hex: string): ColorRGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

const defaultConfig: MotionConfig = {
  sequenceHeightDesktop: 520,
  sequenceHeightMobile: 470,
  animation: {
    revealDuration: 0.8,
    revealY: 24,
    magneticScale: 1.02
  },
  stars: {
    desktopCount: 860,
    mobileCount: 500,
    depth: 1600,
    baseSpeed: 0.28,
    warpBoost: 5.1
  },
  orbit: {
    start: 0.62,
    full: 0.78,
    radiusDesktop: 260,
    radiusMobile: 220,
    rings: [
      { radiusFactor: 0.45, ellipseRatio: 0.52, ellipseRatioMobile: 0.55, speedMultiplier: 1.4, tiltOffset: 0, strokeAlpha: 0.10 },
      { radiusFactor: 0.72, ellipseRatio: 0.58, ellipseRatioMobile: 0.62, speedMultiplier: 1.0, tiltOffset: 0.08, strokeAlpha: 0.14 },
      { radiusFactor: 1.0, ellipseRatio: 0.64, ellipseRatioMobile: 0.68, speedMultiplier: 0.7, tiltOffset: -0.06, strokeAlpha: 0.18 },
    ]
  }
};

const stageThemes: StageTheme[] = [
  {
    base: [2, 3, 6],
    hazeA: [18, 28, 52],
    hazeB: [8, 18, 40],
    palette: [
      [145, 154, 176],
      [172, 180, 198],
      [214, 221, 236],
      [255, 255, 255]
    ]
  },
  {
    base: [2, 4, 8],
    hazeA: [14, 30, 58],
    hazeB: [10, 24, 44],
    palette: [
      [151, 161, 184],
      [180, 190, 210],
      [218, 226, 240],
      [255, 255, 255]
    ]
  },
  {
    base: [3, 5, 10],
    hazeA: [12, 34, 64],
    hazeB: [10, 23, 48],
    palette: [
      [158, 166, 188],
      [188, 197, 218],
      [224, 230, 245],
      [255, 255, 255]
    ]
  }
];

// Speed stages: one per slide transition boundary + idle
//   [0] idle during hero hold
//   [1] slide 0→1 transition (gentle start)
//   [2] slide 1→2 (building)
//   [3] slide 2→3 (strong)
//   [4] final push into orbit (max)
const speedStages = [1, 6, 18, 42, 100];
const speedStageMaxBoost = 3.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return x * x * (3 - 2 * x);
};

const lerpColor = (a: ColorRGB, b: ColorRGB, t: number): ColorRGB => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t))
];

const samplePaletteColor = (palette: ColorRGB[], value: number): ColorRGB => {
  const wrapped = ((value % 1) + 1) % 1;
  const scaled = wrapped * (palette.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(palette.length - 1, index + 1);
  return lerpColor(palette[index], palette[nextIndex], scaled - index);
};

const parseConfig = (wrapper: HTMLElement): MotionConfig => {
  const raw = wrapper.getAttribute("data-motion-config");
  if (!raw) return defaultConfig;

  try {
    const parsed = JSON.parse(raw) as PartialMotionConfig;
    return {
      sequenceHeightDesktop: parsed.sequenceHeightDesktop ?? defaultConfig.sequenceHeightDesktop,
      sequenceHeightMobile: parsed.sequenceHeightMobile ?? defaultConfig.sequenceHeightMobile,
      animation: {
        revealDuration: parsed.animation?.revealDuration ?? defaultConfig.animation.revealDuration,
        revealY: parsed.animation?.revealY ?? defaultConfig.animation.revealY,
        magneticScale: parsed.animation?.magneticScale ?? defaultConfig.animation.magneticScale
      },
      stars: {
        desktopCount: parsed.stars?.desktopCount ?? defaultConfig.stars.desktopCount,
        mobileCount: parsed.stars?.mobileCount ?? defaultConfig.stars.mobileCount,
        depth: parsed.stars?.depth ?? defaultConfig.stars.depth,
        baseSpeed: parsed.stars?.baseSpeed ?? defaultConfig.stars.baseSpeed,
        warpBoost: parsed.stars?.warpBoost ?? defaultConfig.stars.warpBoost
      },
      orbit: {
        start: parsed.orbit?.start ?? defaultConfig.orbit.start,
        full: parsed.orbit?.full ?? defaultConfig.orbit.full,
        radiusDesktop: parsed.orbit?.radiusDesktop ?? defaultConfig.orbit.radiusDesktop,
        radiusMobile: parsed.orbit?.radiusMobile ?? defaultConfig.orbit.radiusMobile,
        rings: parsed.orbit?.rings ?? defaultConfig.orbit.rings
      }
    };
  } catch {
    return defaultConfig;
  }
};

const V_LOGO_CHANCE = 0.13; // ~13% of stars are tiny V logos

const createStars = (count: number, depth: number, spread: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * spread,
    y: (Math.random() * 2 - 1) * spread * 0.68,
    z: Math.random() * depth + 1,
    size: Math.random() * 1.2 + 0.45,
    tint: Math.random(),
    prevX: 0,
    prevY: 0,
    initialized: false,
    isVLogo: Math.random() < V_LOGO_CHANCE,
    rotation: Math.random() * Math.PI * 2,
  }));

const resetStar = (star: Star, depth: number, spread: number) => {
  star.x = (Math.random() * 2 - 1) * spread;
  star.y = (Math.random() * 2 - 1) * spread * 0.68;
  star.z = depth;
  star.size = Math.random() * 1.2 + 0.45;
  star.tint = Math.random();
  star.initialized = false;
  star.isVLogo = Math.random() < V_LOGO_CHANCE;
  star.rotation = Math.random() * Math.PI * 2;
};

const initRevealAnimations = (config: MotionConfig) => {
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => {
    gsap.to(item, {
      opacity: 1,
      y: 0,
      duration: config.animation.revealDuration,
      ease: "power2.out",
      scrollTrigger: {
        trigger: item,
        start: "top 88%"
      }
    });
  });
};

const initMagneticButtons = (config: MotionConfig) => {
  const cleanupHandlers: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>(".magnetic-btn").forEach((button) => {
    const enter = () => {
      gsap.to(button, { scale: config.animation.magneticScale, duration: 0.2 });
    };
    const leave = () => {
      gsap.to(button, { scale: 1, duration: 0.2 });
    };

    button.addEventListener("mouseenter", enter);
    button.addEventListener("mouseleave", leave);

    cleanupHandlers.push(() => {
      button.removeEventListener("mouseenter", enter);
      button.removeEventListener("mouseleave", leave);
    });
  });

  return () => cleanupHandlers.forEach((cleanup) => cleanup());
};

const initHeroSequence = (wrapper: HTMLElement, config: MotionConfig) => {
  const canvas = document.getElementById("heroWaveCanvas") as HTMLCanvasElement | null;
  const orbitMenu = document.getElementById("orbitMenu");
  const orbitCore = orbitMenu?.querySelector<HTMLElement>(".orbit-core") ?? null;
  const introPanel = document.getElementById("heroIntro");
  const slideTrack = document.getElementById("heroSlideTrack");
  const orbitNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-orbit-node]"));
  const slides = Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));
  const skipIntroButton = document.getElementById("skipIntroBtn") as HTMLButtonElement | null;

  if (!canvas || !slides.length) return () => {};

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return () => {};

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPowerDevice =
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
    (navigator.hardwareConcurrency ?? 8) <= 4;

  // ── V Logo stamp for star field ──
  // Pre-render the SVG at a fixed size onto an offscreen canvas so we can
  // stamp it at any scale/color/rotation using drawImage per frame.
  const V_STAMP_SIZE = 32; // px — rendered once, scaled down per star
  const vStampCanvas = document.createElement("canvas");
  vStampCanvas.width = V_STAMP_SIZE;
  vStampCanvas.height = V_STAMP_SIZE;
  const vStampCtx = vStampCanvas.getContext("2d")!;
  let vStampReady = false;

  const vLogoImg = new Image();
  const basePath = wrapper.dataset.basePath ?? "";
  vLogoImg.src = `${basePath}/logos/vista-v-white.svg`;
  vLogoImg.onload = () => {
    // Draw white V onto the stamp canvas (centered, with slight padding)
    const pad = 2;
    vStampCtx.drawImage(vLogoImg, pad, pad, V_STAMP_SIZE - pad * 2, V_STAMP_SIZE - pad * 2);
    vStampReady = true;
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let spread = 1600;
  let frameId = 0;
  let isMobile = false;
  let stars: Star[] = [];
  let scrollProgress = 0;
  let scrollEnergy = 0;
  let pointerEnergy = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let lastTime = performance.now();
  let nodesHaveEntered = false;
  let touchSpinOffset = 0;
  let touchSpinVelocity = 0;
  let touchTiltOffset = 0;   // Y-axis tilt from drag (breaks orbital plane)
  let touchTiltVelocity = 0; // Y-axis momentum
  let isTouchDragging = false;
  let touchStartX = 0;
  let touchStartY = 0;


  // Mouse drag state
  let isMouseDragging = false;
  let mouseStartX = 0;
  let mouseStartY = 0;

  // Orbit hover-pause: freeze time-based spin when hovering a node
  let orbitPaused = false;
  let pauseTimeOffset = 0;  // accumulated paused time to subtract
  let pauseStartTime = 0;   // when the current pause began

  // SVG elements (created in init)
  let svgEl: SVGSVGElement | null = null;
  const spokeLines: SVGLineElement[] = [];
  const spokePulseCircles: SVGCircleElement[][] = [];
  const spokePulseTrails: SVGLineElement[][] = [];
  const spokePulseGrads: SVGLinearGradientElement[][] = [];

  // Planet canvas (inside orbit-core)
  let planetCanvas: HTMLCanvasElement | null = null;
  let planetCtx: CanvasRenderingContext2D | null = null;
  let planetSize = 0;

  // Per-node ring assignment
  const nodeRingAssignments: number[] = [];
  let orbitAngles: number[] = [];

  // Spoke pulse data (animated dots traveling along spokes toward center)
  type SpokePulse = { progress: number; speed: number; baseOpacity: number; };
  const spokePulses: SpokePulse[][] = [];

  const initSpokePulses = () => {
    spokePulses.length = 0;
    for (let i = 0; i < orbitNodes.length; i++) {
      const pulses: SpokePulse[] = [];
      const count = 2 + Math.floor(Math.random() * 2); // 2-3 pulses
      for (let j = 0; j < count; j++) {
        pulses.push({
          progress: j / count, // staggered positions
          speed: 0.25 + Math.random() * 0.12,
          baseOpacity: 0.6 + Math.random() * 0.4,
        });
      }
      spokePulses.push(pulses);
    }
  };

  // ── Goldberg Hex Globe system (dual of subdivided icosahedron) ──
  type Vec3 = [number, number, number];
  // Each hex/pent cell: array of corner positions on unit sphere + center position
  type HexCell = { corners: Vec3[]; center: Vec3; };
  let hexCells: HexCell[] = [];

  const normalize3 = (v: Vec3): Vec3 => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  };

  const midpoint3 = (a: Vec3, b: Vec3): Vec3 =>
    normalize3([(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]);

  const generateHexGlobe = (subdivisions: number) => {
    // ── Step 1: Build subdivided icosahedron (triangle mesh) ──
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseVerts: Vec3[] = [
      [-1,  phi,  0], [ 1,  phi,  0], [-1, -phi,  0], [ 1, -phi,  0],
      [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
      [ phi,  0, -1], [ phi,  0,  1], [-phi,  0, -1], [-phi,  0,  1],
    ].map(v => normalize3(v as Vec3));

    let triFaces: [number, number, number][] = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1],
    ];

    let verts = [...baseVerts];

    for (let s = 0; s < subdivisions; s++) {
      const midCache = new Map<string, number>();
      const getMid = (a: number, b: number): number => {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (midCache.has(key)) return midCache.get(key)!;
        const mid = midpoint3(verts[a], verts[b]);
        const idx = verts.length;
        verts.push(mid);
        midCache.set(key, idx);
        return idx;
      };
      const newFaces: [number, number, number][] = [];
      for (const [a, b, c] of triFaces) {
        const ab = getMid(a, b);
        const bc = getMid(b, c);
        const ca = getMid(c, a);
        newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      triFaces = newFaces;
    }

    // ── Step 2: Build dual mesh (Goldberg polyhedron) ──
    // Each vertex of the triangle mesh becomes a hex/pent cell.
    // The cell corners are the centroids of the triangles surrounding that vertex.

    // Compute triangle centroids (projected onto unit sphere)
    const triCentroids: Vec3[] = triFaces.map(([a, b, c]) =>
      normalize3([
        (verts[a][0] + verts[b][0] + verts[c][0]) / 3,
        (verts[a][1] + verts[b][1] + verts[c][1]) / 3,
        (verts[a][2] + verts[b][2] + verts[c][2]) / 3,
      ])
    );

    // For each vertex, collect which triangles it belongs to
    const vertToTris: number[][] = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) vertToTris[i] = [];
    for (let fi = 0; fi < triFaces.length; fi++) {
      for (const vi of triFaces[fi]) {
        vertToTris[vi].push(fi);
      }
    }

    // For each vertex, sort its surrounding triangles in angular order
    // to form a proper polygon (hex or pent)
    const cells: HexCell[] = [];
    for (let vi = 0; vi < verts.length; vi++) {
      const adjTris = vertToTris[vi];
      if (adjTris.length < 5) continue; // skip degenerate

      const center = verts[vi];
      const corners = adjTris.map(fi => triCentroids[fi]);

      // Sort corners by angle around the vertex normal (center)
      // Use a local tangent frame
      const n = center;
      // Pick arbitrary tangent not parallel to n
      const arbRef: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      // tangentU = normalize(arbRef - (arbRef·n)n)
      const dot = arbRef[0] * n[0] + arbRef[1] * n[1] + arbRef[2] * n[2];
      const tu: Vec3 = normalize3([
        arbRef[0] - dot * n[0],
        arbRef[1] - dot * n[1],
        arbRef[2] - dot * n[2],
      ]);
      // tangentV = n × tu
      const tv: Vec3 = [
        n[1] * tu[2] - n[2] * tu[1],
        n[2] * tu[0] - n[0] * tu[2],
        n[0] * tu[1] - n[1] * tu[0],
      ];

      corners.sort((a, b) => {
        const da = [a[0] - center[0], a[1] - center[1], a[2] - center[2]];
        const db = [b[0] - center[0], b[1] - center[1], b[2] - center[2]];
        const angA = Math.atan2(
          da[0] * tv[0] + da[1] * tv[1] + da[2] * tv[2],
          da[0] * tu[0] + da[1] * tu[1] + da[2] * tu[2],
        );
        const angB = Math.atan2(
          db[0] * tv[0] + db[1] * tv[1] + db[2] * tv[2],
          db[0] * tu[0] + db[1] * tu[1] + db[2] * tu[2],
        );
        return angA - angB;
      });

      cells.push({ corners, center });
    }

    hexCells = cells;
  };

  // ── Energy Core Particle System ──
  type CoreParticle = {
    // 3D position in unit sphere space (-1 to 1)
    x: number; y: number; z: number;
    // Velocity
    vx: number; vy: number; vz: number;
    // Visual
    size: number;
    brightness: number;
    hue: number;       // 0 = blue, 1 = cyan, 2 = white
    life: number;      // 0-1 lifecycle
    maxLife: number;
    layer: number;     // 0 = inner vortex, 1 = mid swirl, 2 = outer drift
  };

  const CORE_PARTICLE_COUNT = isMobile ? 180 : 400;
  const coreParticles: CoreParticle[] = [];

  const initCoreParticle = (p: CoreParticle, respawn: boolean) => {
    const layer = respawn ? p.layer : Math.floor(Math.random() * 3);
    p.layer = layer;
    p.life = respawn ? 0 : Math.random();
    p.maxLife = 0.6 + Math.random() * 0.8;

    if (layer === 0) {
      // Inner vortex — tight spiral near center
      const a = Math.random() * Math.PI * 2;
      const spread = 0.05 + Math.random() * 0.2;
      p.x = Math.cos(a) * spread;
      p.y = (Math.random() - 0.5) * 0.3;
      p.z = Math.sin(a) * spread;
      p.size = 0.8 + Math.random() * 1.5;
      p.brightness = 0.7 + Math.random() * 0.3;
      p.hue = Math.random() < 0.3 ? 2 : 0; // mostly white hot
    } else if (layer === 1) {
      // Mid swirl — wider orbit
      const a = Math.random() * Math.PI * 2;
      const spread = 0.2 + Math.random() * 0.35;
      p.x = Math.cos(a) * spread;
      p.y = (Math.random() - 0.5) * 0.5;
      p.z = Math.sin(a) * spread;
      p.size = 0.5 + Math.random() * 1.2;
      p.brightness = 0.5 + Math.random() * 0.4;
      p.hue = Math.random() < 0.5 ? 1 : 0; // cyan or blue
    } else {
      // Outer drift — slow floating particles near sphere edge
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI;
      const spread = 0.4 + Math.random() * 0.45;
      p.x = Math.cos(a) * Math.cos(elev) * spread;
      p.y = Math.sin(elev) * spread;
      p.z = Math.sin(a) * Math.cos(elev) * spread;
      p.size = 0.3 + Math.random() * 0.8;
      p.brightness = 0.3 + Math.random() * 0.3;
      p.hue = 0; // deep blue
    }

    // Velocity: orbital motion + slight upward drift
    const speed = layer === 0 ? 0.015 : layer === 1 ? 0.008 : 0.003;
    p.vx = -p.z * speed + (Math.random() - 0.5) * 0.002;
    p.vy = (Math.random() - 0.5) * 0.003 + 0.001; // slight upward
    p.vz = p.x * speed + (Math.random() - 0.5) * 0.002;
  };

  const initEnergyCoreParticles = () => {
    coreParticles.length = 0;
    for (let i = 0; i < CORE_PARTICLE_COUNT; i++) {
      const p: CoreParticle = {
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        size: 1, brightness: 1, hue: 0, life: 0, maxLife: 1, layer: 0,
      };
      initCoreParticle(p, false);
      coreParticles.push(p);
    }
  };

  // Node accent colors from data attributes
  const nodeAccents = orbitNodes.map(node => ({
    accent: node.dataset.accent ?? "#ffffff",
    rgb: hexToRGB(node.dataset.accent ?? "#ffffff"),
    desc: node.dataset.desc ?? "",
    short: node.dataset.short ?? "",
  }));

  // ── SVG creation + Ring assignment ──

  const createOrbitSVG = () => {
    if (!orbitMenu) return;
    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.classList.add("orbit-rings-svg");
    svgEl.setAttribute("aria-hidden", "true");

    // Spoke lines (node → center)
    for (let i = 0; i < orbitNodes.length; i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("orbit-spoke");
      svgEl.appendChild(line);
      spokeLines.push(line);
    }

    // Pulse dots + comet trails traveling along spokes (3 per spoke)
    // Create a <defs> block for trail gradients
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgEl.appendChild(defs);

    for (let i = 0; i < orbitNodes.length; i++) {
      const circles: SVGCircleElement[] = [];
      const trails: SVGLineElement[] = [];
      const grads: SVGLinearGradientElement[] = [];
      for (let j = 0; j < 3; j++) {
        // Trail gradient (unique per dot so we can update colors)
        const gradId = `trail-grad-${i}-${j}`;
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.id = gradId;
        grad.setAttribute("gradientUnits", "userSpaceOnUse");
        const stop0 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop0.setAttribute("offset", "0%");
        stop0.setAttribute("stop-color", "#ffffff");
        stop0.setAttribute("stop-opacity", "0");
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "100%");
        stop1.setAttribute("stop-color", "#ffffff");
        stop1.setAttribute("stop-opacity", "0.8");
        grad.appendChild(stop0);
        grad.appendChild(stop1);
        defs.appendChild(grad);
        grads.push(grad);

        // Trail line
        const trail = document.createElementNS("http://www.w3.org/2000/svg", "line");
        trail.classList.add("orbit-spoke-trail");
        trail.setAttribute("stroke", `url(#${gradId})`);
        trail.setAttribute("stroke-width", "2");
        trail.setAttribute("stroke-linecap", "round");
        trail.style.opacity = "0";
        svgEl.appendChild(trail);
        trails.push(trail);

        // Bright head dot
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.classList.add("orbit-spoke-pulse");
        circle.setAttribute("r", "2.5");
        circle.style.opacity = "0";
        svgEl.appendChild(circle);
        circles.push(circle);
      }
      spokePulseCircles.push(circles);
      spokePulseTrails.push(trails);
      spokePulseGrads.push(grads);
    }

    orbitMenu.insertBefore(svgEl, orbitMenu.firstChild);
  };

  const assignNodesToRings = () => {
    nodeRingAssignments.length = 0;
    orbitNodes.forEach(node => {
      const ringAttr = node.dataset.ring;
      nodeRingAssignments.push(ringAttr ? parseInt(ringAttr, 10) - 1 : 1);
    });

    // Compute per-ring angle distributions
    const ringBuckets: number[][] = config.orbit.rings.map(() => []);
    orbitNodes.forEach((_, i) => {
      ringBuckets[nodeRingAssignments[i]].push(i);
    });

    // Per-ring even spacing
    orbitAngles = new Array(orbitNodes.length);
    ringBuckets.forEach((bucket) => {
      bucket.forEach((nodeIdx, posInRing) => {
        orbitAngles[nodeIdx] = (posInRing / Math.max(bucket.length, 1)) * Math.PI * 2 - Math.PI / 2;
      });
    });
  };

  /** Effective time that excludes paused intervals */
  const getOrbitTime = (nowSeconds: number): number => {
    if (orbitPaused) return nowSeconds - pauseTimeOffset - (nowSeconds - pauseStartTime);
    return nowSeconds - pauseTimeOffset;
  };

  const computeBaseSpin = (nowSeconds: number, speedMultiplier: number): number => {
    const t = getOrbitTime(nowSeconds);
    const baseRate = reduceMotion ? 0 : t * 0.17 * speedMultiplier;
    return baseRate + scrollProgress * Math.PI * 0.55 * speedMultiplier + touchSpinOffset * speedMultiplier;
  };

  /** Orbit radius that adapts to viewport on mobile so nodes never overflow */
  const getOrbitRadius = (): number => {
    if (!isMobile) return config.orbit.radiusDesktop;
    return Math.min(config.orbit.radiusMobile, Math.min(width, height) * 0.34);
  };

  /** Compute tilted 2D position for an orbit node (shared by spokes, pulses, nodes) */
  const getTiltedNodePos = (
    angle: number, radius: number, ratio: number,
    cx: number, cy: number,
  ): { x: number; y: number; depth: number } => {
    const ox = Math.cos(angle) * radius;
    const oy = Math.sin(angle) * radius * 0.3;
    const oz = Math.sin(angle) * radius * ratio;
    const cosTilt = Math.cos(touchTiltOffset);
    const sinTilt = Math.sin(touchTiltOffset);
    const tiltedY = oy * cosTilt - oz * sinTilt;
    const tiltedZ = oy * sinTilt + oz * cosTilt;
    return {
      x: cx + ox + mouseX * (isMobile ? 4 : 14),
      y: cy + tiltedZ + mouseY * (isMobile ? 3 : 10),
      depth: clamp((tiltedY / radius + 1) * 0.5, 0, 1),
    };
  };

  const initPlanetCanvas = () => {
    planetCanvas = document.getElementById("orbitPlanetCanvas") as HTMLCanvasElement | null;
    if (!planetCanvas || !orbitCore) return;

    const rect = orbitCore.getBoundingClientRect();
    planetSize = Math.round(Math.max(rect.width, rect.height));
    const pxSize = Math.round(planetSize * dpr);
    planetCanvas.width = pxSize;
    planetCanvas.height = pxSize;
    planetCtx = planetCanvas.getContext("2d");
    if (planetCtx) {
      planetCtx.imageSmoothingEnabled = true;
      planetCtx.imageSmoothingQuality = "high";
    }
  };

  /**
   * Title fly-through — ONE STRAIGHT LINE, same as the stars.
   *
   * Picture a highway billboard. You see it tiny in the distance (center of
   * screen / vanishing point). It gets closer and bigger as you approach it.
   * It sits beside you (reading position). Then it continues PAST you on
   * the SAME side of the road, getting huge and fading — it never crosses
   * in front of you.
   *
   * All motion is on a SINGLE 290° compass line (0°=N, 90°=E, 270°=W):
   *   290° ≈ WNW — left and slightly up
   *   math angle: 90° - 290° = -200° → +160°
   *   dx = cos(160°) ≈ -0.940 (strong left)
   *   dy = -sin(160°) ≈ -0.342 (slightly up)
   *
   * The reading position (translate 0,0) is a STOP on this line.
   *
   * FLY-IN:  title is BEHIND reading pos on the line (toward vanishing pt)
   *          = positive offset (opposite of travel direction)
   *          It moves ALONG the line toward reading position.
   *
   * FLY-OUT: title continues PAST reading pos on the SAME line
   *          = negative offset (same direction as travel)
   *          It keeps moving along the line, getting bigger.
   */

  // 290° compass → math angle
  const LINE_RAD = (90 - 290) * (Math.PI / 180); // = 160° in math coords
  const LINE_DX = Math.cos(LINE_RAD);   // ≈ -0.940 (left)
  const LINE_DY = -Math.sin(LINE_RAD);  // ≈ -0.342 (up) [negate for screen Y]

  // How far along the line (in px) for entry/exit from reading position
  const getLineDist = () => ({
    entry: Math.max(width * 0.42, 200), // distance FROM vanishing pt TO reading pos
    exit:  Math.max(width * 0.32, 220), // distance FROM reading pos onward past camera
  });

  const updateSlidesFlyThrough = (progress: number) => {
    const clamped = clamp(progress, 0, 0.999);
    const scaled = clamped * slides.length;
    const activeIndex = Math.floor(scaled);
    const t = scaled - activeIndex;
    const dist = getLineDist();

    // Entry offset: OPPOSITE of travel direction (back toward vanishing pt)
    const entryTx = -LINE_DX * dist.entry; // positive X (rightward, toward center)
    const entryTy = -LINE_DY * dist.entry; // positive Y (slightly down)

    // Exit offset: SAME as travel direction (past reading pos)
    const exitTx = LINE_DX * dist.exit;    // negative X (leftward)
    const exitTy = LINE_DY * dist.exit;    // negative Y (slightly up)

    slides.forEach((slide, index) => {
      const isHero = index === 0;

      if (index === activeIndex) {
        slide.classList.add("is-active");

        const flyInEnd = 0.15;
        const holdEnd = 0.75;
        let opacity: number;
        let tx: number;
        let ty: number;
        let scale: number;

        if (isHero) {
          // ── SLIDE 0: Hard visible on load. Only flies OUT along 290° line. ──
          if (t < holdEnd) {
            opacity = 1;
            tx = 0;
            ty = 0;
            scale = 1;
          } else {
            // Fly out along the SAME 290° line — identical to slides 1-3
            const ft = (t - holdEnd) / (1.0 - holdEnd);
            const eased = ft * ft * (3 - 2 * ft);
            opacity = clamp(1 - ft * 2.5, 0, 1);
            tx = exitTx * eased;
            ty = exitTy * eased;
            scale = lerp(1.0, 3.5, eased);
          }
        } else {
          // ── SLIDES 1-3: Fly in along line → hold → fly out along SAME line ──
          const isLastSlide = index === slides.length - 1;

          if (t < flyInEnd) {
            // FLY-IN: starts at vanishing point (behind on the line), tiny
            // Travels along 290° line toward reading position
            const at = t / flyInEnd;
            const eased = at * (2 - at); // ease-out: fast approach, soft landing
            opacity = clamp(eased * 1.4, 0, 1);
            scale = lerp(0.25, 1.0, eased);
            // Interpolate from entry offset → reading pos (0,0)
            tx = lerp(entryTx, 0, eased);
            ty = lerp(entryTy, 0, eased);
          } else if (t < holdEnd || isLastSlide) {
            // HOLD: at reading position, fully readable.
            // The LAST slide stays in hold permanently — introOpacity
            // fades the entire panel so no separate fly-out is needed.
            opacity = 1;
            tx = 0;
            ty = 0;
            scale = 1;
          } else {
            // FLY-OUT: continues SAME direction past reading pos
            const ft = (t - holdEnd) / (1.0 - holdEnd);
            const eased = ft * ft * (3 - 2 * ft);
            opacity = clamp(1 - ft * 2.5, 0, 1);
            tx = exitTx * eased;
            ty = exitTy * eased;
            scale = lerp(1.0, 3.5, eased);
          }
        }

        // With transform-origin: left center, scale > 1 expands rightward,
        // fighting the leftward exit motion. Compensate only during fly-OUT
        // (scale > 1) so the visual center stays on the 290° line.
        const scaleExcess = Math.max(0, scale - 1);
        const scaleCompX = -scaleExcess * width * 0.18;
        const scaleCompY = -scaleExcess * 8;
        slide.style.transform = `translate(${(tx + scaleCompX).toFixed(1)}px, ${(ty + scaleCompY).toFixed(1)}px) scale(${scale.toFixed(3)})`;
        slide.style.opacity = `${opacity.toFixed(3)}`;
      } else {
        slide.classList.remove("is-active");
        slide.style.opacity = "0";
        if (index < activeIndex) {
          // Already flown past — parked at exit end of line
          slide.style.transform = `translate(${exitTx.toFixed(1)}px, ${exitTy.toFixed(1)}px) scale(3.5)`;
        } else {
          // Not yet visible — parked at entry end of line (vanishing pt)
          slide.style.transform = `translate(${entryTx.toFixed(1)}px, ${entryTy.toFixed(1)}px) scale(0.25)`;
        }
      }
    });
  };

  const applySequenceHeight = () => {
    wrapper.style.height = `${isMobile ? config.sequenceHeightMobile : config.sequenceHeightDesktop}svh`;
  };

  const rebuildStars = () => {
    const configuredCount = isMobile ? config.stars.mobileCount : config.stars.desktopCount;
    const powerMultiplier = lowPowerDevice ? 0.62 : 1;
    const finalCount = Math.max(220, Math.round(configuredCount * powerMultiplier));
    spread = Math.max(width, height) * 1.55;
    stars = createStars(finalCount, config.stars.depth, spread);
  };

  const resize = () => {
    width = Math.max(window.innerWidth, 1);
    height = Math.max(window.innerHeight, 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    isMobile = width < 900;
    applySequenceHeight();

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    rebuildStars();
    initPlanetCanvas();
  };

  const drawAtmosphere = (themeA: StageTheme, themeB: StageTheme, mix: number) => {
    const base = lerpColor(themeA.base, themeB.base, mix);
    const hazeA = lerpColor(themeA.hazeA, themeB.hazeA, mix);
    const hazeB = lerpColor(themeA.hazeB, themeB.hazeB, mix);

    const backdrop = context.createLinearGradient(0, 0, 0, height);
    backdrop.addColorStop(0, `rgb(${Math.max(base[0] - 1, 1)}, ${Math.max(base[1] - 1, 2)}, ${Math.max(base[2] - 2, 4)})`);
    backdrop.addColorStop(1, `rgb(${base[0]}, ${base[1]}, ${base[2]})`);
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);

    const glowA = context.createRadialGradient(
      width * (0.16 + mouseX * 0.03),
      height * (0.22 + scrollProgress * 0.12),
      0,
      width * (0.16 + mouseX * 0.03),
      height * (0.22 + scrollProgress * 0.12),
      Math.max(width, height) * 0.7
    );
    glowA.addColorStop(0, `rgba(${hazeA[0]}, ${hazeA[1]}, ${hazeA[2]}, 0.2)`);
    glowA.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glowA;
    context.fillRect(0, 0, width, height);

    const glowB = context.createRadialGradient(
      width * (0.8 - mouseX * 0.04),
      height * (0.06 + scrollProgress * 0.2),
      0,
      width * (0.8 - mouseX * 0.04),
      height * (0.06 + scrollProgress * 0.2),
      Math.max(width, height) * 0.82
    );
    glowB.addColorStop(0, `rgba(${hazeB[0]}, ${hazeB[1]}, ${hazeB[2]}, 0.16)`);
    glowB.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glowB;
    context.fillRect(0, 0, width, height);
  };

  const updateOrbitSVG = (_nowSeconds: number, orbitReveal: number) => {
    if (!svgEl || !orbitMenu) return;
    if (orbitReveal <= 0.02) {
      svgEl.style.opacity = "0";
      return;
    }
    svgEl.style.opacity = `${clamp(orbitReveal * 1.2, 0, 1)}`;
    const containerRect = orbitMenu.getBoundingClientRect();
    svgEl.setAttribute("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`);
  };

  const updateSpokeSVG = (nowSeconds: number, orbitReveal: number) => {
    if (!orbitMenu) return;

    if (orbitReveal <= 0.3) {
      spokeLines.forEach(line => { line.style.opacity = "0"; });
      return;
    }

    const containerRect = orbitMenu.getBoundingClientRect();
    const cx = containerRect.width * 0.5;
    const cy = containerRect.height * 0.5;
    const baseRadius = getOrbitRadius() * (0.9 + orbitReveal * 0.24);
    const spokeAlpha = clamp((orbitReveal - 0.3) * 2, 0, 0.10);

    orbitNodes.forEach((_, index) => {
      const line = spokeLines[index];
      if (!line) return;

      const ringIdx = nodeRingAssignments[index];
      const ringCfg = config.orbit.rings[ringIdx];
      const radius = baseRadius * ringCfg.radiusFactor;
      const ratio = isMobile ? ringCfg.ellipseRatioMobile : ringCfg.ellipseRatio;

      const baseSpin = computeBaseSpin(nowSeconds, ringCfg.speedMultiplier);
      const angle = orbitAngles[index] + baseSpin + ringCfg.tiltOffset;

      const pos = getTiltedNodePos(angle, radius, ratio, cx, cy);
      const { accent } = nodeAccents[index];

      line.setAttribute("x1", `${cx}`);
      line.setAttribute("y1", `${cy}`);
      line.setAttribute("x2", `${pos.x}`);
      line.setAttribute("y2", `${pos.y}`);
      line.style.stroke = accent;
      line.style.opacity = `${spokeAlpha * pos.depth}`;
    });
  };

  // ── Spoke pulse dots: travel from node → center ──
  const updateSpokePulses = (nowSeconds: number, delta: number, orbitReveal: number) => {
    if (!orbitMenu || orbitReveal <= 0.3) {
      spokePulseCircles.forEach(circles =>
        circles.forEach(c => { c.style.opacity = "0"; })
      );
      spokePulseTrails.forEach(trails =>
        trails.forEach(t => { t.style.opacity = "0"; })
      );
      return;
    }

    const containerRect = orbitMenu.getBoundingClientRect();
    const cx = containerRect.width * 0.5;
    const cy = containerRect.height * 0.5;
    const baseRadius = getOrbitRadius() * (0.9 + orbitReveal * 0.24);

    orbitNodes.forEach((_, index) => {
      const ringIdx = nodeRingAssignments[index];
      const ringCfg = config.orbit.rings[ringIdx];
      const radius = baseRadius * ringCfg.radiusFactor;
      const ratio = isMobile ? ringCfg.ellipseRatioMobile : ringCfg.ellipseRatio;
      const baseSpin = computeBaseSpin(nowSeconds, ringCfg.speedMultiplier);
      const angle = orbitAngles[index] + baseSpin + ringCfg.tiltOffset;

      const pos = getTiltedNodePos(angle, radius, ratio, cx, cy);
      const { accent } = nodeAccents[index];

      const pulses = spokePulses[index];
      const circles = spokePulseCircles[index];
      const trails = spokePulseTrails[index];
      const grads = spokePulseGrads[index];
      if (!pulses || !circles) return;

      // Globe occlusion radius for pulse dots
      const globeR = planetSize * 0.45;
      // Trail length as fraction of spoke (how far back the tail extends)
      const trailFrac = 0.12;

      pulses.forEach((pulse, j) => {
        // Advance progress: 0 = at center (globe), 1 = at node
        pulse.progress += pulse.speed * delta * 0.016;
        if (pulse.progress >= 1) pulse.progress -= 1;

        const t = pulse.progress;
        const px = cx + (pos.x - cx) * t;
        const py = cy + (pos.y - cy) * t;

        // Trail tail position (behind the dot along the spoke)
        const tTail = Math.max(0, t - trailFrac);
        const tailX = cx + (pos.x - cx) * tTail;
        const tailY = cy + (pos.y - cy) * tTail;

        // Fade: brightest in middle of travel, dim near endpoints
        const fadeIn = smoothstep(0, 0.12, t);
        const fadeOut = 1 - smoothstep(0.82, 1, t);
        let alpha = fadeIn * fadeOut * pulse.baseOpacity
          * clamp((orbitReveal - 0.3) * 3, 0, 1);

        // Occlude pulse dots ONLY when physically behind AND overlapping the globe disc
        const pdx = px - cx, pdy = py - cy;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pos.depth < 0.45 && pDist < globeR) {
          const behind = clamp((0.45 - pos.depth) / 0.4, 0, 1);
          const overlap = clamp(1 - pDist / globeR, 0, 1);
          alpha *= clamp(1 - behind * overlap * 0.80, 0.05, 1);
        }

        // Update trail line + gradient
        const trail = trails?.[j];
        const grad = grads?.[j];
        if (trail && grad) {
          trail.setAttribute("x1", `${tailX}`);
          trail.setAttribute("y1", `${tailY}`);
          trail.setAttribute("x2", `${px}`);
          trail.setAttribute("y2", `${py}`);
          trail.style.opacity = `${alpha * 0.7}`;
          // Update gradient direction to follow the spoke
          grad.setAttribute("x1", `${tailX}`);
          grad.setAttribute("y1", `${tailY}`);
          grad.setAttribute("x2", `${px}`);
          grad.setAttribute("y2", `${py}`);
          // Set gradient stops to node accent color
          const stops = grad.querySelectorAll("stop");
          if (stops[0]) stops[0].setAttribute("stop-color", accent);
          if (stops[1]) stops[1].setAttribute("stop-color", accent);
        }

        const circle = circles[j];
        if (circle) {
          circle.setAttribute("cx", `${px}`);
          circle.setAttribute("cy", `${py}`);
          circle.style.opacity = `${alpha}`;
          circle.style.fill = accent;
        }
      });
    });
  };

  // ── Planet glow: ambient atmosphere on main canvas (stays fixed) ──
  const drawPlanetGlow = (orbitReveal: number, nowSeconds: number, fadeMul: number) => {
    if (orbitReveal <= 0.02 || fadeMul <= 0) return;

    const cx = width * 0.5;
    const cy = height * 0.52;
    const baseR = isMobile ? 62 : 90;
    const planetRadius = baseR * (0.85 + orbitReveal * 0.2);
    const planetAlpha = clamp(orbitReveal * 1.4, 0, 1) * fadeMul;
    const glowPulse = reduceMotion ? 0.65 : 0.5 + Math.sin(nowSeconds * 1.8) * 0.3;

    context.save();
    context.globalAlpha = planetAlpha;

    const glowLayers = [
      { scale: 2.8, alpha: 0.02, color: "40, 110, 230" },
      { scale: 2.1, alpha: 0.04, color: "50, 130, 255" },
      { scale: 1.6, alpha: 0.08, color: "65, 155, 255" },
      { scale: 1.3, alpha: 0.15, color: "85, 175, 255" },
    ];
    for (const layer of glowLayers) {
      const gr = planetRadius * (layer.scale + glowPulse * 0.06);
      const grd = context.createRadialGradient(cx, cy, planetRadius * 0.82, cx, cy, gr);
      grd.addColorStop(0, `rgba(${layer.color}, ${layer.alpha * glowPulse})`);
      grd.addColorStop(0.5, `rgba(${layer.color}, ${layer.alpha * 0.35 * glowPulse})`);
      grd.addColorStop(1, `rgba(${layer.color}, 0)`);
      context.fillStyle = grd;
      context.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    }

    context.restore();
  };

  // ── Planet sphere: renders onto inline planetCanvas (scrolls with DOM) ──
  // ── Wireframe Hex Globe renderer (replaces textured planet) ──
  // Breathing scale — smoothly oscillates between 80% and 105%
  let globeBreathTarget = 1.0;     // target scale
  let globeBreathCurrent = 1.0;    // smoothed current scale
  // Mouse-over-globe detection for proximity highlight
  let globeMouseNx = 0;  // normalized mouse direction on globe surface (3D)
  let globeMouseNy = 0;
  let globeMouseNz = 0;
  let globeMouseProximity = 0;  // 0..1, how close cursor is to globe center

  const drawHexGlobe = (nowSeconds: number, orbitReveal: number) => {
    if (!planetCtx || !planetCanvas || orbitReveal <= 0.02) return;

    const s = planetSize;
    const r = s * 0.5;
    // Match orbit base spin using paused-aware time
    // Negate to sync visual direction (globe surface moves WITH orbit nodes)
    const orbitT = getOrbitTime(nowSeconds);
    const rotY = -((reduceMotion ? scrollProgress * Math.PI * 2 : orbitT * 0.17)
      + scrollProgress * Math.PI * 0.55 + touchSpinOffset);
    const tiltX = 0.3 + touchTiltOffset; // base axial tilt + drag tilt
    const cosRY = Math.cos(rotY), sinRY = Math.sin(rotY);
    const cosTX = Math.cos(tiltX), sinTX = Math.sin(tiltX);

    // ── Breathing pulse: 80% ↔ 105% ──
    // Multi-layered sine for organic feel
    const breathA = Math.sin(nowSeconds * 0.8) * 0.5 + 0.5;   // slow primary
    const breathB = Math.sin(nowSeconds * 1.9) * 0.5 + 0.5;    // faster secondary
    const breathMix = breathA * 0.75 + breathB * 0.25;          // weighted blend
    globeBreathTarget = 0.80 + breathMix * 0.25;                // 0.80 → 1.05
    // Smooth damp toward target (prevents pops)
    globeBreathCurrent += (globeBreathTarget - globeBreathCurrent) * 0.08;
    const breathScale = globeBreathCurrent;

    // ── Mouse proximity to globe surface (for hex highlight) ──
    // Forward projection is:
    //   rx = cx*cosRY + cy*sinRY           (screen X component)
    //   ry = -cx*sinRY + cy*cosRY          (intermediate)
    //   fz = ry*sinTX + cz*cosTX           (screen Y component, negated)
    //   fy = ry*cosTX - cz*sinTX           (depth / view direction)
    //   screenX = r + rx * scale            → fx = (screenX - r) / scale
    //   screenY = r - fz * scale            → fz = (r - screenY) / scale
    // So from 2D screen coords we get: fx = rx, fz known, fy (depth) = sqrt(1 - fx² - fz²)
    // Then un-tilt: ry = fz*sinTX + fy*cosTX,  cz = fz*cosTX - fy*sinTX
    // Then un-rotateY: cx = rx*cosRY - ry*sinRY,  cy = rx*sinRY + ry*cosRY
    // (using inverse = transpose since rotation matrices are orthogonal,
    //  but note rotY was negated, so inverse uses -rotY → cos same, sin flipped)
    if (planetCanvas && orbitCore) {
      const coreRect = orbitCore.getBoundingClientRect();
      const coreCx = coreRect.left + coreRect.width * 0.5;
      const coreCy = coreRect.top + coreRect.height * 0.5;
      const coreR = Math.max(coreRect.width, coreRect.height) * 0.5;
      // Convert viewport-normalized mouse to pixel distance from globe center
      const mPxX = (mouseX * 0.5 + 0.5) * width - coreCx;
      const mPxY = (mouseY * 0.5 + 0.5) * height - coreCy;
      const mDist = Math.sqrt(mPxX * mPxX + mPxY * mPxY);
      // Proximity: 1.0 when cursor is at globe center, 0 when far away
      globeMouseProximity = clamp(1 - mDist / (coreR * 2.5), 0, 1);
      // Unproject mouse to 3D world-space direction on the globe
      if (mDist < coreR * 1.5 && globeMouseProximity > 0.05) {
        const projR = coreR * breathScale * 0.90;
        // fx (= rx) and fz from screen coords
        const fx = mPxX / projR;
        const fz = -mPxY / projR;   // screenY = r - fz*scale → fz = -mPxY/scale
        const fSq = fx * fx + fz * fz;
        if (fSq < 1.0) {
          const fy = Math.sqrt(Math.max(0, 1 - fSq));  // depth (facing us = positive)
          // Reverse tilt (inverse of X-axis rotation by tiltX):
          //   ry = fz * sinTX + fy * cosTX
          //   cz = fz * cosTX - fy * sinTX
          const ry = fz * sinTX + fy * cosTX;
          const wcz = fz * cosTX - fy * sinTX;
          // Reverse Y-rotation (inverse of Y-axis rotation by rotY):
          //   Since forward was rx = cx*cosRY + cy*sinRY, ry = -cx*sinRY + cy*cosRY
          //   Inverse: cx = rx*cosRY - ry*sinRY, cy = rx*sinRY + ry*cosRY
          //   But rotY includes a negation, so inverse flips sign of sinRY:
          globeMouseNx = fx * cosRY + ry * sinRY;
          globeMouseNy = -fx * sinRY + ry * cosRY;
          globeMouseNz = wcz;
        } else {
          globeMouseProximity = 0;
        }
      } else {
        globeMouseProximity = 0;
      }
    }

    planetCtx.clearRect(0, 0, planetCanvas.width, planetCanvas.height);
    planetCtx.save();
    planetCtx.scale(dpr, dpr);
    planetCtx.globalAlpha = clamp(orbitReveal * 1.4, 0, 1);

    // Clip to circle
    planetCtx.save();
    planetCtx.beginPath();
    planetCtx.arc(r, r, r - 1, 0, Math.PI * 2);
    planetCtx.clip();

    const glowPulse = reduceMotion ? 0.65 : 0.5 + Math.sin(nowSeconds * 1.8) * 0.3;

    // ── Energy Core: particle nebula BEHIND the wireframe ──
    planetCtx.save();
    planetCtx.globalCompositeOperation = "lighter";

    // Mouse influence on particles
    const mxInfluence = mouseX * 0.15;
    const myInfluence = mouseY * 0.15;

    // Central energy glow — pulsing core, synced with breath
    const corePulse = 0.5 + Math.sin(nowSeconds * 2.2) * 0.25 + Math.sin(nowSeconds * 3.7) * 0.12;
    const coreR = r * 0.35 * breathScale * (1 + corePulse * 0.2);
    const coreGrd = planetCtx.createRadialGradient(r, r, 0, r, r, coreR);
    coreGrd.addColorStop(0, `rgba(220, 240, 255, ${corePulse * 0.5})`);
    coreGrd.addColorStop(0.2, `rgba(140, 190, 255, ${corePulse * 0.3})`);
    coreGrd.addColorStop(0.5, `rgba(80, 140, 255, ${corePulse * 0.12})`);
    coreGrd.addColorStop(1, "rgba(40, 80, 200, 0)");
    planetCtx.fillStyle = coreGrd;
    planetCtx.fillRect(0, 0, s, s);

    // Secondary wider ambient glow — synced with breath
    const ambR = r * 0.7 * breathScale;
    const ambGrd = planetCtx.createRadialGradient(r, r, 0, r, r, ambR);
    ambGrd.addColorStop(0, `rgba(60, 120, 220, ${corePulse * 0.08})`);
    ambGrd.addColorStop(0.5, `rgba(40, 90, 180, ${corePulse * 0.04})`);
    ambGrd.addColorStop(1, "rgba(20, 50, 120, 0)");
    planetCtx.fillStyle = ambGrd;
    planetCtx.fillRect(0, 0, s, s);

    // Update and draw particles
    const delta16 = reduceMotion ? 0.5 : 1;
    const hueColors = [
      [90, 150, 255],   // 0 = blue
      [120, 220, 250],  // 1 = cyan
      [230, 240, 255],  // 2 = white-hot
    ];

    for (const p of coreParticles) {
      // Advance lifecycle
      p.life += delta16 * 0.006 / p.maxLife;
      if (p.life >= 1) {
        initCoreParticle(p, true);
        continue;
      }

      // Orbital motion (swirl around Y axis)
      const swirlSpeed = p.layer === 0 ? 0.03 : p.layer === 1 ? 0.015 : 0.005;
      const cosS = Math.cos(swirlSpeed * delta16);
      const sinS = Math.sin(swirlSpeed * delta16);
      const nx = p.x * cosS - p.z * sinS;
      const nz = p.x * sinS + p.z * cosS;
      p.x = nx;
      p.z = nz;

      // Apply velocity + mouse push
      const pushDist = Math.sqrt(p.x * p.x + p.z * p.z) + 0.01;
      p.x += p.vx * delta16 + mxInfluence * 0.003 / pushDist;
      p.y += p.vy * delta16 + myInfluence * 0.003 / pushDist;
      p.z += p.vz * delta16;

      // Gentle pull back toward center (gravity)
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      const maxDist = p.layer === 0 ? 0.3 : p.layer === 1 ? 0.55 : 0.85;
      if (dist > maxDist) {
        const pullStrength = (dist - maxDist) * 0.025;
        p.x -= (p.x / dist) * pullStrength;
        p.y -= (p.y / dist) * pullStrength;
        p.z -= (p.z / dist) * pullStrength;
      }

      // Lifecycle fade (in/out)
      const lifeFade = p.life < 0.12
        ? p.life / 0.12
        : p.life > 0.75 ? (1 - p.life) / 0.25 : 1;

      // Project to 2D (match globe rotation) — scale with breath
      const rx = p.x * cosRY + p.z * sinRY;
      const rz = -p.x * sinRY + p.z * cosRY;
      const fy = rz * cosTX - p.y * sinTX;
      const fz = rz * sinTX + p.y * cosTX;
      const particleScale = r * 0.88 * breathScale;
      const px = r + rx * particleScale;
      const py = r - fz * particleScale;
      const depth = fy;

      // MUCH brighter alpha — front particles really pop
      const depthAlpha = clamp(0.35 + (depth + 1) * 0.45, 0.15, 1);
      const alpha = lifeFade * p.brightness * depthAlpha * (0.7 + glowPulse * 0.5);

      if (alpha < 0.02) continue;

      const col = hueColors[p.hue] || hueColors[0];
      const drawSize = p.size * (0.8 + (depth + 1) * 0.35);

      // Glow halo — more particles get halos now
      if (alpha > 0.08 && drawSize > 0.4) {
        const glowR = drawSize * 4;
        const grd = planetCtx.createRadialGradient(px, py, 0, px, py, glowR);
        grd.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 0.5})`);
        grd.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 0.12})`);
        grd.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
        planetCtx.fillStyle = grd;
        planetCtx.beginPath();
        planetCtx.arc(px, py, glowR, 0, Math.PI * 2);
        planetCtx.fill();
      }

      // Solid bright particle
      planetCtx.globalAlpha = Math.min(1, alpha * 1.3);
      planetCtx.fillStyle = `rgb(${col[0]}, ${col[1]}, ${col[2]})`;
      planetCtx.beginPath();
      planetCtx.arc(px, py, Math.max(0.4, drawSize), 0, Math.PI * 2);
      planetCtx.fill();
    }

    planetCtx.globalAlpha = 1;
    planetCtx.globalCompositeOperation = "source-over";
    planetCtx.restore();

    // ── Project and draw each hex/pent cell ──
    const cellProjectScale = r * 0.90 * breathScale;

    for (const cell of hexCells) {
      // Back-face check on cell center
      const [ncx, ncy, ncz] = cell.center;
      const nrx = ncx * cosRY + ncy * sinRY;
      const nry = -ncx * sinRY + ncy * cosRY;
      const viewDepth = nry * cosTX - ncz * sinTX;
      if (viewDepth < -0.2) continue;

      // ── Mouse proximity highlight ──
      // Dot product between cell center (world space) and mouse direction
      let mouseHighlight = 0;
      if (globeMouseProximity > 0.05) {
        const dot = ncx * globeMouseNx + ncy * globeMouseNy + ncz * globeMouseNz;
        // dot > 0.7 means cell faces toward mouse; fade smoothly
        mouseHighlight = clamp((dot - 0.4) / 0.5, 0, 1) * globeMouseProximity;
      }

      // Project all corners
      const projected: { x: number; y: number }[] = [];
      let avgDepth = 0;

      for (const [cx, cy, cz] of cell.corners) {
        const rx = cx * cosRY + cy * sinRY;
        const ry = -cx * sinRY + cy * cosRY;
        const fx = rx;
        const fy = ry * cosTX - cz * sinTX;
        const fz = ry * sinTX + cz * cosTX;
        projected.push({
          x: r + fx * cellProjectScale,
          y: r - fz * cellProjectScale,
        });
        avgDepth += fy;
      }
      avgDepth /= projected.length;

      // Depth-based alpha and line width
      const depthAlpha = clamp(0.08 + (avgDepth + 1) * 0.32, 0.04, 0.60);
      const lineW = 0.4 + clamp((avgDepth + 1) * 0.3, 0, 0.6);

      // ── Color blending: base blue → warm gold on mouse proximity ──
      const baseR = 100, baseG = 180, baseB = 255;     // default hex blue
      const warmR = 235, warmG = 190, warmB = 100;      // warm gold highlight
      const mh = mouseHighlight * mouseHighlight;       // quadratic for softer falloff
      const cellR = Math.round(baseR + (warmR - baseR) * mh);
      const cellG = Math.round(baseG + (warmG - baseG) * mh);
      const cellB = Math.round(baseB + (warmB - baseB) * mh);
      // Boost alpha for highlighted cells
      const highlightAlphaBoost = 1 + mh * 2.0;

      // Stroke the hex/pent outline
      planetCtx.strokeStyle = `rgba(${cellR}, ${cellG}, ${cellB}, ${depthAlpha * glowPulse * 1.3 * highlightAlphaBoost})`;
      planetCtx.lineWidth = lineW + mh * 0.6;
      planetCtx.beginPath();
      planetCtx.moveTo(projected[0].x, projected[0].y);
      for (let k = 1; k < projected.length; k++) {
        planetCtx.lineTo(projected[k].x, projected[k].y);
      }
      planetCtx.closePath();
      planetCtx.stroke();

      // ── Fill highlighted cells with a warm glow ──
      if (mh > 0.05) {
        planetCtx.fillStyle = `rgba(${warmR}, ${warmG}, ${warmB}, ${mh * 0.12 * depthAlpha})`;
        planetCtx.fill();
      }

      // Glowing vertex dots at each corner
      if (avgDepth > -0.15) {
        const dotAlpha = clamp(0.1 + (avgDepth + 1) * 0.35, 0.05, 0.75) * glowPulse * 1.2 * highlightAlphaBoost;
        const dotR = 0.5 + clamp((avgDepth + 1) * 0.55, 0, 1.0) + mh * 0.4;

        for (const p of projected) {
          // Glow halo on front-facing cells
          if (avgDepth > 0.2) {
            const glowR = dotR * 2.5;
            const grd = planetCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            grd.addColorStop(0, `rgba(${Math.min(255, cellR + 60)}, ${Math.min(255, cellG + 40)}, ${cellB}, ${dotAlpha * 0.4})`);
            grd.addColorStop(1, `rgba(${cellR}, ${cellG}, ${cellB}, 0)`);
            planetCtx.fillStyle = grd;
            planetCtx.beginPath();
            planetCtx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            planetCtx.fill();
          }

          planetCtx.fillStyle = `rgba(${Math.min(255, cellR + 80)}, ${Math.min(255, cellG + 40)}, ${cellB}, ${dotAlpha})`;
          planetCtx.beginPath();
          planetCtx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
          planetCtx.fill();
        }
      }
    }

    planetCtx.restore(); // end clip
    planetCtx.restore();
  };

  const drawStarField = (
    delta: number,
    palette: ColorRGB[],
    orbitReveal: number,
    warpStrength: number,
    sequenceBoost: number,
    stageSpeedNormalized: number,
    orbitDampen: number
  ) => {
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const focal = Math.max(width, height) * 0.94;

    const dynamicSpeed =
      (scrollEnergy * 0.22 +
        pointerEnergy * 0.08 +
        sequenceBoost * 1.12 +
        stageSpeedNormalized * speedStageMaxBoost +
        warpStrength * config.stars.warpBoost) *
      orbitDampen;
    const speed = config.stars.baseSpeed + dynamicSpeed;

    for (const star of stars) {
      star.z -= speed * delta * (8 + star.size * 4);

      if (star.z <= 1) {
        resetStar(star, config.stars.depth, spread);
      }

      const projection = focal / star.z;
      const depthMix = clamp(1 - star.z / config.stars.depth, 0, 1);
      const parallax = 1 + depthMix * 1.8;
      const sx = centerX + (star.x + mouseX * 28 * parallax) * projection;
      const sy = centerY + (star.y + mouseY * 24 * parallax) * projection;

      if (sx < -120 || sx > width + 120 || sy < -120 || sy > height + 120) {
        resetStar(star, config.stars.depth, spread);
        continue;
      }

      const nearWhite = clamp(188 + depthMix * 67, 0, 255);
      const subtleCool = samplePaletteColor(palette, star.tint);
      const color = lerpColor(
        [nearWhite, nearWhite, clamp(200 + depthMix * 55, 0, 255)],
        subtleCool,
        (1 - depthMix) * 0.14
      );
      const alpha = clamp(0.12 + depthMix * 0.86 + warpStrength * 0.08, 0, 1);
      const radius = clamp(star.size * (0.45 + depthMix * 1.9), 0.35, 3.2);

      if (warpStrength > 0.07 && star.initialized && !reduceMotion) {
        const streakAlpha = alpha * clamp(warpStrength * 1.05, 0, 0.92);
        context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${streakAlpha})`;
        context.lineWidth = clamp(radius * 0.72, 0.35, 1.8);
        context.beginPath();
        context.moveTo(star.prevX, star.prevY);
        context.lineTo(sx, sy);
        context.stroke();
      }

      // Draw V logo stamp or regular circle
      if (star.isVLogo && vStampReady) {
        // V logos are ~2.5x the size of a normal star dot for visibility
        const vSize = radius * 7;
        if (vSize > 1.2) { // skip if too tiny to see
          context.save();
          context.globalAlpha = alpha * 0.85; // slightly more transparent than dots
          context.drawImage(vStampCanvas, sx - vSize * 0.5, sy - vSize * 0.5, vSize, vSize);
          context.restore();
        }
      } else {
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        context.beginPath();
        context.arc(sx, sy, radius, 0, Math.PI * 2);
        context.fill();
      }

      star.prevX = sx;
      star.prevY = sy;
      star.initialized = true;
    }

    const vignette = context.createLinearGradient(0, 0, 0, height);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0.9)");
    vignette.addColorStop(0.24, "rgba(0, 0, 0, 0.06)");
    vignette.addColorStop(0.78, "rgba(0, 0, 0, 0.08)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.94)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);

    if (orbitReveal > 0.06) {
      const halo = context.createRadialGradient(
        width * 0.5,
        height * 0.52,
        0,
        width * 0.5,
        height * 0.52,
        Math.max(width, height) * 0.45
      );
      halo.addColorStop(0, `rgba(74, 124, 230, ${0.04 + orbitReveal * 0.12})`);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);
    }
  };

  const updateOrbitMenu = (nowSeconds: number, orbitReveal: number) => {
    if (!orbitMenu || !orbitNodes.length) return;

    const visible = orbitReveal > 0.16;
    orbitMenu.classList.toggle("is-active", visible);
    orbitMenu.setAttribute("aria-hidden", visible ? "false" : "true");

    if (!visible) {
      nodesHaveEntered = false;
      return;
    }

    const isNarrowStack = width < 340;
    if (isNarrowStack) {
      orbitNodes.forEach(node => {
        node.style.transform = "";
        node.style.opacity = `${clamp(orbitReveal * 1.2, 0, 1)}`;
      });
      return;
    }

    const baseRadius = getOrbitRadius() * (0.9 + orbitReveal * 0.24);
    const nodeOpacity = clamp(orbitReveal * 1.2, 0, 1);
    const nodeScale = 0.9 + orbitReveal * 0.14;

    // Fly-in animation on first reveal
    if (!nodesHaveEntered) {
      nodesHaveEntered = true;
      orbitNodes.forEach((node, index) => {
        const startAngle = Math.random() * Math.PI * 2;
        const startDist = Math.max(width, height) * 0.6;
        const startX = Math.cos(startAngle) * startDist;
        const startY = Math.sin(startAngle) * startDist;
        node.style.transform = `translate(calc(-50% + ${startX}px), calc(-50% + ${startY}px)) scale(0.3)`;
        node.style.opacity = "0";
        node.style.transition = `transform ${0.6 + index * 0.08}s cubic-bezier(0.16, 1, 0.3, 1), opacity ${0.4 + index * 0.06}s ease`;
      });
      requestAnimationFrame(() => {
        orbitNodes.forEach(node => {
          node.style.transition = "transform 0.12s ease-out, opacity 0.2s ease";
        });
      });
    }

    // Apply tilt rotation to orbit nodes (matches globe tilt)
    const cosTilt = Math.cos(touchTiltOffset);
    const sinTilt = Math.sin(touchTiltOffset);

    orbitNodes.forEach((node, index) => {
      const ringIdx = nodeRingAssignments[index];
      const ringCfg = config.orbit.rings[ringIdx];
      const radius = baseRadius * ringCfg.radiusFactor;
      const ratio = isMobile ? ringCfg.ellipseRatioMobile : ringCfg.ellipseRatio;

      const baseSpin = computeBaseSpin(nowSeconds, ringCfg.speedMultiplier);
      const angle = orbitAngles[index] + baseSpin + ringCfg.tiltOffset;

      // 3D orbit position (x = horizontal, y = depth, z = vertical)
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius * 0.3; // depth (into screen)
      const oz = Math.sin(angle) * radius * ratio;

      // Apply tilt rotation around X-axis
      const tiltedY = oy * cosTilt - oz * sinTilt;
      const tiltedZ = oy * sinTilt + oz * cosTilt;

      const drift = reduceMotion ? 0 : Math.sin(nowSeconds * 0.8 + index * 0.9) * 8 * orbitReveal;
      const parallaxX = isMobile ? 4 : 14;
      const parallaxY = isMobile ? 3 : 10;
      const x = ox + mouseX * parallaxX;
      const y = tiltedZ + mouseY * parallaxY + drift * 0.25;

      // Depth from tilted position (-1 to 1 range)
      const depthMix = clamp((tiltedY / radius + 1) * 0.5, 0, 1);

      // ── Globe occlusion: ONLY when node is physically behind AND overlapping the globe disc ──
      const globeScreenR = planetSize * 0.5;
      const distFromCenter = Math.sqrt(x * x + y * y);
      const isBehind = depthMix < 0.45;
      const isOverlappingGlobe = distFromCenter < globeScreenR;

      let occlusionAlpha = 1;
      let blurPx = 0;

      if (isBehind && isOverlappingGlobe) {
        // Only occlude when the node is visually passing through the globe area
        const behindAmount = clamp((0.45 - depthMix) / 0.4, 0, 1);
        const overlapAmount = clamp(1 - distFromCenter / globeScreenR, 0, 1);
        const occlusionStrength = behindAmount * overlapAmount;
        occlusionAlpha = clamp(1 - occlusionStrength * 0.80, 0.05, 1);
        blurPx = occlusionStrength * 12;
      }

      // Depth sorting
      const depthScale = nodeScale * (0.78 + depthMix * 0.28);
      const depthOpacity = nodeOpacity * (0.45 + depthMix * 0.55) * occlusionAlpha;

      node.style.zIndex = (isBehind && isOverlappingGlobe) ? "-1" : `${Math.round(depthMix * 10)}`;
      node.style.opacity = `${depthOpacity}`;
      node.style.filter = blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : "none";
      node.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px)) scale(${depthScale.toFixed(3)})`;

      // Set accent color as CSS variable for dot + popup styling
      const { accent } = nodeAccents[index];
      node.style.setProperty("--node-accent", accent);
    });
  };

  const draw = (now: number) => {
    const nowSeconds = now * 0.001;
    const delta = clamp((now - lastTime) / 16.6667, 0.35, 2.4);
    lastTime = now;

    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    scrollEnergy = Math.max(0, scrollEnergy * 0.94 - 0.002);
    pointerEnergy = Math.max(0, pointerEnergy * 0.92 - 0.002);

    // Momentum decay for drag spin (horizontal + vertical tilt)
    touchSpinVelocity *= 0.95;
    if (Math.abs(touchSpinVelocity) > 0.0001) touchSpinOffset += touchSpinVelocity;

    touchTiltVelocity *= 0.95;
    if (Math.abs(touchTiltVelocity) > 0.0001) touchTiltOffset += touchTiltVelocity;
    // Gently return tilt to zero when not dragging (spring-back)
    if (!isTouchDragging && !isMouseDragging) {
      touchTiltOffset *= 0.97;
      if (Math.abs(touchTiltOffset) < 0.001) touchTiltOffset = 0;
    }

    // slideWindow = the scroll range for all 4 titles.
    // The LAST slide stays in its hold until introOpacity fades the panel,
    // so slideWindow should extend to where introOpacity ≈ 0.
    // introOpacity fades: orbit.start-0.12 → orbit.start-0.02 = 0.64 → 0.74
    // Set slideWindow = orbit.start - 0.02 = 0.74 so slideProgress=1.0
    // at the exact moment the intro panel is nearly invisible.
    const slideWindow = Math.max(config.orbit.start - 0.02, 0.0001);
    const slideProgress = clamp(scrollProgress / slideWindow, 0, 1);
    const stageValue = slideProgress * Math.max(stageThemes.length - 1, 1);
    const stageLower = Math.floor(stageValue);
    const stageUpper = Math.min(stageThemes.length - 1, stageLower + 1);
    const stageMix = stageValue - stageLower;

    // Warp kicks in during the last slide's fly-out and orbit approach
    // orbit.start=0.76, so warp ramps 0.68→0.74 (slide 3 fly-out zone)
    const introWarpWindowStart = Math.max(config.orbit.start - 0.08, 0.4);
    const introWarpWindowEnd = Math.max(config.orbit.start - 0.02, introWarpWindowStart + 0.01);
    let warpStrength =
      smoothstep(introWarpWindowStart, introWarpWindowEnd, scrollProgress) *
      (1 - smoothstep(config.orbit.start - 0.02, config.orbit.full, scrollProgress));
    const orbitReveal = smoothstep(config.orbit.start, config.orbit.full, scrollProgress);
    // ── Star speed ↔ title sync (frame-by-frame) ──
    //
    // Title phases per slide (t = intra-slide progress 0→1):
    //   FLY-IN  t 0.00–0.15: title arrives from vanishing pt (stars hot, settling)
    //   HOLD    t 0.15–0.75: title readable (stars CALM at this stage's speed)
    //   FLY-OUT t 0.75–1.00: title departs along 290° (stars SURGE to next stage)
    //
    // The SURGE during fly-out is what makes it feel like you're accelerating
    // through space — the title and stars speed up TOGETHER.
    //
    // speedStages [1, 6, 18, 42, 100] — hold speeds for each slide:
    //   [0] slide 0 hold = 1  (gentle idle while reading hero headline)
    //   [1] slide 1 hold = 6  (cruising)
    //   [2] slide 2 hold = 18 (building)
    //   [3] slide 3 hold = 42 (intense)
    //   [4] orbit push  = 100 (max — only reached during final fly-out)
    //
    const intraSlide = (slideProgress * slides.length) % 1;
    const activeSlideIndex = Math.floor(clamp(slideProgress, 0, 0.999) * slides.length);

    const flyInEnd = 0.15;  // must match title flyInEnd
    const holdEnd = 0.75;   // must match title holdEnd

    const baseIdx = clamp(activeSlideIndex, 0, speedStages.length - 1);
    const nextIdx = Math.min(baseIdx + 1, speedStages.length - 1);
    const holdSpeed = speedStages[baseIdx];
    const nextHoldSpeed = speedStages[nextIdx];

    // Peak speed during transition = midpoint between current and next hold
    // (so the surge is proportional to the gap between stages)
    const transitionPeak = holdSpeed + (nextHoldSpeed - holdSpeed) * 0.7;

    let continuousSpeed: number;
    if (intraSlide < flyInEnd) {
      // FLY-IN: stars are still hot from the previous fly-out surge,
      // decelerating into this slide's calm hold speed
      const settleT = smoothstep(0, flyInEnd, intraSlide);
      continuousSpeed = lerp(transitionPeak, holdSpeed, settleT);
    } else if (intraSlide < holdEnd) {
      // HOLD: calm and steady — you're reading the title
      continuousSpeed = holdSpeed;
    } else {
      // FLY-OUT: title flying past → stars SURGE toward next stage
      const surgeT = smoothstep(holdEnd, 0.96, intraSlide);
      continuousSpeed = lerp(holdSpeed, transitionPeak, surgeT);
    }

    const stageSpeedNormalized = clamp((continuousSpeed - 1) / 99, 0, 1);

    // Extra boost for the final slide's fly-out into orbit
    const leverageBoundary = 3 / 4;
    const transitionBurst = smoothstep(leverageBoundary - 0.04, leverageBoundary + 0.06, slideProgress);
    const executionBoost = smoothstep(leverageBoundary + 0.05, 0.96, slideProgress);
    const boostedStageSpeed = clamp(stageSpeedNormalized + executionBoost * 0.35, 0, 1);

    // Transition pulse: extra sequenceBoost kick synced to title motion
    // This adds the visual "burst" feeling — stars jump when titles move
    const transitionPulse = intraSlide < flyInEnd
      ? (1 - smoothstep(0, flyInEnd, intraSlide)) * 0.5  // fly-in: fading burst
      : intraSlide > holdEnd
        ? smoothstep(holdEnd, 1.0, intraSlide)             // fly-out: rising burst
        : 0;                                                // hold: calm

    const sequenceBoost =
      smoothstep(0.06, 0.98, slideProgress) *
      (1 - smoothstep(config.orbit.start - 0.03, config.orbit.start + 0.06, scrollProgress)) *
      (0.10 + transitionPulse * 0.90);

    const orbitPhase = orbitReveal > 0.16;
    const orbitExiting = scrollProgress > 0.98;
    const orbitSpeedReset = orbitReveal > 0.1;
    if (orbitSpeedReset) {
      warpStrength = 0;
    }
    wrapper.classList.toggle("is-orbit-phase", orbitPhase && !orbitExiting);

    // ── Single opacity driver for the entire hero intro panel ──
    // The intro panel (chip + slide titles + description + buttons + badges)
    // has ONE driver: fade out as orbit reveals. Nothing else touches it.
    const introOpacity = clamp(
      1 - smoothstep(config.orbit.start - 0.12, config.orbit.start - 0.02, scrollProgress),
      0,
      1
    );

    if (introPanel) {
      introPanel.style.opacity = `${introOpacity}`;
      introPanel.style.pointerEvents = introOpacity < 0.2 ? "none" : "auto";
    }

    // Scroll exit fade — canvas glow fades when sticky section unpins
    const canvasOrbitFade = 1 - smoothstep(0.96, 1.0, scrollProgress);

    drawAtmosphere(stageThemes[stageLower], stageThemes[stageUpper], stageMix);
    const orbitDampen = 1 - smoothstep(config.orbit.start - 0.02, config.orbit.start + 0.04, scrollProgress);
    drawStarField(
      delta,
      stageThemes[stageUpper].palette,
      orbitReveal,
      warpStrength + transitionBurst * 0.7,
      sequenceBoost,
      orbitSpeedReset ? 0 : boostedStageSpeed,
      orbitDampen
    );

    // Planet glow on main canvas (fades with scroll exit)
    drawPlanetGlow(orbitReveal, nowSeconds, canvasOrbitFade);

    // SVG spokes + pulse dots + hex globe + DOM nodes (all in orbit-menu DOM)
    updateOrbitSVG(nowSeconds, orbitReveal);
    updateSpokeSVG(nowSeconds, orbitReveal);
    updateSpokePulses(nowSeconds, delta, orbitReveal);
    drawHexGlobe(nowSeconds, orbitReveal);
    updateOrbitMenu(nowSeconds, orbitReveal);
    updateSlidesFlyThrough(slideProgress);

    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(draw);
    }
  };

  const pointerMove = (event: PointerEvent) => {
    targetMouseX = clamp((event.clientX / width - 0.5) * 2, -1, 1);
    targetMouseY = clamp((event.clientY / height - 0.5) * 2, -1, 1);
    pointerEnergy = clamp(pointerEnergy + 0.035, 0, 1);
  };

  const pointerLeave = () => {
    targetMouseX = 0;
    targetMouseY = 0;
  };

  // Touch swipe-to-spin handlers
  const touchStart = (e: TouchEvent) => {
    if (scrollProgress < config.orbit.start) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouchDragging = false;
  };

  const touchMove = (e: TouchEvent) => {
    if (scrollProgress < config.orbit.start) return;
    const touch = e.touches[0];
    let dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (!isTouchDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      isTouchDragging = true;
    }

    if (isTouchDragging) {
      e.preventDefault();
      // Horizontal spin
      const spinDelta = dx * 0.004;
      touchSpinOffset += spinDelta;
      touchSpinVelocity = spinDelta;
      // Vertical tilt (breaks orbital plane)
      const tiltDelta = dy * -0.003;
      touchTiltOffset = clamp(touchTiltOffset + tiltDelta, -1.2, 1.2);
      touchTiltVelocity = tiltDelta;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }
  };

  const touchEnd = () => { isTouchDragging = false; };

  // Mouse click-and-drag spin handlers (desktop)
  const mouseDown = (e: MouseEvent) => {
    if (scrollProgress < config.orbit.start) return;
    if ((e.target as HTMLElement).closest(".orbit-node")) return;
    isMouseDragging = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    orbitMenu?.classList.add("is-dragging");
    e.preventDefault();
  };

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isMouseDragging) return;
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    // Horizontal spin
    const spinDelta = dx * 0.004;
    touchSpinOffset += spinDelta;
    touchSpinVelocity = spinDelta;
    // Vertical tilt (breaks orbital plane — spin any direction!)
    const tiltDelta = dy * -0.003;
    touchTiltOffset = clamp(touchTiltOffset + tiltDelta, -1.2, 1.2);
    touchTiltVelocity = tiltDelta;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
  };

  const mouseUp = () => {
    if (!isMouseDragging) return;
    isMouseDragging = false;
    orbitMenu?.classList.remove("is-dragging");
  };

  // Tap-to-expand on touch devices:
  // 1st tap on node → show popup (prevent navigation)
  // 2nd tap on popup → navigate to page
  // Tap elsewhere → close popup
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    orbitNodes.forEach(node => {
      node.addEventListener("click", (e) => {
        const clickedPopup = (e.target as HTMLElement).closest(".orbit-node__popup");
        if (node.classList.contains("is-expanded") && clickedPopup) {
          // Second tap on the popup → allow navigation (don't prevent default)
          return;
        }
        // First tap or tap on dot → expand and show popup
        e.preventDefault();
        orbitNodes.forEach(n => n.classList.remove("is-expanded"));
        node.classList.add("is-expanded");
      });
    });

    // Tap on orbit background → close any expanded node
    if (orbitMenu) {
      orbitMenu.addEventListener("click", (e) => {
        const clickedNode = (e.target as HTMLElement).closest(".orbit-node");
        if (!clickedNode) {
          orbitNodes.forEach(n => n.classList.remove("is-expanded"));
        }
      });
    }
  }

  const scrollToOrbit = () => {
    const maxScrollable = Math.max(wrapper.offsetHeight - window.innerHeight, 0);
    const orbitTargetTop = wrapper.offsetTop + maxScrollable * config.orbit.full;
    window.scrollTo({ top: orbitTargetTop, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const trigger = ScrollTrigger.create({
    trigger: wrapper,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      scrollEnergy = clamp(scrollEnergy + clamp(Math.abs(self.getVelocity()) / 3000, 0, 1), 0, 2);

      if (reduceMotion) {
        draw(performance.now());
      }
    }
  });

  // Initialize SVG, ring assignments, hex globe, and planet canvas
  generateHexGlobe(isMobile ? 2 : 3); // 2 subs mobile (~80 hex cells), 3 desktop (~320 hex cells)
  createOrbitSVG();
  assignNodesToRings();
  initSpokePulses();
  initEnergyCoreParticles();
  resize();
  initPlanetCanvas();
  updateSlidesFlyThrough(0);
  if (reduceMotion) {
    draw(performance.now());
  } else {
    frameId = window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  wrapper.addEventListener("pointermove", pointerMove, { passive: true });
  wrapper.addEventListener("pointerleave", pointerLeave, { passive: true });
  if (skipIntroButton) {
    skipIntroButton.addEventListener("click", scrollToOrbit);
  }
  if (orbitMenu) {
    orbitMenu.addEventListener("touchstart", touchStart, { passive: true });
    orbitMenu.addEventListener("touchmove", touchMove, { passive: false });
    orbitMenu.addEventListener("touchend", touchEnd, { passive: true });
    orbitMenu.addEventListener("mousedown", mouseDown);
  }
  window.addEventListener("mousemove", mouseMoveHandler);
  window.addEventListener("mouseup", mouseUp);

  // Hover-pause: freeze orbit when hovering any node (desktop only)
  const pauseOrbit = () => {
    if (orbitPaused) return;
    orbitPaused = true;
    pauseStartTime = performance.now() * 0.001;
  };
  const resumeOrbit = () => {
    if (!orbitPaused) return;
    pauseTimeOffset += performance.now() * 0.001 - pauseStartTime;
    orbitPaused = false;
  };
  orbitNodes.forEach(node => {
    node.addEventListener("mouseenter", pauseOrbit);
    node.addEventListener("mouseleave", resumeOrbit);
  });

  return () => {
    window.removeEventListener("resize", resize);
    wrapper.removeEventListener("pointermove", pointerMove);
    wrapper.removeEventListener("pointerleave", pointerLeave);
    if (skipIntroButton) {
      skipIntroButton.removeEventListener("click", scrollToOrbit);
    }
    window.removeEventListener("mousemove", mouseMoveHandler);
    window.removeEventListener("mouseup", mouseUp);
    if (orbitMenu) {
      orbitMenu.removeEventListener("mousedown", mouseDown);
      orbitMenu.removeEventListener("touchstart", touchStart);
      orbitMenu.removeEventListener("touchmove", touchMove);
      orbitMenu.removeEventListener("touchend", touchEnd);
    }
    trigger.kill();
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  };
};

export const initializeHomePageMotion = () => {
  const wrapper = document.getElementById("heroSequenceWrapper");
  if (!wrapper) return () => {};

  const config = parseConfig(wrapper);
  const gsapContext = gsap.context(() => {
    initRevealAnimations(config);
  });

  const cleanupButtons = initMagneticButtons(config);
  const cleanupHeroSequence = initHeroSequence(wrapper, config);

  return () => {
    cleanupButtons();
    cleanupHeroSequence();
    gsapContext.revert();
  };
};
