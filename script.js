const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const scrollMeter = document.querySelector(".scroll-meter");
const cursorAura = document.querySelector("[data-cursor-aura]");
const loader = document.querySelector("[data-loader]");
const loaderCount = document.querySelector("[data-loader-count]");
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const motionPanels = [...document.querySelectorAll("[data-motion-panel]")];
const depthLayers = [...document.querySelectorAll("[data-depth]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const bootLoader = () => {
  const skipLoader = window.location.search.includes("skipLoader");

  if (!loader || !loaderCount || prefersReducedMotion || skipLoader) {
    loader?.classList.add("is-done");
    document.body.classList.add("is-ready");
    return;
  }

  const finish = () => {
    loaderCount.textContent = "100";
    loader.style.setProperty("--loader-progress", "100%");
    loader.classList.add("is-done");
    document.body.classList.add("is-ready");
  };

  const duration = 980;
  const startedAt = performance.now();
  const fallback = window.setTimeout(finish, 1600);

  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * 100);

    loaderCount.textContent = value.toString();
    loader.style.setProperty("--loader-progress", `${value}%`);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    window.clearTimeout(fallback);
    window.setTimeout(() => {
      finish();
    }, 170);
  };

  requestAnimationFrame(tick);
};

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 20);

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (scrollMeter) scrollMeter.style.width = `${progress}%`;

  const activeSection = navSections
    .slice()
    .reverse()
    .find((section) => window.scrollY + 220 >= section.offsetTop);

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", activeSection && link.getAttribute("href") === `#${activeSection.id}`);
  });
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();
bootLoader();

navToggle?.addEventListener("click", () => {
  const isOpen = header.classList.toggle("is-open");
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
});

nav?.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    header.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;

    event.preventDefault();
    header?.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Abrir menú");

    const headerOffset = target.id === "contacto" ? 0 : (header?.offsetHeight || 76) + 26;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });

    history.pushState(null, "", link.getAttribute("href"));
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -70px 0px" }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  revealObserver.observe(element);
});

const animateCounter = (element) => {
  const target = Number(element.dataset.counter);
  const hasDecimal = element.dataset.decimal === "true";
  const duration = 1250;
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

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll("[data-counter]").forEach((counter) => counterObserver.observe(counter));

document.querySelectorAll(".hover-glow").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--y", `${event.clientY - rect.top}px`);
  });
});

document.querySelectorAll("[data-tilt]").forEach((tilt) => {
  if (prefersReducedMotion) return;

  tilt.addEventListener("pointermove", (event) => {
    const rect = tilt.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tilt.style.transform = `perspective(1100px) rotateX(${y * -4}deg) rotateY(${x * 6}deg) translateY(-2px)`;
  });

  tilt.addEventListener("pointerleave", () => {
    tilt.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0)";
  });
});

document.querySelectorAll(".magnetic").forEach((button) => {
  if (prefersReducedMotion) return;

  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    button.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
  });

  button.addEventListener("pointerleave", () => {
    button.style.transform = "";
  });
});

if (cursorAura && !prefersReducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorAura.style.opacity = "1";
      cursorAura.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    },
    { passive: true }
  );
}

document.querySelectorAll("[data-scan-map]").forEach((map) => {
  const cells = [...map.querySelectorAll("span")];
  cells.forEach((cell, index) => cell.style.setProperty("--cell-index", index));

  if (!prefersReducedMotion) {
    window.setInterval(() => {
      map.classList.add("is-scanning");
      window.setTimeout(() => map.classList.remove("is-scanning"), 820);
    }, 2800);
  }
});

const proofCards = [...document.querySelectorAll(".proof-card")];
let motionFrame = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateScrollMotion = () => {
  motionFrame = null;
  if (prefersReducedMotion) return;

  depthLayers.forEach((layer) => {
    const speed = Number(layer.dataset.depth || 0.03);
    layer.style.setProperty("--depth-y", `${window.scrollY * speed}px`);
  });

  motionPanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = (center - window.innerHeight / 2) / window.innerHeight;
    panel.style.setProperty("--motion-y", `${clamp(distance * -42, -34, 34)}px`);
  });

  proofCards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
    const offset = (0.5 - progress) * (index === 0 ? 30 : 46);
    card.style.setProperty("--proof-y", `${offset}px`);
  });
};

const requestScrollMotion = () => {
  if (motionFrame || prefersReducedMotion) return;
  motionFrame = requestAnimationFrame(updateScrollMotion);
};

window.addEventListener("scroll", requestScrollMotion, { passive: true });
window.addEventListener("resize", requestScrollMotion);
updateScrollMotion();

const parallaxItems = [...document.querySelectorAll("[data-parallax]")];

const updateParallax = () => {
  if (prefersReducedMotion) return;

  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.speed || 0.05);
    const rect = item.getBoundingClientRect();
    const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
    item.style.transform = `translate3d(0, ${centerOffset * speed}px, 0)`;
  });
};

window.addEventListener("scroll", updateParallax, { passive: true });
window.addEventListener("resize", updateParallax);
updateParallax();

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

document.querySelectorAll("[data-faq] .faq-item").forEach((item) => {
  const button = item.querySelector("button");
  const panel = item.querySelector(".faq-panel");

  const sync = () => {
    panel.style.maxHeight = item.classList.contains("is-open") ? `${panel.scrollHeight}px` : "0px";
  };

  button.addEventListener("click", () => {
    const isOpening = !item.classList.contains("is-open");

    document.querySelectorAll("[data-faq] .faq-item").forEach((other) => {
      other.classList.remove("is-open");
      other.querySelector("button").setAttribute("aria-expanded", "false");
      other.querySelector(".faq-panel").style.maxHeight = "0px";
    });

    item.classList.toggle("is-open", isOpening);
    button.setAttribute("aria-expanded", String(isOpening));
    sync();
  });

  sync();
});

const form = document.querySelector("[data-lead-form]");
const formStatus = document.querySelector("[data-form-status]");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.textContent = "Solicitud preparada. El formulario ya está listo para conectarse a tu CRM o email.";
  form.reset();
});
