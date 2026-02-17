import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ColorRGB = [number, number, number];

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
  };
};

type PartialMotionConfig = Partial<Omit<MotionConfig, "animation" | "stars" | "orbit">> & {
  animation?: Partial<MotionConfig["animation"]>;
  stars?: Partial<MotionConfig["stars"]>;
  orbit?: Partial<MotionConfig["orbit"]>;
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
};

type RingParticle = {
  ring: number;
  angle: number;
  speed: number;
  size: number;
  brightness: number;
  tailLength: number;
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
    radiusMobile: 178
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

const speedStages = [1, 25, 50, 100];
const speedStageMaxBoost = 3.6;

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
        radiusMobile: parsed.orbit?.radiusMobile ?? defaultConfig.orbit.radiusMobile
      }
    };
  } catch {
    return defaultConfig;
  }
};

const createStars = (count: number, depth: number, spread: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * spread,
    y: (Math.random() * 2 - 1) * spread * 0.68,
    z: Math.random() * depth + 1,
    size: Math.random() * 1.2 + 0.45,
    tint: Math.random(),
    prevX: 0,
    prevY: 0,
    initialized: false
  }));

const resetStar = (star: Star, depth: number, spread: number) => {
  star.x = (Math.random() * 2 - 1) * spread;
  star.y = (Math.random() * 2 - 1) * spread * 0.68;
  star.z = depth;
  star.size = Math.random() * 1.2 + 0.45;
  star.tint = Math.random();
  star.initialized = false;
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
  const headline = document.getElementById("heroHeadline");
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
  let isTouchDragging = false;
  let touchStartX = 0;
  let touchStartY = 0;

  // Load V logo for canvas planet compositing
  const vLogo = new Image();
  const coreImg = orbitCore?.querySelector("img") as HTMLImageElement | null;
  vLogo.src = coreImg?.src ?? "";
  let vLogoReady = false;
  vLogo.onload = () => { vLogoReady = true; };

  // Hide DOM orbit core — canvas planet replaces it
  if (orbitCore) orbitCore.style.display = "none";

  // ── Planet texture system (offscreen canvases) ──
  const planetTexW = 800;
  const planetTexH = 400;
  const planetTexCanvas = document.createElement("canvas");
  planetTexCanvas.width = planetTexW;
  planetTexCanvas.height = planetTexH;
  const planetTexCtx = planetTexCanvas.getContext("2d")!;

  // Cloud layer offscreen
  const cloudTexCanvas = document.createElement("canvas");
  cloudTexCanvas.width = planetTexW;
  cloudTexCanvas.height = planetTexH;
  const cloudTexCtx = cloudTexCanvas.getContext("2d")!;

  // Sphere render buffer (planet-sized, reused each frame)
  const sphereSize = isMobile ? 148 : 210;
  const sphereCanvas = document.createElement("canvas");
  sphereCanvas.width = sphereSize;
  sphereCanvas.height = sphereSize;
  const sphereCtx = sphereCanvas.getContext("2d")!;
  sphereCtx.imageSmoothingEnabled = true;
  sphereCtx.imageSmoothingQuality = "high";

  // Pre-generate cloud wisps
  type CloudWisp = { x: number; y: number; w: number; h: number; opacity: number; };
  const cloudWisps: CloudWisp[] = [];
  for (let i = 0; i < 36; i++) {
    cloudWisps.push({
      x: Math.random() * planetTexW,
      y: 40 + Math.random() * (planetTexH - 80),
      w: 50 + Math.random() * 160,
      h: 10 + Math.random() * 22,
      opacity: 0.15 + Math.random() * 0.25,
    });
  }

  // Bake the planet ocean texture (called once + when logo loads)
  let planetTextureReady = false;
  const bakePlanetTexture = () => {
    const ctx = planetTexCtx;
    ctx.clearRect(0, 0, planetTexW, planetTexH);

    // Deep ocean gradient (latitude bands)
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, planetTexH);
    oceanGrad.addColorStop(0, "#061e36");
    oceanGrad.addColorStop(0.12, "#0a2e52");
    oceanGrad.addColorStop(0.3, "#124878");
    oceanGrad.addColorStop(0.45, "#1a6498");
    oceanGrad.addColorStop(0.55, "#1e72a8");
    oceanGrad.addColorStop(0.7, "#124878");
    oceanGrad.addColorStop(0.88, "#0a2e52");
    oceanGrad.addColorStop(1, "#061e36");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, planetTexW, planetTexH);

    // Ocean shimmer / current streaks
    ctx.globalAlpha = 1;
    for (let i = 0; i < 22; i++) {
      const sy = 30 + Math.random() * (planetTexH - 60);
      const sw = 60 + Math.random() * 250;
      const sx = Math.random() * planetTexW;
      const streak = ctx.createLinearGradient(sx, sy, sx + sw, sy);
      streak.addColorStop(0, "rgba(30, 120, 180, 0)");
      streak.addColorStop(0.3, `rgba(50, 170, 220, ${0.08 + Math.random() * 0.08})`);
      streak.addColorStop(0.7, `rgba(40, 150, 200, ${0.04 + Math.random() * 0.06})`);
      streak.addColorStop(1, "rgba(30, 120, 180, 0)");
      ctx.fillStyle = streak;
      ctx.fillRect(sx, sy - 2 - Math.random() * 3, sw, 4 + Math.random() * 4);
    }

    // Subtle ocean noise texture (small bright dots)
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 300; i++) {
      const nx = Math.random() * planetTexW;
      const ny = Math.random() * planetTexH;
      ctx.fillStyle = "#8ec8f0";
      ctx.fillRect(nx, ny, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Stamp V logo as "continental landmass"
    if (vLogoReady) {
      ctx.save();
      const logoAspect = vLogo.width / Math.max(vLogo.height, 1);
      const logoH = planetTexH * 0.65;
      const logoW = logoH * logoAspect;
      const logoY = (planetTexH - logoH) / 2;

      for (let copy = 0; copy < 2; copy++) {
        const logoX = (planetTexW * 0.5 - logoW / 2) + copy * planetTexW;

        // Soft shadow
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(vLogo, logoX + 3, logoY + 3, logoW, logoH);

        // Main continent layer
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.55;
        ctx.drawImage(vLogo, logoX, logoY, logoW, logoH);

        // Warm earth tint overlay (draw on top, blended)
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.12;
        const tintGrad = ctx.createLinearGradient(logoX, logoY, logoX, logoY + logoH);
        tintGrad.addColorStop(0, "#a08040");
        tintGrad.addColorStop(0.5, "#c8a050");
        tintGrad.addColorStop(1, "#806830");
        ctx.fillStyle = tintGrad;
        ctx.fillRect(logoX, logoY, logoW, logoH);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    planetTextureReady = true;
  };

  // Bake on logo load
  vLogo.onload = () => {
    vLogoReady = true;
    bakePlanetTexture();
  };
  // Bake initial (no logo yet)
  bakePlanetTexture();

  const updateCloudTexture = (nowSeconds: number) => {
    const ctx = cloudTexCtx;
    ctx.clearRect(0, 0, planetTexW, planetTexH);

    for (const wisp of cloudWisps) {
      const wx = (wisp.x + nowSeconds * 10) % (planetTexW + wisp.w) - wisp.w * 0.5;
      const wavey = wisp.y + Math.sin(nowSeconds * 0.25 + wisp.x * 0.015) * 5;
      const grad = ctx.createRadialGradient(
        wx + wisp.w * 0.5, wavey, 0,
        wx + wisp.w * 0.5, wavey, wisp.w * 0.52
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${wisp.opacity})`);
      grad.addColorStop(0.3, `rgba(245, 250, 255, ${wisp.opacity * 0.65})`);
      grad.addColorStop(0.7, `rgba(230, 240, 250, ${wisp.opacity * 0.2})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(wx + wisp.w * 0.5, wavey, wisp.w * 0.5, wisp.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Render equirectangular texture onto sphere buffer
  const renderSphereTexture = (nowSeconds: number) => {
    const ctx = sphereCtx;
    ctx.clearRect(0, 0, sphereSize, sphereSize);

    const rotation = reduceMotion ? scrollProgress * Math.PI * 2 : nowSeconds * 0.12;
    const texScrollPx = (rotation / (Math.PI * 2)) * planetTexW;
    const cloudScrollPx = texScrollPx * 1.25; // Clouds drift faster
    const srcW = 3; // Sample 3px wide strips for smooth interpolation
    const destW = 2; // Draw 2px wide columns with overlap for seamless fill

    for (let col = 0; col < sphereSize; col += destW) {
      const xNorm = ((col + destW * 0.5) / sphereSize) * 2 - 1; // -1 to 1, centered
      if (Math.abs(xNorm) > 0.995) continue;

      const lon = Math.asin(clamp(xNorm, -0.99, 0.99));
      const cosLon = Math.cos(lon);
      const colHeight = cosLon * sphereSize;
      if (colHeight < 1) continue;

      const destY = (sphereSize - colHeight) * 0.5;

      // Map longitude to texture U coordinate
      const texU = ((lon / Math.PI + 0.5) * planetTexW + texScrollPx) % planetTexW;
      const srcX = ((Math.floor(texU) - 1) + planetTexW) % planetTexW;

      // Ocean + landmass (wider source strip for smooth interpolation)
      ctx.drawImage(planetTexCanvas, srcX, 0, srcW, planetTexH, col, destY, destW, colHeight);

      // Cloud layer (different scroll speed, slightly transparent)
      ctx.globalAlpha = 0.75;
      const cloudU = ((lon / Math.PI + 0.5) * planetTexW + cloudScrollPx) % planetTexW;
      const cloudSrcX = ((Math.floor(cloudU) - 1) + planetTexW) % planetTexW;
      ctx.drawImage(cloudTexCanvas, cloudSrcX, 0, srcW, planetTexH, col, destY, destW, colHeight);
      ctx.globalAlpha = 1;
    }
  };

  // Node accent colors from data attributes
  const nodeAccents = orbitNodes.map(node => ({
    accent: node.dataset.accent ?? "#ffffff",
    rgb: hexToRGB(node.dataset.accent ?? "#ffffff"),
    desc: node.dataset.desc ?? "",
    short: node.dataset.short ?? "",
  }));

  // Ring particle system
  const ringParticleCount = lowPowerDevice ? (isMobile ? 12 : 24) : (isMobile ? 24 : 48);
  const ringParticles: RingParticle[] = Array.from({ length: ringParticleCount }, () => ({
    ring: Math.floor(Math.random() * 4) + 1,
    angle: Math.random() * Math.PI * 2,
    speed: (0.15 + Math.random() * 0.25) * (Math.random() > 0.5 ? 1 : -1),
    size: 0.8 + Math.random() * 1.2,
    brightness: 0.4 + Math.random() * 0.6,
    tailLength: 3 + Math.floor(Math.random() * 5),
  }));

  const orbitAngles = orbitNodes.map((_, index) => (index / Math.max(orbitNodes.length, 1)) * Math.PI * 2 - Math.PI / 2);

  const setSlides = (progress: number) => {
    const clamped = clamp(progress, 0, 0.999);
    const scaled = clamped * slides.length;
    const activeIndex = Math.floor(scaled);

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeIndex);
    });
  };

  const updateSlideTrackLayout = () => {
    if (!slideTrack || !headline) return;
    const rect = headline.getBoundingClientRect();
    slideTrack.style.left = `${rect.left}px`;
    slideTrack.style.top = `${rect.top}px`;
    slideTrack.style.width = `${rect.width}px`;
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
    updateSlideTrackLayout();
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

  const drawOrbitRings = (nowSeconds: number, orbitReveal: number, delta: number) => {
    if (orbitReveal <= 0.02) return;

    const centerX = width * 0.5;
    const centerY = height * 0.52;
    const radius = (isMobile ? config.orbit.radiusMobile : config.orbit.radiusDesktop) * (0.72 + orbitReveal * 0.32);
    const tiltX = mouseX * 0.04;
    const tiltY = mouseY * 0.03;
    const breathe = 0.85 + Math.sin(nowSeconds * 0.7) * 0.15;

    context.save();

    // Draw rings with depth variation
    for (let ring = 1; ring <= 4; ring++) {
      const ringRadius = radius * (0.52 + ring * 0.2);
      const depthFactor = 0.4 + (ring / 4) * 0.6;
      const ringAlpha = (0.07 + orbitReveal * 0.14) * depthFactor * breathe;
      const parallaxScale = 0.5 + (ring / 4) * 0.5;
      const offsetX = tiltX * ringRadius * parallaxScale * 0.5;
      const offsetY = tiltY * ringRadius * parallaxScale * 0.3;

      context.strokeStyle = `rgba(188, 206, 235, ${ringAlpha})`;
      context.lineWidth = 0.6 + ring * 0.15;
      context.beginPath();
      context.ellipse(centerX + offsetX, centerY + offsetY, ringRadius, ringRadius * 0.6, 0, 0, Math.PI * 2);
      context.stroke();
    }

    // Ring particles
    if (!reduceMotion) {
      for (const particle of ringParticles) {
        particle.angle += particle.speed * delta * 0.016;

        const ringRadius = radius * (0.52 + particle.ring * 0.2);
        const parallaxScale = 0.5 + (particle.ring / 4) * 0.5;
        const offsetX = tiltX * ringRadius * parallaxScale * 0.5;
        const offsetY = tiltY * ringRadius * parallaxScale * 0.3;

        const px = centerX + offsetX + Math.cos(particle.angle) * ringRadius;
        const py = centerY + offsetY + Math.sin(particle.angle) * ringRadius * 0.6;
        const depthMix = (Math.sin(particle.angle) + 1) * 0.5;
        const particleAlpha = orbitReveal * particle.brightness * (0.3 + depthMix * 0.7) * breathe;

        // Glow tail
        for (let t = particle.tailLength; t >= 0; t--) {
          const tailAngle = particle.angle - (particle.speed > 0 ? 1 : -1) * t * 0.03;
          const tx = centerX + offsetX + Math.cos(tailAngle) * ringRadius;
          const ty = centerY + offsetY + Math.sin(tailAngle) * ringRadius * 0.6;
          const tailAlpha = particleAlpha * (1 - t / (particle.tailLength + 1)) * 0.5;
          const tailSize = particle.size * (1 - t * 0.08);

          context.fillStyle = `rgba(160, 200, 255, ${tailAlpha})`;
          context.beginPath();
          context.arc(tx, ty, Math.max(tailSize, 0.3), 0, Math.PI * 2);
          context.fill();
        }

        // Particle head
        context.fillStyle = `rgba(200, 225, 255, ${particleAlpha})`;
        context.beginPath();
        context.arc(px, py, particle.size, 0, Math.PI * 2);
        context.fill();

        // Tiny glow
        if (particle.size > 1) {
          const glowGrad = context.createRadialGradient(px, py, 0, px, py, particle.size * 3);
          glowGrad.addColorStop(0, `rgba(160, 200, 255, ${particleAlpha * 0.25})`);
          glowGrad.addColorStop(1, "rgba(160, 200, 255, 0)");
          context.fillStyle = glowGrad;
          context.beginPath();
          context.arc(px, py, particle.size * 3, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    context.restore();
  };

  const drawSpokes = (nowSeconds: number, orbitReveal: number) => {
    if (orbitReveal <= 0.3) return;

    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = (isMobile ? config.orbit.radiusMobile : config.orbit.radiusDesktop) * (0.9 + orbitReveal * 0.24);
    const ellipseRatio = isMobile ? 0.66 : 0.58;

    touchSpinVelocity *= 0.95;
    if (Math.abs(touchSpinVelocity) > 0.0001) touchSpinOffset += touchSpinVelocity;

    const baseSpin = reduceMotion
      ? scrollProgress * Math.PI * 0.58 + touchSpinOffset
      : nowSeconds * 0.17 + scrollProgress * Math.PI * 0.55 + touchSpinOffset;
    const spokeAlpha = clamp((orbitReveal - 0.3) * 2, 0, 0.25);

    context.save();
    context.lineWidth = 0.5;

    orbitNodes.forEach((_, index) => {
      const angle = orbitAngles[index] + baseSpin;
      const x = cx + Math.cos(angle) * radius + mouseX * 14;
      const y = cy + Math.sin(angle) * radius * ellipseRatio + mouseY * 10;
      const depthMix = (Math.sin(angle) + 1) * 0.5;
      const { rgb } = nodeAccents[index];

      const grad = context.createLinearGradient(cx, cy, x, y);
      grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
      grad.addColorStop(0.4, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${spokeAlpha * depthMix})`);
      grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${spokeAlpha * depthMix * 0.6})`);

      context.strokeStyle = grad;
      context.beginPath();
      context.moveTo(cx, cy);
      context.lineTo(x, y);
      context.stroke();
    });

    context.restore();
  };

  const drawPlanet = (nowSeconds: number, orbitReveal: number) => {
    if (orbitReveal <= 0.02) return;

    const cx = width * 0.5;
    const cy = height * 0.52;
    const baseR = isMobile ? 62 : 90;
    const planetRadius = baseR * (0.85 + orbitReveal * 0.2);
    const planetAlpha = clamp(orbitReveal * 1.4, 0, 1);
    const glowPulse = reduceMotion ? 0.65 : 0.5 + Math.sin(nowSeconds * 1.8) * 0.3;
    const diameter = planetRadius * 2;

    context.save();
    context.globalAlpha = planetAlpha;

    // ── Outer atmosphere glow (3 layers for rich blue haze) ──
    const glowLayers = [
      { scale: 2.4, alpha: 0.035, color: "50, 130, 255" },
      { scale: 1.75, alpha: 0.07, color: "65, 150, 255" },
      { scale: 1.38, alpha: 0.13, color: "80, 170, 255" },
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

    // ── Render sphere texture into offscreen buffer ──
    if (planetTextureReady) {
      renderSphereTexture(nowSeconds);

      // Draw the sphere buffer onto the main canvas, scaled to planet size
      context.drawImage(
        sphereCanvas,
        0, 0, sphereSize, sphereSize,
        cx - planetRadius, cy - planetRadius, diameter, diameter
      );
    }

    // ── Clip for overlays on sphere surface ──
    context.save();
    context.beginPath();
    context.arc(cx, cy, planetRadius, 0, Math.PI * 2);
    context.clip();

    // ── Water shimmer / specular highlight (sun glint) ──
    const shimPhase = reduceMotion ? 0 : nowSeconds * 0.4;
    const shimX = cx - planetRadius * 0.32 + Math.sin(shimPhase) * planetRadius * 0.06;
    const shimY = cy - planetRadius * 0.28 + Math.cos(shimPhase * 0.7) * planetRadius * 0.04;
    const shimGrad = context.createRadialGradient(shimX, shimY, 0, shimX, shimY, planetRadius * 0.5);
    shimGrad.addColorStop(0, `rgba(200, 235, 255, ${0.22 * glowPulse})`);
    shimGrad.addColorStop(0.25, `rgba(160, 210, 255, ${0.09 * glowPulse})`);
    shimGrad.addColorStop(1, "rgba(140, 200, 255, 0)");
    context.fillStyle = shimGrad;
    context.fillRect(cx - planetRadius, cy - planetRadius, diameter, diameter);

    // ── Terminator shadow (day/night boundary) ──
    const termGrad = context.createLinearGradient(cx - planetRadius, cy, cx + planetRadius, cy);
    termGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    termGrad.addColorStop(0.45, "rgba(0, 0, 0, 0)");
    termGrad.addColorStop(0.68, "rgba(0, 0, 0, 0.2)");
    termGrad.addColorStop(0.82, "rgba(0, 0, 0, 0.45)");
    termGrad.addColorStop(0.95, "rgba(0, 0, 0, 0.65)");
    termGrad.addColorStop(1, "rgba(0, 0, 0, 0.78)");
    context.fillStyle = termGrad;
    context.fillRect(cx - planetRadius, cy - planetRadius, diameter, diameter);

    // ── 3D lighting (upper-left highlight for depth) ──
    const lightGrad = context.createRadialGradient(
      cx - planetRadius * 0.35, cy - planetRadius * 0.35, planetRadius * 0.02,
      cx + planetRadius * 0.15, cy + planetRadius * 0.15, planetRadius * 1.05
    );
    lightGrad.addColorStop(0, "rgba(210, 235, 255, 0.14)");
    lightGrad.addColorStop(0.25, "rgba(140, 195, 245, 0.05)");
    lightGrad.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    lightGrad.addColorStop(1, "rgba(0, 0, 30, 0.08)");
    context.fillStyle = lightGrad;
    context.fillRect(cx - planetRadius, cy - planetRadius, diameter, diameter);

    context.restore(); // End sphere clip

    // ── Atmosphere rim light (bright blue edge like ISS Earth photos) ──
    context.lineWidth = 3;
    const rimGrad = context.createRadialGradient(
      cx - planetRadius * 0.12, cy - planetRadius * 0.12, planetRadius * 0.78,
      cx, cy, planetRadius * 1.06
    );
    rimGrad.addColorStop(0, "rgba(80, 160, 255, 0)");
    rimGrad.addColorStop(0.65, `rgba(90, 175, 255, ${0.12 + glowPulse * 0.08})`);
    rimGrad.addColorStop(0.85, `rgba(70, 155, 255, ${0.35 + glowPulse * 0.15})`);
    rimGrad.addColorStop(1, `rgba(55, 135, 255, ${0.55 + glowPulse * 0.12})`);
    context.strokeStyle = rimGrad;
    context.beginPath();
    context.arc(cx, cy, planetRadius, 0, Math.PI * 2);
    context.stroke();

    // Second thinner inner rim
    context.lineWidth = 1.2;
    context.strokeStyle = `rgba(170, 215, 255, ${0.2 + glowPulse * 0.08})`;
    context.beginPath();
    context.arc(cx, cy, planetRadius + 3, 0, Math.PI * 2);
    context.stroke();

    // ── HUD text below planet ──
    context.globalAlpha = planetAlpha;
    context.font = `${isMobile ? 8 : 9}px "IBM Plex Mono", monospace`;
    context.textAlign = "center";
    context.fillStyle = `rgba(250, 250, 250, ${0.45 * planetAlpha})`;
    context.fillText("NAVIGATION CORE", cx, cy + planetRadius + (isMobile ? 16 : 22));
    context.font = `${isMobile ? 7 : 7.5}px "IBM Plex Mono", monospace`;
    context.fillStyle = `rgba(250, 250, 250, ${0.28 * planetAlpha})`;
    context.fillText(`${orbitNodes.length} SECTORS ACTIVE`, cx, cy + planetRadius + (isMobile ? 24 : 31));

    context.restore();
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

      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
      context.beginPath();
      context.arc(sx, sy, radius, 0, Math.PI * 2);
      context.fill();

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

    const isNarrowStack = width < 380;
    if (isNarrowStack) {
      orbitNodes.forEach(node => {
        node.style.transform = "";
        node.style.opacity = `${clamp(orbitReveal * 1.2, 0, 1)}`;
      });
      return;
    }

    const radius = (isMobile ? config.orbit.radiusMobile : config.orbit.radiusDesktop) * (0.9 + orbitReveal * 0.24);
    const ellipseRatio = isMobile ? 0.66 : 0.58;
    const baseSpin = reduceMotion
      ? scrollProgress * Math.PI * 0.58 + touchSpinOffset
      : nowSeconds * 0.17 + scrollProgress * Math.PI * 0.55 + touchSpinOffset;
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
          node.style.transition = "transform 0.12s ease-out, opacity 0.2s ease, border-color 0.22s ease, background-color 0.22s ease, max-height 0.28s ease, padding 0.22s ease";
        });
      });
    }

    orbitNodes.forEach((node, index) => {
      const angle = orbitAngles[index] + baseSpin;
      const drift = reduceMotion ? 0 : Math.sin(nowSeconds * 0.8 + index * 0.9) * 8 * orbitReveal;
      const x = Math.cos(angle) * radius + mouseX * 14;
      const y = Math.sin(angle) * radius * ellipseRatio + mouseY * 10 + drift * 0.25;
      const depthMix = (Math.sin(angle) + 1) * 0.5;

      // Stronger depth sorting
      const depthScale = nodeScale * (0.78 + depthMix * 0.28);
      const depthOpacity = nodeOpacity * (0.45 + depthMix * 0.55);

      node.style.zIndex = `${Math.round(depthMix * 10)}`;
      node.style.opacity = `${depthOpacity}`;
      node.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px)) scale(${depthScale.toFixed(3)})`;

      // Accent glow
      const { accent } = nodeAccents[index];
      node.style.borderColor = `${accent}44`;
      node.style.boxShadow = `0 0 ${(12 + depthMix * 8).toFixed(0)}px ${accent}33, inset 0 0 6px ${accent}11`;
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

    const slideWindow = Math.max(config.orbit.start - 0.16, 0.0001);
    const slideProgress = clamp(scrollProgress / slideWindow, 0, 1);
    const stageValue = slideProgress * Math.max(stageThemes.length - 1, 1);
    const stageLower = Math.floor(stageValue);
    const stageUpper = Math.min(stageThemes.length - 1, stageLower + 1);
    const stageMix = stageValue - stageLower;

    const introWarpWindowStart = Math.max(config.orbit.start - 0.22, 0.2);
    const introWarpWindowEnd = Math.max(config.orbit.start - 0.03, introWarpWindowStart + 0.01);
    let warpStrength =
      smoothstep(introWarpWindowStart, introWarpWindowEnd, scrollProgress) *
      (1 - smoothstep(config.orbit.start - 0.02, config.orbit.full, scrollProgress));
    const orbitReveal = smoothstep(config.orbit.start, config.orbit.full, scrollProgress);
    const intraSlide = (slideProgress * slides.length) % 1;
    const activeSlideIndex = Math.floor(slideProgress * slides.length);
    const stageIndex = slideProgress < 0.02 ? 0 : clamp(activeSlideIndex + 1, 0, speedStages.length - 1);
    const nextStageIndex = Math.min(stageIndex + 1, speedStages.length - 1);
    const stageBlend = smoothstep(0.25, 0.75, intraSlide);
    const stageSpeed = lerp(speedStages[stageIndex], speedStages[nextStageIndex], stageBlend);
    const stageSpeedNormalized = clamp((stageSpeed - 1) / 99, 0, 1);
    const leverageBoundary = 2 / 3;
    const transitionBurst = smoothstep(leverageBoundary - 0.06, leverageBoundary + 0.05, slideProgress);
    const executionBoost = smoothstep(leverageBoundary, 0.96, slideProgress);
    const boostedStageSpeed = clamp(stageSpeedNormalized + executionBoost * 0.35, 0, 1);
    const sequencePulse = Math.sin(intraSlide * Math.PI);
    const sequenceBoost =
      smoothstep(0.12, 0.98, slideProgress) *
      (1 - smoothstep(config.orbit.start - 0.03, config.orbit.start + 0.06, scrollProgress)) *
      (0.34 + sequencePulse * 0.66);

    const orbitPhase = orbitReveal > 0.16;
    const orbitSpeedReset = orbitReveal > 0.1;
    if (orbitSpeedReset) {
      warpStrength = 0;
    }
    wrapper.classList.toggle("is-orbit-phase", orbitPhase);

    const introOpacity = clamp(
      1 - smoothstep(config.orbit.start - 0.05, config.orbit.start + 0.08, scrollProgress),
      0,
      1
    );

    if (introPanel) {
      introPanel.style.opacity = `${introOpacity}`;
      introPanel.style.pointerEvents = introOpacity < 0.2 ? "none" : "auto";
    }

    if (headline) {
      const headlineFade = clamp(1 - smoothstep(0.02, 0.08, slideProgress), 0, 1);
      headline.style.opacity = `${headlineFade * introOpacity}`;
    }

    if (slideTrack) {
      const trackOpacity = smoothstep(0.04, 0.12, slideProgress) * introOpacity;
      slideTrack.style.opacity = `${trackOpacity}`;
      slideTrack.style.pointerEvents = trackOpacity > 0.2 ? "auto" : "none";
    }

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
    drawOrbitRings(nowSeconds, orbitReveal, delta);
    drawSpokes(nowSeconds, orbitReveal);
    if (orbitReveal > 0.02 && !reduceMotion) updateCloudTexture(nowSeconds);
    drawPlanet(nowSeconds, orbitReveal);
    updateOrbitMenu(nowSeconds, orbitReveal);
    setSlides(slideProgress);

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
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (!isTouchDragging && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      isTouchDragging = true;
    }

    if (isTouchDragging) {
      e.preventDefault();
      const spinDelta = dx * 0.004;
      touchSpinOffset += spinDelta;
      touchSpinVelocity = spinDelta;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }
  };

  const touchEnd = () => { isTouchDragging = false; };

  // Tap-to-expand on touch devices
  if ("ontouchstart" in window) {
    orbitNodes.forEach(node => {
      node.addEventListener("click", (e) => {
        if (node.classList.contains("is-expanded")) return;
        e.preventDefault();
        orbitNodes.forEach(n => n.classList.remove("is-expanded"));
        node.classList.add("is-expanded");
      });
    });
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

  resize();
  updateSlideTrackLayout();
  setSlides(0);
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
  }

  return () => {
    window.removeEventListener("resize", resize);
    wrapper.removeEventListener("pointermove", pointerMove);
    wrapper.removeEventListener("pointerleave", pointerLeave);
    if (skipIntroButton) {
      skipIntroButton.removeEventListener("click", scrollToOrbit);
    }
    if (orbitMenu) {
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
