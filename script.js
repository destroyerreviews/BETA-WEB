const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const scrollMeter = document.querySelector(".scroll-meter");
const loader = document.querySelector("[data-loader]");
const loaderCount = document.querySelector("[data-loader-count]");
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const motionPanels = [...document.querySelectorAll("[data-motion-panel]")];
const depthLayers = [...document.querySelectorAll("[data-depth]")];
const proofCards = [...document.querySelectorAll(".proof-card")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ── Sliding pill indicator for active nav link ── */
let lastScrollY = 0;
let headerHidden = false;
const SCROLL_THRESHOLD = 8;

const updateNavPill = () => {
  if (!nav) return;
  const activeLink = nav.querySelector(".is-active");
  if (activeLink) {
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const left = linkRect.left - navRect.left;
    const width = linkRect.width;
    nav.style.setProperty("--pill-left", `${left}px`);
    nav.style.setProperty("--pill-width", `${width}px`);
  } else {
    nav.style.setProperty("--pill-width", "0px");
  }
};

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

  /* Auto-hide header on scroll down, show on scroll up */
  if (header && currentScrollY > 200) {
    const delta = currentScrollY - lastScrollY;
    if (delta > SCROLL_THRESHOLD && !headerHidden) {
      header.style.transform = "translateY(-130%)";
      header.style.transition = "top 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
      headerHidden = true;
    } else if (delta < -SCROLL_THRESHOLD && headerHidden) {
      header.style.transform = "translateY(0)";
      headerHidden = false;
    }
  } else if (header && headerHidden) {
    header.style.transform = "translateY(0)";
    headerHidden = false;
  }
  lastScrollY = currentScrollY;

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (currentScrollY / scrollable) * 100 : 0;
  if (scrollMeter) scrollMeter.style.width = `${progress}%`;

  const activeSection = navSections
    .slice()
    .reverse()
    .find((section) => currentScrollY + 220 >= section.offsetTop);

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", activeSection && link.getAttribute("href") === `#${activeSection.id}`);
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
  initReveals();
  initCounters();
  initMicroInteractions();
  initPlanSwitch();
  initPricingReveal();
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
