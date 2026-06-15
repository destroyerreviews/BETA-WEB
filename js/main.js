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
    if (event.key === "Escape" && drawer.classList.contains("is-open")) closeCart();
  });

  readCart();
  renderCart();
};

const initCheckout = () => {
  const root = document.querySelector("[data-checkout-page]");
  if (!root) return;

  const form = root.querySelector("[data-checkout-form]");
  const shell = root.querySelector("[data-checkout-shell]");
  const empty = root.querySelector("[data-checkout-empty]");
  const summaryItems = root.querySelector("[data-checkout-summary-items]");
  const totalNode = root.querySelector("[data-checkout-total]");
  const totalInlineNode = root.querySelector("[data-checkout-total-inline]");
  const submitButton = root.querySelector("[data-payment-submit]");
  const statusNode = root.querySelector("[data-checkout-status]");

  const escapeCheckoutHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);

  const itemQuantity = (item) => Math.max(1, Number(item.quantity) || 1);
  const cartItems = () => readStoredCart();
  const cartTotal = (items) => items.reduce((total, item) => total + (Number(item.price) || 0) * itemQuantity(item), 0);
  const packIcon = (item) => {
    const id = item.id || "";
    const safeId = ["ambar", "amatista", "diamante", "rubi"].includes(id) ? id : "diamante";
    return sitePath(`assets/icons/packs/${safeId}.webp`);
  };

  const setStatus = (type, message) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = type || "";
  };

  const renderSummary = () => {
    const items = cartItems();
    const hasItems = items.length > 0;
    const total = cartTotal(items);

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
              <div><dt>Unitario</dt><dd>${formatCartPrice(price)}</dd></div>
              <div><dt>Subtotal</dt><dd>${formatCartPrice(subtotal)}</dd></div>
            </dl>
          </article>
        `;
      }).join("");
    }

    if (totalNode) totalNode.textContent = formatCartPrice(total);
    if (totalInlineNode) totalInlineNode.textContent = formatCartPrice(total);
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
    return isValid;
  };

  const collectCheckoutData = () => {
    const formData = new FormData(form);
    const cart = cartItems();
    return {
      customer: Object.fromEntries(formData.entries()),
      cart,
      total: cartTotal(cart),
      nextStep: sitePath("checkout/personalizacion/"),
    };
  };

  const handlePaymentSubmit = async (checkoutData) => {
    // Ready to replace with the real provider handoff when the gateway is connected.
    sessionStorage.setItem("destroyerCheckoutDraft", JSON.stringify(checkoutData));
    await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 0 : 420));
    return { ok: true, redirectUrl: checkoutData.nextStep };
  };

  form?.addEventListener("input", (event) => {
    const field = event.target.closest("input, textarea");
    if (field) setFieldError(field, "");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "");

    if (!cartItems().length) {
      setStatus("error", "Tu carrito está vacío. Elige un pack antes de pagar.");
      renderSummary();
      return;
    }

    if (!validateCheckout()) {
      setStatus("error", "Revisa los campos marcados antes de continuar.");
      return;
    }

    submitButton?.classList.add("is-loading");
    if (submitButton) submitButton.disabled = true;
    setStatus("", "Preparando el pago...");

    try {
      const payment = await handlePaymentSubmit(collectCheckoutData());
      window.location.href = payment.redirectUrl || sitePath("checkout/personalizacion/");
    } catch {
      setStatus("error", "No hemos podido continuar ahora. Inténtalo de nuevo en unos segundos.");
      submitButton?.classList.remove("is-loading");
      if (submitButton) submitButton.disabled = false;
    }
  });

  window.addEventListener("destroyer:cart-updated", renderSummary);
  window.addEventListener("storage", (event) => {
    if (event.key === cartStorageKey) renderSummary();
  });

  renderSummary();
};

const initPersonalizacion = () => {
  const root = document.querySelector("[data-personalizacion-page]");
  if (!root) return;

  const modeButtons = [...root.querySelectorAll("[data-personalization-mode]")];
  const manualPanel = root.querySelector("[data-manual-panel]");
  const teamPanel = root.querySelector("[data-team-panel]");
  const reviewList = root.querySelector("[data-personalization-review-list]");
  const form = root.querySelector("[data-personalization-form]");
  const statusNodes = [...root.querySelectorAll("[data-personalization-status]")];
  const reviewTotalNodes = [...root.querySelectorAll("[data-personalization-review-total], [data-personalization-summary-reviews]")];
  const paidTotalNodes = [...root.querySelectorAll("[data-personalization-paid-total], [data-personalization-summary-total]")];
  const summaryItems = root.querySelector("[data-personalization-summary-items]");
  const mapsLink = root.querySelector("[data-personalization-maps]");
  const noMapsNode = root.querySelector("[data-personalization-no-maps]");
  const extraBreakdown = root.querySelector("[data-extra-breakdown]");
  const extraTotal = root.querySelector("[data-extra-total]");
  const summaryExtraLabel = root.querySelector("[data-personalization-summary-extra-label]");
  const summaryExtra = root.querySelector("[data-personalization-summary-extra]");
  const summaryExtraTotalRow = root.querySelector("[data-personalization-summary-extra-total]");
  const summaryExtraTotalValue = root.querySelector("[data-personalization-summary-extra-total-value]");
  const teamStarButtons = [...root.querySelectorAll("[data-team-stars]")];
  let mode = "team";
  let teamStars = 5;
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
  const cart = Array.isArray(draft.cart) && draft.cart.length ? draft.cart : readStoredCart();
  const paidTotal = Number(draft.total ?? cart.reduce((total, item) => total + (Number(item.price) || 0) * itemQuantity(item), 0));
  const reviewTotal = cart.reduce((total, item) => total + itemUnitReviews(item) * itemQuantity(item), 0);
  const customer = draft.customer || {};
  const googleMaps = `${customer.googleMaps || customer.mapsUrl || ""}`.trim();
  const manualExtraCost = reviewTotal;

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
    reviews = Array.from({ length: reviewTotal }, (_, index) => reviews[index] || { stars: 5, text: "" });
  };

  const renderSummary = () => {
    reviewTotalNodes.forEach((node) => {
      node.textContent = String(reviewTotal);
    });
    paidTotalNodes.forEach((node) => {
      node.textContent = formatCartPrice(paidTotal);
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
              <div><dt>Unitario</dt><dd>${formatCartPrice(price)}</dd></div>
              <div><dt>Subtotal</dt><dd>${formatCartPrice(subtotal)}</dd></div>
            </dl>
          </article>
        `;
      }).join("") : `<p class="personalization-muted">No hay packs guardados en esta sesión.</p>`;
    }

    if (extraBreakdown) extraBreakdown.textContent = `${reviewTotal} ${reviewTotal === 1 ? "reseña" : "reseñas"} x 1 €`;
    if (extraTotal) extraTotal.textContent = `Total adicional: ${formatCartPrice(manualExtraCost)}`;
  };

  const renderReviews = () => {
    if (!reviewList) return;
    ensureReviews();
    if (!reviews.length) {
      reviewList.innerHTML = `<p class="personalization-muted">No hay reseñas compradas para personalizar.</p>`;
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
            Texto de la reseña
            <textarea data-review-text="${index}" rows="4" placeholder="Escribe el texto de esta reseña o una orientación clara.">${escapePersonalizationHtml(review.text)}</textarea>
          </label>
          <div class="review-stars" role="group" aria-label="Estrellas para la reseña ${index + 1}">
            ${[3, 4, 5].map((stars) => `
              <button class="review-star-chip ${review.stars === stars ? "is-active" : ""}" type="button" data-review-stars="${stars}" data-review-index="${index}" aria-pressed="${review.stars === stars}">
                <span>${starLabel(stars)}</span>
                <b>${stars}</b>
              </button>
            `).join("")}
          </div>
        </div>
      </details>
    `).join("");
  };

  const renderMode = () => {
    modeButtons.forEach((button) => {
      const isActive = button.dataset.personalizationMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    const isManual = mode === "manual";
    if (manualPanel) manualPanel.hidden = !isManual;
    if (teamPanel) teamPanel.hidden = isManual;
    if (summaryExtraLabel) summaryExtraLabel.textContent = isManual ? "Personalización manual" : "Textos preparados por el equipo";
    if (summaryExtra) summaryExtra.textContent = isManual ? `${reviewTotal} ${reviewTotal === 1 ? "reseña" : "reseñas"} x 1 €` : "Incluido";
    if (summaryExtraTotalRow) summaryExtraTotalRow.hidden = !isManual;
    if (summaryExtraTotalValue) summaryExtraTotalValue.textContent = formatCartPrice(manualExtraCost);
    setStatus("", "");
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.personalizationMode || "manual";
      renderMode();
    });
  });

  teamStarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      teamStars = Number(button.dataset.teamStars) || 5;
      teamStarButtons.forEach((starButton) => {
        const isActive = Number(starButton.dataset.teamStars) === teamStars;
        starButton.classList.toggle("is-active", isActive);
        starButton.setAttribute("aria-pressed", String(isActive));
      });
    });
  });

  reviewList?.addEventListener("input", (event) => {
    const textarea = event.target.closest("[data-review-text]");
    if (!textarea) return;
    const index = Number(textarea.dataset.reviewText);
    if (reviews[index]) reviews[index].text = textarea.value;
  });

  reviewList?.addEventListener("click", (event) => {
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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter?.closest("[data-personalization-submit]");
    const selectedMode = submit?.dataset.personalizationSubmit || mode;
    setSubmitLoading(submit, true);
    setStatus("", selectedMode === "manual" ? "Preparando el pago adicional..." : "Guardando datos...");

    const formData = new FormData(form);
    const payload = {
      mode: selectedMode,
      cart,
      reviewTotal,
      googleMaps,
      manualReviews: selectedMode === "manual" ? reviews : [],
      teamPreparation: selectedMode === "team" ? {
        instructions: `${formData.get("teamInstructions") || ""}`.trim(),
        services: `${formData.get("services") || ""}`.trim(),
        tone: `${formData.get("tone") || ""}`.trim(),
        avoid: `${formData.get("avoid") || ""}`.trim(),
        stars: teamStars,
      } : null,
      extraCost: selectedMode === "manual" ? manualExtraCost : 0,
    };

    try {
      sessionStorage.setItem("destroyerPersonalizacion", JSON.stringify(payload));
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 0 : 420));
      setStatus("success", selectedMode === "manual" ? "Pago adicional preparado. Te contactaremos para finalizarlo." : "Datos confirmados. Hemos guardado tus indicaciones.");
    } catch {
      setStatus("error", "No hemos podido guardar los datos ahora. Inténtalo de nuevo en unos segundos.");
    } finally {
      setSubmitLoading(submit, false);
    }
  });

  renderSummary();
  renderReviews();
  renderMode();
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
  initTrialModal();
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
