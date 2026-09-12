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
  const supportListNode = root.querySelector("[data-support-list]");
  const supportDetailNode = root.querySelector("[data-support-detail]");
  const supportFeedback = root.querySelector("[data-support-feedback]");
  const supportUnreadCount = root.querySelector("[data-panel-support-count]");
  const supportNotice = root.querySelector("[data-panel-support-notice]");
  const supportNoticeText = root.querySelector("[data-panel-support-notice-text]");
  const supportNoticeButton = root.querySelector("[data-panel-support-notice-open]");
  const supportNewButtons = [...document.querySelectorAll("[data-support-new]")];
  const supportOverlay = document.querySelector("[data-support-compose-overlay]");
  const supportModal = document.querySelector("[data-support-compose-modal]");
  const supportForm = document.querySelector("[data-support-compose-form]");
  const supportOrderSelect = document.querySelector("[data-support-order-select]");
  const supportComposeStatus = document.querySelector("[data-support-compose-status]");
  const supportSubjectCount = document.querySelector("[data-support-subject-count]");
  const supportMessageCount = document.querySelector("[data-support-message-count]");
  const supportSubmitButton = document.querySelector("[data-support-compose-submit]");
  const supportModalCloseButtons = [...document.querySelectorAll("[data-support-compose-close], [data-support-compose-cancel]")];

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
    activePanelTab: window.location.hash.toLowerCase() === "#panel-support" ? "support" : "orders",
    supportThreads: [],
    supportMessages: [],
    supportLoaded: false,
    supportLoading: false,
    supportError: "",
    activeSupportThreadId: "",
    supportDetailLoading: false,
    supportDetailError: "",
    supportDetailRequest: 0,
    supportAction: "",
    supportDraft: "",
    supportMessageRequestId: "",
    supportCreateRequestId: "",
    supportReturnFocus: null,
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

  const supportStatusLabels = {
    waiting_support: "En espera de soporte",
    waiting_customer: "Soporte ha respondido",
    closed: "Conversación cerrada",
  };

  const supportStatusTones = {
    waiting_support: "warning",
    waiting_customer: "success",
    closed: "neutral",
  };

  const pendingOrderStatuses = new Set(["pending", "review", "in_progress"]);
  const inProcessReviewStatuses = new Set(["awaiting_client", "draft", "submitted", "awaiting_team", "prepared", "approved"]);
  const manualPendingStatuses = new Set(["awaiting_client", "draft"]);
  const teamHiddenTextStatuses = new Set(["awaiting_team", "draft"]);
  const teamPreparedStatuses = new Set(["prepared", "approved", "completed"]);

  const activatePanelTab = (tabName, { syncHash = false } = {}) => {
    if (!tabButtons.some((button) => button.dataset.panelTab === tabName)) return;
    state.activePanelTab = tabName;
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

    if (syncHash) {
      const nextUrl = tabName === "support"
        ? `${window.location.pathname}${window.location.search}#panel-support`
        : `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", nextUrl);
    }

    if (tabName === "support" && state.user && !state.supportLoaded && !state.supportLoading) {
      void loadSupportThreads();
    }
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

  const formatDateTime = (value) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const textLength = (value) => [...`${value || ""}`].length;

  const createNode = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const firstRpcRow = (data) => Array.isArray(data) ? data[0] || null : data || null;

  const createRequestId = () => {
    if (!window.crypto?.randomUUID) throw new Error("secure_request_id_unavailable");
    return window.crypto.randomUUID();
  };

  const supportErrorMessage = (error, fallback) => {
    const message = `${error?.message || error || ""}`;
    const knownErrors = {
      authentication_required: "Tu sesión ha caducado. Inicia sesión de nuevo.",
      invalid_subject: "El asunto debe tener entre 3 y 120 caracteres.",
      message_required: "Escribe un mensaje antes de continuar.",
      message_too_long: "El mensaje no puede superar los 4000 caracteres.",
      request_id_required: "No pudimos preparar una solicitud segura. Vuelve a intentarlo.",
      invalid_support_status: "El estado de la conversación no es válido.",
      order_not_available: "Ese pedido no está disponible para soporte.",
      thread_not_available: "La conversación no está disponible.",
      message_not_available: "No se pudo actualizar la lectura de la conversación.",
      thread_closed: "La conversación está cerrada. Puedes reabrirla con un mensaje.",
      thread_not_closed: "La conversación ya está abierta.",
      too_many_active_threads: "Has alcanzado el máximo de conversaciones abiertas.",
      rate_limit_exceeded: "Has enviado demasiados mensajes. Inténtalo de nuevo dentro de una hora.",
      idempotency_conflict: "La solicitud ya se utilizó con otro contenido. Vuelve a intentarlo.",
      secure_request_id_unavailable: "Tu navegador no permite crear una solicitud segura. Actualízalo e inténtalo de nuevo.",
    };
    const key = Object.keys(knownErrors).find((item) => message.includes(item));
    return key ? knownErrors[key] : fallback;
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
      const message = link.dataset.whatsappMessage || `Hola, quiero ayuda con un pedido de Destroyer Reviews${ref}.`;
      link.href = getWhatsappHref(message);
    });
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

  const getActiveSupportThread = () => state.supportThreads.find((thread) => thread.id === state.activeSupportThreadId) || null;

  const setSupportFeedback = (message = "", tone = "") => {
    if (!supportFeedback) return;
    supportFeedback.textContent = message;
    supportFeedback.hidden = !message;
    if (tone) supportFeedback.dataset.tone = tone;
    else delete supportFeedback.dataset.tone;
  };

  const updateSupportUnreadCount = () => {
    if (!supportUnreadCount) return;
    const count = state.supportThreads.filter((thread) => thread.has_unread === true).length;
    supportUnreadCount.textContent = String(count);
    supportUnreadCount.hidden = count === 0;
    supportUnreadCount.setAttribute("aria-label", `${count} ${count === 1 ? "conversación sin leer" : "conversaciones sin leer"}`);
  };

  const getSupportAttentionThreads = () => state.supportThreads.filter((thread) => (
    thread?.has_unread === true || thread?.status === "waiting_customer"
  ));

  const getSupportActivityTime = (thread) => {
    const value = Date.parse(thread?.last_message_at || thread?.updated_at || thread?.created_at || "");
    return Number.isFinite(value) ? value : 0;
  };

  const getMostRecentSupportAttentionThread = () => [...getSupportAttentionThreads()]
    .sort((left, right) => getSupportActivityTime(right) - getSupportActivityTime(left))[0] || null;

  const renderSupportNotice = () => {
    if (!supportNotice) return;
    const count = state.supportLoaded ? getSupportAttentionThreads().length : 0;
    supportNotice.hidden = count === 0;
    if (supportNoticeText) {
      supportNoticeText.textContent = count === 1
        ? "Tienes 1 conversación con respuesta de soporte."
        : `Tienes ${count} conversaciones con respuesta de soporte.`;
    }
  };

  const appendSupportState = (container, { icon, title, body, actionLabel = "", action = "" }) => {
    const empty = createNode("div", "panel-support-state");
    empty.appendChild(createNode("span", "panel-support-state__icon", icon));
    empty.lastElementChild.setAttribute("aria-hidden", "true");
    empty.appendChild(createNode("h3", "", title));
    empty.appendChild(createNode("p", "", body));
    if (actionLabel && action) {
      const button = createNode("button", "panel-action panel-action--secondary", actionLabel);
      button.type = "button";
      button.dataset[action] = "";
      empty.appendChild(button);
    }
    container.appendChild(empty);
  };

  const renderSupportList = () => {
    if (!supportListNode) return;
    supportListNode.replaceChildren();
    supportListNode.setAttribute("aria-busy", String(state.supportLoading || !state.supportLoaded));

    if (state.supportError) {
      appendSupportState(supportListNode, {
        icon: "!",
        title: "No pudimos cargar el soporte",
        body: state.supportError,
        actionLabel: "Reintentar",
        action: "supportRetry",
      });
      return;
    }

    if (state.supportLoading || !state.supportLoaded) {
      const skeleton = createNode("div", "panel-support-skeleton");
      skeleton.setAttribute("aria-label", "Cargando conversaciones");
      for (let index = 0; index < 3; index += 1) skeleton.appendChild(createNode("span"));
      supportListNode.appendChild(skeleton);
      return;
    }

    if (!state.supportThreads.length) {
      appendSupportState(supportListNode, {
        icon: "+",
        title: "Aún no hay conversaciones",
        body: "Crea una conversación para consultar una duda general o sobre uno de tus pedidos.",
        actionLabel: "Nueva conversación",
        action: "supportNewInline",
      });
      return;
    }

    state.supportThreads.forEach((thread) => {
      const button = createNode("button", "panel-support-thread");
      button.type = "button";
      button.dataset.supportThreadId = thread.id;
      const isActive = thread.id === state.activeSupportThreadId;
      const hasUnread = thread.has_unread === true;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-unread", hasUnread);
      if (isActive) button.setAttribute("aria-current", "true");
      button.setAttribute("aria-label", `${thread.reference_code || "Conversación de soporte"}: ${thread.subject || "Sin asunto"}${hasUnread ? ", respuesta nueva" : ""}`);

      const top = createNode("span", "panel-support-thread__top");
      top.appendChild(createNode("strong", "", thread.reference_code || "Soporte"));
      if (hasUnread) {
        const unread = createNode("span", "panel-support-thread__unread", "Respuesta nueva");
        unread.setAttribute("aria-label", "Respuesta nueva de soporte");
        top.appendChild(unread);
      }
      button.appendChild(top);

      button.appendChild(createNode("span", "panel-support-thread__subject", thread.subject || "Sin asunto"));

      const meta = createNode("span", "panel-support-thread__meta");
      const status = createNode("span", "panel-status-chip", supportStatusLabels[thread.status] || "Estado desconocido");
      status.dataset.tone = supportStatusTones[thread.status] || "neutral";
      meta.appendChild(status);
      const activity = createNode("time", "", formatDateTime(thread.last_message_at));
      if (thread.last_message_at) activity.dateTime = thread.last_message_at;
      meta.appendChild(activity);
      button.appendChild(meta);

      if (thread.order_id) button.appendChild(createNode("span", "panel-support-thread__order", `Pedido ${shortRef(thread.order_id)}`));
      supportListNode.appendChild(button);
    });
  };

  const renderSupportDetail = () => {
    if (!supportDetailNode) return;
    supportDetailNode.replaceChildren();
    supportDetailNode.classList.toggle("is-empty", !state.activeSupportThreadId || state.supportDetailLoading || Boolean(state.supportDetailError));
    supportDetailNode.setAttribute("aria-busy", String(state.supportDetailLoading));

    if (!state.activeSupportThreadId) {
      appendSupportState(supportDetailNode, {
        icon: "?",
        title: "Selecciona una conversación",
        body: "Abre un hilo para consultar los mensajes o crea una conversación nueva.",
      });
      return;
    }

    if (state.supportDetailLoading) {
      appendSupportState(supportDetailNode, {
        icon: "…",
        title: "Cargando conversación",
        body: "Estamos recuperando los mensajes más recientes.",
      });
      return;
    }

    if (state.supportDetailError) {
      appendSupportState(supportDetailNode, {
        icon: "!",
        title: "No pudimos abrir la conversación",
        body: state.supportDetailError,
        actionLabel: "Reintentar",
        action: "supportRefreshThread",
      });
      return;
    }

    const thread = getActiveSupportThread();
    if (!thread) {
      state.activeSupportThreadId = "";
      renderSupportDetail();
      return;
    }

    const header = createNode("header", "panel-support-detail__header");
    const heading = createNode("div");
    const reference = createNode("span", "panel-support-detail__reference", thread.reference_code || "Soporte");
    heading.appendChild(reference);
    heading.appendChild(createNode("h3", "", thread.subject || "Sin asunto"));
    const details = createNode("div", "panel-support-detail__meta");
    const status = createNode("span", "panel-status-chip", supportStatusLabels[thread.status] || "Estado desconocido");
    status.dataset.tone = supportStatusTones[thread.status] || "neutral";
    details.appendChild(status);
    if (thread.order_id) details.appendChild(createNode("span", "", `Pedido ${shortRef(thread.order_id)}`));
    heading.appendChild(details);
    header.appendChild(heading);
    const refreshButton = createNode("button", "panel-action panel-action--ghost", state.supportAction === "refresh" ? "Actualizando..." : "Actualizar");
    refreshButton.type = "button";
    refreshButton.dataset.supportRefreshThread = "";
    refreshButton.disabled = Boolean(state.supportAction);
    header.appendChild(refreshButton);
    supportDetailNode.appendChild(header);

    const messages = createNode("div", "panel-support-messages");
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-label", `Mensajes de ${thread.reference_code || "la conversación"}`);
    messages.dataset.lenisPrevent = "";

    if (!state.supportMessages.length) {
      appendSupportState(messages, {
        icon: "?",
        title: "Sin mensajes disponibles",
        body: "Actualiza la conversación para volver a intentarlo.",
      });
    } else {
      state.supportMessages.forEach((message) => {
        const isAdmin = message.author_role === "admin";
        const item = createNode("article", `panel-support-message panel-support-message--${isAdmin ? "admin" : "client"}`);
        const author = createNode("strong", "", isAdmin ? "Soporte" : "Tú");
        const body = createNode("p", "", message.body || "");
        const time = createNode("time", "", formatDateTime(message.created_at));
        if (message.created_at) time.dateTime = message.created_at;
        item.append(author, body, time);
        messages.appendChild(item);
      });
    }
    supportDetailNode.appendChild(messages);

    const form = createNode("form", "panel-support-reply");
    form.dataset.supportReplyForm = "";
    form.noValidate = true;
    const isClosed = thread.status === "closed";
    const label = createNode("label", "panel-support-field");
    label.appendChild(createNode("span", "", isClosed ? "Reabrir con un mensaje" : "Tu respuesta"));
    const textarea = createNode("textarea");
    textarea.name = "message";
    textarea.rows = 3;
    textarea.maxLength = 4000;
    textarea.required = true;
    textarea.placeholder = isClosed ? "Explica qué necesitas para reabrir esta conversación." : "Escribe tu mensaje para soporte.";
    textarea.value = state.supportDraft;
    textarea.disabled = Boolean(state.supportAction);
    label.appendChild(textarea);
    const count = createNode("small", "", `${textLength(state.supportDraft)} / 4000`);
    count.dataset.supportReplyCount = "";
    label.appendChild(count);
    form.appendChild(label);

    const actions = createNode("div", "panel-support-reply__actions");
    if (!isClosed) {
      const closeButton = createNode("button", "panel-action panel-action--ghost", state.supportAction === "close" ? "Cerrando..." : "Cerrar conversación");
      closeButton.type = "button";
      closeButton.dataset.supportCloseThread = "";
      closeButton.disabled = Boolean(state.supportAction);
      actions.appendChild(closeButton);
    }
    const submitButton = createNode("button", "panel-action panel-action--primary", state.supportAction === "message"
      ? (isClosed ? "Reabriendo..." : "Enviando...")
      : (isClosed ? "Reabrir conversación" : "Enviar mensaje"));
    submitButton.type = "submit";
    submitButton.disabled = Boolean(state.supportAction);
    actions.appendChild(submitButton);
    form.appendChild(actions);
    supportDetailNode.appendChild(form);

    window.requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  };

  const renderSupport = () => {
    updateSupportUnreadCount();
    renderSupportNotice();
    renderSupportList();
    renderSupportDetail();
  };

  const loadSupportThreads = async () => {
    if (!state.user || state.supportLoading) return;
    const supabase = client();
    if (!supabase) {
      state.supportError = "El servicio de soporte no está disponible ahora mismo.";
      renderSupportList();
      return;
    }

    state.supportLoading = true;
    state.supportError = "";
    renderSupportList();

    try {
      const { data, error } = await supabase.rpc("get_my_support_threads", {
        p_status: null,
        p_limit: 50,
      });
      if (error) throw error;
      state.supportThreads = Array.isArray(data) ? data : [];
      state.supportLoaded = true;
      if (state.activeSupportThreadId && !getActiveSupportThread()) {
        state.activeSupportThreadId = "";
        state.supportMessages = [];
      }
    } catch (error) {
      state.supportError = supportErrorMessage(error, "No pudimos cargar tus conversaciones. Vuelve a intentarlo.");
    } finally {
      state.supportLoading = false;
      renderSupport();
    }
  };

  const markSupportThreadRead = async (thread, lastMessage) => {
    if (!thread?.has_unread || !lastMessage?.id) return;
    const supabase = client();
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc("mark_my_support_thread_read", {
        p_thread_id: thread.id,
        p_last_seen_message_id: lastMessage.id,
      });
      if (error) throw error;
      const currentThread = state.supportThreads.find((item) => item.id === thread.id);
      if (currentThread) currentThread.has_unread = false;
      updateSupportUnreadCount();
      renderSupportNotice();
      renderSupportList();
    } catch {
      // Reading messages remains available even if the non-critical read marker fails.
    }
  };

  const openSupportThread = async (threadId) => {
    const thread = state.supportThreads.find((item) => item.id === threadId);
    if (!thread || !state.user || state.supportAction) return;
    const supabase = client();
    if (!supabase) return;

    const request = state.supportDetailRequest + 1;
    state.supportDetailRequest = request;
    state.activeSupportThreadId = thread.id;
    state.supportMessages = [];
    state.supportDetailLoading = true;
    state.supportDetailError = "";
    state.supportDraft = "";
    state.supportMessageRequestId = "";
    renderSupport();

    try {
      const { data, error } = await supabase.rpc("get_my_support_thread_messages", {
        p_thread_id: thread.id,
        p_limit: 100,
      });
      if (error) throw error;
      if (request !== state.supportDetailRequest) return;
      state.supportMessages = Array.isArray(data) ? data : [];
      state.supportDetailLoading = false;
      renderSupportDetail();
      const lastMessage = state.supportMessages[state.supportMessages.length - 1];
      if (lastMessage) void markSupportThreadRead(thread, lastMessage);
    } catch (error) {
      if (request !== state.supportDetailRequest) return;
      state.supportDetailLoading = false;
      state.supportDetailError = supportErrorMessage(error, "No pudimos cargar los mensajes. Vuelve a intentarlo.");
      renderSupportDetail();
    }
  };

  const refreshSupportThread = async () => {
    const threadId = state.activeSupportThreadId;
    if (!threadId || state.supportAction) return;
    state.supportAction = "refresh";
    renderSupportDetail();
    await loadSupportThreads();
    state.supportAction = "";
    if (state.supportThreads.some((thread) => thread.id === threadId)) await openSupportThread(threadId);
    else renderSupportDetail();
  };

  const setSupportComposeStatus = (message = "", tone = "") => {
    if (!supportComposeStatus) return;
    supportComposeStatus.textContent = message;
    if (tone) supportComposeStatus.dataset.tone = tone;
    else delete supportComposeStatus.dataset.tone;
  };

  const updateSupportComposeCounts = () => {
    const subject = supportForm?.elements?.subject?.value || "";
    const message = supportForm?.elements?.message?.value || "";
    if (supportSubjectCount) supportSubjectCount.textContent = `${textLength(subject)} / 120`;
    if (supportMessageCount) supportMessageCount.textContent = `${textLength(message)} / 4000`;
  };

  const populateSupportOrders = (selectedOrderId = "") => {
    if (!supportOrderSelect) return;
    supportOrderSelect.replaceChildren();
    const generalOption = createNode("option", "", "Soporte general");
    generalOption.value = "";
    supportOrderSelect.appendChild(generalOption);
    state.orders.forEach((order) => {
      const option = createNode("option", "", `Pedido ${shortRef(order.id)} · ${formatDate(order.created_at)}`);
      option.value = order.id;
      supportOrderSelect.appendChild(option);
    });
    supportOrderSelect.value = state.orders.some((order) => order.id === selectedOrderId) ? selectedOrderId : "";
  };

  const setSupportComposeBusy = (isBusy) => {
    if (!supportForm) return;
    [...supportForm.elements].forEach((field) => {
      field.disabled = isBusy;
    });
    if (supportSubmitButton) supportSubmitButton.textContent = isBusy ? "Creando..." : "Crear conversación";
  };

  const openSupportComposer = (orderId = "") => {
    if (!supportModal || !supportOverlay || !supportForm || state.supportAction === "create") return;
    state.supportReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.supportCreateRequestId = "";
    supportForm.reset();
    populateSupportOrders(orderId);
    updateSupportComposeCounts();
    setSupportComposeStatus();
    supportForm.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
    supportOverlay.hidden = false;
    supportModal.hidden = false;
    supportModal.setAttribute("aria-hidden", "false");
    lockPanelPage();
    window.requestAnimationFrame(() => {
      supportOverlay.classList.add("is-visible");
      supportModal.classList.add("is-open");
      supportForm.elements.subject?.focus({ preventScroll: true });
    });
  };

  const closeSupportComposer = ({ force = false } = {}) => {
    if (!supportModal || supportModal.hidden || (state.supportAction === "create" && !force)) return;
    supportOverlay?.classList.remove("is-visible");
    supportModal.classList.remove("is-open");
    supportModal.setAttribute("aria-hidden", "true");
    unlockPanelPage();
    window.setTimeout(() => {
      if (!supportModal.classList.contains("is-open")) {
        if (supportOverlay) supportOverlay.hidden = true;
        supportModal.hidden = true;
        state.supportReturnFocus?.focus?.({ preventScroll: true });
        state.supportReturnFocus = null;
      }
    }, 220);
  };

  const submitSupportThread = async (event) => {
    event.preventDefault();
    if (!supportForm || state.supportAction) return;
    const subjectField = supportForm.elements.subject;
    const messageField = supportForm.elements.message;
    const orderField = supportForm.elements.orderId;
    const subject = `${subjectField?.value || ""}`.trim();
    const message = `${messageField?.value || ""}`.trim();
    const orderId = `${orderField?.value || ""}`;

    subjectField?.removeAttribute("aria-invalid");
    messageField?.removeAttribute("aria-invalid");
    orderField?.removeAttribute("aria-invalid");

    if (textLength(subject) < 3 || textLength(subject) > 120) {
      subjectField?.setAttribute("aria-invalid", "true");
      setSupportComposeStatus("El asunto debe tener entre 3 y 120 caracteres.", "error");
      subjectField?.focus();
      return;
    }
    if (textLength(message) < 1 || textLength(message) > 4000) {
      messageField?.setAttribute("aria-invalid", "true");
      setSupportComposeStatus("El mensaje debe tener entre 1 y 4000 caracteres.", "error");
      messageField?.focus();
      return;
    }
    if (orderId && !state.orders.some((order) => order.id === orderId)) {
      orderField?.setAttribute("aria-invalid", "true");
      setSupportComposeStatus("El pedido seleccionado no está disponible.", "error");
      orderField?.focus();
      return;
    }

    const supabase = client();
    if (!supabase) {
      setSupportComposeStatus("El servicio de soporte no está disponible ahora mismo.", "error");
      return;
    }

    try {
      state.supportCreateRequestId ||= createRequestId();
      state.supportAction = "create";
      setSupportComposeBusy(true);
      setSupportComposeStatus("Creando conversación...", "loading");
      const { data, error } = await supabase.rpc("create_my_support_thread", {
        p_subject: subject,
        p_message: message,
        p_order_id: orderId || null,
        p_request_id: state.supportCreateRequestId,
      });
      if (error) throw error;
      const createdThread = firstRpcRow(data);
      if (!createdThread?.id) throw new Error("thread_not_available");

      state.supportCreateRequestId = "";
      state.supportAction = "";
      setSupportComposeBusy(false);
      closeSupportComposer({ force: true });
      setSupportFeedback("Conversación creada. Soporte ya puede revisar tu mensaje.", "success");
      await loadSupportThreads();
      if (state.supportThreads.some((thread) => thread.id === createdThread.id)) await openSupportThread(createdThread.id);
    } catch (error) {
      state.supportAction = "";
      setSupportComposeBusy(false);
      setSupportComposeStatus(supportErrorMessage(error, "No pudimos crear la conversación. Vuelve a intentarlo."), "error");
    }
  };

  const submitSupportMessage = async (event) => {
    event.preventDefault();
    if (state.supportAction) return;
    const thread = getActiveSupportThread();
    const form = event.target.closest("[data-support-reply-form]");
    const textarea = form?.elements?.message;
    state.supportDraft = `${textarea?.value || ""}`;
    const message = `${textarea?.value || ""}`.trim();
    if (!thread) return;

    if (textLength(message) < 1 || textLength(message) > 4000) {
      textarea?.setAttribute("aria-invalid", "true");
      setSupportFeedback("El mensaje debe tener entre 1 y 4000 caracteres.", "error");
      textarea?.focus();
      return;
    }

    const supabase = client();
    if (!supabase) {
      setSupportFeedback("El servicio de soporte no está disponible ahora mismo.", "error");
      return;
    }

    try {
      state.supportMessageRequestId ||= createRequestId();
      state.supportAction = "message";
      renderSupportDetail();
      const isClosed = thread.status === "closed";
      const params = {
        p_thread_id: thread.id,
        p_message: message,
        p_request_id: state.supportMessageRequestId,
      };
      const { error } = isClosed
        ? await supabase.rpc("reopen_my_support_thread", params)
        : await supabase.rpc("add_my_support_message", params);
      if (error) throw error;

      state.supportDraft = "";
      state.supportMessageRequestId = "";
      state.supportAction = "";
      setSupportFeedback(isClosed ? "Conversación reabierta." : "Mensaje enviado.", "success");
      await loadSupportThreads();
      if (state.supportThreads.some((item) => item.id === thread.id)) await openSupportThread(thread.id);
    } catch (error) {
      state.supportAction = "";
      setSupportFeedback(supportErrorMessage(error, "No pudimos enviar el mensaje. Vuelve a intentarlo."), "error");
      renderSupportDetail();
    }
  };

  const closeCurrentSupportThread = async () => {
    const thread = getActiveSupportThread();
    if (!thread || thread.status === "closed" || state.supportAction) return;
    if (!window.confirm("¿Quieres cerrar esta conversación? Podrás reabrirla más adelante con un mensaje.")) return;
    const supabase = client();
    if (!supabase) return;

    state.supportAction = "close";
    renderSupportDetail();
    try {
      const { data, error } = await supabase.rpc("close_my_support_thread", {
        p_thread_id: thread.id,
      });
      if (error) throw error;
      const updatedThread = firstRpcRow(data);
      if (updatedThread) Object.assign(thread, updatedThread);
      state.supportAction = "";
      setSupportFeedback("Conversación cerrada. Puedes reabrirla cuando lo necesites.", "success");
      renderSupport();
      await loadSupportThreads();
    } catch (error) {
      state.supportAction = "";
      setSupportFeedback(supportErrorMessage(error, "No pudimos cerrar la conversación. Vuelve a intentarlo."), "error");
      renderSupportDetail();
    }
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
        <p>Abre una conversación con el pedido ${ref} ya seleccionado.</p>
        <div class="panel-order-actions">
          <button class="panel-action panel-action--primary" type="button" data-order-support="${order.id}">Nueva conversación</button>
          <a class="panel-action panel-action--secondary" href="${getWhatsappHref(`Hola, quiero ayuda con el pedido ${ref} de Destroyer Reviews.`)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
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

  const renderPanel = () => {
    renderSummary();
    renderPendingAction();
    renderTrialCard();
    renderOrders();
    renderSupport();
    updateWhatsappLinks();
  };

  const fetchPanelData = async () => {
    const session = await auth()?.getSession?.();
    const nextUser = session?.user || null;
    if (state.user?.id !== nextUser?.id) {
      state.supportThreads = [];
      state.supportMessages = [];
      state.supportLoaded = false;
      state.supportLoading = false;
      state.supportError = "";
      state.activeSupportThreadId = "";
      state.supportDetailLoading = false;
      state.supportDetailError = "";
      state.supportDetailRequest += 1;
      state.supportAction = "";
      state.supportDraft = "";
      state.supportMessageRequestId = "";
      state.supportCreateRequestId = "";
    }
    state.session = session || null;
    state.user = nextUser;

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
      activatePanelTab(window.location.hash.toLowerCase() === "#panel-support" ? "support" : state.activePanelTab);
      void loadSupportThreads();
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
    activatePanelTab(window.location.hash.toLowerCase() === "#panel-support" ? "support" : state.activePanelTab);
    void loadSupportThreads();
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
      activatePanelTab("support", { syncHash: true });
      openSupportComposer(supportButton.dataset.orderSupport);
      return;
    }
  });

  pendingNode?.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-order-open]");
    if (openButton) openDrawer(openButton.dataset.orderOpen);
  });

  drawerOverlay?.addEventListener("click", closeDrawer);
  drawerCloseButtons.forEach((button) => button.addEventListener("click", closeDrawer));
  drawerBody?.addEventListener("click", (event) => {
    const supportButton = event.target.closest("[data-order-support]");
    if (!supportButton) return;
    const orderId = supportButton.dataset.orderSupport;
    closeDrawer();
    activatePanelTab("support", { syncHash: true });
    openSupportComposer(orderId);
  });
  supportOverlay?.addEventListener("click", () => closeSupportComposer());
  supportModalCloseButtons.forEach((button) => button.addEventListener("click", () => closeSupportComposer()));
  supportNewButtons.forEach((button) => button.addEventListener("click", () => openSupportComposer()));
  supportNoticeButton?.addEventListener("click", () => {
    const thread = getMostRecentSupportAttentionThread();
    activatePanelTab("support", { syncHash: true });
    if (thread?.id) void openSupportThread(thread.id);
    window.requestAnimationFrame(() => {
      root.querySelector("[data-panel-support]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  supportForm?.addEventListener("submit", submitSupportThread);
  supportForm?.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea, select")) state.supportCreateRequestId = "";
    updateSupportComposeCounts();
    setSupportComposeStatus();
    event.target.removeAttribute?.("aria-invalid");
  });

  supportListNode?.addEventListener("click", (event) => {
    const threadButton = event.target.closest("[data-support-thread-id]");
    if (threadButton) {
      void openSupportThread(threadButton.dataset.supportThreadId);
      return;
    }
    if (event.target.closest("[data-support-retry]")) {
      void loadSupportThreads();
      return;
    }
    if (event.target.closest("[data-support-new-inline]")) openSupportComposer();
  });

  supportDetailNode?.addEventListener("click", (event) => {
    if (event.target.closest("[data-support-refresh-thread]")) {
      void refreshSupportThread();
      return;
    }
    if (event.target.closest("[data-support-close-thread]")) void closeCurrentSupportThread();
  });
  supportDetailNode?.addEventListener("submit", submitSupportMessage);
  supportDetailNode?.addEventListener("input", (event) => {
    if (!event.target.matches("[data-support-reply-form] textarea")) return;
    state.supportDraft = event.target.value;
    state.supportMessageRequestId = "";
    event.target.removeAttribute("aria-invalid");
    const count = event.target.closest("[data-support-reply-form]")?.querySelector("[data-support-reply-count]");
    if (count) count.textContent = `${textLength(state.supportDraft)} / 4000`;
    setSupportFeedback();
  });
  retryButton?.addEventListener("click", init);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeSupportComposer();
    }
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activatePanelTab(button.dataset.panelTab, { syncHash: true }));
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash.toLowerCase() === "#panel-support") activatePanelTab("support");
  });

  auth()?.onSessionChange?.((session) => {
    if (Boolean(session?.user) === Boolean(state.user) && session?.user?.id === state.user?.id) return;
    init();
  });

  init();
})();
