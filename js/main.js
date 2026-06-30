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
const authShell = document.querySelector(".auth-shell");
const authBackground = document.querySelector(".auth-background");
const authCard = document.querySelector(".auth-card");
const authConsole = document.querySelector(".auth-console");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const scrollMotionQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
const pointerEffectsQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
const perfDebug = new URLSearchParams(window.location.search).has("perf");
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const canRunScrollMotion = () => !prefersReducedMotion && scrollMotionQuery.matches;
const canRunPointerEffects = () => !prefersReducedMotion && pointerEffectsQuery.matches;
const isGoogleMapsUrl = (value) => {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const isGoogleMapsPath = (hostname === "google.com" || hostname.endsWith(".google.com")) && pathname.startsWith("/maps");
    const isMapsGoogle = hostname === "maps.google.com";
    const isMapsShortLink = hostname === "maps.app.goo.gl";
    const isLegacyMapsShortLink = hostname === "goo.gl" && pathname.startsWith("/maps");

    return isGoogleMapsPath || isMapsGoogle || isMapsShortLink || isLegacyMapsShortLink;
  } catch {
    return false;
  }
};

/* ── Sliding pill indicator for active nav link ── */
const getAssetScriptUrl = (fileName) => {
  const currentScriptUrl = document.currentScript?.src || document.querySelector('script[src$="main.js"]')?.src;
  return new URL(fileName, currentScriptUrl || `${window.location.origin}/js/main.js`).href;
};

const loadScriptOnce = (src, test) => {
  if (test?.()) return Promise.resolve();

  const existingScript = [...document.scripts].find((script) => script.src === src);
  if (existingScript) {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
};

const ensureAuthScripts = async () => {
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", () => Boolean(window.supabase?.createClient));
  await loadScriptOnce(getAssetScriptUrl("supabase-config.js"), () => Boolean(window.DestroyerSupabase));
  await loadScriptOnce(getAssetScriptUrl("auth.js"), () => Boolean(window.DestroyerAuth?.getSession));
  return window.DestroyerAuth || null;
};

const ensureProfileDataScripts = async () => {
  await ensureAuthScripts();
  await loadScriptOnce(getAssetScriptUrl("profile-data.js"), () => Boolean(window.DestroyerProfileData?.ensureUserProfile));
  return window.DestroyerProfileData || null;
};

const getCurrentAuthSession = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && hasResolvedAuthSession) return currentAuthSession;
  if (!forceRefresh && authSessionPromise) return authSessionPromise;

  authSessionPromise = (async () => {
    const auth = await ensureAuthScripts();
    const session = auth?.getSession ? await auth.getSession() : null;
    currentAuthSession = session;
    hasResolvedAuthSession = true;
    return session;
  })();

  try {
    return await authSessionPromise;
  } finally {
    authSessionPromise = null;
  }
};

const updateNavPill = () => {};

let lenis;
let motionFrame = null;
let authMotionFrame = null;
let navSectionPositions = [];
let scrollStateFrame = null;
let lenisFrame = null;
let processTimelineFrame = null;
let lenisLastActive = 0;
let requestLenisFrame = () => {};
let updateProcessTimeline = () => {};
let visibleMotionPanels = new Set(motionPanels);
let visibleDepthLayers = new Set(depthLayers);
let lastHeaderScrolled = null;
let lastScrollProgress = -1;
let lastActiveSectionId = "";
let processTimelineVisible = true;
let currentAuthSession = null;
let hasResolvedAuthSession = false;
let authSessionPromise = null;
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

const resetScrollMotion = () => {
  depthLayers.forEach((layer) => layer.style.removeProperty("--depth-y"));
  motionPanels.forEach((panel) => panel.style.removeProperty("--motion-y"));
  visibleDepthLayers.clear();
  visibleMotionPanels.clear();
};

const initLenis = () => {
  if (prefersReducedMotion || !hasFinePointer || typeof Lenis === "undefined") {
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

  let activeSection = null;
  for (let index = navSectionPositions.length - 1; index >= 0; index -= 1) {
    if (currentScrollY + 220 >= navSectionPositions[index].top) {
      activeSection = navSectionPositions[index];
      break;
    }
  }
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
    requestProcessTimeline();
  });
};

const requestProcessTimeline = () => {
  if (processTimelineFrame || !processTimelineVisible) return;
  processTimelineFrame = requestAnimationFrame(() => {
    processTimelineFrame = null;
    updateProcessTimeline();
  });
};

const closeMobileNav = () => {
  header?.classList.remove("is-open");
  navToggle?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.classList.remove("is-open");
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

const initTrialModal = () => {
  const triggers = [...document.querySelectorAll("[data-trial-trigger]")];
  const modal = document.querySelector("[data-trial-modal]");
  const overlay = document.querySelector("[data-trial-overlay]");
  const closeButtons = [...document.querySelectorAll("[data-trial-close]")];
  let lastFocusedElement = null;
  let closeTimer = null;
  let activeStep = 1;
  let activeAccount = "register";

  if (!triggers.length || !modal || !overlay) return;

  const steps = [...modal.querySelectorAll("[data-trial-step]")];
  const progressItems = [...modal.querySelectorAll("[data-trial-progress]")];
  const accountButtons = [...modal.querySelectorAll("[data-trial-account], [data-trial-account-switch]")];
  const accountPanels = [...modal.querySelectorAll("[data-trial-account-panel]")];
  const registerForm = modal.querySelector('[data-trial-account-panel="register"]');
  const loginForm = modal.querySelector('[data-trial-account-panel="login"]');
  const localForm = modal.querySelector("[data-trial-local-form]");
  const teamWritesCheckbox = modal.querySelector("[data-trial-team-writes]");
  const reviewTextarea = localForm?.elements?.reviewText;
  const teamWritesHelp = modal.querySelector("[data-trial-team-help]");
  const starButtons = [...modal.querySelectorAll("[data-trial-star]")];
  const starInput = modal.querySelector("[data-trial-stars-input]");
  const backButton = modal.querySelector("[data-trial-back]");
  const doneButton = modal.querySelector("[data-trial-done]");
  const forgotLink = modal.querySelector("[data-trial-forgot]");
  const stepsWrapper = modal.querySelector(".trial-steps");
  const accountStage = modal.querySelector("[data-trial-account-stage]");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const transitionMs = 390;
  const accountTransitionMs = 320;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let stepTimer = null;
  let accountTimer = null;

  const getFocusableElements = () =>
    [
      ...modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => {
      const step = element.closest("[data-trial-step]");
      const panel = element.closest("[data-trial-account-panel]");
      return (!step || step.classList.contains("is-active")) && (!panel || panel.classList.contains("is-active"));
    });

  const focusFirstField = () => {
    window.setTimeout(() => {
      const firstFocusable = getFocusableElements()[0] || modal;
      firstFocusable.focus?.({ preventScroll: true });
    }, 70);
  };

  const getField = (form, name) => form?.elements?.[name] || null;

  const getErrorNode = (form, name) =>
    form?.querySelector(`[data-trial-error-for="${name}"]`) || modal.querySelector(`[data-trial-error-for="${name}"]`);

  const setFieldError = (form, name, message) => {
    const field = getField(form, name);
    const error = getErrorNode(form, name);
    const fieldShell = field?.closest(".trial-field") || field?.closest(".trial-check") || field?.closest(".trial-stars");
    fieldShell?.classList.add("is-invalid");
    if (error) error.textContent = message;
  };

  const clearFieldError = (form, name) => {
    const field = getField(form, name);
    const error = getErrorNode(form, name);
    const fieldShell = field?.closest(".trial-field") || field?.closest(".trial-check") || field?.closest(".trial-stars");
    fieldShell?.classList.remove("is-invalid");
    if (error) error.textContent = "";
  };

  const clearFormErrors = (form) => {
    if (!form) return;
    form.querySelectorAll(".trial-field.is-invalid, .trial-check.is-invalid, .trial-stars.is-invalid").forEach((field) => field.classList.remove("is-invalid"));
    form.querySelectorAll("[data-trial-error-for]").forEach((error) => {
      error.textContent = "";
    });
  };

  const updateProgress = (stepNumber) => {
    progressItems.forEach((item) => {
      const itemStep = Number(item.dataset.trialProgress);
      item.classList.toggle("is-active", itemStep === stepNumber);
      item.classList.toggle("is-complete", itemStep < stepNumber);
    });
  };

  const measureHiddenElement = (element) => {
    if (!element) return 0;
    const wasMeasuring = element.classList.contains("is-measuring");
    element.classList.add("is-measuring");
    const height = element.offsetHeight;
    if (!wasMeasuring) element.classList.remove("is-measuring");
    return height;
  };

  const setStep = (stepNumber) => {
    if (stepNumber === activeStep) {
      steps.forEach((step) => {
        const isActive = Number(step.dataset.trialStep) === stepNumber;
        step.classList.toggle("is-active", isActive);
        step.classList.remove("is-leaving");
        step.setAttribute("aria-hidden", String(!isActive));
      });
      updateProgress(stepNumber);
      focusFirstField();
      return;
    }

    const previousStep = activeStep;
    const currentStep = steps.find((step) => Number(step.dataset.trialStep) === previousStep);
    const nextStep = steps.find((step) => Number(step.dataset.trialStep) === stepNumber);
    if (!nextStep) return;

    window.clearTimeout(stepTimer);
    modal.dataset.trialDirection = stepNumber < previousStep ? "back" : "forward";
    const currentHeight = currentStep?.offsetHeight || 0;
    const nextHeight = measureHiddenElement(nextStep);
    if (stepsWrapper) stepsWrapper.style.minHeight = `${Math.max(currentHeight, nextHeight)}px`;

    steps.forEach((step) => step.classList.remove("is-leaving"));
    if (currentStep && currentStep !== nextStep) {
      currentStep.classList.add("is-leaving");
      currentStep.classList.remove("is-active");
      currentStep.setAttribute("aria-hidden", "true");
    }

    nextStep.classList.add("is-active");
    nextStep.setAttribute("aria-hidden", "false");
    activeStep = stepNumber;
    updateProgress(stepNumber);

    stepTimer = window.setTimeout(() => {
      steps.forEach((step) => step.classList.remove("is-leaving", "is-measuring"));
      if (stepsWrapper) stepsWrapper.style.minHeight = "";
    }, transitionMs);

    focusFirstField();
  };

  const setAccountMode = (mode) => {
    if (mode === activeAccount) return;
    const currentPanel = accountPanels.find((panel) => panel.dataset.trialAccountPanel === activeAccount);
    const nextPanel = accountPanels.find((panel) => panel.dataset.trialAccountPanel === mode);
    if (!nextPanel) return;

    window.clearTimeout(accountTimer);
    modal.dataset.trialAccountDirection = mode === "register" ? "back" : "forward";
    if (accountStage) {
      const currentHeight = currentPanel?.offsetHeight || 0;
      const nextHeight = measureHiddenElement(nextPanel);
      accountStage.style.minHeight = `${Math.max(currentHeight, nextHeight)}px`;
    }

    activeAccount = mode;
    accountButtons.forEach((button) => {
      const isActive = button.dataset.trialAccount === mode || button.dataset.trialAccountSwitch === mode;
      button.classList.toggle("is-active", isActive);
      if (button.hasAttribute("role")) button.setAttribute("aria-selected", String(isActive));
    });
    modal.style.setProperty("--trial-tab-x", mode === "login" ? "100%" : "0%");
    accountPanels.forEach((panel) => {
      const isActive = panel.dataset.trialAccountPanel === mode;
      panel.classList.remove("is-leaving");
      if (panel === currentPanel && currentPanel !== nextPanel) panel.classList.add("is-leaving");
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", String(!isActive && panel !== currentPanel));
    });
    clearFormErrors(registerForm);
    clearFormErrors(loginForm);
    accountTimer = window.setTimeout(() => {
      accountPanels.forEach((panel) => panel.classList.remove("is-leaving", "is-measuring"));
      accountPanels.forEach((panel) => panel.setAttribute("aria-hidden", String(!panel.classList.contains("is-active"))));
      if (accountStage) accountStage.style.minHeight = "";
    }, accountTransitionMs);
    focusFirstField();
  };

  const resetAccountMode = (mode = "register") => {
    activeAccount = mode;
    modal.dataset.trialAccountDirection = "forward";
    modal.style.setProperty("--trial-tab-x", mode === "login" ? "100%" : "0%");
    accountButtons.forEach((button) => {
      const isActive = button.dataset.trialAccount === mode || button.dataset.trialAccountSwitch === mode;
      button.classList.toggle("is-active", isActive);
      if (button.hasAttribute("role")) button.setAttribute("aria-selected", String(isActive));
    });
    accountPanels.forEach((panel) => {
      const isActive = panel.dataset.trialAccountPanel === mode;
      panel.classList.toggle("is-active", isActive);
      panel.classList.remove("is-leaving", "is-measuring");
      panel.setAttribute("aria-hidden", String(!isActive));
    });
    if (accountStage) accountStage.style.minHeight = "";
  };

  const isRegisterReady = () => {
    const name = getField(registerForm, "name")?.value.trim() || "";
    const email = getField(registerForm, "email")?.value.trim() || "";
    const password = getField(registerForm, "password")?.value || "";
    const confirmPassword = getField(registerForm, "confirmPassword")?.value || "";
    const terms = getField(registerForm, "terms")?.checked;
    return Boolean(name && email && password && confirmPassword && terms);
  };

  const isLoginReady = () => {
    const email = getField(loginForm, "email")?.value.trim() || "";
    const password = getField(loginForm, "password")?.value || "";
    return Boolean(email && password);
  };

  const isLocalReady = () => {
    const mapsUrl = getField(localForm, "mapsUrl")?.value.trim() || "";
    const reviewText = reviewTextarea?.value.trim() || "";
    const stars = Number(starInput?.value || 0);
    return Boolean(mapsUrl && (teamWritesCheckbox?.checked || reviewText) && [3, 4, 5].includes(stars));
  };

  const updateTrialSubmitStates = () => {
    const buttonStates = [
      [registerForm?.querySelector("[data-trial-submit]"), isRegisterReady()],
      [loginForm?.querySelector("[data-trial-submit]"), isLoginReady()],
      [localForm?.querySelector("[data-trial-submit]"), isLocalReady()],
    ];

    buttonStates.forEach(([button, isReady]) => {
      if (!button || button.classList.contains("is-loading")) return;
      button.disabled = !isReady;
    });
  };

  const runWithLoading = (button, callback) => {
    if (!button) {
      callback();
      updateTrialSubmitStates();
      return;
    }

    button.classList.add("is-loading");
    button.disabled = true;
    window.setTimeout(() => {
      callback();
      button.classList.remove("is-loading");
      updateTrialSubmitStates();
    }, reducedMotionQuery.matches ? 0 : 180);
  };

  const setStarValue = (value) => {
    const nextValue = [3, 4, 5].includes(Number(value)) ? String(value) : "5";
    if (starInput) starInput.value = nextValue;
    starButtons.forEach((button) => {
      const isActive = button.dataset.trialStar === nextValue;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });
    clearFieldError(localForm, "stars");
    updateTrialSubmitStates();
  };

  const updateReviewPreference = () => {
    if (!teamWritesCheckbox || !reviewTextarea) return;
    const field = reviewTextarea.closest(".trial-field");
    const teamWrites = teamWritesCheckbox.checked;
    reviewTextarea.disabled = teamWrites;
    reviewTextarea.required = !teamWrites;
    reviewTextarea.placeholder = teamWrites
      ? "Prepararemos un texto natural según tu negocio."
      : "Ejemplo: Buen trato, servicio rápido y atención profesional.";
    field?.classList.toggle("is-disabled", teamWrites);
    teamWritesHelp?.classList.toggle("is-visible", teamWrites);
    if (teamWrites) {
      reviewTextarea.value = "";
      clearFieldError(localForm, "reviewText");
    }
    updateTrialSubmitStates();
  };

  const resetTrial = () => {
    modal.querySelectorAll("form").forEach((form) => {
      form.reset();
      clearFormErrors(form);
    });
    resetAccountMode("register");
    setStarValue("5");
    updateReviewPreference();
    setStep(1);
    updateTrialSubmitStates();
  };

  const validateRegister = () => {
    clearFormErrors(registerForm);
    let isValid = true;
    const name = getField(registerForm, "name")?.value.trim() || "";
    const email = getField(registerForm, "email")?.value.trim() || "";
    const password = getField(registerForm, "password")?.value || "";
    const confirmPassword = getField(registerForm, "confirmPassword")?.value || "";
    const terms = getField(registerForm, "terms")?.checked;

    if (!name) {
      setFieldError(registerForm, "name", "Introduce tu nombre.");
      isValid = false;
    }
    if (!emailPattern.test(email)) {
      setFieldError(registerForm, "email", "Introduce un email válido.");
      isValid = false;
    }
    if (password.length < 8) {
      setFieldError(registerForm, "password", "La contraseña debe tener al menos 8 caracteres.");
      isValid = false;
    }
    if (confirmPassword !== password || !confirmPassword) {
      setFieldError(registerForm, "confirmPassword", "Las contraseñas deben coincidir.");
      isValid = false;
    }
    if (!terms) {
      setFieldError(registerForm, "terms", "Debes aceptar los términos para continuar.");
      isValid = false;
    }

    return isValid;
  };

  const validateLogin = () => {
    clearFormErrors(loginForm);
    let isValid = true;
    const email = getField(loginForm, "email")?.value.trim() || "";
    const password = getField(loginForm, "password")?.value || "";

    if (!emailPattern.test(email)) {
      setFieldError(loginForm, "email", "Introduce un email válido.");
      isValid = false;
    }
    if (!password) {
      setFieldError(loginForm, "password", "Introduce tu contraseña.");
      isValid = false;
    }

    return isValid;
  };

  const validateLocal = () => {
    clearFormErrors(localForm);
    let isValid = true;
    const mapsUrl = getField(localForm, "mapsUrl")?.value.trim() || "";
    const reviewText = reviewTextarea?.value.trim() || "";
    const stars = Number(starInput?.value || 0);

    if (!mapsUrl) {
      setFieldError(localForm, "mapsUrl", "Introduce el enlace de tu ficha de Google Maps.");
      isValid = false;
    } else if (!isGoogleMapsUrl(mapsUrl)) {
      setFieldError(localForm, "mapsUrl", "Pega un enlace válido de Google Maps.");
      isValid = false;
    }
    if (!teamWritesCheckbox?.checked && !reviewText) {
      setFieldError(localForm, "reviewText", "Escribe una orientación o marca que lo redacte el equipo.");
      isValid = false;
    }
    if (![3, 4, 5].includes(stars)) {
      setFieldError(localForm, "stars", "Elige 3, 4 o 5 estrellas.");
      isValid = false;
    }

    return isValid;
  };

  const openTrialModal = () => {
    window.clearTimeout(closeTimer);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeMobileNav();
    resetTrial();
    modal.hidden = false;
    overlay.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("trial-modal-is-open");
    overlay.classList.add("is-visible");
    modal.classList.add("is-open");
    focusFirstField();
  };

  const closeTrialModal = () => {
    overlay.classList.remove("is-visible");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("trial-modal-is-open");
    closeTimer = window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.hidden = true;
        overlay.hidden = true;
      }
    }, 280);
    lastFocusedElement?.focus?.({ preventScroll: true });
  };

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.trialAccount || button.dataset.trialAccountSwitch;
      if (mode) setAccountMode(mode);
    });
  });

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (validateRegister()) runWithLoading(event.submitter, () => setStep(2));
    updateTrialSubmitStates();
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (validateLogin()) runWithLoading(event.submitter, () => setStep(2));
    updateTrialSubmitStates();
  });

  localForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (validateLocal()) runWithLoading(event.submitter, () => setStep(3));
    updateTrialSubmitStates();
  });

  modal.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      const form = field.closest("form");
      if (form && field.name) clearFieldError(form, field.name);
      updateTrialSubmitStates();
    });
    field.addEventListener("change", updateTrialSubmitStates);
  });

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setStarValue(button.dataset.trialStar);
    });
  });

  teamWritesCheckbox?.addEventListener("change", updateReviewPreference);
  backButton?.addEventListener("click", () => setStep(1));
  doneButton?.addEventListener("click", closeTrialModal);
  forgotLink?.addEventListener("click", (event) => event.preventDefault());

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openTrialModal();
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTrialModal();
    });
  });

  closeButtons.forEach((button) => button.addEventListener("click", closeTrialModal));
  overlay.addEventListener("click", closeTrialModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeTrialModal();
    if (event.key !== "Tab" || !modal.classList.contains("is-open")) return;
    const focusableElements = getFocusableElements();
    if (!focusableElements.length) return;
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
};

const initFreeTrialModal = () => {
  const triggers = [...document.querySelectorAll("[data-trial-trigger]")];
  const isCheckoutFlow = Boolean(document.body.classList.contains("checkout-page") || document.querySelector("[data-checkout-page], [data-personalizacion-page]"));
  const allPromoBars = [...document.querySelectorAll(".promo-bar")];
  const checkoutPromoHosts = [...new Set(allPromoBars.map((bar) => bar.closest("[data-header]") || bar.parentElement).filter(Boolean))];

  if (isCheckoutFlow) {
    document.body.classList.add("trial-promo-hidden");
    checkoutPromoHosts.forEach((host) => host.classList.add("trial-promo-is-hidden"));
    allPromoBars.forEach((bar) => {
      bar.classList.add("is-hidden");
      bar.hidden = true;
      bar.setAttribute("aria-hidden", "true");
      bar.setAttribute("tabindex", "-1");
    });
    return;
  }

  if (!triggers.length) return;

  const promoBars = triggers.filter((trigger) => trigger.classList.contains("promo-bar"));
  const promoHosts = [...new Set(promoBars.map((bar) => bar.closest("[data-header]") || bar.parentElement).filter(Boolean))];
  let overlay = document.querySelector("[data-trial-overlay]");
  let modal = document.querySelector("[data-trial-modal]");
  let lastFocusedElement = null;
  let closeTimer = null;
  let currentRequest = null;
  let isSubmitting = false;
  let isTrialPromoHidden = false;

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "trial-modal-overlay";
    overlay.dataset.trialOverlay = "";
    overlay.hidden = true;
    document.body.append(overlay);
  }

  if (!modal) {
    modal = document.createElement("section");
    modal.id = "trial-modal";
    modal.dataset.trialModal = "";
    document.body.append(modal);
  }

  modal.className = "trial-modal trial-modal--free";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("aria-labelledby", "trial-modal-title");
  modal.tabIndex = -1;
  modal.hidden = true;

  const statusLabels = {
    pending: "Pendiente",
    review: "En revisión",
    active: "Activa",
    completed: "Completada",
  };

  const getSupabaseClient = () => window.DestroyerSupabase?.client || null;

  const setTrialPromoVisibility = (isVisible) => {
    if (!promoBars.length) return;
    isTrialPromoHidden = !isVisible;
    document.body.classList.toggle("trial-promo-hidden", !isVisible);
    promoHosts.forEach((host) => host.classList.toggle("trial-promo-is-hidden", !isVisible));
    promoBars.forEach((bar) => {
      bar.classList.toggle("is-hidden", !isVisible);
      bar.hidden = !isVisible;
      bar.setAttribute("aria-hidden", String(!isVisible));
      if (isVisible) {
        bar.setAttribute("tabindex", "0");
      } else {
        bar.setAttribute("tabindex", "-1");
      }
    });
  };

  const hideTrialPromo = () => setTrialPromoVisibility(false);
  const showTrialPromo = () => setTrialPromoVisibility(true);

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const getFocusableElements = () =>
    [...modal.querySelectorAll(focusableSelector)].filter((element) => {
      if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });

  const focusFirstElement = () => {
    const focusTarget = () => {
      const state = modal.dataset.trialState;
      const preferred =
        state === "request" ? modal.querySelector("[data-trial-maps-url]")
          : state === "auth" ? modal.querySelector("[data-trial-login]")
            : modal.querySelector("[data-trial-done], [data-trial-close]");
      (preferred || getFocusableElements()[0] || modal).focus?.({ preventScroll: true });
    };

    requestAnimationFrame(focusTarget);
    window.setTimeout(focusTarget, 90);
  };

  const setOpenState = (isOpen) => {
    window.clearTimeout(closeTimer);
    if (isOpen) {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeMobileNav();
      overlay.hidden = false;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("trial-modal-is-open");
      requestAnimationFrame(() => {
        overlay.classList.add("is-visible");
        modal.classList.add("is-open");
        focusFirstElement();
      });
      return;
    }

    overlay.classList.remove("is-visible");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("trial-modal-is-open");
    closeTimer = window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.hidden = true;
        overlay.hidden = true;
      }
    }, prefersReducedMotion ? 0 : 260);
    lastFocusedElement?.focus?.({ preventScroll: true });
  };

  const closeTrialModal = () => setOpenState(false);

  const getStatusLabel = (status) => statusLabels[status] || "";

  const renderShell = (state, content) => {
    modal.dataset.trialState = state;
    modal.innerHTML = `
      <div class="trial-modal__glow" aria-hidden="true"></div>
      <button class="trial-modal__close" type="button" aria-label="Cerrar" data-trial-close>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <div class="free-trial-content">
        <p class="free-trial-eyebrow">PRUEBA GRATUITA</p>
        ${content}
      </div>
    `;
    focusFirstElement();
  };

  const renderAuthRequired = () => {
    renderShell("auth", `
      <h2 id="trial-modal-title">Inicia sesión para solicitar tu prueba</h2>
      <p class="free-trial-lead">Para activar tu prueba gratuita de 1 reseña necesitamos asociarla a tu cuenta.</p>
      <p class="free-trial-note">Tu prueba no afecta al carrito ni requiere pago.</p>
      <div class="free-trial-actions free-trial-actions--auth">
        <a class="button button-primary free-trial-primary" href="${sitePath("login.html")}" data-trial-login>Iniciar sesión</a>
        <a class="free-trial-register" href="${sitePath("register.html")}">Crear cuenta</a>
        <button class="free-trial-tertiary" type="button" data-trial-close>Seguir viendo la página</button>
      </div>
    `);
  };

  const renderLoading = () => {
    renderShell("loading", `
      <h2 id="trial-modal-title">Comprobando tu prueba</h2>
      <p class="free-trial-lead">Un momento, estamos revisando si ya existe una solicitud asociada a tu cuenta.</p>
      <div class="free-trial-loader" aria-hidden="true"></div>
    `);
  };

  const renderRequestForm = () => {
    renderShell("request", `
      <h2 id="trial-modal-title">Solicita tu prueba gratuita</h2>
      <p class="free-trial-lead">Activaremos 1 reseña de prueba para que veas cómo funciona el servicio.</p>
      <form class="free-trial-form" novalidate data-free-trial-form>
        <label class="free-trial-field" data-free-trial-field="google_maps_url">
          <span>Enlace de tu ficha de Google Maps</span>
          <input type="url" name="google_maps_url" placeholder="Pega aquí el enlace de tu ficha de Google Maps" autocomplete="url" data-trial-maps-url />
          <small class="free-trial-help">Aceptamos enlaces de Google Maps, compartidos de Maps o enlaces cortos de la app.</small>
          <small class="free-trial-error" data-free-trial-error-for="google_maps_url"></small>
        </label>
        <label class="free-trial-field">
          <span>Nota opcional</span>
          <textarea name="note" rows="3" placeholder="Cuéntanos algo útil sobre tu negocio o la ficha."></textarea>
        </label>
        <p class="free-trial-status" role="status" aria-live="polite" data-free-trial-status></p>
        <div class="free-trial-actions">
          <button class="button button-primary free-trial-primary" type="submit" data-free-trial-submit>Solicitar prueba gratuita</button>
          <button class="free-trial-tertiary" type="button" data-trial-close>Cancelar</button>
        </div>
      </form>
    `);
  };

  const renderSuccess = () => {
    renderShell("success", `
      <span class="free-trial-success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="m6.8 12.4 3.4 3.4 7-7.6" /></svg>
      </span>
      <h2 id="trial-modal-title">Prueba solicitada</h2>
      <p class="free-trial-lead">Hemos recibido tu solicitud. Revisaremos tu ficha y activaremos la prueba gratuita de 1 reseña.</p>
      <p class="free-trial-note">Te avisaremos por email o desde tu cuenta cuando esté en marcha.</p>
      <div class="free-trial-actions free-trial-actions--single">
        <button class="button button-primary free-trial-primary" type="button" data-trial-done>Entendido</button>
      </div>
    `);
  };

  const renderAlreadyRequested = (request = currentRequest) => {
    const status = getStatusLabel(request?.status);
    renderShell("already", `
      <h2 id="trial-modal-title">Ya has solicitado tu prueba gratuita</h2>
      <p class="free-trial-lead">Estamos revisando tu solicitud. Te avisaremos cuando esté activa.</p>
      ${status ? `<p class="free-trial-status-pill">Estado: <strong>${status}</strong></p>` : ""}
      <div class="free-trial-actions free-trial-actions--single">
        <button class="button button-primary free-trial-primary" type="button" data-trial-done>Entendido</button>
      </div>
    `);
  };

  const renderError = (message, note = "") => {
    renderShell("error", `
      <h2 id="trial-modal-title">No hemos podido cargar tu prueba</h2>
      <p class="free-trial-lead">${message}</p>
      ${note ? `<p class="free-trial-note">${note}</p>` : ""}
      <div class="free-trial-actions free-trial-actions--single">
        <button class="button button-primary free-trial-primary" type="button" data-trial-done>Entendido</button>
      </div>
    `);
  };

  const getFreeTrialLoadErrorCopy = (error) => {
    const code = `${error?.code || ""}`.toUpperCase();
    const message = `${error?.message || error?.details || ""}`.toLowerCase();

    if (code === "PGRST205" || message.includes("could not find the table") || message.includes("schema cache")) {
      return {
        message: "Supabase no encuentra la tabla de solicitudes de prueba gratuita.",
        note: "Revisa que la migración de free_trial_requests esté aplicada y refresca el schema cache si acabas de crearla.",
      };
    }

    if (code === "42501" || message.includes("permission denied")) {
      return {
        message: "Supabase está bloqueando la consulta por permisos de base de datos.",
        note: "La tabla existe, pero el rol authenticated necesita permisos SELECT e INSERT además de las políticas RLS.",
      };
    }

    if (message.includes("jwt") || message.includes("invalid claim") || message.includes("not authenticated")) {
      return {
        message: "No hemos podido confirmar tu sesión antes de consultar la prueba.",
        note: "Cierra sesión, vuelve a iniciar sesión e inténtalo de nuevo.",
      };
    }

    return {
      message: "No hemos podido comprobar tu solicitud en Supabase.",
      note: "Revisa la consola del navegador para ver el error técnico devuelto por Supabase.",
    };
  };

  const fetchFreeTrialRequest = async () => {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase no está disponible.");

    const { data, error } = await client
      .from("free_trial_requests")
      .select("id,status,created_at")
      .maybeSingle();

    if (error) throw error;
    return data || null;
  };

  const syncTrialPromoVisibility = async () => {
    if (!promoBars.length) return;

    let session = null;
    try {
      session = await getCurrentAuthSession({ forceRefresh: true });
    } catch (error) {
      console.warn("[free-trial] Session lookup failed while checking promo visibility", error);
      showTrialPromo();
      return;
    }

    if (!session?.user) {
      showTrialPromo();
      return;
    }

    try {
      currentRequest = await fetchFreeTrialRequest();
      if (currentRequest) {
        hideTrialPromo();
      } else {
        showTrialPromo();
      }
    } catch (error) {
      console.warn("[free-trial] Supabase request lookup failed while checking promo visibility", error);
      showTrialPromo();
    }
  };

  const isDuplicateTrialError = (error) => {
    const code = `${error?.code || ""}`.toLowerCase();
    const message = `${error?.message || error?.details || ""}`.toLowerCase();
    return code === "23505" || message.includes("duplicate") || message.includes("free_trial_requests_user_id_key");
  };

  const setFieldError = (form, message) => {
    const field = form.querySelector('[data-free-trial-field="google_maps_url"]');
    const error = form.querySelector('[data-free-trial-error-for="google_maps_url"]');
    field?.classList.add("is-invalid");
    if (error) error.textContent = message;
  };

  const clearFieldError = (form) => {
    const field = form.querySelector('[data-free-trial-field="google_maps_url"]');
    const error = form.querySelector('[data-free-trial-error-for="google_maps_url"]');
    field?.classList.remove("is-invalid");
    if (error) error.textContent = "";
  };

  const validateFreeTrialForm = (form) => {
    const mapsUrl = `${form.elements.google_maps_url?.value || ""}`.trim();
    clearFieldError(form);

    if (!mapsUrl) {
      setFieldError(form, "Introduce el enlace de tu ficha de Google Maps.");
      return false;
    }

    if (!isGoogleMapsUrl(mapsUrl)) {
      setFieldError(form, "Pega un enlace válido de Google Maps.");
      return false;
    }

    return true;
  };

  const setSubmitLoading = (button, isLoading) => {
    if (!button) return;
    button.classList.toggle("is-loading", isLoading);
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
    if (!isLoading) button.removeAttribute("aria-busy");
  };

  const submitFreeTrialRequest = async (form, submitButton) => {
    if (isSubmitting || !validateFreeTrialForm(form)) return;

    const status = form.querySelector("[data-free-trial-status]");
    const client = getSupabaseClient();
    const mapsUrl = `${form.elements.google_maps_url?.value || ""}`.trim();
    const note = `${form.elements.note?.value || ""}`.trim();

    isSubmitting = true;
    setSubmitLoading(submitButton, true);
    if (status) {
      status.className = "free-trial-status";
      status.textContent = "Enviando solicitud...";
    }

    try {
      const { data, error } = await client
        .from("free_trial_requests")
        .insert({
          google_maps_url: mapsUrl,
          note: note || null,
        })
        .select("id,status,created_at")
        .single();

      if (error) throw error;
      currentRequest = data || { status: "pending" };
      renderSuccess();
      hideTrialPromo();
    } catch (error) {
      if (isDuplicateTrialError(error)) {
        currentRequest = await fetchFreeTrialRequest().catch(() => ({ status: "pending" }));
        hideTrialPromo();
        renderAlreadyRequested(currentRequest);
        return;
      }

      if (status) {
        status.className = "free-trial-status is-error";
        status.textContent = "No hemos podido enviar la solicitud. Inténtalo de nuevo en unos segundos.";
      }
    } finally {
      isSubmitting = false;
      setSubmitLoading(submitButton, false);
    }
  };

  const openTrialModal = async () => {
    renderLoading();
    setOpenState(true);

    let session = null;
    try {
      session = await getCurrentAuthSession({ forceRefresh: true });
    } catch {
      session = null;
    }

    if (!session?.user) {
      renderAuthRequired();
      return;
    }

    try {
      currentRequest = await fetchFreeTrialRequest();
      if (currentRequest) {
        hideTrialPromo();
        renderAlreadyRequested(currentRequest);
        return;
      }
      showTrialPromo();
      renderRequestForm();
    } catch (error) {
      console.warn("[free-trial] Supabase request lookup failed", error);
      const errorCopy = getFreeTrialLoadErrorCopy(error);
      renderError(errorCopy.message, errorCopy.note);
    }
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openTrialModal();
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTrialModal();
    });
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-trial-close], [data-trial-done]")) {
      event.preventDefault();
      closeTrialModal();
    }
  });

  modal.addEventListener("input", (event) => {
    const form = event.target.closest("[data-free-trial-form]");
    if (form && event.target.name === "google_maps_url") clearFieldError(form);
  });

  modal.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-free-trial-form]");
    if (!form) return;
    event.preventDefault();
    submitFreeTrialRequest(form, event.submitter || form.querySelector("[data-free-trial-submit]"));
  });

  overlay.addEventListener("click", closeTrialModal);

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      closeTrialModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    if (!focusableElements.length) return;
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  syncTrialPromoVisibility();
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
    if (!canRunPointerEffects()) return;
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

  document.querySelectorAll(".price-card").forEach((card) => {
    if (!canRunPointerEffects()) return;
    let spotlightFrame = null;
    let pointerX = 0;
    let pointerY = 0;

    card.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (spotlightFrame) return;

      spotlightFrame = requestAnimationFrame(() => {
        spotlightFrame = null;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spotlight-x", `${pointerX - rect.left}px`);
        card.style.setProperty("--spotlight-y", `${pointerY - rect.top}px`);
      });
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      if (spotlightFrame) {
        cancelAnimationFrame(spotlightFrame);
        spotlightFrame = null;
      }
      card.style.removeProperty("--spotlight-x");
      card.style.removeProperty("--spotlight-y");
    });
  });

  document.querySelectorAll(".magnetic").forEach((button) => {
    if (!canRunPointerEffects()) return;
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

    button.addEventListener("pointerenter", () => button.classList.add("is-magnetic-active"), { passive: true });
    button.addEventListener("pointerleave", () => {
      if (magneticFrame) {
        cancelAnimationFrame(magneticFrame);
        magneticFrame = null;
      }
      button.style.transform = "";
      button.classList.remove("is-magnetic-active");
    });
  });

  document.querySelectorAll("[data-scan-map]").forEach((map) => {
    [...map.querySelectorAll("span")].forEach((cell, index) => cell.style.setProperty("--cell-index", index));
    if (prefersReducedMotion) return;
    let isMapVisible = true;
    if (typeof IntersectionObserver !== "undefined") {
      isMapVisible = false;
      const observer = new IntersectionObserver(
        ([entry]) => {
          isMapVisible = entry.isIntersecting;
        },
        { rootMargin: "160px 0px" }
      );
      observer.observe(map);
    }

    window.setInterval(() => {
      if (document.hidden || !isMapVisible) return;
      map.classList.add("is-scanning");
      window.setTimeout(() => map.classList.remove("is-scanning"), 740);
    }, 2600);
  });
};

const initAnimationVisibility = () => {
  const pauseGroups = [
    { roots: document.querySelectorAll(".hero"), targets: ".reputation-phone, .map-pin, .map-dot, .phone-stars i, .chart-line, .map-route, .phone-notification, .phone-app-nav span, .button-primary" },
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

const initTestimonialMarqueeSpeed = () => {
  if (prefersReducedMotion || !hasFinePointer) return;

  document.querySelectorAll(".testimonial-marquee").forEach((marquee) => {
    const track = marquee.querySelector(".testimonial-track");
    if (!track || typeof track.getAnimations !== "function") return;

    let frame = null;
    let currentRate = 1;
    let targetRate = 1;
    let lastTime = 0;
    let animations = [];

    const readAnimations = () => {
      animations = track.getAnimations().filter((animation) => animation.effect);
      return animations.length;
    };

    const setRate = (rate) => {
      if (!animations.length && !readAnimations()) return;
      animations.forEach((animation) => {
        animation.playbackRate = rate;
      });
    };

    const tick = (time) => {
      const elapsed = Math.min(time - lastTime, 64) / 1000;
      lastTime = time;
      const smoothing = 1 - Math.exp(-elapsed * 4.8);
      currentRate += (targetRate - currentRate) * smoothing;
      setRate(currentRate);

      if (Math.abs(targetRate - currentRate) < 0.006) {
        currentRate = targetRate;
        setRate(currentRate);
        frame = null;
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    const glideTo = (rate) => {
      targetRate = rate;
      if (frame) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    marquee.addEventListener("pointerenter", () => glideTo(0.3), { passive: true });
    marquee.addEventListener("pointerleave", () => glideTo(1), { passive: true });
    marquee.addEventListener("focusin", () => glideTo(0.3));
    marquee.addEventListener("focusout", () => glideTo(1));
  });
};

const initMotionVisibility = () => {
  if (!canRunScrollMotion()) {
    resetScrollMotion();
    return;
  }

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
};

const updateScrollMotion = () => {
  motionFrame = null;
  if (!canRunScrollMotion()) return;

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

};

const requestScrollMotion = () => {
  if (motionFrame || !canRunScrollMotion()) return;
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

const initProcessTimeline = () => {
  const timeline = document.querySelector("[data-process-section] .process-timeline");
  const steps = [...document.querySelectorAll("[data-process-step]")];
  if (!timeline || !steps.length) return;

  const firstNode = steps[0]?.querySelector(".process-node");
  const lastNode = steps[steps.length - 1]?.querySelector(".process-node");
  if (!firstNode || !lastNode) return;

  const getNodeCenter = (node, timelineRect = timeline.getBoundingClientRect()) => {
    const nodeRect = node.getBoundingClientRect();
    return nodeRect.top - timelineRect.top + nodeRect.height / 2;
  };

  const updateLineMetrics = () => {
    const timelineRect = timeline.getBoundingClientRect();
    const firstCenter = getNodeCenter(firstNode, timelineRect);
    const lastCenter = getNodeCenter(lastNode, timelineRect);
    timeline.style.setProperty("--process-line-top", `${firstCenter}px`);
    timeline.style.setProperty("--process-line-height", `${Math.max(1, lastCenter - firstCenter)}px`);
  };

  const clearHoveredStep = () => {
    timeline.classList.remove("is-segment-hovered");
    steps.forEach((step) => step.classList.remove("is-hovered"));
  };

  const setHoveredStep = (targetStep) => {
    const timelineRect = timeline.getBoundingClientRect();
    const centers = steps.map((step) => {
      const node = step.querySelector(".process-node");
      return node ? getNodeCenter(node, timelineRect) : 0;
    });
    const index = steps.indexOf(targetStep);
    if (index < 0) return;

    const currentCenter = centers[index];
    const previousCenter = centers[index - 1];
    const nextCenter = centers[index + 1];
    const segmentTop = index === 0 ? currentCenter : (previousCenter + currentCenter) / 2;
    const segmentBottom = index === steps.length - 1 ? currentCenter : (currentCenter + nextCenter) / 2;

    steps.forEach((step) => step.classList.toggle("is-hovered", step === targetStep));
    timeline.style.setProperty("--process-hover-top", `${Math.max(0, segmentTop)}px`);
    timeline.style.setProperty("--process-hover-height", `${Math.max(1, segmentBottom - segmentTop)}px`);
    timeline.classList.add("is-segment-hovered");
  };

  updateProcessTimeline = () => {
    if (!processTimelineVisible) return;
    const rect = timeline.getBoundingClientRect();
    const firstCenter = getNodeCenter(firstNode, rect);
    const lastCenter = getNodeCenter(lastNode, rect);
    timeline.style.setProperty("--process-line-top", `${firstCenter}px`);
    timeline.style.setProperty("--process-line-height", `${Math.max(1, lastCenter - firstCenter)}px`);
    const triggerY = window.innerHeight * (window.innerWidth < 768 ? 0.6 : 0.55);
    const firstViewportCenter = rect.top + firstCenter;
    const totalDistance = Math.max(1, lastCenter - firstCenter);
    const progress = clamp((triggerY - firstViewportCenter) / totalDistance, 0, 1);
    timeline.style.setProperty("--process-progress", progress.toFixed(3));

    steps.forEach((step) => {
      const node = step.querySelector(".process-node");
      if (!node) return;
      const nodeCenter = rect.top + getNodeCenter(node, rect);
      step.classList.toggle("is-active", nodeCenter <= triggerY);
    });
  };

  if (prefersReducedMotion) {
    timeline.style.setProperty("--process-progress", "1");
    steps.forEach((step) => step.classList.add("is-active"));
    updateLineMetrics();
    return;
  }

  const resizeObserver = new ResizeObserver(() => requestProcessTimeline());
  resizeObserver.observe(timeline);
  steps.forEach((step) => resizeObserver.observe(step));

  if (typeof IntersectionObserver !== "undefined") {
    processTimelineVisible = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        processTimelineVisible = entry.isIntersecting;
        if (processTimelineVisible) requestProcessTimeline();
      },
      { rootMargin: "220px 0px" }
    );
    observer.observe(timeline);
  } else {
    processTimelineVisible = true;
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    steps.forEach((step) => {
      const card = step.querySelector(".process-card");
      if (!card) return;
      card.addEventListener("mouseenter", () => setHoveredStep(step));
      card.addEventListener("mouseleave", clearHoveredStep);
    });
  }

  updateLineMetrics();
  requestProcessTimeline();
};

const cartStorageKey = "destroyerReviewsCart";
const formatCartPrice = (value) => `${Number(value || 0).toLocaleString("es-ES")} €`;
const mainScriptSrc = [...document.scripts].find((script) => script.getAttribute("src")?.includes("js/main.js"))?.getAttribute("src") || "";
const relativeRoot = mainScriptSrc.match(/^(?:\.\.\/)+/)?.[0] || "";
const sitePath = (path) => `${relativeRoot}${path}`;
const checkoutPath = () => `${relativeRoot}checkout/`;

const readStoredCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    return Array.isArray(stored) ? stored.filter((item) => item && item.name) : [];
  } catch {
    return [];
  }
};

const initCart = () => {
  const drawer = document.querySelector("[data-cart-drawer]");
  const overlay = document.querySelector("[data-cart-overlay]");
  const toggles = [...document.querySelectorAll("[data-cart-toggle]")];
  const openButtons = [...document.querySelectorAll("[data-cart-open]")];
  const closeButtons = [...document.querySelectorAll("[data-cart-close]")];
  const countNodes = [...document.querySelectorAll("[data-cart-count]")];
  const itemsNode = document.querySelector("[data-cart-items]");
  const emptyNode = document.querySelector("[data-cart-empty]");
  const summaryNode = document.querySelector("[data-cart-summary]");
  const totalNode = document.querySelector("[data-cart-total]");
  const checkoutNode = document.querySelector("[data-cart-checkout]");
  const continueNode = document.querySelector("[data-cart-continue]");
  const pricesLinks = [...document.querySelectorAll("[data-cart-prices]")];
  const toast = document.querySelector("[data-cart-toast]");
  const drawerNotice = document.querySelector("[data-cart-notice]");
  const addButtons = [...document.querySelectorAll("[data-add-cart]")];
  const whatsappNumber = "34603826428";
  const removeAnimationMs = 320;
  let cart = [];
  let toastTimer = null;
  let noticeTimer = null;

  if (!drawer || !overlay) return;

  let accountModal = null;
  let accountModalOverlay = null;
  let accountModalLogin = null;
  let lastFocusedBeforeAccountModal = null;

  const getAuthHref = (fileName) => sitePath(fileName);

  const createAccountModal = () => {
    if (accountModal && accountModalOverlay) return;

    accountModalOverlay = document.createElement("div");
    accountModalOverlay.className = "cart-account-modal-overlay";
    accountModalOverlay.hidden = true;
    accountModalOverlay.dataset.accountModalClose = "overlay";

    accountModal = document.createElement("section");
    accountModal.className = "cart-account-modal";
    accountModal.setAttribute("role", "dialog");
    accountModal.setAttribute("aria-modal", "true");
    accountModal.setAttribute("aria-labelledby", "cart-account-modal-title");
    accountModal.hidden = true;
    accountModal.innerHTML = `
      <div class="cart-account-modal__glow" aria-hidden="true"></div>
      <button class="cart-account-modal__close" type="button" aria-label="Cerrar" data-account-modal-close>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <div class="cart-account-modal__content">
        <p class="cart-account-modal__eyebrow">CUENTA NECESARIA</p>
        <h2 id="cart-account-modal-title">Inicia sesión para completar tu pedido</h2>
        <p>Para guardar tu pedido, asociarlo a tu cuenta y continuar con el checkout, necesitas iniciar sesión o crear una cuenta.</p>
        <p class="cart-account-modal__note">Tu carrito se mantendrá guardado mientras accedes.</p>
        <div class="cart-account-modal__actions">
          <a class="button button-primary cart-account-modal__login" href="${getAuthHref("login.html")}" data-account-login>Iniciar sesión</a>
          <a class="cart-account-modal__register" href="${getAuthHref("register.html")}">Crear cuenta</a>
          <button class="cart-account-modal__continue" type="button" data-account-modal-close>Seguir viendo packs</button>
        </div>
      </div>
    `;

    document.body.append(accountModalOverlay, accountModal);
    accountModalLogin = accountModal.querySelector("[data-account-login]");

    accountModalOverlay.addEventListener("click", closeAccountModal);
    accountModal.querySelectorAll("[data-account-modal-close]").forEach((button) => {
      button.addEventListener("click", closeAccountModal);
    });
  };

  const openAccountModal = () => {
    createAccountModal();
    lastFocusedBeforeAccountModal = document.activeElement;
    accountModalOverlay.hidden = false;
    accountModal.hidden = false;
    document.body.classList.add("cart-account-modal-is-open");
    requestAnimationFrame(() => {
      accountModalOverlay.classList.add("is-visible");
      accountModal.classList.add("is-open");
      accountModalLogin?.focus({ preventScroll: true });
    });
  };

  const closeAccountModal = () => {
    if (!accountModal || accountModal.hidden) return;
    accountModalOverlay?.classList.remove("is-visible");
    accountModal.classList.remove("is-open");
    document.body.classList.remove("cart-account-modal-is-open");
    window.setTimeout(() => {
      if (!accountModal?.classList.contains("is-open")) {
        if (accountModalOverlay) accountModalOverlay.hidden = true;
        accountModal.hidden = true;
      }
    }, prefersReducedMotion ? 0 : 220);
    lastFocusedBeforeAccountModal?.focus?.({ preventScroll: true });
  };

  const requireSessionForCheckout = async (event) => {
    if (!checkoutNode) return;
    if (hasResolvedAuthSession && currentAuthSession) return;
    event.preventDefault();

    checkoutNode.classList.add("is-loading");
    checkoutNode.setAttribute("aria-busy", "true");
    try {
      const session = await getCurrentAuthSession();
      if (session) {
        window.location.href = checkoutNode.href || checkoutPath();
        return;
      }
      openAccountModal();
    } catch {
      openAccountModal();
    } finally {
      checkoutNode.classList.remove("is-loading");
      checkoutNode.removeAttribute("aria-busy");
    }
  };

  const readCart = () => {
    cart = readStoredCart();
  };

  const saveCart = () => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("destroyer:cart-updated", { detail: { cart } }));
  };

  const formatPrice = (value) => `${Number(value || 0).toLocaleString("es-ES")} €`;
  const cartCount = () => cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const cartTotal = () => cart.reduce((total, item) => total + (Number(item.price) || 0) * (item.quantity || 1), 0);
  const packVisuals = {
    ambar: { image: "assets/icons/packs/ambar.webp", color: "#f59e0b", label: "Ámbar" },
    amatista: { image: "assets/icons/packs/amatista.webp", color: "#a855f7", label: "Amatista" },
    diamante: { image: "assets/icons/packs/diamante.webp", color: "#58a6ff", label: "Diamante" },
    rubi: { image: "assets/icons/packs/rubi.webp", color: "#fb4d6d", label: "Rubí" },
  };

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);

  const getPackVisual = (item) => {
    const visual = packVisuals[item.id] || {
      image: "assets/icons/packs/diamante.webp",
      color: "#58a6ff",
      label: item.name || "Pack",
    };
    return {
      ...visual,
      image: visual.image.startsWith("../") ? visual.image : sitePath(visual.image),
    };
  };

  const updateCheckout = () => {
    if (!checkoutNode) return;
    const detail = cart.map((item) => `${item.quantity || 1}x ${item.name} (${item.reviews}) - ${formatPrice((Number(item.price) || 0) * (item.quantity || 1))}`).join("; ");
    const message = `Hola, quiero contratar estos packs: ${detail}. ¿Me podéis ayudar?`;
    checkoutNode.href = checkoutPath();
    checkoutNode.removeAttribute("target");
    checkoutNode.removeAttribute("rel");
  };

  const renderCart = () => {
    const count = cartCount();
    countNodes.forEach((node) => {
      node.textContent = String(count);
      node.hidden = count === 0;
    });

    toggles.forEach((toggle) => toggle.setAttribute("aria-expanded", drawer.classList.contains("is-open") ? "true" : "false"));

    const hasItems = cart.length > 0;
    if (emptyNode) emptyNode.hidden = hasItems;
    if (summaryNode) summaryNode.hidden = !hasItems;
    if (totalNode) totalNode.textContent = formatPrice(cartTotal());

    if (itemsNode) {
      itemsNode.innerHTML = cart.map((item) => {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const escapedId = escapeHtml(item.id);
        const escapedName = escapeHtml(item.name);
        const visual = getPackVisual(item);
        return `
        <article class="cart-item" style="--pack-accent: ${visual.color};" data-cart-item="${escapedId}">
          <div class="cart-item__icon" aria-hidden="true">
            <img src="${visual.image}" alt="" loading="lazy" decoding="async" />
          </div>
          <div class="cart-item__meta">
            <span class="cart-item__badge">${escapeHtml(item.reviews)}</span>
            <h3>${escapedName}</h3>
            <div class="cart-quantity" aria-label="Cantidad de ${escapedName}">
              <button class="cart-quantity__button" type="button" aria-label="Reducir cantidad de ${escapedName}" data-cart-quantity="decrease" data-cart-id="${escapedId}" ${quantity === 1 ? "disabled" : ""}>&minus;</button>
              <span class="cart-quantity__value" aria-live="polite">${quantity}</span>
              <button class="cart-quantity__button" type="button" aria-label="Aumentar cantidad de ${escapedName}" data-cart-quantity="increase" data-cart-id="${escapedId}">+</button>
            </div>
          </div>
          <div class="cart-item__side">
            <strong>${formatPrice((Number(item.price) || 0) * quantity)}</strong>
            <button class="cart-item__remove" type="button" aria-label="Eliminar ${escapedName}" data-remove-cart="${escapedId}">
              <svg class="cart-trash" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <g class="cart-trash__lid">
                  <path d="M8.5 6.4h7" />
                  <path d="M10.2 6.4l.55-1.45h2.5l.55 1.45" />
                </g>
                <path d="M6.8 8.4h10.4" />
                <path d="M8.2 8.4l.65 9.25a2 2 0 0 0 2 1.85h2.3a2 2 0 0 0 2-1.85l.65-9.25" />
                <path d="M10.7 11.15v5.1" />
                <path d="M13.3 11.15v5.1" />
              </svg>
            </button>
          </div>
        </article>
      `;
      }).join("");
    }

    updateCheckout();
  };

  const openCart = () => {
    renderCart();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    document.body.classList.add("cart-is-open");
    closeMobileNav();
  };

  const closeCart = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-visible");
    if (drawerNotice) {
      drawerNotice.classList.remove("is-visible");
      window.clearTimeout(noticeTimer);
      window.setTimeout(() => {
        if (!drawer.classList.contains("is-open")) drawerNotice.hidden = true;
      }, 220);
    }
    document.body.classList.remove("cart-is-open");
    toggles.forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) overlay.hidden = true;
    }, 260);
  };

  const scrollToPricing = () => {
    const pricingGrid = document.querySelector(".pricing-grid-wrap") || document.querySelector(".pricing-grid");
    const pricingSection = document.querySelector("#precios") || document.querySelector("#planes") || document.querySelector(".pricing-section");
    const target = pricingGrid || pricingSection;
    if (!target) return false;

    const headerHeight = header?.offsetHeight || 76;
    const viewportPadding = window.innerWidth < 768 ? 18 : 28;
    const targetRect = target.getBoundingClientRect();
    const targetTop = targetRect.top + window.scrollY;
    const targetCenterOffset = Math.max(0, (window.innerHeight - targetRect.height) * 0.28);
    const top = Math.max(0, targetTop - headerHeight - viewportPadding - targetCenterOffset);

    if (lenis && !prefersReducedMotion) {
      lenisLastActive = performance.now();
      requestLenisFrame();
      lenis.scrollTo(top, { duration: 0.95, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else {
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }

    return true;
  };

  const goToPricing = (link) => {
    const fallbackHref = link?.getAttribute("href") || "index.html#planes";
    closeCart();
    window.setTimeout(() => {
      if (scrollToPricing()) return;
      window.location.href = fallbackHref;
    }, prefersReducedMotion ? 0 : 220);
  };

  const showToast = (message) => {
    const isDrawerOpen = drawer.classList.contains("is-open");
    if (isDrawerOpen && drawerNotice) {
      window.clearTimeout(noticeTimer);
      drawerNotice.innerHTML = `<span aria-hidden="true">✓</span><strong>${escapeHtml(message)}</strong>`;
      drawerNotice.hidden = false;
      requestAnimationFrame(() => drawerNotice.classList.add("is-visible"));
      noticeTimer = window.setTimeout(() => {
        drawerNotice.classList.remove("is-visible");
        window.setTimeout(() => {
          if (!drawerNotice.classList.contains("is-visible")) drawerNotice.hidden = true;
        }, 220);
      }, 1800);
      return;
    }

    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.innerHTML = `<span aria-hidden="true">✓</span><strong>${escapeHtml(message)}</strong>`;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        if (!toast.classList.contains("is-visible")) toast.hidden = true;
      }, 220);
    }, 2200);
  };

  addButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentScroll = window.scrollY;
      const item = {
        id: (button.dataset.packName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-"),
        name: button.dataset.packName || "Pack",
        reviews: button.dataset.packReviews || "Reseñas",
        price: Number(button.dataset.packPrice || 0),
        quantity: 1,
      };
      const existing = cart.find((cartItem) => cartItem.id === item.id);
      if (existing) existing.quantity = (existing.quantity || 1) + 1;
      else cart.push(item);
      saveCart();
      button.classList.add("is-added");
      window.setTimeout(() => button.classList.remove("is-added"), 620);
      openCart();
      showToast(`${item.name} añadido al carrito`);
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - currentScroll) > 2) {
          window.scrollTo(0, currentScroll);
        }
      });
    });
  });

  itemsNode?.addEventListener("click", (event) => {
    const quantityButton = event.target.closest("[data-cart-quantity]");
    if (quantityButton) {
      const targetItem = cart.find((item) => item.id === quantityButton.dataset.cartId);
      if (!targetItem) return;

      const currentQuantity = Math.max(1, Number(targetItem.quantity) || 1);
      if (quantityButton.dataset.cartQuantity === "increase") {
        targetItem.quantity = currentQuantity + 1;
      } else if (currentQuantity > 1) {
        targetItem.quantity = currentQuantity - 1;
      } else {
        targetItem.quantity = 1;
      }

      saveCart();
      renderCart();
      return;
    }

    const removeButton = event.target.closest("[data-remove-cart]");
    if (!removeButton) return;
    const itemNode = removeButton.closest(".cart-item");
    if (!itemNode || itemNode.classList.contains("is-removing")) return;
    itemNode.style.setProperty("--cart-item-height", `${itemNode.offsetHeight}px`);
    itemNode.classList.add("is-removing");
    window.setTimeout(() => {
      cart = cart.filter((item) => item.id !== removeButton.dataset.removeCart);
      saveCart();
      renderCart();
    }, removeAnimationMs);
  });

  toggles.forEach((button) => button.addEventListener("click", () => {
    if (drawer.classList.contains("is-open")) closeCart();
    else openCart();
  }));
  openButtons.forEach((button) => button.addEventListener("click", openCart));
  closeButtons.forEach((button) => button.addEventListener("click", closeCart));
  overlay.addEventListener("click", closeCart);
  continueNode?.addEventListener("click", closeCart);
  checkoutNode?.addEventListener("click", requireSessionForCheckout);
  pricesLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goToPricing(link);
    });
  });

  if (window.location.hash === "#planes" || window.location.hash === "#precios") {
    window.setTimeout(scrollToPricing, 260);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (accountModal && !accountModal.hidden) {
      closeAccountModal();
      return;
    }
    if (drawer.classList.contains("is-open")) closeCart();
  });

  readCart();
  renderCart();

  window.addEventListener("destroyer:cart-updated", () => {
    readCart();
    renderCart();
  });

  if (new URLSearchParams(window.location.search).get("accountRequired") === "checkout") {
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
    getCurrentAuthSession()
      .then((session) => {
        if (!session) openAccountModal();
      })
      .catch(openAccountModal);
  }
};

const initCheckout = () => {
  const root = document.querySelector("[data-checkout-page]");
  if (!root) return;
  root.hidden = true;

  const form = root.querySelector("[data-checkout-form]");
  const shell = root.querySelector("[data-checkout-shell]");
  const empty = root.querySelector("[data-checkout-empty]");
  const summaryItems = root.querySelector("[data-checkout-summary-items]");
  const totalNode = root.querySelector("[data-checkout-total]");
  const totalInlineNode = root.querySelector("[data-checkout-total-inline]");
  const submitButton = root.querySelector("[data-payment-submit]");
  const statusNode = root.querySelector("[data-checkout-status]");
  const reviewModeButtons = [...root.querySelectorAll("[data-checkout-review-mode]")];
  const optionLabel = root.querySelector("[data-checkout-option-label]");
  const optionValue = root.querySelector("[data-checkout-option-value]");
  const extraRow = root.querySelector("[data-checkout-extra-row]");
  const extraBreakdownNode = root.querySelector("[data-checkout-extra-breakdown]");
  const extraTotalNode = root.querySelector("[data-checkout-extra-total]");
  const finalTotalNode = root.querySelector("[data-checkout-final-total]");
  let reviewMode = "team";
  let submittedOrder = null;

  const resultNode = document.createElement("div");
  resultNode.className = "checkout-order-result";
  resultNode.hidden = true;
  statusNode?.after(resultNode);

  const setCheckoutFieldValue = (name, value) => {
    const field = form?.elements?.[name];
    if (!field || !value) return;
    field.value = String(value).trim();
  };

  const readCheckoutAccountData = async (user) => {
    if (!user) return { name: "", email: "", whatsapp: "" };

    const metadata = user.user_metadata || {};
    let profile = null;

    try {
      const profileData = await ensureProfileDataScripts();
      profile = await profileData?.ensureUserProfile?.(user);
    } catch (error) {
      profile = null;
    }

    return {
      name: `${profile?.full_name || metadata.name || ""}`.trim(),
      email: `${user.email || ""}`.trim(),
      whatsapp: `${profile?.whatsapp || metadata.whatsapp || ""}`.trim(),
    };
  };

  const applyCheckoutAccountData = async (session) => {
    const user = session?.user;
    if (!user || !form) return;

    const account = await readCheckoutAccountData(user);
    const nameField = form.elements?.name;
    const emailField = form.elements?.email;
    const whatsappField = form.elements?.whatsapp;

    setCheckoutFieldValue("email", account.email);
    setCheckoutFieldValue("name", account.name);
    setCheckoutFieldValue("whatsapp", account.whatsapp);

    if (nameField) {
      nameField.readOnly = Boolean(account.name);
      nameField.setAttribute("aria-readonly", String(Boolean(account.name)));
      nameField.required = true;
      if (!account.name) nameField.placeholder = "Indica el nombre de contacto";
    }

    if (emailField) {
      emailField.readOnly = true;
      emailField.setAttribute("aria-readonly", "true");
    }

    if (whatsappField) {
      whatsappField.required = false;
      whatsappField.removeAttribute("required");
    }
  };

  const escapeCheckoutHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);

  const itemQuantity = (item) => Math.max(1, Number(item.quantity) || 1);
  const itemUnitReviews = (item) => Math.max(1, Number(String(item.reviews || item.name || "1").match(/\d+/)?.[0]) || 1);
  const cartItems = () => readStoredCart();
  const cartTotal = (items) => items.reduce((total, item) => total + (Number(item.price) || 0) * itemQuantity(item), 0);
  const cartReviewTotal = (items) => items.reduce((total, item) => total + itemUnitReviews(item) * itemQuantity(item), 0);
  const packIcon = (item) => {
    const id = item.id || "";
    const safeId = ["ambar", "amatista", "diamante", "rubi"].includes(id) ? id : "diamante";
    return sitePath(`assets/icons/packs/${safeId}.webp`);
  };

  const setStatus = (type, message) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = type || "";
    if (type !== "success" && !submittedOrder) {
      resultNode.hidden = true;
      resultNode.innerHTML = "";
    }
  };

  const renderSummary = () => {
    const items = cartItems();
    const hasItems = items.length > 0;
    const packTotal = cartTotal(items);
    const reviewTotal = cartReviewTotal(items);
    const extraCost = reviewMode === "manual" ? reviewTotal : 0;
    const finalTotal = packTotal + extraCost;

    if (submittedOrder) {
      if (shell) shell.hidden = false;
      if (empty) empty.hidden = true;
      if (submitButton) submitButton.disabled = true;
      return;
    }

    if (shell) shell.hidden = !hasItems;
    if (empty) empty.hidden = hasItems;
    if (submitButton) submitButton.disabled = !hasItems;

    if (summaryItems) {
      summaryItems.innerHTML = items.map((item) => {
        const quantity = itemQuantity(item);
        const price = Number(item.price) || 0;
        const subtotal = price * quantity;
        return `
          <article class="checkout-summary-item">
            <img src="${packIcon(item)}" alt="" loading="lazy" decoding="async" />
            <div>
              <strong>${escapeCheckoutHtml(item.name)}</strong>
              <span>${escapeCheckoutHtml(item.reviews)} &middot; Cantidad ${quantity}</span>
            </div>
            <dl>
              <div><dt>Precio del pack</dt><dd>${formatCartPrice(price)}</dd></div>
              <div><dt>Subtotal</dt><dd>${formatCartPrice(subtotal)}</dd></div>
            </dl>
          </article>
        `;
      }).join("");
    }

    if (totalNode) totalNode.textContent = formatCartPrice(finalTotal);
    if (totalInlineNode) totalInlineNode.textContent = formatCartPrice(packTotal);
    if (optionLabel) optionLabel.textContent = reviewMode === "manual" ? "Personalización de reseñas" : "Reseñas preparadas por el equipo";
    if (optionValue) optionValue.textContent = reviewMode === "manual" ? "Añadida" : "Incluido";
    if (extraRow) extraRow.hidden = reviewMode !== "manual";
    if (extraBreakdownNode) extraBreakdownNode.textContent = `${reviewTotal} ${reviewTotal === 1 ? "reseña" : "reseñas"} x 1 €`;
    if (extraTotalNode) extraTotalNode.textContent = `+${formatCartPrice(extraCost)}`;
    if (finalTotalNode) finalTotalNode.textContent = formatCartPrice(finalTotal);
  };

  const setFieldError = (field, message) => {
    const wrapper = field.closest("[data-checkout-field]");
    const error = wrapper?.querySelector("[data-checkout-error]");
    wrapper?.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message || "";
  };

  const validateCheckout = () => {
    if (!form) return false;
    let isValid = true;
    [...form.querySelectorAll("[required]")].forEach((field) => {
      let message = "";
      if (!field.value.trim()) {
        message = field.name === "googleMaps"
          ? "Introduce el enlace de tu ficha de Google Maps."
          : "Completa este campo.";
      }
      if (!message && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
        message = "Introduce un email válido.";
      }
      if (!message && field.name === "googleMaps" && !isGoogleMapsUrl(field.value.trim())) {
        message = "Pega un enlace válido de Google Maps.";
      }
      setFieldError(field, message);
      if (message) isValid = false;
    });
    if (!["team", "manual"].includes(reviewMode)) {
      setStatus("error", "Elige cómo quieres gestionar tus reseñas.");
      isValid = false;
    }
    return isValid;
  };

  const collectCheckoutData = () => {
    const formData = new FormData(form);
    const cart = cartItems();
    const reviewTotal = cartReviewTotal(cart);
    const extraCost = reviewMode === "manual" ? reviewTotal : 0;
    const baseTotal = cartTotal(cart);
    return {
      customer: Object.fromEntries(formData.entries()),
      cart,
      reviewMode,
      reviewTotal,
      extraCost,
      baseTotal,
      total: baseTotal + extraCost,
    };
  };

  const toCents = (value) => Math.max(0, Math.round((Number(value) || 0) * 100));

  const buildOrderItemsPayload = (checkoutData) => {
    const items = checkoutData.cart.map((item) => {
      const quantity = itemQuantity(item);
      const unitPrice = Number(item.price) || 0;
      return {
        pack_slug: item.id || null,
        pack_name: `${item.name || "Pack"}`.trim(),
        reviews_count: itemUnitReviews(item),
        quantity,
        unit_price_cents: toCents(unitPrice),
        subtotal_cents: toCents(unitPrice * quantity),
      };
    });

    if (checkoutData.reviewMode === "manual" && checkoutData.reviewTotal > 0 && checkoutData.extraCost > 0) {
      items.push({
        pack_slug: "personalizacion-resenas",
        pack_name: "Personalizacion de resenas",
        reviews_count: checkoutData.reviewTotal,
        quantity: checkoutData.reviewTotal,
        unit_price_cents: 100,
        subtotal_cents: toCents(checkoutData.extraCost),
      });
    }

    return items;
  };

  const clearCheckoutCart = () => {
    localStorage.removeItem(cartStorageKey);
    window.dispatchEvent(new CustomEvent("destroyer:cart-updated", { detail: { cart: [] } }));
  };

  const formatOrderError = (error) => {
    const message = `${error?.message || ""}`.toLowerCase();
    if (message.includes("authentication") || message.includes("jwt")) {
      return "Tu sesion no esta activa. Inicia sesion de nuevo para crear el pedido.";
    }
    if (message.includes("google maps")) {
      return "Revisa el enlace de Google Maps e intentalo de nuevo.";
    }
    return "No se pudo crear el pedido. Revisa los datos e intentalo de nuevo.";
  };

  const buildPersonalizationDraft = (order, checkoutData) => ({
    ...checkoutData,
    orderId: order?.id || "",
    orderShortId: order?.short_id || "",
    orderStatus: order?.status || "pending",
    paymentStatus: order?.payment_status || "unpaid",
    personalizationPending: true,
  });

  const storePersonalizationDraft = (order, checkoutData) => {
    if (checkoutData?.reviewMode !== "manual") return false;
    try {
      sessionStorage.setItem("destroyerCheckoutDraft", JSON.stringify(buildPersonalizationDraft(order, checkoutData)));
      return true;
    } catch {
      return false;
    }
  };

  const showOrderSuccess = (order, checkoutData, canPersonalize = false) => {
    submittedOrder = order;
    root.classList.add("has-order-success");
    setStatus("success", "Pedido recibido. Estado: pendiente.");
    const personalizeUrl = sitePath("checkout/personalizacion/");

    resultNode.hidden = false;
    resultNode.innerHTML = `
      <span class="checkout-order-result__eyebrow">Estado: pendiente</span>
      <strong>Pedido recibido</strong>
      <p>Hemos guardado tu pedido correctamente. Lo revisaremos y te contactaremos para continuar con el proceso.</p>
      <small>Referencia del pedido ${escapeCheckoutHtml(order?.short_id ? `#${order.short_id}` : order?.id || "")}</small>
      ${canPersonalize ? `<a class="checkout-order-result__action" href="${personalizeUrl}">Personalizar reseñas</a>` : ""}
    `;

    form?.querySelectorAll("input, textarea, button").forEach((field) => {
      field.disabled = true;
    });
    reviewModeButtons.forEach((button) => {
      button.disabled = true;
    });
    submitButton?.classList.remove("is-loading");
    if (submitButton) submitButton.disabled = true;
    submitButton?.querySelector("span")?.replaceChildren(document.createTextNode("Pedido enviado"));
  };

  const createPendingOrder = async (checkoutData) => {
    const session = await getCurrentAuthSession({ forceRefresh: true });
    const user = session?.user;
    if (!user) throw new Error("Authentication required");

    const client = window.DestroyerSupabase?.client;
    if (!client) throw new Error("Supabase is not available");

    const account = await readCheckoutAccountData(user);
    const formCustomerName = `${checkoutData.customer.name || ""}`.trim();
    const formWhatsapp = `${checkoutData.customer.whatsapp || ""}`.trim();
    const googleMapsUrl = `${checkoutData.customer.googleMaps || ""}`.trim();
    const notes = `${checkoutData.customer.notes || ""}`.trim();
    const customerName = account.name || formCustomerName;

    const { data, error } = await client.rpc("create_order_with_items", {
      p_customer_name: customerName,
      p_whatsapp: account.whatsapp || formWhatsapp || null,
      p_google_maps_url: googleMapsUrl,
      p_notes: notes || null,
      p_management_mode: checkoutData.reviewMode,
      p_currency: "EUR",
      p_total_cents: toCents(checkoutData.total),
      p_items: buildOrderItemsPayload(checkoutData),
    });

    if (error) throw error;

    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.id) throw new Error("Order was not returned");
    return order;
  };

  reviewModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      reviewMode = button.dataset.checkoutReviewMode || "team";
      reviewModeButtons.forEach((modeButton) => {
        const isActive = modeButton.dataset.checkoutReviewMode === reviewMode;
        modeButton.classList.toggle("is-active", isActive);
        modeButton.setAttribute("aria-pressed", String(isActive));
      });
      setStatus("", "");
      renderSummary();
    });
  });

  form?.addEventListener("input", (event) => {
    const field = event.target.closest("input, textarea");
    if (field) setFieldError(field, "");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "");

    if (!cartItems().length) {
      setStatus("error", "Tu carrito está vacío. Elige un pack antes de continuar.");
      renderSummary();
      return;
    }

    if (!validateCheckout()) {
      setStatus("error", "Revisa los campos marcados antes de continuar.");
      return;
    }

    submitButton?.classList.add("is-loading");
    if (submitButton) submitButton.disabled = true;
    setStatus("", "Creando pedido...");

    try {
      const checkoutData = collectCheckoutData();
      const order = await createPendingOrder(checkoutData);
      const canPersonalize = storePersonalizationDraft(order, checkoutData);
      showOrderSuccess(order, checkoutData, canPersonalize);
      try {
        clearCheckoutCart();
      } catch {
        // The order is already stored; a local cart cleanup issue should not turn success into failure.
      }
    } catch (error) {
      setStatus("error", formatOrderError(error));
      submitButton?.classList.remove("is-loading");
      if (submitButton) submitButton.disabled = false;
    }
  });

  window.addEventListener("destroyer:cart-updated", renderSummary);
  window.addEventListener("storage", (event) => {
    if (event.key === cartStorageKey) renderSummary();
  });

  getCurrentAuthSession()
    .then((session) => {
      if (!session) {
        window.location.replace(sitePath("index.html?accountRequired=checkout"));
        return;
      }
      return applyCheckoutAccountData(session);
    })
    .then(() => {
      root.hidden = false;
      renderSummary();
    })
    .catch(() => {
      window.location.replace(sitePath("index.html?accountRequired=checkout"));
    });

  renderSummary();
};

const initPersonalizacion = () => {
  const root = document.querySelector("[data-personalizacion-page]");
  if (!root) return;

  const manualPanel = root.querySelector("[data-manual-panel]");
  const reviewList = root.querySelector("[data-personalization-review-list]");
  const form = root.querySelector("[data-personalization-form]");
  const statusNodes = [...root.querySelectorAll("[data-personalization-status]")];
  const reviewTotalNodes = [...root.querySelectorAll("[data-personalization-review-total], [data-personalization-summary-reviews]")];
  const estimatedTotalNodes = [...root.querySelectorAll("[data-personalization-estimated-total]")];
  const summaryTotalNode = root.querySelector("[data-personalization-summary-total]");
  const summaryItems = root.querySelector("[data-personalization-summary-items]");
  const packSubtotalNode = root.querySelector("[data-personalization-pack-subtotal]");
  const extraBreakdownNode = root.querySelector("[data-personalization-extra-breakdown]");
  const extraTotalNode = root.querySelector("[data-personalization-extra-total]");
  const finalTotalNode = root.querySelector("[data-personalization-final-total]");
  const mapsLink = root.querySelector("[data-personalization-maps]");
  const noMapsNode = root.querySelector("[data-personalization-no-maps]");
  let reviews = [];

  const escapePersonalizationHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);

  const readCheckoutDraft = () => {
    try {
      return JSON.parse(sessionStorage.getItem("destroyerCheckoutDraft") || "{}");
    } catch {
      return {};
    }
  };

  const itemQuantity = (item) => Math.max(1, Number(item.quantity) || 1);
  const itemUnitReviews = (item) => Math.max(1, Number(String(item.reviews || item.name || "1").match(/\d+/)?.[0]) || 1);
  const draft = readCheckoutDraft();
  if (draft.reviewMode !== "manual" || draft.personalizationPending !== true || !draft.orderId) {
    window.location.replace(sitePath("checkout/"));
    return;
  }
  const cart = Array.isArray(draft.cart) && draft.cart.length ? draft.cart : readStoredCart();
  const reviewTotal = Number(draft.reviewTotal) || cart.reduce((total, item) => total + itemUnitReviews(item) * itemQuantity(item), 0);
  const packSubtotal = Number.isFinite(Number(draft.baseTotal))
    ? Number(draft.baseTotal)
    : cart.reduce((total, item) => total + (Number(item.price) || 0) * itemQuantity(item), 0);
  const personalizationCost = Number.isFinite(Number(draft.extraCost)) ? Number(draft.extraCost) : reviewTotal;
  const estimatedTotal = Number.isFinite(Number(draft.total)) ? Number(draft.total) : packSubtotal + personalizationCost;
  const customer = draft.customer || {};
  const googleMaps = `${customer.googleMaps || customer.mapsUrl || ""}`.trim();

  const packIcon = (item) => {
    const id = item.id || "";
    const safeId = ["ambar", "amatista", "diamante", "rubi"].includes(id) ? id : "diamante";
    return sitePath(`assets/icons/packs/${safeId}.webp`);
  };

  const starLabel = (stars) => `${"&#9733;".repeat(stars)}${"&#9734;".repeat(5 - stars)}`;

  const setStatus = (type, message) => {
    statusNodes.forEach((node) => {
      node.textContent = message;
      node.dataset.state = type || "";
    });
  };

  const setSubmitLoading = (submit, isLoading) => {
    submit?.classList.toggle("is-loading", isLoading);
    if (submit) submit.disabled = isLoading;
  };

  const ensureReviews = () => {
    reviews = Array.from({ length: reviewTotal }, (_, index) => reviews[index] || { stars: 5, text: "", photos: [], error: "" });
  };

  const renderSummary = () => {
    reviewTotalNodes.forEach((node) => {
      node.textContent = String(reviewTotal);
    });
    estimatedTotalNodes.forEach((node) => {
      node.textContent = formatCartPrice(estimatedTotal);
    });

    if (mapsLink && noMapsNode) {
      mapsLink.hidden = !googleMaps;
      noMapsNode.hidden = Boolean(googleMaps);
      if (googleMaps) mapsLink.href = googleMaps;
    }

    if (summaryItems) {
      summaryItems.innerHTML = cart.length ? cart.map((item) => {
        const quantity = itemQuantity(item);
        const price = Number(item.price) || 0;
        const subtotal = price * quantity;
        return `
          <article class="checkout-summary-item">
            <img src="${packIcon(item)}" alt="" loading="lazy" decoding="async" />
            <div>
              <strong>${escapePersonalizationHtml(item.name)}</strong>
              <span>${escapePersonalizationHtml(item.reviews)} &middot; Cantidad ${quantity}</span>
            </div>
            <dl>
              <div><dt>Precio del pack</dt><dd>${formatCartPrice(price)}</dd></div>
              <div><dt>Subtotal</dt><dd>${formatCartPrice(subtotal)}</dd></div>
            </dl>
          </article>
        `;
      }).join("") : `<p class="personalization-muted">No hay packs guardados en esta sesión.</p>`;
    }

    if (summaryTotalNode) summaryTotalNode.textContent = formatCartPrice(estimatedTotal);
    if (packSubtotalNode) packSubtotalNode.textContent = formatCartPrice(packSubtotal);
    if (extraBreakdownNode) extraBreakdownNode.textContent = `${reviewTotal} ${reviewTotal === 1 ? "reseña" : "reseñas"} x 1 € · Pendiente de revision`;
    if (extraTotalNode) extraTotalNode.textContent = formatCartPrice(personalizationCost);
    if (finalTotalNode) finalTotalNode.textContent = formatCartPrice(estimatedTotal);
  };

  const renderReviews = () => {
    if (!reviewList) return;
    ensureReviews();
    if (!reviews.length) {
      reviewList.innerHTML = `<p class="personalization-muted">No hay reseñas del pedido para personalizar.</p>`;
      return;
    }

    reviewList.innerHTML = reviews.map((review, index) => `
      <details class="review-accordion" data-personalization-review="${index}">
        <summary>
          <span>Reseña ${index + 1}</span>
          <strong>${starLabel(review.stars)}</strong>
        </summary>
        <div class="review-accordion__body">
          <label>
            Contenido de la reseña
            <textarea data-review-text="${index}" rows="4" placeholder="Escribe el contenido de esta reseña.">${escapePersonalizationHtml(review.text)}</textarea>
          </label>
          <div class="review-stars" role="group" aria-label="Estrellas para la reseña ${index + 1}">
            ${[3, 4, 5].map((stars) => `
              <button class="review-star-chip ${review.stars === stars ? "is-active" : ""}" type="button" data-review-stars="${stars}" data-review-index="${index}" aria-pressed="${review.stars === stars}">
                <span>${starLabel(stars)}</span>
                <b>${stars}</b>
              </button>
            `).join("")}
          </div>
          <div class="review-photo-uploader" data-photo-dropzone="${index}">
            <div class="review-photo-uploader__head">
              <span class="review-photo-uploader__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false"><path d="M4.75 7.25a2.5 2.5 0 0 1 2.5-2.5h9.5a2.5 2.5 0 0 1 2.5 2.5v9.5a2.5 2.5 0 0 1-2.5 2.5h-9.5a2.5 2.5 0 0 1-2.5-2.5z" /><path d="m7.25 16.25 3.25-3.15a1.25 1.25 0 0 1 1.7-.02l2.02 1.87" /><path d="m13.35 14.15 1.05-1.05a1.25 1.25 0 0 1 1.76 0l2.65 2.65" /><path d="M8.65 8.7h.01" /></svg>
              </span>
              <div>
                <strong>Fotos de la reseña</strong>
                <span>${review.photos.length}/3 fotos · JPG, PNG o WebP · máx. 5 MB</span>
              </div>
            </div>
            <label class="review-photo-uploader__button ${review.photos.length >= 3 ? "is-disabled" : ""}" aria-disabled="${review.photos.length >= 3}">
              Subir fotos
              <input data-review-photos="${index}" type="file" accept="image/jpeg,image/png,image/webp" multiple ${review.photos.length >= 3 ? "disabled" : ""} />
            </label>
            ${review.error ? `<p class="review-photo-error">${escapePersonalizationHtml(review.error)}</p>` : ""}
            ${review.photos.length ? `
              <div class="review-photo-grid">
                ${review.photos.map((photo, photoIndex) => `
                  <figure class="review-photo-thumb">
                    <img src="${photo.url}" alt="${escapePersonalizationHtml(photo.name)}" />
                    <figcaption>${escapePersonalizationHtml(photo.name)}</figcaption>
                    <button type="button" data-remove-photo="${photoIndex}" data-review-index="${index}" aria-label="Eliminar foto ${escapePersonalizationHtml(photo.name)}">
                      <span class="review-photo-remove-icon" aria-hidden="true"></span>
                    </button>
                  </figure>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>
      </details>
    `).join("");
  };

  const validPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  const addReviewPhotos = (index, files) => {
    if (!reviews[index]) return;
    reviews[index].error = "";
    const incoming = [...files].filter((file) => validPhotoTypes.has(file.type));
    if (incoming.length !== files.length) {
      reviews[index].error = "Solo puedes subir fotos JPG, PNG o WebP.";
    }
    if (reviews[index].photos.length + incoming.length > 3) {
      reviews[index].error = "Puedes subir un máximo de 3 fotos por reseña.";
      renderReviews();
      const row = reviewList?.querySelector(`[data-personalization-review="${index}"]`);
      if (row) row.open = true;
      return;
    }
    incoming.forEach((file) => {
      reviews[index].photos.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      });
    });
    renderReviews();
    const row = reviewList?.querySelector(`[data-personalization-review="${index}"]`);
    if (row) row.open = true;
  };

  const validatePersonalization = () => {
    ensureReviews();
    const firstEmpty = reviews.findIndex((review) => !review.text.trim());
    if (firstEmpty >= 0) {
      setStatus("error", `Completa el contenido de la reseña ${firstEmpty + 1} antes de confirmar.`);
      const row = reviewList?.querySelector(`[data-personalization-review="${firstEmpty}"]`);
      if (row) row.open = true;
      return false;
    }
    return true;
  };

  reviewList?.addEventListener("input", (event) => {
    const textarea = event.target.closest("[data-review-text]");
    if (!textarea) return;
    const index = Number(textarea.dataset.reviewText);
    if (reviews[index]) reviews[index].text = textarea.value;
  });

  reviewList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-photo]");
    if (removeButton) {
      const index = Number(removeButton.dataset.reviewIndex);
      const photoIndex = Number(removeButton.dataset.removePhoto);
      const photo = reviews[index]?.photos?.[photoIndex];
      if (photo?.url) URL.revokeObjectURL(photo.url);
      reviews[index]?.photos?.splice(photoIndex, 1);
      if (reviews[index]) reviews[index].error = "";
      renderReviews();
      const row = reviewList.querySelector(`[data-personalization-review="${index}"]`);
      if (row) row.open = true;
      return;
    }

    const button = event.target.closest("[data-review-stars]");
    if (!button) return;
    const index = Number(button.dataset.reviewIndex);
    const stars = Number(button.dataset.reviewStars);
    if (!reviews[index] || ![3, 4, 5].includes(stars)) return;
    reviews[index].stars = stars;
    renderReviews();
    const row = reviewList.querySelector(`[data-personalization-review="${index}"]`);
    if (row) row.open = true;
  });

  reviewList?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-review-photos]");
    if (!input) return;
    addReviewPhotos(Number(input.dataset.reviewPhotos), input.files || []);
    input.value = "";
  });

  reviewList?.addEventListener("dragover", (event) => {
    const dropzone = event.target.closest("[data-photo-dropzone]");
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });

  reviewList?.addEventListener("dragleave", (event) => {
    const dropzone = event.target.closest("[data-photo-dropzone]");
    if (!dropzone || dropzone.contains(event.relatedTarget)) return;
    dropzone.classList.remove("is-dragging");
  });

  reviewList?.addEventListener("drop", (event) => {
    const dropzone = event.target.closest("[data-photo-dropzone]");
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
    addReviewPhotos(Number(dropzone.dataset.photoDropzone), event.dataTransfer?.files || []);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter?.closest("[data-personalization-submit]");
    if (!validatePersonalization()) return;
    setSubmitLoading(submit, true);
    setStatus("", "Guardando personalización...");

    const payload = {
      mode: "manual",
      cart,
      reviewTotal,
      googleMaps,
      estimatedTotal,
      manualReviews: reviews.map((review) => ({
        stars: review.stars,
        text: review.text.trim(),
        photos: review.photos.map((photo) => ({
          name: photo.name,
          size: photo.size,
          type: photo.type,
        })),
      })),
      confirmedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("destroyerPersonalizacion", JSON.stringify(payload));
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 0 : 420));
      setStatus("success", "Personalización confirmada correctamente.");
    } catch {
      setStatus("error", "No hemos podido guardar los datos ahora. Inténtalo de nuevo en unos segundos.");
    } finally {
      setSubmitLoading(submit, false);
    }
  });

  renderSummary();
  renderReviews();
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
      const card = button.closest(".auth-card, .trial-modal");
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

    form.addEventListener("submit", async (event) => {
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

      const authHandler = window.DestroyerAuth?.submitAuthForm;

      if (!authHandler) {
        submit.classList.remove("is-loading");
        submitText.textContent = mode === "login" ? "Iniciar sesión" : "Crear cuenta";
        status.textContent = "No se ha podido cargar la autenticación. Revisa tu conexión e inténtalo de nuevo.";
        status.className = "auth-status is-error";
        validate();
        return;
      }

      let result;
      try {
        result = await authHandler({ form, mode });
      } catch (error) {
        result = {
          ok: false,
          message: "No se ha podido completar la autenticación. Inténtalo de nuevo.",
        };
      }

      submit.classList.remove("is-loading");
      submitText.textContent = mode === "login" ? "Iniciar sesión" : "Crear cuenta";

      if (!result.ok) {
        validate();
        if (result.field) setError(result.field, result.message);
        status.textContent = result.message;
        status.className = "auth-status is-error";
        return;
      }

      status.textContent = result.message;
      status.className = "auth-status is-success";

      if (mode === "register") {
        form.reset();
        form.querySelectorAll("input").forEach((input) => input.dispatchEvent(new Event("change", { bubbles: true })));
        validate();
        return;
      }

      if (result.redirectTo) {
        window.setTimeout(() => {
          window.location.href = result.redirectTo;
        }, prefersReducedMotion ? 0 : 520);
      }
    });

    validate();
  });
};

const initLegacySessionNav = () => {
  const authContainers = [...document.querySelectorAll(".nav-auth, .mobile-menu")];
  if (!authContainers.length) return;

  const mainScriptUrl = document.querySelector('script[src$="main.js"]')?.src || `${window.location.origin}/js/main.js`;
  const indexUrl = new URL("../index.html", mainScriptUrl).href;
  const authLinks = [...document.querySelectorAll(".nav-login, .nav-register, .mobile-register, .mobile-menu a")]
    .filter((link) => {
      const href = link.getAttribute("href") || "";
      return link.matches(".nav-login, .nav-register, .mobile-register") || /(^|\/)(login|register)(\.html|\/)?$/.test(href);
    });

  const createLogoutButton = (variant) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `auth-logout-button auth-logout-button--${variant}`;
    button.setAttribute("aria-label", "Cerrar sesión");
    button.title = "Cerrar sesión";
    button.hidden = true;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M10.8 5.6H7.2a2 2 0 0 0-2 2v8.8a2 2 0 0 0 2 2h3.6" />
        <path d="M14.3 8.4 18 12l-3.7 3.6" />
        <path d="M17.7 12H10" />
      </svg>
    `;
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.classList.add("is-loading");
      const result = await window.DestroyerAuth?.signOut?.();
      button.classList.remove("is-loading");
      button.disabled = false;
      if (result?.ok === false) return;
      setResolvedSessionNavState(null);
      window.location.href = indexUrl;
    });
    return button;
  };

  const desktopLogout = createLogoutButton("desktop");
  const mobileLogout = createLogoutButton("mobile");
  document.querySelector(".nav-auth")?.appendChild(desktopLogout);
  document.querySelector(".mobile-menu")?.appendChild(mobileLogout);

  const renderSessionNavState = (session) => {
    const isLoggedIn = Boolean(session);
    authLinks.forEach((link) => {
      link.hidden = isLoggedIn;
      link.setAttribute("aria-hidden", String(isLoggedIn));
    });
    [desktopLogout, mobileLogout].forEach((button) => {
      button.hidden = !isLoggedIn;
    });
  };

  const setResolvedSessionNavState = (session) => {
    currentAuthSession = session;
    hasResolvedAuthSession = true;
    renderSessionNavState(session);
  };

  renderSessionNavState(currentAuthSession);

  getCurrentAuthSession()
    .then((session) => {
      setResolvedSessionNavState(session);
      return ensureAuthScripts();
    })
    .then((auth) => {
      auth?.onSessionChange?.(setResolvedSessionNavState);
    })
    .catch(() => {
      setResolvedSessionNavState(null);
    });
};

const initAccountSessionNav = () => {
  const authContainers = [...document.querySelectorAll(".nav-auth, .mobile-menu")];
  if (!authContainers.length) return;

  const mainScriptUrl = document.querySelector('script[src$="main.js"]')?.src || `${window.location.origin}/js/main.js`;
  const indexUrl = new URL("../index.html", mainScriptUrl).href;
  const profileUrl = new URL("../perfil.html", mainScriptUrl).href;
  const authLinks = [...document.querySelectorAll(".nav-login, .nav-register, .mobile-register, .mobile-menu a")]
    .filter((link) => {
      const href = link.getAttribute("href") || "";
      return link.matches(".nav-login, .nav-register, .mobile-register") || /(^|\/)(login|register)(\.html|\/)?$/.test(href);
    });
  const accountMenus = [];

  const getUserInitial = (session) => {
    const user = session?.user;
    const metadata = user?.user_metadata || {};
    const label = `${metadata.name || user?.email || "Cuenta"}`.trim();
    return (label[0] || "C").toUpperCase();
  };

  const closeAccountMenus = (except = null) => {
    accountMenus.forEach(({ wrapper, button, menu }) => {
      if (wrapper === except) return;
      wrapper.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    });
  };

  const signOutFromMenu = async (button) => {
    button.disabled = true;
    button.classList.add("is-loading");
    const result = await window.DestroyerAuth?.signOut?.();
    button.classList.remove("is-loading");
    button.disabled = false;
    if (result?.ok === false) return;
    setResolvedSessionNavState(null);
    window.location.href = indexUrl;
  };

  const createAccountMenu = (variant) => {
    const wrapper = document.createElement("div");
    const menuId = `account-menu-${variant}`;
    wrapper.className = `account-menu account-menu--${variant}`;
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <button class="account-menu__trigger" type="button" aria-label="Abrir menú de cuenta" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}">
        <span class="account-menu__avatar" data-account-initial>C</span>
        <span class="account-menu__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="m7 10 5 5 5-5" /></svg>
        </span>
      </button>
      <div class="account-menu__panel" id="${menuId}" role="menu" hidden>
        <a class="account-menu__item" href="${profileUrl}" role="menuitem">Perfil</a>
        <button class="account-menu__item account-menu__item--disabled" type="button" role="menuitem" aria-disabled="true" tabindex="-1">
          <span>Panel</span>
          <small>Próximamente</small>
        </button>
        <button class="account-menu__item account-menu__signout" type="button" role="menuitem">
          <span>Cerrar sesión</span>
        </button>
      </div>
    `;

    const button = wrapper.querySelector(".account-menu__trigger");
    const menu = wrapper.querySelector(".account-menu__panel");
    const signOutButton = wrapper.querySelector(".account-menu__signout");
    const initial = wrapper.querySelector("[data-account-initial]");

    button.addEventListener("click", () => {
      const willOpen = !wrapper.classList.contains("is-open");
      closeAccountMenus(wrapper);
      wrapper.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
      menu.hidden = !willOpen;
    });

    signOutButton.addEventListener("click", () => signOutFromMenu(signOutButton));

    const accountMenu = {
      wrapper,
      button,
      menu,
      setSession(session) {
        initial.textContent = getUserInitial(session);
      },
    };

    accountMenus.push(accountMenu);
    return wrapper;
  };

  const desktopAccount = createAccountMenu("desktop");
  const mobileAccount = createAccountMenu("mobile");
  document.querySelector(".nav-auth")?.appendChild(desktopAccount);
  document.querySelector(".mobile-menu")?.appendChild(mobileAccount);

  const renderSessionNavState = (session) => {
    const isLoggedIn = Boolean(session);
    authLinks.forEach((link) => {
      link.hidden = isLoggedIn;
      link.setAttribute("aria-hidden", String(isLoggedIn));
    });
    accountMenus.forEach(({ wrapper, setSession }) => {
      wrapper.hidden = !isLoggedIn;
      if (isLoggedIn) setSession(session);
    });
    if (!isLoggedIn) closeAccountMenus();
  };

  const setResolvedSessionNavState = (session) => {
    currentAuthSession = session;
    hasResolvedAuthSession = true;
    renderSessionNavState(session);
  };

  renderSessionNavState(currentAuthSession);

  getCurrentAuthSession()
    .then((session) => {
      setResolvedSessionNavState(session);
      return ensureAuthScripts();
    })
    .then((auth) => {
      auth?.onSessionChange?.(setResolvedSessionNavState);
    })
    .catch(() => {
      setResolvedSessionNavState(null);
    });

  document.addEventListener("click", (event) => {
    if (accountMenus.some(({ wrapper }) => wrapper.contains(event.target))) return;
    closeAccountMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeAccountMenus();
  });
};

const initForm = () => {
  const form = document.querySelector("[data-lead-form]");
  const formStatus = document.querySelector("[data-form-status]");
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitLabel = submitButton?.querySelector(".lead-submit-label") || submitButton;
  const defaultSubmitText = submitLabel?.textContent || "Pedir información";
  if (form) form.noValidate = true;

  const setLeadStatus = (message, state = "") => {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = state ? `form-status is-${state}` : "form-status";
  };

  const getLeadField = (name) => form?.querySelector(`[name="${name}"]`);

  const getFieldShell = (field) => field?.closest(".lead-field") || field?.closest(".lead-goal");

  const getErrorNode = (shell) => {
    if (!shell) return null;
    const className = shell.classList.contains("lead-goal") ? "lead-goal-error" : "lead-field-error";
    let error = shell.querySelector(`.${className}`);
    if (!error) {
      error = document.createElement("p");
      error.className = className;
      shell.appendChild(error);
    }
    return error;
  };

  const clearLeadErrors = () => {
    form?.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
    form?.querySelectorAll(".lead-field-error, .lead-goal-error").forEach((error) => {
      error.textContent = "";
    });
  };

  const setLeadError = (fieldOrShell, message) => {
    const shell = fieldOrShell?.matches?.(".lead-field, .lead-goal") ? fieldOrShell : getFieldShell(fieldOrShell);
    shell?.classList.add("is-invalid");
    const error = getErrorNode(shell);
    if (error) error.textContent = message;
  };

  const handleContactSubmit = async (payload) => {
    // Replace this simulated request with an API route, backend, email, CRM or webhook.
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return { ok: true, data: payload };
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    clearLeadErrors();
    setLeadStatus("");

    const formData = new FormData(form);
    const name = `${formData.get("name") || ""}`.trim();
    const email = `${formData.get("email") || ""}`.trim();
    const whatsapp = `${formData.get("whatsapp") || ""}`.trim();
    const goal = `${formData.get("goal") || ""}`.trim();
    const mapsUrl = `${formData.get("mapsUrl") || ""}`.trim();
    const message = `${formData.get("message") || ""}`.trim();
    let firstInvalidField = null;

    if (!name) {
      const field = getLeadField("name");
      setLeadError(field, "Indica tu nombre.");
      firstInvalidField ||= field;
    }

    if (email && !emailPattern.test(email)) {
      const field = getLeadField("email");
      setLeadError(field, "Introduce un email válido.");
      firstInvalidField ||= field;
    }

    if (!email && !whatsapp) {
      const emailField = getLeadField("email");
      const whatsappField = getLeadField("whatsapp");
      setLeadError(emailField, "Indica un email o WhatsApp.");
      setLeadError(whatsappField, "Indica un WhatsApp o email.");
      firstInvalidField ||= emailField;
    }

    if (!goal) {
      const goalShell = form.querySelector(".lead-goal");
      setLeadError(goalShell, "Elige sobre qué quieres información.");
      firstInvalidField ||= form.querySelector('[name="goal"]');
    }

    if (mapsUrl && !isGoogleMapsUrl(mapsUrl)) {
      const field = getLeadField("mapsUrl");
      setLeadError(field, "Pega un enlace válido de Google Maps.");
      firstInvalidField ||= field;
    }

    if (firstInvalidField) {
      setLeadStatus("Revisa los campos marcados para poder enviarlo.", "error");
      firstInvalidField.focus?.({ preventScroll: true });
      firstInvalidField.scrollIntoView?.({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      return;
    }

    setLeadStatus("Enviando tu mensaje...", "loading");
    if (submitButton) submitButton.disabled = true;
    submitButton?.classList.add("is-loading");
    if (submitLabel) submitLabel.textContent = "Enviando...";

    handleContactSubmit({ name, email, whatsapp, goal, mapsUrl, message })
      .then(() => {
        setLeadStatus("Hemos recibido tu mensaje. Te responderemos lo antes posible por WhatsApp o email.", "success");
        form.reset();
      })
      .catch(() => {
        setLeadStatus("No hemos podido enviar el mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.", "error");
      })
      .finally(() => {
        if (submitButton) submitButton.disabled = false;
        submitButton?.classList.remove("is-loading");
        if (submitLabel) submitLabel.textContent = defaultSubmitText;
      });
  });

  form?.addEventListener("input", (event) => {
    const shell = getFieldShell(event.target);
    shell?.classList.remove("is-invalid");
    const error = shell?.querySelector(".lead-field-error, .lead-goal-error");
    if (error) error.textContent = "";
  });

  form?.addEventListener("change", (event) => {
    const shell = getFieldShell(event.target);
    shell?.classList.remove("is-invalid");
    const error = shell?.querySelector(".lead-field-error, .lead-goal-error");
    if (error) error.textContent = "";
  });
};

const initPhoneTime = () => {
  const timeNodes = document.querySelectorAll("[data-phone-time]");
  if (!timeNodes.length) return;
  let phoneTimeTimer;

  const formatTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat("es-ES", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  };

  const updateTime = () => {
    const time = formatTime();
    timeNodes.forEach((node) => {
      node.textContent = time;
    });
  };

  const scheduleNextMinute = () => {
    window.clearTimeout(phoneTimeTimer);
    const now = new Date();
    const msUntilNextMinute = ((60 - now.getSeconds()) * 1000) - now.getMilliseconds() + 80;
    phoneTimeTimer = window.setTimeout(() => {
      updateTime();
      scheduleNextMinute();
    }, Math.max(msUntilNextMinute, 1000));
  };

  updateTime();
  scheduleNextMinute();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateTime();
      scheduleNextMinute();
    }
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
  initFreeTrialModal();
  initCart();
  initCheckout();
  initPersonalizacion();
  if (hasHomeContent) {
    initHeroRotatingWord();
    initPhoneTime();
    initReveals();
    initCounters();
    initSocialMetrics();
    initMicroInteractions();
    initAnimationVisibility();
    initTestimonialMarqueeSpeed();
    initMotionVisibility();
    initPlanSwitch();
    initPricingReveal();
    initProcessTimeline();
    initWhatsappFloat();
  }
  initAuthForms();
  initAccountSessionNav();
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
    if (canRunScrollMotion()) requestScrollMotion();
    else resetScrollMotion();
    requestAuthMotion();
    requestProcessTimeline();
  }, { passive: true });

  window.addEventListener("load", () => {
    refreshNavSectionPositions();
    requestScrollState();
    requestProcessTimeline();
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
