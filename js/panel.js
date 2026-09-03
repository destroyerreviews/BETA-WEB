(() => {
  const root = document.querySelector("[data-panel-page]");
  if (!root) return;

  const client = () => window.DestroyerSupabase?.client || null;
  const auth = () => window.DestroyerAuth || null;
  const profiles = () => window.DestroyerProfileData || null;

  const loading = root.querySelector("[data-panel-loading]");
  const authEmpty = root.querySelector("[data-panel-auth-empty]");
  const shell = root.querySelector("[data-panel-shell]");
  const errorState = root.querySelector("[data-panel-error]");
  const retryButton = root.querySelector("[data-panel-retry]");
  const pendingNode = root.querySelector("[data-panel-pending]");
  const ordersNode = root.querySelector("[data-panel-orders]");
  const ordersCountNodes = [...root.querySelectorAll("[data-panel-orders-count]")];
  const ordersCountLabel = root.querySelector("[data-panel-orders-count-label]");
  const trialCard = root.querySelector("[data-panel-trial-card]");
  const tabButtons = [...root.querySelectorAll("[data-panel-tab]")];
  const tabPanels = [...root.querySelectorAll("[data-panel-panel]")];
  const drawer = document.querySelector("[data-panel-order-drawer]");
  const drawerOverlay = document.querySelector("[data-panel-order-overlay]");
  const drawerBody = document.querySelector("[data-panel-drawer-body]");
  const drawerTitle = document.querySelector("[data-panel-drawer-title]");
  const drawerStatus = document.querySelector("[data-panel-drawer-status]");
  const drawerCloseButtons = [...document.querySelectorAll("[data-panel-drawer-close]")];
  const supportOverlay = document.querySelector("[data-panel-support-overlay]");
  const supportModal = document.querySelector("[data-panel-support-modal]");
  const supportModalRef = document.querySelector("[data-panel-support-modal-ref]");
  const supportModalWhatsapp = document.querySelector("[data-panel-support-whatsapp]");
  const supportModalCopy = document.querySelector("[data-panel-support-copy]");
  const supportModalStatus = document.querySelector("[data-panel-support-status]");
  const supportModalCloseButtons = [...document.querySelectorAll("[data-panel-support-close]")];

  const state = {
    session: null,
    user: null,
    profile: null,
    orders: [],
    items: [],
    reviews: [],
    media: [],
    trial: null,
    activeOrderId: "",
    activeSupportRef: "",
    modalScrollY: 0,
  };

  const orderStatusLabels = {
    pending: "Pendiente",
    review: "En revisión",
    in_progress: "En preparación",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const paymentStatusLabels = {
    unpaid: "Pago pendiente",
    pending: "Pago en proceso",
    paid: "Pagado",
    failed: "Pago fallido",
    refunded: "Reembolsado",
  };

  const reviewStatusLabels = {
    awaiting_client: "Pendiente de completar",
    draft: "Borrador",
    submitted: "Personalización enviada",
    awaiting_team: "El equipo prepara los textos",
    prepared: "Texto preparado",
    approved: "Aprobado",
    completed: "Completado",
  };

  const trialStatusLabels = {
    pending: "Pendiente",
    review: "En revisión",
    active: "En proceso",
    completed: "Completada",
  };

  const pendingOrderStatuses = new Set(["pending", "review", "in_progress"]);
  const inProcessReviewStatuses = new Set(["awaiting_client", "draft", "submitted", "awaiting_team", "prepared", "approved"]);
  const manualPendingStatuses = new Set(["awaiting_client", "draft"]);
  const teamHiddenTextStatuses = new Set(["awaiting_team", "draft"]);
  const teamPreparedStatuses = new Set(["prepared", "approved", "completed"]);

  const activatePanelTab = (tabName) => {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.panelTab === tabName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.panelPanel === tabName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  const orderTone = (status) => ({
    pending: "warning",
    review: "info",
    in_progress: "info",
    completed: "success",
    cancelled: "danger",
  })[status] || "neutral";

  const paymentTone = (status) => ({
    unpaid: "warning",
    pending: "info",
    paid: "success",
    failed: "danger",
    refunded: "neutral",
  })[status] || "neutral";

  const reviewTone = (status, source = "client") => {
    if (source === "team") {
      if (["awaiting_team", "draft"].includes(status)) return "info";
      if (teamPreparedStatuses.has(status)) return "success";
    }
    return ({
      awaiting_client: "warning",
      draft: "warning",
      submitted: "info",
      awaiting_team: "info",
      prepared: "info",
      approved: "success",
      completed: "success",
    })[status] || "neutral";
  };

  const trialTone = () => {
    if (!state.trial) return "neutral";
    return ({
      pending: "warning",
      review: "info",
      active: "info",
      completed: "success",
    })[state.trial.status] || "neutral";
  };

  const escapeHtml = (value) => `${value || ""}`.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[char]);

  const shortRef = (id) => `#${`${id || ""}`.replaceAll("-", "").slice(0, 8).toUpperCase() || "PEDIDO"}`;

  const formatDate = (value) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  const formatMoney = (cents, currency = "EUR") => {
    const amount = (Number(cents) || 0) / 100;
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: currency || "EUR" }).format(amount);
  };

  const labelFrom = (map, value, fallback = "Pendiente") => map[value] || fallback;

  const getValidGoogleMapsUrl = (value) => {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname.toLowerCase();
      const isGoogleMapsPath = (hostname === "google.com" || hostname.endsWith(".google.com")) && pathname.startsWith("/maps");
      const isMapsGoogle = hostname === "maps.google.com";
      const isMapsShortLink = hostname === "maps.app.goo.gl";
      const isLegacyShortLink = hostname === "goo.gl" && pathname.startsWith("/maps");
      return isGoogleMapsPath || isMapsGoogle || isMapsShortLink || isLegacyShortLink ? url.href : "";
    } catch {
      return "";
    }
  };

  const setVisibleState = (nextState) => {
    if (loading) loading.hidden = nextState !== "loading";
    if (authEmpty) authEmpty.hidden = nextState !== "auth";
    if (shell) shell.hidden = nextState !== "shell";
    if (errorState) errorState.hidden = nextState !== "error";
  };

  const itemsForOrder = (orderId) => state.items.filter((item) => item.order_id === orderId);
  const reviewsForOrder = (orderId) => state.reviews.filter((review) => review.order_id === orderId);
  const mediaForReview = (reviewId) => state.media.filter((item) => item.order_review_id === reviewId);

  const packItemsForOrder = (orderId) => itemsForOrder(orderId).filter((item) => item.pack_slug !== "personalizacion-resenas");

  const reviewCountForOrder = (orderId) => {
    const reviews = reviewsForOrder(orderId);
    if (reviews.length) return reviews.length;
    return packItemsForOrder(orderId).reduce((total, item) => total + ((Number(item.reviews_count) || 0) * (Number(item.quantity) || 1)), 0);
  };

  const packSummary = (orderId) => {
    const items = packItemsForOrder(orderId);
    if (!items.length) return "Sin packs disponibles";
    return items.map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const reviews = Number(item.reviews_count) || 0;
      return `${item.pack_name || "Pack"} x${quantity}${reviews ? ` (${reviews * quantity} reseñas)` : ""}`;
    }).join(", ");
  };

  const managementLabel = (mode) => mode === "manual" ? "Personalizado" : mode === "team" ? "Equipo" : "Sin modo";

  const getOrderPersonalization = (order) => {
    const reviews = reviewsForOrder(order.id);

    if (order.management_mode === "manual") {
      if (!reviews.length) return { label: "Sin reseñas todavía", pendingCount: 0, isPending: false, tone: "neutral", message: "" };
      const pending = reviews.filter((review) => review.source === "client" && manualPendingStatuses.has(review.status)).length;
      if (pending) {
        return {
          label: `${pending} ${pending === 1 ? "pendiente" : "pendientes"} de completar`,
          pendingCount: pending,
          isPending: true,
          tone: "warning",
        };
      }
      const submitted = reviews.filter((review) => review.status === "submitted").length;
      if (submitted) return { label: "Personalización enviada", pendingCount: 0, isPending: false, tone: "info" };
      return { label: "Sin personalización pendiente", pendingCount: 0, isPending: false, tone: "neutral" };
    }

    if (order.management_mode === "team") {
      const teamReviews = reviews.filter((review) => review.source === "team");
      const allPrepared = teamReviews.length > 0 && teamReviews.every((review) => teamPreparedStatuses.has(review.status));
      if (allPrepared) {
        return {
          label: "Reseñas preparadas",
          pendingCount: 0,
          isPending: false,
          tone: "success",
          message: "Ya puedes revisar los textos preparados por el equipo.",
        };
      }
      return {
        label: "En preparación",
        pendingCount: teamReviews.filter((review) => teamHiddenTextStatuses.has(review.status)).length,
        isPending: false,
        tone: "info",
        message: "El equipo está preparando tus reseñas.",
      };
    }

    return { label: "Sin personalización necesaria", pendingCount: 0, isPending: false, tone: "neutral", message: "" };
  };

  const getTrialLabel = () => {
    if (!state.trial) return "No solicitada";
    return trialStatusLabels[state.trial.status] || "Sin estado";
  };

  const getWhatsappHref = (message) => {
    const existingHref = document.querySelector("[data-whatsapp-float]")?.getAttribute("href")
      || document.querySelector("[data-panel-whatsapp]")?.getAttribute("href")
      || "https://wa.me/34603826428";
    const phone = existingHref.match(/wa\.me\/(\d+)/)?.[1] || "34603826428";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const updateWhatsappLinks = () => {
    document.querySelectorAll("[data-panel-whatsapp]").forEach((link) => {
      const ref = link.dataset.orderRef ? ` ${link.dataset.orderRef}` : "";
      link.href = getWhatsappHref(`Hola, quiero ayuda con un pedido de Destroyer Reviews${ref}.`);
    });
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  };

  const setStat = (name, value) => {
    const node = root.querySelector(`[data-panel-stat="${name}"]`);
    if (node) node.textContent = String(value);
  };

  const renderSummary = () => {
    setStat("orders", state.orders.length);
    setStat("pendingOrders", state.orders.filter((order) => pendingOrderStatuses.has(order.status)).length);
    setStat("reviewsInProcess", state.reviews.filter((review) => inProcessReviewStatuses.has(review.status)).length);
    setStat("completedOrders", state.orders.filter((order) => order.status === "completed").length);

    const metadata = state.user?.user_metadata || {};
    const name = state.profile?.full_name || metadata.name || state.user?.email || "cliente";
    const nameNode = root.querySelector("[data-panel-name]");
    const welcomeNode = root.querySelector("[data-panel-welcome]");
    if (nameNode) nameNode.textContent = `${name}`.split("@")[0];
    if (welcomeNode) welcomeNode.textContent = state.orders.length
      ? "Tienes tus pedidos y personalizaciones reunidos en un único panel privado."
      : "Aún no hay pedidos asociados a tu cuenta. Cuando hagas el primero aparecerá aquí.";
  };

  const renderPendingAction = () => {
    const manualOrder = state.orders.find((order) => order.management_mode === "manual" && getOrderPersonalization(order).isPending);

    if (manualOrder) {
      pendingNode.hidden = false;
      pendingNode.innerHTML = `
        <div>
          <span>Acción pendiente</span>
          <h2>Tienes reseñas pendientes</h2>
          <p>Completa la personalización para avanzar con tu pedido ${shortRef(manualOrder.id)}.</p>
        </div>
        <a class="panel-action panel-action--primary" href="checkout/personalizacion/?order=${encodeURIComponent(manualOrder.id)}">Continuar</a>
      `;
      pendingNode.dataset.state = "action";
      return;
    }

    pendingNode.hidden = true;
    pendingNode.innerHTML = "";
    delete pendingNode.dataset.state;
  };

  const renderTrialCard = () => {
    if (!trialCard) return;

    if (!state.trial) {
      trialCard.innerHTML = `
        <span>Prueba gratuita</span>
        <h2>Solicita tu prueba gratuita</h2>
        <p>Envía una solicitud para que revisemos tu ficha y podamos preparar una primera reseña.</p>
        <a class="panel-action panel-action--primary" href="index.html?trial=open">Solicitar prueba gratuita</a>
      `;
      trialCard.dataset.tone = "neutral";
      return;
    }

    const completedReviewText = state.trial.status === "completed"
      ? `${state.trial.review_text || ""}`.trim()
      : "";

    trialCard.dataset.tone = trialTone();
    trialCard.innerHTML = `
      <span>Prueba gratuita</span>
      <h2>${state.trial.status === "completed" ? "Tu prueba gratuita está completada" : "Prueba gratuita solicitada"}</h2>
      <p class="panel-trial-status">${getTrialLabel()}</p>
      <dl class="panel-mini-list">
        <div><dt>Fecha</dt><dd>${formatDate(state.trial.created_at)}</dd></div>
        <div><dt>Estado</dt><dd>${escapeHtml(getTrialLabel())}</dd></div>
      </dl>
      ${completedReviewText ? `
        <section class="panel-trial-result" aria-labelledby="panel-trial-review-title">
          <div class="panel-trial-result__header">
            <span>Resultado final</span>
            <span class="panel-trial-stars" role="img" aria-label="5 de 5 estrellas"><span aria-hidden="true">★★★★★</span></span>
          </div>
          <h3 id="panel-trial-review-title">Texto de la reseña gratuita</h3>
          <p>${escapeHtml(completedReviewText)}</p>
        </section>
      ` : ""}
    `;
  };

  const getPrimaryAction = (order) => {
    const personalization = getOrderPersonalization(order);
    if (order.management_mode === "manual" && personalization.isPending) {
      return {
        tag: "a",
        label: "Continuar personalización",
        href: `checkout/personalizacion/?order=${encodeURIComponent(order.id)}`,
      };
    }
    if (order.management_mode === "manual") {
      return { tag: "button", label: "Ver personalización" };
    }
    return { tag: "button", label: "Ver pedido" };
  };

  const renderOrders = () => {
    const count = state.orders.length;
    ordersCountNodes.forEach((node) => {
      node.textContent = String(count);
    });
    if (ordersCountLabel) ordersCountLabel.textContent = `${count} ${count === 1 ? "pedido" : "pedidos"}`;

    if (!ordersNode) return;
    if (!state.orders.length) {
      ordersNode.innerHTML = `
        <section class="panel-empty-card">
          <span>Sin pedidos</span>
          <h3>Aún no tienes pedidos</h3>
          <p>Cuando envíes tu primer pedido, lo verás aquí con sus reseñas y acciones pendientes.</p>
          <a class="panel-action panel-action--primary" href="index.html#planes">Ver packs</a>
        </section>
      `;
      return;
    }

    ordersNode.innerHTML = state.orders.map((order) => {
      const action = getPrimaryAction(order);
      const personalization = getOrderPersonalization(order);
      const ref = shortRef(order.id);
      const actionMarkup = action.tag === "a"
        ? `<a class="panel-action panel-action--primary" href="${action.href}">${action.label}</a>`
        : `<button class="panel-action panel-action--primary" type="button" data-order-open="${order.id}">${action.label}</button>`;

      return `
        <article class="panel-order-card" data-panel-order-card="${order.id}">
          <header>
            <div>
              <span class="panel-order-ref">Pedido ${ref}</span>
              <h3>${escapeHtml(packSummary(order.id))}</h3>
            </div>
            <span class="panel-status-badge" data-tone="${orderTone(order.status)}">${labelFrom(orderStatusLabels, order.status)}</span>
          </header>
          <div class="panel-order-main">
            <div>
              <span>Fecha</span>
              <strong>${formatDate(order.created_at)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>${formatMoney(order.total_cents, order.currency)}</strong>
            </div>
            <div>
              <span>Reseñas</span>
              <strong>${reviewCountForOrder(order.id)}</strong>
            </div>
          </div>
          <div class="panel-order-chips" aria-label="Estados del pedido">
            <span class="panel-status-chip" data-tone="${paymentTone(order.payment_status)}">${labelFrom(paymentStatusLabels, order.payment_status, "Pago pendiente")}</span>
            <span class="panel-status-chip" data-tone="neutral">${managementLabel(order.management_mode)}</span>
            <span class="panel-status-chip" data-tone="${personalization.tone}">${escapeHtml(personalization.label)}</span>
          </div>
          ${order.management_mode === "team" ? `<p class="panel-order-note" data-tone="${personalization.tone}">${escapeHtml(personalization.message)}</p>` : ""}
          <div class="panel-order-actions">
            ${actionMarkup}
            <button class="panel-action panel-action--secondary" type="button" data-order-support="${order.id}">Soporte</button>
          </div>
        </article>
      `;
    }).join("");
  };

  const renderReviewDetail = (review) => {
    const isTeamReview = review.source === "team";
    const isTeamPreparing = isTeamReview && teamHiddenTextStatuses.has(review.status);
    const isTeamPrepared = isTeamReview && teamPreparedStatuses.has(review.status);
    const status = isTeamPreparing
      ? "En preparación"
      : isTeamPrepared
        ? "Texto preparado"
        : labelFrom(reviewStatusLabels, review.status, "Borrador");

    if (isTeamPreparing) {
      return `
        <article class="panel-review-detail panel-review-detail--team">
          <header class="panel-review-detail__header">
            <strong class="panel-review-detail__title">Reseña ${review.review_index}</strong>
            <strong class="panel-status-chip" data-tone="${reviewTone(review.status, review.source)}">${status}</strong>
          </header>
          <div class="panel-review-rating">
            <strong>5/5 estrellas</strong>
            <span>Valoración prevista</span>
          </div>
          <div class="panel-review-copy panel-review-copy--preparing">
            <span>Texto</span>
            <p>El equipo está preparando esta reseña.</p>
          </div>
        </article>
      `;
    }

    const canShowTeamText = isTeamReview && teamPreparedStatuses.has(review.status);
    const canShowClientText = review.source === "client";
    const showText = canShowTeamText || canShowClientText;
    const media = canShowClientText ? mediaForReview(review.id) : [];
    const imageCount = media.filter((item) => item.file_type === "image").length;
    const videoCount = media.filter((item) => item.file_type === "video").length;

    return `
      <article class="panel-review-detail${isTeamReview ? " panel-review-detail--team" : " panel-review-detail--client"}">
        <header class="panel-review-detail__header">
          <strong class="panel-review-detail__title">Reseña ${review.review_index}</strong>
          <strong class="panel-status-chip" data-tone="${reviewTone(review.status, review.source)}">${status}</strong>
        </header>
        <div class="panel-review-rating">
          <strong>${isTeamReview ? "5/5 estrellas" : review.rating ? `${review.rating}/5 estrellas` : "Sin valoración"}</strong>
          <span>${isTeamReview ? "Valoración preparada" : "Valoración del cliente"}</span>
        </div>
        ${isTeamPrepared ? `<p class="panel-review-team-message">Ya puedes revisar los textos preparados por el equipo.</p>` : ""}
        <div class="panel-review-copy">
          <span>Texto</span>
          <p>${showText && review.review_text ? escapeHtml(review.review_text) : "Sin texto visible todavía."}</p>
        </div>
        ${canShowClientText && review.review_notes ? `
          <div class="panel-review-note">
            <span>Nota específica</span>
            <p>${escapeHtml(review.review_notes)}</p>
          </div>
        ` : ""}
        ${canShowClientText ? `
          <div class="panel-review-media" aria-label="Archivos asociados">
            <span>${imageCount} ${imageCount === 1 ? "imagen" : "imágenes"}</span>
            <span>${videoCount} ${videoCount === 1 ? "vídeo" : "vídeos"}</span>
          </div>
        ` : ""}
      </article>
    `;
  };

  const renderDrawer = (order) => {
    const ref = shortRef(order.id);
    const items = itemsForOrder(order.id);
    const reviews = reviewsForOrder(order.id);
    const googleMapsUrl = getValidGoogleMapsUrl(order.google_maps_url);
    if (drawerTitle) drawerTitle.textContent = `Pedido ${ref}`;
    if (drawerStatus) {
      drawerStatus.textContent = `${labelFrom(orderStatusLabels, order.status)} - ${labelFrom(paymentStatusLabels, order.payment_status, "Pago pendiente")}`;
    }
    if (!drawerBody) return;

    drawerBody.innerHTML = `
      <section class="panel-drawer-section panel-drawer-summary">
        <h3>Resumen</h3>
        <dl class="panel-order-summary-grid">
          <div><dt>Estado del pedido</dt><dd><span class="panel-status-chip" data-tone="${orderTone(order.status)}">${labelFrom(orderStatusLabels, order.status)}</span></dd></div>
          <div><dt>Pago</dt><dd><span class="panel-status-chip" data-tone="${paymentTone(order.payment_status)}">${labelFrom(paymentStatusLabels, order.payment_status, "Pago pendiente")}</span></dd></div>
          <div><dt>Gestión</dt><dd><span class="panel-status-chip" data-tone="neutral">${managementLabel(order.management_mode)}</span></dd></div>
          <div class="panel-order-summary-grid__total"><dt>Total</dt><dd>${formatMoney(order.total_cents, order.currency)}</dd></div>
          <div><dt>Fecha</dt><dd>${formatDate(order.created_at)}</dd></div>
        </dl>
        ${googleMapsUrl ? `
          <a class="panel-maps-link" href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer">
            <span>Ver perfil en Google Maps</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
          </a>
        ` : `<p class="panel-maps-unavailable">Enlace de Google Maps no disponible.</p>`}
        <div class="panel-order-note-block">
          <span>Nota general</span>
          ${order.notes ? `<p class="panel-drawer-note">${escapeHtml(order.notes)}</p>` : `<p class="panel-muted">Sin nota general del pedido.</p>`}
        </div>
      </section>

      <section class="panel-drawer-section">
        <h3>Packs comprados</h3>
        ${items.length ? items.map((item) => `
          <article class="panel-line-item">
            <strong>${escapeHtml(item.pack_name)}</strong>
            <span>${Number(item.quantity) || 1} x ${formatMoney(item.unit_price_cents, order.currency)} - ${formatMoney(item.subtotal_cents, order.currency)}</span>
          </article>
        `).join("") : `<p class="panel-muted">Pedido sin líneas disponibles.</p>`}
      </section>

      <section class="panel-drawer-section">
        <h3>Reseñas asociadas</h3>
        ${reviews.length ? reviews.map(renderReviewDetail).join("") : `<p class="panel-muted">Este pedido no tiene reseñas todavía.</p>`}
      </section>

      <section class="panel-drawer-section panel-drawer-support">
        <h3>Soporte relacionado</h3>
        <p>Indica la referencia ${ref} para que podamos ubicar el pedido.</p>
        <a class="panel-action panel-action--primary" href="${getWhatsappHref(`Hola, quiero ayuda con el pedido ${ref} de Destroyer Reviews.`)}" target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>
      </section>
    `;
  };

  const lockPanelPage = () => {
    if (document.body.classList.contains("panel-modal-is-open")) return;
    state.modalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add("panel-modal-is-open");
    document.body.classList.add("panel-modal-is-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${state.modalScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  };

  const unlockPanelPage = () => {
    document.documentElement.classList.remove("panel-modal-is-open");
    document.body.classList.remove("panel-modal-is-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, state.modalScrollY || 0);
  };

  const openDrawer = (orderId) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order || !drawer || !drawerOverlay) return;
    state.activeOrderId = orderId;
    renderDrawer(order);
    drawerOverlay.hidden = false;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("panel-drawer-is-open");
    lockPanelPage();
    requestAnimationFrame(() => {
      drawerOverlay.classList.add("is-visible");
      drawer.classList.add("is-open");
      drawer.querySelector("[data-panel-drawer-close]")?.focus({ preventScroll: true });
    });
  };

  const closeDrawer = () => {
    if (!drawer || drawer.hidden) return;
    drawerOverlay?.classList.remove("is-visible");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("panel-drawer-is-open");
    unlockPanelPage();
    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) {
        if (drawerOverlay) drawerOverlay.hidden = true;
        drawer.hidden = true;
      }
    }, 260);
  };

  const openSupportModal = (orderId) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order || !supportModal || !supportOverlay) return;
    const ref = shortRef(order.id);
    state.activeSupportRef = ref;
    if (supportModalRef) supportModalRef.textContent = `Pedido ${ref}`;
    if (supportModalWhatsapp) {
      supportModalWhatsapp.href = getWhatsappHref(`Hola, quiero ayuda con el pedido ${ref} de Destroyer Reviews.`);
    }
    if (supportModalStatus) supportModalStatus.textContent = "";
    supportOverlay.hidden = false;
    supportModal.hidden = false;
    supportModal.setAttribute("aria-hidden", "false");
    lockPanelPage();
    requestAnimationFrame(() => {
      supportOverlay.classList.add("is-visible");
      supportModal.classList.add("is-open");
      supportModal.querySelector("[data-panel-support-close]")?.focus({ preventScroll: true });
    });
  };

  const closeSupportModal = () => {
    if (!supportModal || supportModal.hidden) return;
    supportOverlay?.classList.remove("is-visible");
    supportModal.classList.remove("is-open");
    supportModal.setAttribute("aria-hidden", "true");
    unlockPanelPage();
    window.setTimeout(() => {
      if (!supportModal.classList.contains("is-open")) {
        if (supportOverlay) supportOverlay.hidden = true;
        supportModal.hidden = true;
      }
    }, 220);
  };

  const renderPanel = () => {
    renderSummary();
    renderPendingAction();
    renderTrialCard();
    renderOrders();
    updateWhatsappLinks();
  };

  const fetchPanelData = async () => {
    const session = await auth()?.getSession?.();
    state.session = session || null;
    state.user = session?.user || null;

    if (!state.user) {
      setVisibleState("auth");
      return;
    }

    const supabase = client();
    if (!supabase) throw new Error("Supabase is not available");

    const profilePromise = profiles()?.ensureUserProfile
      ? profiles().ensureUserProfile(state.user).then((profile) => ({ data: profile, error: null })).catch((error) => ({ data: null, error }))
      : Promise.resolve({ data: null, error: null });

    const [profileResult, trialResult, ordersResult] = await Promise.all([
      profilePromise,
      supabase.rpc("get_my_free_trial_request"),
      supabase
        .from("orders")
        .select("id,user_id,customer_name,customer_email,whatsapp,google_maps_url,notes,management_mode,currency,total_cents,status,payment_status,created_at,updated_at")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (trialResult.error) throw trialResult.error;
    if (ordersResult.error) throw ordersResult.error;

    state.profile = profileResult.data || null;
    state.trial = Array.isArray(trialResult.data) ? trialResult.data[0] || null : trialResult.data || null;
    state.orders = ordersResult.data || [];

    const orderIds = state.orders.map((order) => order.id).filter(Boolean);
    if (!orderIds.length) {
      state.items = [];
      state.reviews = [];
      state.media = [];
      renderPanel();
      setVisibleState("shell");
      return;
    }

    const [itemsResult, reviewsResult, mediaResult] = await Promise.all([
      supabase
        .from("order_items")
        .select("id,order_id,pack_slug,pack_name,reviews_count,quantity,unit_price_cents,subtotal_cents,created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_reviews")
        .select("id,order_id,user_id,review_index,source,rating,review_text,review_notes,status,created_at,updated_at")
        .in("order_id", orderIds)
        .eq("user_id", state.user.id)
        .order("review_index", { ascending: true }),
      supabase
        .from("review_media")
        .select("id,order_review_id,order_id,user_id,file_type,created_at")
        .in("order_id", orderIds)
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: true }),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (reviewsResult.error) throw reviewsResult.error;
    if (mediaResult.error) throw mediaResult.error;

    state.items = itemsResult.data || [];
    state.reviews = reviewsResult.data || [];
    state.media = mediaResult.data || [];

    renderPanel();
    setVisibleState("shell");
  };

  const init = async () => {
    setVisibleState("loading");
    try {
      await fetchPanelData();
    } catch {
      setVisibleState("error");
    }
  };

  ordersNode?.addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-order-open]");
    if (openButton) {
      openDrawer(openButton.dataset.orderOpen);
      return;
    }

    const supportButton = event.target.closest("[data-order-support]");
    if (supportButton) {
      openSupportModal(supportButton.dataset.orderSupport);
      return;
    }
  });

  pendingNode?.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-order-open]");
    if (openButton) openDrawer(openButton.dataset.orderOpen);
  });

  drawerOverlay?.addEventListener("click", closeDrawer);
  drawerCloseButtons.forEach((button) => button.addEventListener("click", closeDrawer));
  supportOverlay?.addEventListener("click", closeSupportModal);
  supportModalCloseButtons.forEach((button) => button.addEventListener("click", closeSupportModal));
  supportModalCopy?.addEventListener("click", async () => {
    try {
      await copyText(state.activeSupportRef || "");
      if (supportModalStatus) supportModalStatus.textContent = "Referencia copiada.";
    } catch {
      if (supportModalStatus) supportModalStatus.textContent = "No se pudo copiar automáticamente.";
    }
  });
  retryButton?.addEventListener("click", init);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeSupportModal();
    }
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activatePanelTab(button.dataset.panelTab));
  });

  auth()?.onSessionChange?.((session) => {
    if (Boolean(session?.user) === Boolean(state.user) && session?.user?.id === state.user?.id) return;
    init();
  });

  init();
})();
