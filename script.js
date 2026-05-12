const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const scrollMeter = document.querySelector(".scroll-meter");
const loader = document.querySelector("[data-loader]");
const loaderCount = document.querySelector("[data-loader-count]");
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const navSectionLinks = navLinks.filter((link) => {
  const href = link.getAttribute("href") || "";
  return href.startsWith("#") && href.length > 1;
});
const navSections = navSectionLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const motionPanels = [...document.querySelectorAll("[data-motion-panel]")];
const depthLayers = [...document.querySelectorAll("[data-depth]")];
const proofCards = [...document.querySelectorAll(".proof-card")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ── Sliding pill indicator for active nav link ── */
const updateNavPill = () => {};

let lenis;
let motionFrame = null;

const initLenis = () => {
  if (prefersReducedMotion || typeof Lenis === "undefined") {
    lenis = null;
    return;
  }

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.2,
    infinite: false,
  });

  lenis.on("scroll", () => {
    setHeaderState();
    requestScrollMotion();
  });

  const raf = (time) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };

  requestAnimationFrame(raf);
};

const animateLoader = () => {
  const skipLoader = window.location.search.includes("skipLoader");

  if (!loader || !loaderCount || prefersReducedMotion || skipLoader) {
    if (loader) loader.hidden = true;
    document.body.classList.add("is-ready");
    return;
  }

  const finish = () => {
    loaderCount.textContent = "100";
    loader.style.setProperty("--loader-progress", "100%");
    loader.classList.add("is-done");
    document.body.classList.add("is-ready");
    window.setTimeout(() => {
      loader.hidden = true;
    }, 360);
  };

  loaderCount.textContent = "0";
  loader.style.setProperty("--loader-progress", "0%");
  requestAnimationFrame(() => {
    loaderCount.textContent = "100";
    loader.style.setProperty("--loader-progress", "100%");
    window.setTimeout(finish, 180);
  });
};

const setHeaderState = () => {
  const currentScrollY = window.scrollY;
  header?.classList.toggle("is-scrolled", currentScrollY > 32);

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (currentScrollY / scrollable) * 100 : 0;
  if (scrollMeter) scrollMeter.style.width = `${progress}%`;

  const activeSection = navSections
    .slice()
    .reverse()
    .find((section) => currentScrollY + 220 >= section.offsetTop);

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", Boolean(activeSection && href === `#${activeSection.id}`));
  });

  /* Update the sliding pill position */
  updateNavPill();
};

const closeMobileNav = () => {
  header?.classList.remove("is-open");
  navToggle?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Abrir menú");
};

const scrollToTarget = (target) => {
  const offset = target.id === "contacto" ? 18 : (header?.offsetHeight || 76) + 32;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  if (lenis && !prefersReducedMotion) {
    lenis.scrollTo(top, { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
  } else {
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }
};

const initNavigation = () => {
  navToggle?.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();
      closeMobileNav();
      scrollToTarget(target);
      history.pushState(null, "", link.getAttribute("href"));
    });
  });
};

const initHeroRotatingWord = () => {
  const word = document.querySelector("[data-rotating-word]");
  if (!word) return;

  const wordShell = word.closest(".rotating-word-shell");
  const words = ["clientes", "confianza", "visibilidad", "autoridad"];
  let index = 0;

  const updateUnderline = () => {
    if (!wordShell || !word) return;
    const shellRect = wordShell.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const wordStyle = window.getComputedStyle(word);
    const paddingLeft = Number.parseFloat(wordStyle.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(wordStyle.paddingRight) || 0;
    wordShell.style.setProperty("--underline-width", `${Math.max(0, wordRect.width - paddingLeft - paddingRight)}px`);
    wordShell.style.setProperty("--underline-x", `${wordRect.left - shellRect.left + paddingLeft}px`);
  };

  word.textContent = words[index];
  requestAnimationFrame(updateUnderline);

  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateUnderline) : null;
  if (resizeObserver) {
    resizeObserver.observe(word);
  }
  window.addEventListener("resize", updateUnderline, { passive: true });

  if (prefersReducedMotion) return;

  window.setInterval(() => {
    word.classList.remove("is-entering");
    word.classList.add("is-exiting");

    window.setTimeout(() => {
      index = (index + 1) % words.length;
      word.textContent = words[index];
      word.classList.remove("is-exiting");
      word.classList.add("is-entering");
      requestAnimationFrame(updateUnderline);
      window.setTimeout(updateUnderline, 90);
    }, 330);
  }, 2500);
};

const initReveals = () => {
  if (prefersReducedMotion) {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    return;
  }

  document.querySelectorAll(".hero .reveal").forEach((element, index) => {
    element.style.transitionDelay = `${index * 70}ms`;
    requestAnimationFrame(() => element.classList.add("is-visible"));
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const siblings = [...entry.target.parentElement.querySelectorAll(".reveal")];
        const index = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.transitionDelay = `${Math.min(index, 4) * 65}ms`;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -80px 0px" }
  );

  document.querySelectorAll("main section:not(.hero) .reveal, footer .reveal").forEach((element) => observer.observe(element));
};

const animateCounter = (element) => {
  const target = Number(element.dataset.counter);
  const hasDecimal = element.dataset.decimal === "true";
  const duration = 1050;
  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = hasDecimal ? value.toFixed(1) : Math.round(value).toString();
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

const initCounters = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.45 }
  );

  document.querySelectorAll("[data-counter]").forEach((counter) => observer.observe(counter));
};

const formatMetricNumber = (value) => new Intl.NumberFormat("es-ES").format(value);

const renderMetricNumber = (element, value) => {
  const suffix = element.dataset.suffix || "";
  element.innerHTML = `${formatMetricNumber(value)}<span class="metric-suffix">${suffix}</span>`;
};

const ensureMetricReel = (element) => {
  if (element.dataset.reelReady === "true") return;

  const target = Number(element.dataset.target || 0);
  const suffix = element.dataset.suffix || "";
  const targetFormatted = formatMetricNumber(target);

  element.innerHTML = "";
  [...targetFormatted].forEach((char) => {
    if (/\d/.test(char)) {
      const digit = document.createElement("span");
      digit.className = "metric-digit";
      digit.setAttribute("aria-hidden", "true");

      const track = document.createElement("span");
      track.className = "metric-digit-track";
      track.style.setProperty("--digit-y", "0em");

      for (let index = 0; index <= 9; index += 1) {
        const number = document.createElement("span");
        number.textContent = String(index);
        track.append(number);
      }

      digit.append(track);
      element.append(digit);
    } else {
      const separator = document.createElement("span");
      separator.className = "metric-separator";
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = char;
      element.append(separator);
    }
  });

  const suffixElement = document.createElement("span");
  suffixElement.className = "metric-suffix";
  suffixElement.setAttribute("aria-hidden", "true");
  suffixElement.textContent = suffix;
  element.append(suffixElement);
  element.dataset.reelReady = "true";
};

const setMetricReelValue = (element, value) => {
  ensureMetricReel(element);

  const target = Number(element.dataset.target || 0);
  const digitCount = formatMetricNumber(target).replace(/\D/g, "").length;
  const digits = String(Math.max(0, Math.round(value))).padStart(digitCount, "0").slice(-digitCount);

  element.querySelectorAll(".metric-digit-track").forEach((track, index) => {
    track.style.setProperty("--digit-y", `-${digits[index] || "0"}em`);
  });

  element.setAttribute("aria-label", `${formatMetricNumber(Math.round(value))}${element.dataset.suffix || ""}`);
};

const animateMetricCounter = (element) => {
  const target = Number(element.dataset.target || 0);
  const duration = 1700;
  const start = performance.now();
  setMetricReelValue(element, 0);

  const easeOutExpo = (progress) => (progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress));

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const current = Math.round(target * easeOutExpo(progress));
    setMetricReelValue(element, current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      setMetricReelValue(element, target);
    }
  };

  requestAnimationFrame(update);
};

const initSocialMetrics = () => {
  const metricsSection = document.querySelector(".metrics-section");
  const counters = [...document.querySelectorAll(".metric-number")];
  if (!metricsSection || !counters.length) return;

  const revealMetrics = () => {
    metricsSection.classList.add("is-visible");
    counters.forEach((counter) => {
      const target = Number(counter.dataset.target || 0);
      if (prefersReducedMotion) {
        renderMetricNumber(counter, target);
      } else {
        animateMetricCounter(counter);
      }
    });
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      revealMetrics();
      observer.disconnect();
    },
    { threshold: 0.35 }
  );

  observer.observe(metricsSection);
};

const initMicroInteractions = () => {
  document.querySelectorAll(".hover-glow").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--y", `${event.clientY - rect.top}px`);
    });
  });

  document.querySelectorAll(".magnetic").forEach((button) => {
    if (!hasFinePointer || prefersReducedMotion) return;

    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate3d(${x * 0.08}px, ${y * 0.1}px, 0)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });

  document.querySelectorAll("[data-scan-map]").forEach((map) => {
    [...map.querySelectorAll("span")].forEach((cell, index) => cell.style.setProperty("--cell-index", index));
    if (prefersReducedMotion) return;

    window.setInterval(() => {
      map.classList.add("is-scanning");
      window.setTimeout(() => map.classList.remove("is-scanning"), 740);
    }, 2600);
  });
};

const updateScrollMotion = () => {
  motionFrame = null;
  if (prefersReducedMotion) return;

  const velocity = lenis?.velocity || 0;

  depthLayers.forEach((layer) => {
    const speed = Number(layer.dataset.depth || 0.025);
    layer.style.setProperty("--depth-y", `${window.scrollY * speed + velocity * 2}px`);
  });

  motionPanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = (center - window.innerHeight / 2) / window.innerHeight;
    panel.style.setProperty("--motion-y", `${clamp(distance * -30 + velocity * 5, -28, 28)}px`);
  });

  proofCards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
    card.style.setProperty("--proof-y", `${(0.5 - progress) * (index === 0 ? 24 : 36)}px`);
  });
};

const requestScrollMotion = () => {
  if (motionFrame || prefersReducedMotion) return;
  motionFrame = requestAnimationFrame(updateScrollMotion);
};

const initPlanSwitch = () => {
  document.querySelectorAll("[data-plan-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.planMode;
      document.querySelectorAll("[data-plan-mode]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      document.querySelectorAll(".price").forEach((price) => {
        price.textContent = price.dataset[mode] || price.textContent;
      });
    });
  });
};

const initPricingReveal = () => {
  const pricingSection = document.querySelector(".pricing-section");
  if (!pricingSection) return;

  if (prefersReducedMotion) {
    pricingSection.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      pricingSection.classList.add("is-visible");
      observer.disconnect();
    },
    { threshold: 0.22 }
  );

  observer.observe(pricingSection);
};

class VaporizeHoverText {
  constructor(container, {
    text,
    active = false,
    font = {},
    color = "rgb(255,255,255)",
    spread = 2.2,
    density = 3,
    direction = "left-to-right",
    className = "",
  }) {
    this.container = container;
    this.text = text;
    this.active = active;
    this.font = {
      fontFamily: "Geist, Inter, system-ui, sans-serif",
      fontSize: "14px",
      fontWeight: 800,
      ...font,
    };
    this.color = color;
    this.spread = spread;
    this.currentSpread = spread;
    this.density = Math.max(2, density);
    this.direction = direction;
    this.progress = active ? 1 : 0;
    this.target = this.progress;
    this.particles = [];
    this.frame = null;
    this.startTime = 0;
    this.startProgress = this.progress;
    this.duration = 360;
    this.disposed = false;
    this.isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (className) this.container.classList.add(className);

    if (this.isReducedMotion) {
      this.renderFallback();
      return;
    }

    this.canvas = this.container.querySelector(".whatsapp-vapor-canvas") || document.createElement("canvas");
    this.canvas.classList.add("whatsapp-vapor-canvas");
    this.context = this.canvas.getContext("2d", { alpha: true });
    this.container.prepend(this.canvas);
    this.resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => this.prepare())
      : null;
    this.resizeObserver?.observe(this.container);
    this.prepare();
    this.draw();
  }

  renderFallback() {
    this.fallback = document.createElement("span");
    this.fallback.className = "whatsapp-float__fallback-text";
    this.fallback.textContent = this.text;
    this.container.appendChild(this.fallback);
  }

  getFontString() {
    return `${this.font.fontWeight} ${this.font.fontSize} ${this.font.fontFamily}`;
  }

  prepare() {
    if (!this.canvas || !this.context || this.disposed) return;

    const bounds = this.container.getBoundingClientRect();
    const cssWidth = Math.ceil(bounds.width + 20);
    const cssHeight = Math.max(30, Math.ceil(bounds.height + 10));
    if (!cssWidth || !cssHeight) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.ceil(cssWidth * this.dpr);
    this.canvas.height = Math.ceil(cssHeight * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = cssWidth;
    this.height = cssHeight;

    const buffer = document.createElement("canvas");
    const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
    buffer.width = this.canvas.width;
    buffer.height = this.canvas.height;
    bufferContext.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    bufferContext.clearRect(0, 0, this.width, this.height);
    bufferContext.font = this.getFontString();
    bufferContext.fillStyle = this.color;
    bufferContext.textBaseline = "middle";
    bufferContext.textAlign = "left";
    bufferContext.fillText(this.text, 10, this.height / 2);

    const imageData = bufferContext.getImageData(0, 0, buffer.width, buffer.height).data;
    const particles = [];
    const step = Math.max(2, Math.round(this.density * this.dpr));

    for (let y = 0; y < buffer.height; y += step) {
      for (let x = 0; x < buffer.width; x += step) {
        const alpha = imageData[(y * buffer.width + x) * 4 + 3];
        if (alpha < 90) continue;

        const baseX = x / this.dpr;
        const baseY = y / this.dpr;
        const seed = Math.sin((baseX + 1) * 12.9898 + (baseY + 1) * 78.233) * 43758.5453;
        const random = seed - Math.floor(seed);
        const drift = 4 + random * 6;
        const vertical = (random - 0.5) * 7;
        const side = this.direction === "right-to-left" ? -1 : 1;

        particles.push({
          x: baseX,
          y: baseY,
          driftX: side * drift,
          driftY: vertical,
          size: Math.max(1, step / this.dpr),
          alpha: alpha / 255,
          wave: baseX / Math.max(this.width, 1),
        });
      }
    }

    this.particles = particles.slice(0, 520);
    this.draw();
  }

  setActive(nextActive, options = {}) {
    if (this.disposed || (this.active === nextActive && !options.force)) return;

    this.active = nextActive;
    this.target = nextActive ? 1 : 0;
    this.startProgress = this.progress;
    this.startTime = performance.now();
    this.duration = options.duration || (nextActive ? 520 : 560);
    this.currentSpread = options.spread || this.spread;
    this.onComplete = typeof options.onComplete === "function" ? options.onComplete : null;
    this.onAlmostComplete = typeof options.onAlmostComplete === "function" ? options.onAlmostComplete : null;
    this.almostCompleteAt = options.almostCompleteAt || 0.78;
    this.hasAlmostCompleted = false;

    if (this.isReducedMotion) {
      this.progress = this.target;
      this.onComplete?.();
      return;
    }

    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  tick(time) {
    if (this.disposed) return;

    const elapsed = time - this.startTime;
    const linear = clamp(elapsed / this.duration, 0, 1);
    if (this.active && !this.hasAlmostCompleted && linear >= this.almostCompleteAt) {
      this.hasAlmostCompleted = true;
      const almostComplete = this.onAlmostComplete;
      this.onAlmostComplete = null;
      almostComplete?.();
      if (!this.frame) return;
    }

    const eased = this.easeOutCubic(linear);
    this.progress = this.startProgress + (this.target - this.startProgress) * eased;
    this.draw();

    if (linear < 1) {
      this.frame = requestAnimationFrame((nextTime) => this.tick(nextTime));
    } else {
      this.progress = this.target;
      this.frame = null;
      if (this.progress === 0) this.context?.clearRect(0, 0, this.width, this.height);
      const complete = this.onComplete;
      this.onComplete = null;
      this.onAlmostComplete = null;
      complete?.();
    }
  }

  draw() {
    if (!this.context || !this.canvas || this.disposed) return;

    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.progress <= 0) return;

    ctx.fillStyle = this.color;

    this.particles.forEach((particle) => {
      const wave = this.direction === "right-to-left" ? 1 - particle.wave : particle.wave;
      const local = clamp((this.progress - wave * 0.18) / 0.82, 0, 1);
      const vapor = 1 - local;
      const opacity = particle.alpha * (this.active ? local : this.progress);
      if (opacity <= 0.02) return;

      ctx.globalAlpha = opacity;
      ctx.filter = `blur(${(this.active ? vapor : 1 - this.progress) * 2.4}px)`;
      ctx.fillRect(
        particle.x + particle.driftX * vapor * this.currentSpread,
        particle.y + particle.driftY * vapor * this.currentSpread,
        particle.size,
        particle.size
      );
    });

    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }

  reset() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.onComplete = null;
    this.onAlmostComplete = null;
    this.hasAlmostCompleted = false;
    this.active = false;
    this.target = 0;
    this.progress = 0;
    this.context?.clearRect(0, 0, this.width, this.height);
  }

  finishGenerateCleanly() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.active = true;
    this.target = 1;
    this.progress = 1;
    this.onComplete = null;
    this.onAlmostComplete = null;
    this.hasAlmostCompleted = true;
    requestAnimationFrame(() => {
      this.context?.clearRect(0, 0, this.width, this.height);
    });
  }

  destroy() {
    this.disposed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.onComplete = null;
    this.onAlmostComplete = null;
    this.resizeObserver?.disconnect();
  }
}

const initWhatsappFloat = () => {
  const button = document.querySelector("[data-whatsapp-float]");
  const textWrap = button?.querySelector("[data-vapor-text]");
  if (!button || !textWrap) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (!canHover || isMobile) return;

  const vaporText = new VaporizeHoverText(textWrap, {
    text: textWrap.dataset.vaporText || "Hablar por WhatsApp",
    active: false,
    font: {
      fontFamily: "Geist, Inter, system-ui, sans-serif",
      fontSize: "14px",
      fontWeight: 800,
    },
    color: "rgb(255,255,255)",
    spread: 1.1,
    density: 5,
    direction: "left-to-right",
  });
  const states = ["whatsapp-float--idle", "whatsapp-float--opening", "whatsapp-float--text-ready", "whatsapp-float--ready", "whatsapp-float--closing"];
  let state = "idle";
  let openDelayTimer = null;
  let readyTimer = null;
  let resetTimer = null;
  let isHovering = false;
  let sequence = 0;

  const setState = (nextState) => {
    state = nextState;
    states.forEach((stateClass) => button.classList.remove(stateClass));
    button.classList.add(`whatsapp-float--${nextState}`);
  };

  const wantsOpen = () => isHovering || document.activeElement === button;

  const resetWhatsappButton = () => {
    sequence += 1;
    isHovering = false;

    if (openDelayTimer) window.clearTimeout(openDelayTimer);
    if (readyTimer) window.clearTimeout(readyTimer);
    if (resetTimer) window.clearTimeout(resetTimer);

    openDelayTimer = null;
    readyTimer = null;
    resetTimer = null;
    vaporText.reset();
    setState("idle");
  };

  const activate = () => {
    if (state === "opening" || state === "ready") return;

    isHovering = true;
    sequence += 1;
    const token = sequence;
    if (openDelayTimer) window.clearTimeout(openDelayTimer);
    if (readyTimer) window.clearTimeout(readyTimer);
    if (resetTimer) window.clearTimeout(resetTimer);

    vaporText.reset();
    setState("opening");
    openDelayTimer = window.setTimeout(() => {
      if (token !== sequence || !wantsOpen()) return;
      vaporText.setActive(true, {
        duration: 360,
        spread: 1.1,
        force: true,
        almostCompleteAt: 0.78,
        onAlmostComplete: () => {
          if (token !== sequence || !wantsOpen()) return;
          setState("text-ready");
          vaporText.finishGenerateCleanly();
          readyTimer = window.setTimeout(() => {
            if (token === sequence && wantsOpen()) setState("ready");
            readyTimer = null;
          }, 100);
        },
        onComplete: () => {
          if (token === sequence && wantsOpen()) setState("ready");
        },
      });
    }, 80);
  };

  const deactivate = () => {
    if ((state === "idle" || state === "closing") && !wantsOpen()) return;

    isHovering = false;
    sequence += 1;
    const token = sequence;
    if (openDelayTimer) window.clearTimeout(openDelayTimer);
    if (readyTimer) window.clearTimeout(readyTimer);
    if (resetTimer) window.clearTimeout(resetTimer);

    setState("closing");
    vaporText.setActive(false, {
      duration: 560,
      spread: 2,
      force: true,
      onComplete: () => {
        if (token === sequence && !wantsOpen()) setState("idle");
      },
    });
  };

  setState("idle");

  button.addEventListener("pointerenter", activate);
  button.addEventListener("focus", activate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("blur", deactivate);
  button.addEventListener("click", () => {
    resetTimer = window.setTimeout(resetWhatsappButton, 120);
  });

  window.addEventListener("blur", resetWhatsappButton);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resetWhatsappButton();
  });
  window.addEventListener("pageshow", resetWhatsappButton);
  window.addEventListener("pagehide", () => {
    resetWhatsappButton();
    vaporText.destroy();
  }, { once: true });
};

const initForm = () => {
  const form = document.querySelector("[data-lead-form]");
  const formStatus = document.querySelector("[data-form-status]");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    formStatus.textContent = "Solicitud preparada. El formulario ya está listo para conectarse a tu CRM o email.";
    form.reset();
  });
};

const init = () => {
  animateLoader();
  initNavigation();
  initHeroRotatingWord();
  initReveals();
  initCounters();
  initSocialMetrics();
  initMicroInteractions();
  initPlanSwitch();
  initPricingReveal();
  initWhatsappFloat();
  initForm();
  setHeaderState();
  updateScrollMotion();
  initLenis();

  window.addEventListener("scroll", () => {
    setHeaderState();
    requestScrollMotion();
  }, { passive: true });
  window.addEventListener("resize", requestScrollMotion);
};

init();
