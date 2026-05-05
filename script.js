/* =========================================================================
   Destroyer Reviews — Awwwards-tier interaction layer
   -------------------------------------------------------------------------
   - Lenis: inertial smooth scrolling, momentum + friction
   - GSAP + ScrollTrigger: title splitter, on-scroll reveals, parallax,
     pinned columns, scroll-velocity marquee
   - Custom cursor (dot + lerped ring + state label)
   - Magnetic buttons with elastic release
   - Hover-reveal floating image with inertia
   - SVG displacement filter (driven by JS) for the WebGL-feel hover
   - Curtain-style preloader exit
   - Respects prefers-reduced-motion and falls back gracefully if any
     external library fails to load.
   ========================================================================= */

(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  // ---- Element references --------------------------------------------------
  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const scrollMeter = document.querySelector(".scroll-meter");
  const loader = document.querySelector("[data-loader]");
  const loaderCount = document.querySelector("[data-loader-count]");
  const cursor = document.querySelector("[data-cursor]");
  const cursorRing = document.querySelector("[data-cursor-ring]");
  const cursorDot = document.querySelector("[data-cursor-dot]");
  const cursorLabel = document.querySelector("[data-cursor-label]");
  const hoverReveal = document.querySelector("[data-hover-reveal]");
  const hoverRevealInner = document.querySelector("[data-hover-reveal-inner]");
  const distortMap = document.querySelector("[data-distort-map]");

  const navLinks = [...document.querySelectorAll("[data-nav-link]")];
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  // ---- Library availability ------------------------------------------------
  const hasGsap = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }
  if (!hasGsap) {
    document.documentElement.classList.add("no-gsap");
  }

  // =========================================================================
  // 1) Preloader — progress counter then curtain split
  // =========================================================================
  const bootLoader = () => {
    const skipLoader = window.location.search.includes("skipLoader");

    const finish = () => {
      if (!loader) {
        document.body.classList.add("is-ready");
        return;
      }
      loader.classList.add("is-leaving");
      // Wait for the longest curtain transition (1100ms) before hiding.
      window.setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.add("is-ready");
        // Kick GSAP/ScrollTrigger refresh after layout settles.
        if (hasScrollTrigger) ScrollTrigger.refresh();
        playHeroIntro();
      }, 1100);
    };

    if (!loader || !loaderCount || prefersReducedMotion || skipLoader) {
      loader?.classList.add("is-done");
      document.body.classList.add("is-ready");
      playHeroIntro();
      return;
    }

    const duration = 1100;
    const startedAt = performance.now();
    const fallback = window.setTimeout(finish, 1900);

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      // Non-linear easing — accelerates then settles for a "real load" feel.
      const eased = 1 - Math.pow(1 - progress, 2.4);
      const value = Math.round(eased * 100);
      loaderCount.textContent = value.toString();
      loader.style.setProperty("--loader-progress", `${value}%`);

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      window.clearTimeout(fallback);
      window.setTimeout(finish, 200);
    };
    requestAnimationFrame(tick);
  };

  // =========================================================================
  // 2) Lenis smooth scroll, wired into GSAP's ticker
  // =========================================================================
  let lenis = null;
  if (hasLenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exp-out
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    if (hasScrollTrigger) {
      // Drive ScrollTrigger from Lenis' scroll position so pinning + reveals
      // stay perfectly synchronized with the smoothed scroll value.
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  // =========================================================================
  // 3) Header state, scroll meter, active nav highlighting
  // =========================================================================
  const setHeaderState = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 20);

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (y / scrollable) * 100 : 0;
    if (scrollMeter) scrollMeter.style.width = `${progress}%`;

    const activeSection = navSections
      .slice()
      .reverse()
      .find((section) => y + 220 >= section.offsetTop);

    navLinks.forEach((link) => {
      link.classList.toggle(
        "is-active",
        activeSection && link.getAttribute("href") === `#${activeSection.id}`
      );
    });
  };
  window.addEventListener("scroll", setHeaderState, { passive: true });
  setHeaderState();

  // =========================================================================
  // 4) Smooth anchor scrolling — uses Lenis when available
  // =========================================================================
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();
      header?.classList.remove("is-open");
      navToggle?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
      navToggle?.setAttribute("aria-label", "Abrir menú");

      const headerOffset =
        target.id === "contacto" ? 0 : (header?.offsetHeight || 76) + 26;

      if (lenis) {
        lenis.scrollTo(target, { offset: -headerOffset, duration: 1.4 });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
      history.pushState(null, "", link.getAttribute("href"));
    });
  });

  // =========================================================================
  // 5) Mobile nav toggle
  // =========================================================================
  navToggle?.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  });

  // =========================================================================
  // 6) Hero title splitter + intro timeline
  //    (No paid SplitText needed — we split into words manually and clip
  //    each line with overflow:hidden on the parent <span>.)
  // =========================================================================
  const splitTitle = (el) => {
    const lines = [...el.querySelectorAll(":scope > span")];
    lines.forEach((line) => {
      const text = line.textContent.trim();
      const words = text.split(/\s+/);
      line.innerHTML = words
        .map((w) => `<span class="word"><span class="word-inner">${w}</span></span>`)
        .join(" ");
    });
    return [...el.querySelectorAll(".word")];
  };

  const titleEls = document.querySelectorAll("[data-split-lines]");
  const titleWords = [...titleEls].flatMap(splitTitle);

  const playHeroIntro = () => {
    if (!hasGsap || prefersReducedMotion) {
      titleWords.forEach((w) => (w.style.transform = "translateY(0)"));
      return;
    }
    // Lock starting state first, then run the timeline.
    gsap.set(titleWords, { yPercent: 110 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(titleWords, {
      yPercent: 0,
      duration: 1.05,
      stagger: 0.06,
    }).from(
      [".hero-lead", ".hero-actions", ".hero-product", ".hero-stat", ".scroll-label"],
      { y: 32, opacity: 0, duration: 0.9, stagger: 0.07 },
      "-=0.7"
    );
  };

  // =========================================================================
  // 7) Generic scroll-triggered reveals (replaces IntersectionObserver)
  // =========================================================================
  const setupReveals = () => {
    if (!hasScrollTrigger || prefersReducedMotion) {
      // Fallback: just show everything.
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }

    document.querySelectorAll(".reveal").forEach((el) => {
      // Hero reveals are handled by the intro timeline above.
      if (el.closest(".hero")) {
        el.classList.add("is-visible");
        return;
      }

      gsap.fromTo(
        el,
        { y: 40, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
            onEnter: () => el.classList.add("is-visible"),
          },
        }
      );
    });

    // Stagger groups: when several siblings have .reveal, batch them.
    ScrollTrigger.batch(".pricing-grid .reveal, .method-cards .reveal, .service-list .reveal", {
      start: "top 90%",
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.95,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true,
        }),
    });
  };

  // =========================================================================
  // 8) Counter animations (driven by ScrollTrigger if available)
  // =========================================================================
  const animateCounter = (element) => {
    const target = Number(element.dataset.counter);
    const hasDecimal = element.dataset.decimal === "true";
    const obj = { v: 0 };

    if (hasGsap) {
      gsap.to(obj, {
        v: target,
        duration: 1.4,
        ease: "power3.out",
        onUpdate: () => {
          element.textContent = hasDecimal ? obj.v.toFixed(1) : Math.round(obj.v).toString();
        },
      });
      return;
    }

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
  document.querySelectorAll("[data-counter]").forEach((c) => counterObserver.observe(c));

  // =========================================================================
  // 9) Custom cursor with lerped ring + state machine
  // =========================================================================
  const cursorState = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    rx: window.innerWidth / 2,
    ry: window.innerHeight / 2,
  };

  const initCursor = () => {
    if (!cursor || prefersReducedMotion || isCoarsePointer) {
      cursor?.remove();
      hoverReveal?.remove();
      return;
    }

    cursor.classList.add("is-ready");

    window.addEventListener(
      "pointermove",
      (event) => {
        cursorState.x = event.clientX;
        cursorState.y = event.clientY;
      },
      { passive: true }
    );

    window.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));

    // Single rAF loop drives both cursor and hover-reveal positions.
    const tick = () => {
      // Lerp ring (inertia), dot follows raw input.
      cursorState.rx += (cursorState.x - cursorState.rx) * 0.18;
      cursorState.ry += (cursorState.y - cursorState.ry) * 0.18;
      cursorRing.style.transform = `translate3d(${cursorState.rx}px, ${cursorState.ry}px, 0) translate(-50%, -50%)`;
      cursorDot.style.transform = `translate3d(${cursorState.x}px, ${cursorState.y}px, 0) translate(-50%, -50%)`;

      // Hover reveal lerp (gentler).
      if (hoverReveal && hoverReveal.classList.contains("is-active")) {
        revealState.x += (cursorState.x - revealState.x) * 0.12;
        revealState.y += (cursorState.y - revealState.y) * 0.12;
        hoverReveal.style.transform = `translate3d(${revealState.x}px, ${revealState.y}px, 0) translate(-50%, -50%) scale(1)`;
      } else if (hoverReveal) {
        revealState.x = cursorState.x;
        revealState.y = cursorState.y;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Cursor states by hovered element.
    const setLink = () => cursor.classList.add("is-link");
    const clearLink = () => cursor.classList.remove("is-link");
    document
      .querySelectorAll("a, button, [role='button'], .magnetic, input, label")
      .forEach((el) => {
        el.addEventListener("pointerenter", setLink);
        el.addEventListener("pointerleave", clearLink);
      });
  };

  // =========================================================================
  // 10) Hover-reveal floating image (services)
  // =========================================================================
  const revealState = { x: 0, y: 0 };

  const initHoverReveal = () => {
    if (!hoverReveal || !hoverRevealInner || prefersReducedMotion || isCoarsePointer) return;

    document.querySelectorAll("[data-reveal-image]").forEach((el) => {
      const src = el.dataset.revealImage;
      const label = el.dataset.revealLabel || "";
      // Preload to avoid the first hover flicker.
      const img = new Image();
      img.src = src;

      el.addEventListener("pointerenter", () => {
        hoverRevealInner.style.backgroundImage = `url("${src}")`;
        hoverReveal.classList.add("is-active");
        if (cursor && label) {
          cursor.classList.add("is-project");
          cursorLabel.textContent = label;
        }
      });
      el.addEventListener("pointerleave", () => {
        hoverReveal.classList.remove("is-active");
        if (cursor) {
          cursor.classList.remove("is-project");
          cursorLabel.textContent = "";
        }
      });
    });
  };

  // =========================================================================
  // 11) Magnetic buttons — elastic release using GSAP if available
  // =========================================================================
  const initMagnetic = () => {
    if (prefersReducedMotion || isCoarsePointer) return;

    document.querySelectorAll(".magnetic").forEach((button) => {
      const strength = button.classList.contains("button-primary") ? 0.22 : 0.16;

      const move = (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * strength;
        const y = (event.clientY - rect.top - rect.height / 2) * strength * 1.1;
        if (hasGsap) {
          gsap.to(button, { x, y, duration: 0.5, ease: "power3.out" });
        } else {
          button.style.transform = `translate(${x}px, ${y}px)`;
        }
      };
      const reset = () => {
        if (hasGsap) {
          gsap.to(button, { x: 0, y: 0, duration: 1.1, ease: "elastic.out(1, 0.4)" });
        } else {
          button.style.transform = "";
        }
      };

      button.addEventListener("pointermove", move);
      button.addEventListener("pointerleave", reset);
    });
  };

  // =========================================================================
  // 12) Tilt panels (kept from the original)
  // =========================================================================
  document.querySelectorAll("[data-tilt]").forEach((tilt) => {
    if (prefersReducedMotion || isCoarsePointer) return;
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

  // =========================================================================
  // 13) Hover-glow spotlights (kept from the original)
  // =========================================================================
  document.querySelectorAll(".hover-glow").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--y", `${event.clientY - rect.top}px`);
    });
  });

  // =========================================================================
  // 14) Scan-map idle pulse (kept)
  // =========================================================================
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

  // =========================================================================
  // 15) WebGL-feel: SVG displacement on proof image hover
  //     (Real WebGL would need a canvas per image; this gives the same
  //     liquid feel via feDisplacementMap with no GPU shader cost.)
  // =========================================================================
  const initDistortion = () => {
    if (!distortMap || prefersReducedMotion) return;

    const proofCards = document.querySelectorAll(".proof-card");
    proofCards.forEach((card) => {
      let raf = null;
      let target = 0;
      let current = 0;

      const animate = () => {
        current += (target - current) * 0.12;
        distortMap.setAttribute("scale", current.toFixed(2));
        if (Math.abs(target - current) > 0.05) {
          raf = requestAnimationFrame(animate);
        } else {
          distortMap.setAttribute("scale", target.toFixed(2));
          raf = null;
        }
      };
      const enter = () => {
        card.classList.add("is-distorting");
        target = 28;
        if (!raf) raf = requestAnimationFrame(animate);
      };
      const leave = () => {
        target = 0;
        if (!raf) raf = requestAnimationFrame(animate);
        // Remove the filter only after the animation settles, otherwise
        // the snap from filtered → unfiltered is jarring.
        window.setTimeout(() => {
          if (target === 0) card.classList.remove("is-distorting");
        }, 600);
      };

      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointerleave", leave);
    });
  };

  // =========================================================================
  // 16) Parallax depth layers + motion panels (Lenis/GSAP-aware)
  // =========================================================================
  const initParallax = () => {
    if (prefersReducedMotion) return;

    if (hasScrollTrigger) {
      // Hero grid: subtle drift.
      gsap.to(".hero-grid", {
        y: 90,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
      });

      // Hero product card: floats opposite to scroll for parallax.
      gsap.to(".hero-product", {
        y: -50,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 },
      });

      // Proof gallery: layered depth between the main card and small cards.
      gsap.to(".proof-main", {
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: ".field-proof", start: "top bottom", end: "bottom top", scrub: 1 },
      });
      gsap.utils.toArray(".proof-card:not(.proof-main)").forEach((card, i) => {
        gsap.to(card, {
          y: i === 0 ? 30 : -22,
          ease: "none",
          scrollTrigger: { trigger: ".field-proof", start: "top bottom", end: "bottom top", scrub: 1 },
        });
      });
      return;
    }

    // Fallback: rAF-driven parallax (matches original behavior).
    const depthLayers = [...document.querySelectorAll("[data-depth]")];
    const motionPanels = [...document.querySelectorAll("[data-motion-panel]")];
    let frame = null;
    const update = () => {
      frame = null;
      depthLayers.forEach((layer) => {
        const speed = Number(layer.dataset.depth || 0.03);
        layer.style.setProperty("--depth-y", `${window.scrollY * speed}px`);
      });
      motionPanels.forEach((panel) => {
        const rect = panel.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = (center - window.innerHeight / 2) / window.innerHeight;
        const clamped = Math.max(-34, Math.min(34, distance * -42));
        panel.style.setProperty("--motion-y", `${clamped}px`);
      });
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  };

  // =========================================================================
  // 17) Marquee that reacts to scroll velocity
  // =========================================================================
  const initVelocityMarquee = () => {
    const track = document.querySelector(".signal-track");
    if (!track || prefersReducedMotion) return;

    let velocity = 0;
    let baseSpeed = 1; // multiplier on the CSS animation

    if (lenis) {
      lenis.on("scroll", ({ velocity: v }) => {
        velocity = v || 0;
      });
    } else {
      let lastY = window.scrollY;
      let lastT = performance.now();
      window.addEventListener(
        "scroll",
        () => {
          const now = performance.now();
          const dy = window.scrollY - lastY;
          const dt = Math.max(1, now - lastT);
          velocity = (dy / dt) * 16; // normalize to ~per-frame
          lastY = window.scrollY;
          lastT = now;
        },
        { passive: true }
      );
    }

    const tick = () => {
      // Smoothly bias the animation rate by velocity. CSS handles base loop.
      const factor = Math.max(0.4, Math.min(3.2, baseSpeed + Math.abs(velocity) * 0.08));
      const direction = velocity < 0 ? "reverse" : "normal";
      track.style.animationDuration = `${24 / factor}s`;
      track.style.animationDirection = direction;
      // Decay velocity so it eases back to baseline when scrolling stops.
      velocity *= 0.92;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // =========================================================================
  // 18) Sticky pin: method-copy stays while cards scroll (GSAP-driven)
  //     The CSS already does `position: sticky`, but ScrollTrigger gives us
  //     a cleaner release once the cards finish.
  // =========================================================================
  const initStickyMethod = () => {
    if (!hasScrollTrigger || prefersReducedMotion) return;
    const copy = document.querySelector(".method-copy");
    const cards = document.querySelector(".method-cards");
    if (!copy || !cards) return;

    // On mobile (single column) skip pinning.
    if (window.matchMedia("(max-width: 1120px)").matches) return;

    ScrollTrigger.create({
      trigger: ".method-layout",
      start: "top top+=120",
      end: () => `+=${cards.offsetHeight - copy.offsetHeight}`,
      pin: copy,
      pinSpacing: false,
    });
  };

  // =========================================================================
  // 19) Plan switch (kept)
  // =========================================================================
  document.querySelectorAll("[data-plan-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.planMode;
      document.querySelectorAll("[data-plan-mode]").forEach((b) => b.classList.remove("is-active"));
      button.classList.add("is-active");
      document.querySelectorAll(".price").forEach((price) => {
        price.textContent = price.dataset[mode] || price.textContent;
      });
    });
  });

  // =========================================================================
  // 20) FAQ accordion (kept)
  // =========================================================================
  document.querySelectorAll("[data-faq] .faq-item").forEach((item) => {
    const button = item.querySelector("button");
    const panel = item.querySelector(".faq-panel");
    if (!button || !panel) return;
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

  // =========================================================================
  // 21) Lead form (kept)
  // =========================================================================
  const form = document.querySelector("[data-lead-form]");
  const formStatus = document.querySelector("[data-form-status]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (formStatus) {
      formStatus.textContent =
        "Solicitud preparada. El formulario ya está listo para conectarse a tu CRM o email.";
    }
    form.reset();
  });

  // =========================================================================
  // Boot order
  // =========================================================================
  initCursor();
  initHoverReveal();
  initMagnetic();
  initParallax();
  initVelocityMarquee();
  initDistortion();
  setupReveals();
  initStickyMethod();
  bootLoader();
})();
