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
const authShell = document.querySelector(".auth-shell");
const authBackground = document.querySelector(".auth-background");
const authCard = document.querySelector(".auth-card");
const authConsole = document.querySelector(".auth-console");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const perfDebug = new URLSearchParams(window.location.search).has("perf");
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ── Sliding pill indicator for active nav link ── */
const updateNavPill = () => {};

let lenis;
let motionFrame = null;
let authMotionFrame = null;
let navSectionPositions = [];
let scrollStateFrame = null;
let lenisFrame = null;
let lenisLastActive = 0;
let requestLenisFrame = () => {};
let visibleMotionPanels = new Set(motionPanels);
let visibleProofCards = new Set(proofCards);
let visibleDepthLayers = new Set(depthLayers);
let lastHeaderScrolled = null;
let lastScrollProgress = -1;
let lastActiveSectionId = "";
const lastMotionValues = new WeakMap();

const refreshNavSectionPositions = () => {
  navSectionPositions = navSections
    .map((section) => ({ id: section.id, top: section.offsetTop }))
    .sort((a, b) => a.top - b.top);
};

const setStyleVarIfChanged = (element, name, value, tolerance = 0.05) => {
  const values = lastMotionValues.get(element) || {};
  const previous = values[name];
  if (typeof previous === "number" && Math.abs(previous - value) < tolerance) return;
  values[name] = value;
  lastMotionValues.set(element, values);
  element.style.setProperty(name, `${value}px`);
};

const initLenis = () => {
  if (prefersReducedMotion || typeof Lenis === "undefined") {
    lenis = null;
    return;
  }

  lenis = new Lenis({
    duration: document.body.classList.contains("auth-page") ? 1.18 : 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: document.body.classList.contains("auth-page") ? 0.85 : 0.9,
    touchMultiplier: document.body.classList.contains("auth-page") ? 1.15 : 1.2,
    infinite: false,
  });

  lenis.on("scroll", () => {
    lenisLastActive = performance.now();
    requestScrollState();
  });

  const raf = (time) => {
    lenisFrame = null;
    lenis?.raf(time);
    const velocity = Math.abs(lenis?.velocity || 0);
    if (!document.hidden && (velocity > 0.001 || time - lenisLastActive < 220)) {
      lenisFrame = requestAnimationFrame(raf);
    }
  };

  requestLenisFrame = () => {
    if (!lenis || lenisFrame || document.hidden) return;
    lenisLastActive = performance.now();
    lenisFrame = requestAnimationFrame(raf);
  };

  window.addEventListener("wheel", requestLenisFrame, { passive: true });
  window.addEventListener("touchmove", requestLenisFrame, { passive: true });
  window.addEventListener("keydown", requestLenisFrame);

  requestLenisFrame();
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
  const isScrolled = currentScrollY > 32;
  if (isScrolled !== lastHeaderScrolled) {
    header?.classList.toggle("is-scrolled", isScrolled);
    lastHeaderScrolled = isScrolled;
  }

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (currentScrollY / scrollable) * 100 : 0;
  if (scrollMeter && Math.abs(progress - lastScrollProgress) > 0.05) {
    scrollMeter.style.transform = `scaleX(${progress / 100})`;
    lastScrollProgress = progress;
  }

  const activeSection = navSectionPositions
    .slice()
    .reverse()
    .find((section) => currentScrollY + 220 >= section.top);
  const activeSectionId = activeSection?.id || "";

  if (activeSectionId !== lastActiveSectionId) {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      link.classList.toggle("is-active", Boolean(activeSectionId && href === `#${activeSectionId}`));
    });
    lastActiveSectionId = activeSectionId;
  }

  /* Update the sliding pill position */
  updateNavPill();
};

const requestScrollState = () => {
  if (scrollStateFrame) return;
  scrollStateFrame = requestAnimationFrame(() => {
    scrollStateFrame = null;
    setHeaderState();
    requestScrollMotion();
    requestAuthMotion();
  });
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
    lenisLastActive = performance.now();
    requestLenisFrame();
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
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      closeMobileNav();
      scrollToTarget(target);
      history.pushState(null, "", href);
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
    if (document.hidden) return;
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
    if (!hasFinePointer) return;
    let glowFrame = null;
    let pointerX = 0;
    let pointerY = 0;

    card.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (glowFrame) return;

      glowFrame = requestAnimationFrame(() => {
        glowFrame = null;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--x", `${pointerX - rect.left}px`);
        card.style.setProperty("--y", `${pointerY - rect.top}px`);
      });
    }, { passive: true });
  });

  document.querySelectorAll(".magnetic").forEach((button) => {
    if (!hasFinePointer || prefersReducedMotion) return;
    let magneticFrame = null;
    let pointerX = 0;
    let pointerY = 0;

    button.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (magneticFrame) return;

      magneticFrame = requestAnimationFrame(() => {
        magneticFrame = null;
        const rect = button.getBoundingClientRect();
        const x = pointerX - rect.left - rect.width / 2;
        const y = pointerY - rect.top - rect.height / 2;
        button.style.transform = `translate3d(${x * 0.08}px, ${y * 0.1}px, 0)`;
      });
    }, { passive: true });

    button.addEventListener("pointerleave", () => {
      if (magneticFrame) {
        cancelAnimationFrame(magneticFrame);
        magneticFrame = null;
      }
      button.style.transform = "";
    });
  });

  document.querySelectorAll("[data-scan-map]").forEach((map) => {
    [...map.querySelectorAll("span")].forEach((cell, index) => cell.style.setProperty("--cell-index", index));
    if (prefersReducedMotion) return;

    window.setInterval(() => {
      if (document.hidden) return;
      map.classList.add("is-scanning");
      window.setTimeout(() => map.classList.remove("is-scanning"), 740);
    }, 2600);
  });
};

const initAnimationVisibility = () => {
  const pauseGroups = [
    { roots: document.querySelectorAll(".hero"), targets: ".reputation-phone, .map-pin, .map-dot, .phone-stars i, .chart-line, .phone-notification, .phone-app-nav span, .button-primary" },
    { roots: document.querySelectorAll(".testimonial-marquee"), targets: ".testimonial-track" },
    { roots: document.querySelectorAll(".signal-strip"), targets: ".signal-track" },
    { roots: document.querySelectorAll(".pricing-section"), targets: ".pricing-sparkles span, .badge-gem, .pack-gem" },
  ];

  pauseGroups.forEach(({ roots, targets }) => {
    roots.forEach((root) => root.querySelectorAll(targets).forEach((target) => target.classList.add("is-paused")));
  });

  if (typeof IntersectionObserver === "undefined") {
    pauseGroups.forEach(({ roots, targets }) => {
      roots.forEach((root) => root.querySelectorAll(targets).forEach((target) => target.classList.remove("is-paused")));
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const group = pauseGroups.find(({ roots }) => [...roots].includes(entry.target));
        if (!group) return;
        entry.target
          .querySelectorAll(group.targets)
          .forEach((target) => target.classList.toggle("is-paused", !entry.isIntersecting || document.hidden));
        entry.target.classList.toggle("is-animation-paused", !entry.isIntersecting || document.hidden);
      });
    },
    { rootMargin: "180px 0px" }
  );

  pauseGroups.forEach(({ roots }) => roots.forEach((root) => observer.observe(root)));
};

const initMotionVisibility = () => {
  if (typeof IntersectionObserver === "undefined") return;

  const observeGroup = (items, visibleSet, rootMargin = "160px 0px") => {
    if (!items.length) return;
    visibleSet.clear();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSet.add(entry.target);
          } else {
            visibleSet.delete(entry.target);
          }
        });
        requestScrollMotion();
      },
      { rootMargin }
    );
    items.forEach((item) => observer.observe(item));
  };

  observeGroup(depthLayers, visibleDepthLayers, "240px 0px");
  observeGroup(motionPanels, visibleMotionPanels);
  observeGroup(proofCards, visibleProofCards);
};

const updateScrollMotion = () => {
  motionFrame = null;
  if (prefersReducedMotion) return;

  const velocity = lenis?.velocity || 0;

  visibleDepthLayers.forEach((layer) => {
    const speed = Number(layer.dataset.depth || 0.025);
    setStyleVarIfChanged(layer, "--depth-y", window.scrollY * speed + velocity * 2);
  });

  visibleMotionPanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = (center - window.innerHeight / 2) / window.innerHeight;
    setStyleVarIfChanged(panel, "--motion-y", clamp(distance * -30 + velocity * 5, -28, 28));
  });

  visibleProofCards.forEach((card) => {
    const index = proofCards.indexOf(card);
    const rect = card.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
    setStyleVarIfChanged(card, "--proof-y", (0.5 - progress) * (index === 0 ? 24 : 36));
  });
};

const requestScrollMotion = () => {
  if (motionFrame || prefersReducedMotion) return;
  motionFrame = requestAnimationFrame(updateScrollMotion);
};

const updateAuthMotion = () => {
  authMotionFrame = null;
  if (prefersReducedMotion || !authShell) return;

  const y = window.scrollY;
  const velocity = lenis?.velocity || 0;
  authShell.style.setProperty("--auth-bg-y", `${clamp(y * 0.035 + velocity * 1.4, -18, 28)}px`);
  authShell.style.setProperty("--auth-card-y", `${clamp(y * -0.012 + velocity * 1.2, -8, 8)}px`);
  authShell.style.setProperty("--auth-console-y", `${clamp(y * 0.018 - velocity, -8, 8)}px`);
  authBackground?.style.setProperty("--auth-bg-shift", `${clamp(y * 0.02, 0, 18)}px`);
  authCard?.style.setProperty("--auth-card-y", `${clamp(y * -0.012 + velocity * 1.2, -8, 8)}px`);
  authConsole?.style.setProperty("--auth-console-y", `${clamp(y * 0.018 - velocity, -8, 8)}px`);
};

const requestAuthMotion = () => {
  if (authMotionFrame || prefersReducedMotion || !authShell) return;
  authMotionFrame = requestAnimationFrame(updateAuthMotion);
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

const initWhatsappFloat = () => {
  const button = document.querySelector("[data-whatsapp-float]");
  if (!button) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const states = ["whatsapp-float--idle", "whatsapp-float--opening", "whatsapp-float--open", "whatsapp-float--closing"];
  let state = "idle";
  let isHovering = false;
  let clickedUntilLeave = false;
  let sequence = 0;
  let openTimer = null;
  let closeTimer = null;

  const clearTimers = () => {
    if (openTimer) window.clearTimeout(openTimer);
    if (closeTimer) window.clearTimeout(closeTimer);
    openTimer = null;
    closeTimer = null;
  };

  const setState = (nextState) => {
    state = nextState;
    states.forEach((stateClass) => button.classList.remove(stateClass));
    button.classList.add(`whatsapp-float--${nextState}`);
  };

  const wantsOpen = () => isHovering || document.activeElement === button;

  const closeWhatsappButton = ({ immediate = false, blockUntilLeave = false } = {}) => {
    sequence += 1;
    isHovering = false;
    if (blockUntilLeave) clickedUntilLeave = true;
    clearTimers();

    if (immediate) {
      setState("idle");
      return;
    }

    const token = sequence;
    setState("closing");
    closeTimer = window.setTimeout(() => {
      if (token !== sequence) return;
      setState("idle");
      closeTimer = null;
    }, 420);
  };

  const activate = () => {
    if (clickedUntilLeave) return;
    if (!canHover && document.activeElement !== button) return;
    isHovering = true;
    if (state === "opening" || state === "open") return;

    sequence += 1;
    const token = sequence;
    clearTimers();
    setState("opening");
    openTimer = window.setTimeout(() => {
      if (token !== sequence || (!isHovering && document.activeElement !== button)) return;
      setState("open");
      openTimer = null;
    }, 360);
  };

  const deactivate = ({ fromPointer = false } = {}) => {
    if (fromPointer) clickedUntilLeave = false;
    isHovering = false;
    if (wantsOpen()) return;
    if (state === "idle" || state === "closing") return;

    sequence += 1;
    const token = sequence;
    clearTimers();
    setState("closing");
    closeTimer = window.setTimeout(() => {
      if (token !== sequence) return;
      setState(wantsOpen() ? "open" : "idle");
      closeTimer = null;
    }, 300);
  };

  const resetWhatsappButton = () => {
    closeWhatsappButton({ immediate: true });
  };

  setState("idle");

  button.addEventListener("pointerenter", () => {
    if (canHover) activate();
  });
  button.addEventListener("focus", activate);
  button.addEventListener("pointerleave", () => deactivate({ fromPointer: true }));
  button.addEventListener("blur", deactivate);
  button.addEventListener("click", () => {
    closeWhatsappButton({ blockUntilLeave: true });
    requestAnimationFrame(() => {
      if (document.activeElement === button) button.blur();
    });
  });

  window.addEventListener("blur", resetWhatsappButton);
  document.addEventListener("visibilitychange", () => {
    resetWhatsappButton();
  });
  window.addEventListener("pageshow", resetWhatsappButton);
  window.addEventListener("pagehide", resetWhatsappButton);
};

const initAuthForms = () => {
  if (authShell) {
    window.setTimeout(() => {
      document.body.classList.add("auth-ready");
    }, prefersReducedMotion ? 0 : 820);
  }

  document.querySelectorAll("[data-auth-provider]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const provider = button.dataset.authProvider || "este proveedor";
      const card = button.closest(".auth-card");
      const status = card?.querySelector("[data-auth-social-status]") || card?.querySelector("[data-auth-status]");
      button.classList.add("is-pending");
      window.setTimeout(() => button.classList.remove("is-pending"), 520);
      if (status) {
        status.textContent = `Inicio con ${provider} próximamente.`;
        status.className = "auth-status";
      }
    });
  });

  document.querySelectorAll(".auth-switch a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
      event.preventDefault();
      document.body.classList.add("auth-is-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, prefersReducedMotion ? 0 : 260);
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    const input = toggle.closest(".auth-password-control")?.querySelector("input");
    if (!input) return;
    const control = toggle.closest(".auth-password-control");
    toggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="eye-open" d="M3.2 12s3.1-5.2 8.8-5.2S20.8 12 20.8 12s-3.1 5.2-8.8 5.2S3.2 12 3.2 12Z" />
        <circle class="eye-open" cx="12" cy="12" r="2.3" />
        <path class="eye-closed" d="M4.4 5.4 19.6 18.6" />
        <path class="eye-closed" d="M6.7 10.1c1.4-.9 3.2-1.5 5.3-1.5 5.7 0 8.8 3.4 8.8 3.4a15.4 15.4 0 0 1-2.5 2.6" />
        <path class="eye-closed" d="M14.2 16.8a10.1 10.1 0 0 1-2.2.2c-5.7 0-8.8-5-8.8-5a13.6 13.6 0 0 1 2.4-2.7" />
      </svg>
    `;

    toggle.addEventListener("click", () => {
      const showPassword = input.type === "password";
      control?.classList.add("is-revealing");
      window.setTimeout(() => {
        input.type = showPassword ? "text" : "password";
        control?.classList.toggle("is-visible", showPassword);
        toggle.classList.toggle("is-visible", showPassword);
        toggle.setAttribute("aria-label", showPassword ? "Ocultar contraseña" : "Mostrar contraseña");
      }, 210);
      window.setTimeout(() => control?.classList.remove("is-revealing"), 430);
    });
  });

  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    const mode = form.dataset.authMode;
    const submit = form.querySelector(".auth-submit");
    const submitText = form.querySelector("[data-submit-text]");
    const status = form.querySelector("[data-auth-status]");
    let wasValid = false;

    const setError = (name, message) => {
      const input = form.elements[name];
      const field = input?.closest("[data-auth-field]") || input?.closest(".auth-check");
      const error = form.querySelector(`[data-error-for="${name}"]`);
      if (field) field.classList.toggle("is-invalid", Boolean(message));
      if (error) error.textContent = message || "";
    };

    const validate = ({ showErrors = false } = {}) => {
      const email = form.elements.email?.value.trim() || "";
      const password = form.elements.password?.value || "";
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      let valid = true;

      const errors = {
        email: emailValid ? "" : "Introduce un email válido.",
        password: password.length >= 8 ? "" : "La contraseña debe tener al menos 8 caracteres.",
      };

      if (mode === "register") {
        const name = form.elements.name?.value.trim() || "";
        const confirm = form.elements.confirm?.value || "";
        const terms = Boolean(form.elements.terms?.checked);
        errors.name = name ? "" : "Introduce tu nombre.";
        errors.confirm = confirm === password && confirm ? "" : "Las contraseñas deben coincidir.";
        errors.terms = terms ? "" : "Debes aceptar los términos para continuar.";
      }

      Object.entries(errors).forEach(([name, message]) => {
        if (message) valid = false;
        if (showErrors) setError(name, message);
      });

      if (!showErrors) {
        Object.keys(errors).forEach((name) => setError(name, ""));
      }

      if (submit) submit.disabled = !valid;
      form.querySelectorAll(".auth-field").forEach((field) => {
        const input = field.querySelector("input");
        if (!input || input.type === "checkbox") return;
        const name = input.name;
        field.classList.toggle("is-valid", Boolean(input.value.trim()) && !errors[name]);
      });
      if (valid && !wasValid) {
        submit?.classList.add("is-armed");
        window.setTimeout(() => submit?.classList.remove("is-armed"), 520);
      }
      wasValid = valid;
      return valid;
    };

    form.querySelectorAll("input").forEach((input) => {
      let typingTimer = null;
      const field = input.closest("[data-auth-field]") || input.closest(".auth-check");
      const syncFieldState = () => {
        field?.classList.toggle("has-value", Boolean(input.value.trim()) || input.checked);
      };

      input.addEventListener("focus", () => field?.classList.add("is-focused"));
      input.addEventListener("blur", () => field?.classList.remove("is-focused"));
      input.addEventListener("input", () => {
        syncFieldState();
        field?.classList.add("is-typing");
        if (typingTimer) window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => field?.classList.remove("is-typing"), 160);
      });
      input.addEventListener("change", syncFieldState);
      syncFieldState();
      window.setTimeout(syncFieldState, 160);
    });

    form.addEventListener("input", () => {
      status.textContent = "";
      status.className = "auth-status";
      validate();
    });

    form.addEventListener("change", () => validate());

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validate({ showErrors: true })) {
        status.textContent = mode === "login"
          ? "No hemos podido iniciar sesión. Revisa tus datos."
          : "Revisa los campos marcados antes de continuar.";
        status.className = "auth-status is-error";
        return;
      }

      submit.disabled = true;
      wasValid = false;
      submit.classList.add("is-loading");
      submitText.textContent = mode === "login" ? "Entrando..." : "Creando cuenta...";
      status.textContent = "";
      status.className = "auth-status";

      window.setTimeout(() => {
        submit.classList.remove("is-loading");
        status.textContent = mode === "login"
          ? "Acceso correcto. Redirigiendo..."
          : "Cuenta creada. Preparando tu panel...";
        status.className = "auth-status is-success";
        submitText.textContent = mode === "login" ? "Iniciar sesión" : "Crear cuenta";
      }, 900);
    });

    validate();
  });
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

const initPerfDebug = () => {
  if (!perfDebug) return;

  window.setInterval(() => {
    console.info("[perf]", {
      lenisFrameActive: Boolean(lenisFrame),
      scrollFrameActive: Boolean(scrollStateFrame || motionFrame || authMotionFrame),
      visibleDepthLayers: visibleDepthLayers.size,
      visibleMotionPanels: visibleMotionPanels.size,
      visibleProofCards: visibleProofCards.size,
      pausedAnimations: document.querySelectorAll(".is-paused, .is-animation-paused").length,
      decodedImages: [...document.images].filter((image) => image.complete).length,
      totalImages: document.images.length,
      hidden: document.hidden,
    });
  }, 5000);
};

const init = () => {
  const hasHomeContent = Boolean(document.querySelector(".hero"));

  animateLoader();
  initNavigation();
  if (hasHomeContent) {
    initHeroRotatingWord();
    initReveals();
    initCounters();
    initSocialMetrics();
    initMicroInteractions();
    initAnimationVisibility();
    initMotionVisibility();
    initPlanSwitch();
    initPricingReveal();
    initWhatsappFloat();
  }
  initAuthForms();
  initForm();
  initPerfDebug();
  refreshNavSectionPositions();
  setHeaderState();
  updateScrollMotion();
  updateAuthMotion();
  initLenis();

  window.addEventListener("scroll", () => {
    requestScrollState();
  }, { passive: true });
  window.addEventListener("resize", () => {
    refreshNavSectionPositions();
    requestScrollMotion();
    requestAuthMotion();
  }, { passive: true });

  window.addEventListener("load", () => {
    refreshNavSectionPositions();
    requestScrollState();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("is-page-hidden", document.hidden);
    if (!document.hidden) {
      requestScrollState();
    } else if (lenisFrame) {
      cancelAnimationFrame(lenisFrame);
      lenisFrame = null;
    }
  });
};

init();
