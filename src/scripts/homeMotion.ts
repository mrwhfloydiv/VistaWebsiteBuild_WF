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

  const drawOrbitRings = (orbitReveal: number) => {
    if (orbitReveal <= 0.02) return;

    const centerX = width * 0.5;
    const centerY = height * 0.52;
    const radius = (isMobile ? config.orbit.radiusMobile : config.orbit.radiusDesktop) * (0.72 + orbitReveal * 0.32);

    context.save();
    context.strokeStyle = `rgba(188, 206, 235, ${0.07 + orbitReveal * 0.14})`;
    context.lineWidth = 1;

    for (let ring = 1; ring <= 4; ring += 1) {
      const ringRadius = radius * (0.52 + ring * 0.2);
      context.beginPath();
      context.ellipse(centerX, centerY, ringRadius, ringRadius * 0.6, 0, 0, Math.PI * 2);
      context.stroke();
    }

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

    if (!visible) return;

    const radius = (isMobile ? config.orbit.radiusMobile : config.orbit.radiusDesktop) * (0.9 + orbitReveal * 0.24);
    const ellipseRatio = isMobile ? 0.66 : 0.58;
    const baseSpin = reduceMotion
      ? scrollProgress * Math.PI * 0.58
      : nowSeconds * 0.17 + scrollProgress * Math.PI * 0.55;
    const nodeOpacity = clamp(orbitReveal * 1.2, 0, 1);
    const nodeScale = 0.9 + orbitReveal * 0.14;

    if (orbitCore) {
      const coreRotation = reduceMotion ? scrollProgress * 140 : nowSeconds * 12 + scrollProgress * 180;
      const coreScale = 0.92 + orbitReveal * 0.14;
      orbitCore.style.transform = `translate(-50%, -50%) scale(${coreScale.toFixed(3)}) rotate(${coreRotation.toFixed(
        2
      )}deg)`;
    }

    orbitNodes.forEach((node, index) => {
      const angle = orbitAngles[index] + baseSpin;
      const drift = reduceMotion ? 0 : Math.sin(nowSeconds * 0.8 + index * 0.9) * 8 * orbitReveal;
      const x = Math.cos(angle) * radius + mouseX * 14;
      const y = Math.sin(angle) * radius * ellipseRatio + mouseY * 10 + drift * 0.25;
      const depthMix = (Math.sin(angle) + 1) * 0.5;
      const nodeDepthScale = nodeScale * (0.92 + depthMix * 0.14);

      node.style.opacity = `${nodeOpacity * (0.7 + depthMix * 0.3)}`;
      node.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(
        2
      )}px)) scale(${nodeDepthScale.toFixed(3)})`;
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
    drawOrbitRings(orbitReveal);
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

  return () => {
    window.removeEventListener("resize", resize);
    wrapper.removeEventListener("pointermove", pointerMove);
    wrapper.removeEventListener("pointerleave", pointerLeave);
    if (skipIntroButton) {
      skipIntroButton.removeEventListener("click", scrollToOrbit);
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
