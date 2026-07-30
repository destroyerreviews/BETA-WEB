(() => {
  "use strict";

  const root = document.querySelector("[data-admin-root]");
  if (!root) return;

  const stateNodes = [...root.querySelectorAll("[data-admin-state]")];
  const adminEmail = root.querySelector("[data-admin-email]");
  const errorMessage = root.querySelector("[data-admin-error-message]");
  const retryButton = root.querySelector("[data-admin-retry]");
  const dataLoading = root.querySelector("[data-admin-data-loading]");
  const dataError = root.querySelector("[data-admin-data-error]");
  const dataRetryButton = root.querySelector("[data-admin-data-retry]");
  const dashboard = root.querySelector("[data-admin-dashboard]");
  const summaryNode = root.querySelector("[data-admin-summary]");
  const attentionNode = root.querySelector("[data-admin-attention]");
  const ordersList = root.querySelector("[data-admin-orders-list]");
  const ordersCount = root.querySelector("[data-admin-orders-count]");
  const filtersForm = root.querySelector("[data-admin-filters]");
  const searchInput = root.querySelector("[data-admin-search]");
  const filterInputs = [...root.querySelectorAll("[data-admin-filter]")];
  const partialWarning = root.querySelector("[data-admin-partial-warning]");
  const orderDialog = root.querySelector("[data-admin-order-dialog]");
  const orderDialogTitle = root.querySelector("[data-admin-order-dialog-title]");
  const orderDialogStatus = root.querySelector("[data-admin-order-dialog-status]");
  const orderDialogBody = root.querySelector("[data-admin-order-dialog-body]");
  const orderDialogClose = root.querySelector("[data-admin-order-dialog-close]");
  const copyFeedback = root.querySelector("[data-admin-copy-feedback]");
  const dialogCopyRef = root.querySelector("[data-admin-dialog-copy-ref]");
  const imageLightbox = root.querySelector("[data-admin-image-lightbox]");
  const imageLightboxImage = root.querySelector("[data-admin-image-lightbox-image]");
  const imageLightboxName = root.querySelector("[data-admin-image-lightbox-name]");
  const imageLightboxClose = root.querySelector("[data-admin-image-lightbox-close]");
  const navButtons = [...root.querySelectorAll("[data-admin-view-target]")];
  const viewNodes = [...root.querySelectorAll("[data-admin-view]")];
  const viewTitle = root.querySelector("[data-admin-view-title]");
  const viewDescription = root.querySelector("[data-admin-view-description]");
  const viewMeta = root.querySelector("[data-admin-view-meta]");
  const summaryShortcut = root.querySelector("[data-admin-summary-shortcut]");
  const REVIEW_MEDIA_BUCKET = "review-media";
  const SIGNED_MEDIA_TTL_SECONDS = 600;

  const adminState = {
    session: null,
    accessGranted: false,
    orders: [],
    items: [],
    reviews: [],
    media: [],
    viewOrders: [],
    partialErrors: {},
    filters: {
      search: "",
      status: "",
      payment: "",
      mode: "",
    },
    activeView: "summary",
    activeOrderId: "",
    copyFeedbackTimer: null,
    mediaGalleryStates: new Map(),
    mediaExpiryTimers: new Map(),
    activeLightboxReviewId: "",
  };

  const viewConfig = {
    summary: {
      title: "Resumen operativo",
      description: "Métricas y acciones que requieren atención.",
      meta: "Datos actuales",
    },
    orders: {
      title: "Pedidos",
      description: "Consulta, filtra y abre el detalle de cada pedido.",
      meta: "Más recientes primero",
    },
    reviews: {
      title: "Reseñas",
      description: "Espacio reservado para la revisión de textos y estados.",
      meta: "Próxima fase",
    },
    trials: {
      title: "Pruebas gratuitas",
      description: "Espacio reservado para gestionar las solicitudes.",
      meta: "Próxima fase",
    },
    clients: {
      title: "Clientes",
      description: "Espacio reservado para la vista ligera de clientes.",
      meta: "Próxima fase",
    },
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
    awaiting_client: "Esperando cliente",
    draft: "Borrador",
    submitted: "Personalización enviada",
    awaiting_team: "Pendiente de equipo",
    prepared: "Preparada",
    approved: "Aprobada",
    completed: "Completada",
  };

  const getSupabaseClient = () => window.DestroyerSupabase?.client || null;

  const escapeHtml = (value) => `${value ?? ""}`.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);

  const normalizeSearch = (value) => `${value ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const shortRef = (id) => `#${`${id || ""}`.replaceAll("-", "").slice(0, 8).toUpperCase() || "PEDIDO"}`;

  const formatDate = (value, includeTime = false) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-ES", includeTime
      ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  const formatMoney = (cents, currency = "EUR") => new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format((Number(cents) || 0) / 100);

  const pluralize = (value, singular, plural) => `${value} ${value === 1 ? singular : plural}`;

  const formatFileSize = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "Tamaño no disponible";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const amount = value / (1024 ** unitIndex);
    const precision = unitIndex === 0 || amount >= 10 ? 0 : 1;
    return `${amount.toFixed(precision)} ${units[unitIndex]}`;
  };

  const isImageMedia = (media) => media?.file_type === "image";
  const isVideoMedia = (media) => media?.file_type === "video";
  const isSupportedMedia = (media) => isImageMedia(media) || isVideoMedia(media);

  const mediaDomId = (reviewId) => `admin-review-media-${`${reviewId || ""}`.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const safeDownloadFileName = (value) => `${value || "archivo"}`
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180)
    .trim() || "archivo";

  const getReviewMedia = (reviewId) => adminState.media
    .filter((media) => media.order_review_id === reviewId)
    .filter(isSupportedMedia);

  const hasReviewMedia = (review) => getReviewMedia(review?.id).length > 0;

  const getReviewMediaPanel = (reviewId) => [...(orderDialogBody?.querySelectorAll("[data-review-media-panel]") || [])]
    .find((panel) => panel.dataset.reviewMediaPanel === reviewId) || null;

  const getReviewMediaButton = (reviewId) => [...(orderDialogBody?.querySelectorAll("[data-review-media-open]") || [])]
    .find((button) => button.dataset.reviewMediaOpen === reviewId) || null;

  const copyIconMarkup = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2"></rect>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
    </svg>
  `;

  const isWithinDays = (value, days) => {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
  };

  const orderTone = (status) => ({
    pending: "warning",
    review: "warning",
    in_progress: "info",
    completed: "success",
    cancelled: "danger",
  })[status] || "neutral";

  const paymentTone = (status) => ({
    unpaid: "warning",
    pending: "warning",
    paid: "success",
    failed: "danger",
    refunded: "danger",
  })[status] || "neutral";

  const reviewTone = (status) => ({
    awaiting_client: "warning",
    draft: "warning",
    submitted: "warning",
    awaiting_team: "info",
    prepared: "success",
    approved: "success",
    completed: "success",
  })[status] || "neutral";

  const managementLabel = (mode) => mode === "manual" ? "Cliente" : mode === "team" ? "Equipo" : "Sin modo";

  const getValidGoogleMapsUrl = (value) => {
    try {
      const url = new URL(`${value || ""}`);
      if (!['http:', 'https:'].includes(url.protocol)) return "";
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

  const getMailtoHref = (email) => {
    const value = `${email || ""}`.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "";
    return `mailto:${encodeURIComponent(value)}`;
  };

  const getWhatsappHref = (phone) => {
    const digits = `${phone || ""}`.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : "";
  };

  const showState = (stateName) => {
    stateNodes.forEach((node) => {
      node.hidden = node.dataset.adminState !== stateName;
    });
    root.setAttribute("aria-busy", String(stateName === "loading"));
    document.body.dataset.adminState = stateName;
  };

  const setDataState = (stateName) => {
    if (dataLoading) dataLoading.hidden = stateName !== "loading";
    if (dataError) dataError.hidden = stateName !== "error";
    if (dashboard) dashboard.hidden = stateName !== "ready";
  };

  const activateAdminView = (viewName) => {
    const nextView = viewConfig[viewName] ? viewName : "summary";
    const config = viewConfig[nextView];
    adminState.activeView = nextView;

    navButtons.forEach((button) => {
      const isActive = button.dataset.adminViewTarget === nextView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    viewNodes.forEach((view) => {
      const isActive = view.dataset.adminView === nextView;
      view.hidden = !isActive;
      view.classList.toggle("is-active", isActive);
    });

    if (viewTitle) viewTitle.textContent = config.title;
    if (viewDescription) viewDescription.textContent = config.description;
    if (viewMeta) viewMeta.textContent = config.meta;
  };

  const clearAdminData = () => {
    adminState.mediaExpiryTimers.forEach((timer) => window.clearTimeout(timer));
    adminState.orders = [];
    adminState.items = [];
    adminState.reviews = [];
    adminState.media = [];
    adminState.viewOrders = [];
    adminState.partialErrors = {};
    adminState.activeOrderId = "";
    adminState.activeLightboxReviewId = "";
    adminState.mediaGalleryStates.clear();
    adminState.mediaExpiryTimers.clear();
  };

  const renderLoading = () => {
    showState("loading");
  };

  const renderSignedOut = () => {
    clearAdminData();
    showState("signed-out");
  };

  const renderForbidden = () => {
    clearAdminData();
    showState("forbidden");
  };

  const renderAdminShell = (session) => {
    const email = session?.user?.email || "Admin verificado";
    if (adminEmail) adminEmail.innerHTML = escapeHtml(email);
    showState("shell");
    setDataState("loading");
  };

  const renderError = () => {
    clearAdminData();
    if (errorMessage) {
      errorMessage.textContent = "No hemos podido validar el acceso. Revisa tu conexión e inténtalo de nuevo.";
    }
    showState("error");
  };

  const getAdminSession = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  };

  const checkAdminAccess = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase.rpc("is_admin");
    if (error) throw error;
    return data === true;
  };

  const fetchOrders = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_name,customer_email,whatsapp,google_maps_url,notes,management_mode,currency,total_cents,status,payment_status,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchOrderItems = async (orderIds) => {
    if (!orderIds.length) return [];
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("order_items")
      .select("id,order_id,pack_slug,pack_name,reviews_count,quantity,unit_price_cents,subtotal_cents")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchOrderReviews = async (orderIds) => {
    if (!orderIds.length) return [];
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("order_reviews")
      .select("id,order_id,review_index,source,rating,review_text,review_notes,status")
      .in("order_id", orderIds)
      .order("review_index", { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchReviewMedia = async (orderIds) => {
    if (!orderIds.length) return [];
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("review_media")
      .select("id,order_review_id,order_id,file_path,file_name,file_type,mime_type,file_size_bytes,sort_order,created_at")
      .in("order_id", orderIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const getRelevantReviewState = (order, reviews) => {
    if (!reviews.length) return { status: "", label: "Sin reseñas", tone: "neutral" };
    const statuses = new Set(reviews.map((review) => review.status));

    if (order.management_mode === "manual") {
      if (statuses.has("submitted")) return { status: "submitted", label: "Personalización enviada", tone: "warning" };
      if (statuses.has("awaiting_client") || statuses.has("draft")) return { status: "awaiting_client", label: "Esperando cliente", tone: "warning" };
    }

    if (order.management_mode === "team" && statuses.has("awaiting_team")) {
      return { status: "awaiting_team", label: "Pendiente de equipo", tone: "info" };
    }

    for (const status of ["prepared", "approved", "completed"]) {
      if (statuses.has(status)) return { status, label: reviewStatusLabels[status], tone: "success" };
    }

    const fallback = reviews[0]?.status || "";
    return { status: fallback, label: reviewStatusLabels[fallback] || "Sin estado", tone: reviewTone(fallback) };
  };

  const buildAdminViewModel = () => {
    const itemsByOrder = new Map();
    const reviewsByOrder = new Map();
    const mediaByReview = new Map();

    adminState.items.forEach((item) => {
      const current = itemsByOrder.get(item.order_id) || [];
      current.push(item);
      itemsByOrder.set(item.order_id, current);
    });

    adminState.media.forEach((media) => {
      const current = mediaByReview.get(media.order_review_id) || [];
      current.push(media);
      mediaByReview.set(media.order_review_id, current);
    });

    adminState.reviews.forEach((review) => {
      const current = reviewsByOrder.get(review.order_id) || [];
      current.push({ ...review, media: mediaByReview.get(review.id) || [] });
      reviewsByOrder.set(review.order_id, current);
    });

    adminState.viewOrders = adminState.orders.map((order) => {
      const items = itemsByOrder.get(order.id) || [];
      const reviews = reviewsByOrder.get(order.id) || [];
      const packItems = items.filter((item) => item.pack_slug !== "personalizacion-resenas");
      const fallbackReviewCount = packItems.reduce((total, item) => total + ((Number(item.reviews_count) || 0) * (Number(item.quantity) || 1)), 0);
      const packSummary = adminState.partialErrors.items
        ? "Packs no disponibles"
        : packItems.length
          ? packItems.map((item) => `${item.pack_name || "Pack"} ×${Math.max(1, Number(item.quantity) || 1)}`).join(", ")
          : "Sin packs disponibles";

      return {
        ...order,
        ref: shortRef(order.id),
        items,
        reviews,
        reviewCount: reviews.length || fallbackReviewCount,
        packSummary,
        reviewState: adminState.partialErrors.reviews
          ? { status: "", label: "Reseñas no disponibles", tone: "neutral" }
          : getRelevantReviewState(order, reviews),
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return adminState.viewOrders;
  };

  const renderAdminSummary = () => {
    if (!summaryNode) return;
    const orders = adminState.viewOrders;
    const reviews = orders.flatMap((order) => order.reviews);
    const metrics = [
      { label: "Pedidos totales", value: orders.length, tone: "neutral" },
      { label: "Pedidos activos", value: orders.filter((order) => ["pending", "review", "in_progress"].includes(order.status)).length, tone: "info" },
      { label: "Personalizaciones enviadas", value: reviews.filter((review) => review.source === "client" && review.status === "submitted").length, tone: "warning" },
      { label: "Reseñas por preparar", value: reviews.filter((review) => review.status === "awaiting_team").length, tone: "warning" },
      { label: "Pedidos completados", value: orders.filter((order) => order.status === "completed").length, tone: "success" },
      { label: "Pedidos cancelados", value: orders.filter((order) => order.status === "cancelled").length, tone: "danger" },
    ];

    summaryNode.innerHTML = metrics.map((metric) => `
      <article class="admin-metric" data-tone="${metric.tone}">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${metric.value}</strong>
      </article>
    `).join("");
  };

  const renderAttentionActions = () => {
    if (!attentionNode) return;
    const alerts = [];

    adminState.viewOrders.forEach((order) => {
      const submitted = order.reviews.filter((review) => review.source === "client" && review.status === "submitted").length;
      const awaitingTeam = order.reviews.filter((review) => review.status === "awaiting_team").length;

      if (order.payment_status === "failed") {
        alerts.push({ priority: 1, tone: "danger", order, title: "Pago fallido", text: `${order.ref} requiere comprobar el estado de pago.` });
      }
      if (submitted) {
        alerts.push({ priority: 2, tone: "warning", order, title: "Personalización enviada", text: `${order.ref} tiene ${pluralize(submitted, "reseña", "reseñas")} enviada por el cliente.` });
      }
      if (awaitingTeam) {
        alerts.push({ priority: 3, tone: "info", order, title: "Pendiente de equipo", text: `${order.ref} tiene ${pluralize(awaitingTeam, "reseña", "reseñas")} por preparar.` });
      }
      if (order.status === "cancelled" && isWithinDays(order.updated_at || order.created_at, 30)) {
        alerts.push({ priority: 4, tone: "danger", order, title: "Pedido cancelado", text: `${order.ref} fue cancelado el ${formatDate(order.updated_at || order.created_at)}.` });
      }
    });

    const visibleAlerts = alerts
      .sort((a, b) => a.priority - b.priority || new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime())
      .slice(0, 5);

    if (!visibleAlerts.length) {
      attentionNode.innerHTML = `
        <div class="admin-calm-state">
          <span class="admin-status-icon" aria-hidden="true">✓</span>
          <div><strong>Todo bajo control</strong><p>No hay acciones urgentes ahora mismo.</p></div>
        </div>
      `;
      return;
    }

    attentionNode.innerHTML = visibleAlerts.map((alert) => `
      <article class="admin-attention-item" data-tone="${alert.tone}">
        <span class="admin-attention-item__marker" aria-hidden="true"></span>
        <div><strong>${escapeHtml(alert.title)}</strong><p>${escapeHtml(alert.text)}</p></div>
        <button type="button" data-order-open="${escapeHtml(alert.order.id)}">Ver pedido</button>
      </article>
    `).join("");
  };

  const renderSummaryShortcut = () => {
    if (!summaryShortcut) return;
    const total = adminState.viewOrders.length;

    if (!total) {
      summaryShortcut.innerHTML = "";
      summaryShortcut.hidden = true;
      return;
    }

    summaryShortcut.hidden = false;
    summaryShortcut.innerHTML = `
      <div>
        <span>Vista completa</span>
        <strong>${pluralize(total, "pedido disponible", "pedidos disponibles")}</strong>
        <p>Consulta la lista, aplica filtros y abre el detalle de cada pedido.</p>
      </div>
      <button class="admin-summary-shortcut__button" type="button" data-admin-go-orders>
        Ir a Pedidos
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
      </button>
    `;
  };

  const getFilteredOrders = () => {
    const search = normalizeSearch(adminState.filters.search);
    return adminState.viewOrders.filter((order) => {
      const searchable = normalizeSearch([order.ref, order.customer_name, order.customer_email, order.whatsapp].filter(Boolean).join(" "));
      return (!search || searchable.includes(search))
        && (!adminState.filters.status || order.status === adminState.filters.status)
        && (!adminState.filters.payment || order.payment_status === adminState.filters.payment)
        && (!adminState.filters.mode || order.management_mode === adminState.filters.mode);
    });
  };

  const renderOrderCard = (order) => `
    <article class="admin-order-row">
      <div class="admin-order-row__identity">
        <span class="admin-order-ref">${escapeHtml(order.ref)}</span>
        <div>
          <h4>${escapeHtml(order.customer_name || "Cliente sin nombre")}</h4>
          <p>${escapeHtml(order.customer_email || "Email no disponible")}</p>
        </div>
      </div>
      <div class="admin-order-row__meta">
        <div><span>Fecha</span><strong>${escapeHtml(formatDate(order.created_at))}</strong></div>
        <div><span>Total</span><strong>${escapeHtml(formatMoney(order.total_cents, order.currency))}</strong></div>
        <div><span>Reseñas</span><strong>${order.reviewCount}</strong></div>
      </div>
      <div class="admin-order-row__packs">
        <span>Packs</span>
        <p>${escapeHtml(order.packSummary)}</p>
      </div>
      <div class="admin-order-row__states">
        <span class="admin-state-chip" data-tone="${orderTone(order.status)}">${escapeHtml(orderStatusLabels[order.status] || "Sin estado")}</span>
        <span class="admin-state-chip" data-tone="${paymentTone(order.payment_status)}">${escapeHtml(paymentStatusLabels[order.payment_status] || "Pago sin estado")}</span>
        <span class="admin-state-chip" data-tone="${order.reviewState.tone}">${escapeHtml(order.reviewState.label)}</span>
        <span class="admin-management-chip" data-mode="${escapeHtml(order.management_mode)}" aria-label="Gestión: ${escapeHtml(managementLabel(order.management_mode))}">${escapeHtml(managementLabel(order.management_mode))}</span>
      </div>
      <div class="admin-order-row__action">
        <button class="admin-row-button" type="button" data-order-open="${escapeHtml(order.id)}">Ver pedido</button>
      </div>
    </article>
  `;

  const renderOrdersList = () => {
    if (!ordersList) return;
    const filteredOrders = getFilteredOrders();
    if (ordersCount) {
      const total = adminState.viewOrders.length;
      ordersCount.textContent = filteredOrders.length === total
        ? pluralize(total, "pedido", "pedidos")
        : `${filteredOrders.length} de ${total} pedidos`;
    }

    if (!adminState.viewOrders.length) {
      ordersList.innerHTML = `
        <div class="admin-orders-empty">
          <span class="admin-status-icon" aria-hidden="true">✓</span>
          <h4>No hay pedidos todavía</h4>
          <p>Los nuevos pedidos aparecerán aquí cuando se creen.</p>
        </div>
      `;
      return;
    }

    if (!filteredOrders.length) {
      ordersList.innerHTML = `
        <div class="admin-orders-empty">
          <h4>No hay resultados con estos filtros</h4>
          <p>Prueba otra referencia, estado, pago o modo de gestión.</p>
          <button class="admin-row-button" type="button" data-admin-clear-filters>Limpiar filtros</button>
        </div>
      `;
      return;
    }

    ordersList.innerHTML = filteredOrders.map(renderOrderCard).join("");
  };

  const renderFilters = () => {
    if (searchInput && searchInput.value !== adminState.filters.search) searchInput.value = adminState.filters.search;
    filterInputs.forEach((input) => {
      const filterName = input.dataset.adminFilter;
      if (filterName && input.value !== adminState.filters[filterName]) input.value = adminState.filters[filterName];
    });
    renderOrdersList();
  };

  const renderPartialWarning = () => {
    if (!partialWarning) return;
    const failedParts = Object.keys(adminState.partialErrors);
    if (!failedParts.length) {
      partialWarning.hidden = true;
      partialWarning.innerHTML = "";
      return;
    }
    const labels = { items: "packs", reviews: "reseñas", media: "conteos multimedia" };
    partialWarning.hidden = false;
    partialWarning.innerHTML = `<strong>Carga parcial</strong><span>No se pudieron recuperar ${escapeHtml(failedParts.map((part) => labels[part]).join(", "))}. El resto de la información sigue disponible.</span>`;
  };

  const renderAdminData = () => {
    buildAdminViewModel();
    renderAdminSummary();
    renderAttentionActions();
    renderSummaryShortcut();
    renderPartialWarning();
    renderFilters();
    setDataState("ready");
    activateAdminView(adminState.activeView);
  };

  const loadAdminData = async () => {
    if (!adminState.accessGranted) return;
    setDataState("loading");
    adminState.partialErrors = {};

    try {
      adminState.orders = await fetchOrders();
      const orderIds = adminState.orders.map((order) => order.id).filter(Boolean);
      const [itemsResult, reviewsResult, mediaResult] = await Promise.allSettled([
        fetchOrderItems(orderIds),
        fetchOrderReviews(orderIds),
        fetchReviewMedia(orderIds),
      ]);

      const assignResult = (result, key) => {
        if (result.status === "fulfilled") {
          adminState[key] = result.value;
        } else {
          adminState[key] = [];
          adminState.partialErrors[key] = true;
          console.error(`No se pudieron cargar ${key}.`, result.reason);
        }
      };

      assignResult(itemsResult, "items");
      assignResult(reviewsResult, "reviews");
      assignResult(mediaResult, "media");
      renderAdminData();
    } catch (error) {
      console.error("No se pudieron cargar los pedidos del panel admin.", error);
      setDataState("error");
    }
  };

  const getReviewContext = (review) => {
    const hasText = Boolean(`${review.review_text || ""}`.trim());
    if (review.source === "client") {
      if (hasText) return { label: "Texto del cliente", empty: "El cliente todavía no ha enviado el texto." };
      return { label: "Pendiente del cliente", empty: "El cliente todavía no ha enviado el texto." };
    }
    if (review.status === "awaiting_team") return { label: "Pendiente del equipo", empty: "El texto está pendiente de preparación por el equipo." };
    if (["prepared", "approved", "completed"].includes(review.status)) {
      return { label: "Texto preparado por el equipo", empty: "No hay texto preparado disponible." };
    }
    return { label: "Texto de reseña", empty: "No hay texto disponible." };
  };

  const renderReviewRating = (review) => {
    const rating = Number(review.rating);
    const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
    if (!hasRating) {
      return `
        <div class="admin-review-rating admin-review-rating--empty">
          <span class="admin-review-rating__label">Valoración</span>
          <strong>Sin valoración</strong>
        </div>
      `;
    }

    const stars = Array.from({ length: 5 }, (_, index) => `<span class="${index < rating ? "is-filled" : ""}">★</span>`).join("");
    return `
      <div class="admin-review-rating" aria-label="${rating} de 5 estrellas">
        <span class="admin-review-stars" aria-hidden="true">${stars}</span>
        <strong>${rating} ${rating === 1 ? "estrella" : "estrellas"}</strong>
        <small>${review.source === "client" ? "Valoración del cliente" : "Valoración registrada"}</small>
      </div>
    `;
  };

  const renderMediaError = (reviewId, message = "No se pudieron generar los enlaces temporales.") => `
    <div class="admin-review-media-state admin-review-media-state--error" role="alert">
      <span class="admin-review-media-state__icon" aria-hidden="true">!</span>
      <div>
        <strong>No se pudo cargar la multimedia</strong>
        <p>${escapeHtml(message)}</p>
      </div>
      <button class="admin-media-reload-button" type="button" data-review-media-reload="${escapeHtml(reviewId)}">Volver a cargar</button>
    </div>
  `;

  const renderMediaCard = (reviewId, item) => {
    const media = item.media;
    const typeLabel = isImageMedia(media) ? "Imagen" : "Vídeo";
    const fileName = `${media.file_name || ""}`.trim() || `${typeLabel} sin nombre`;
    const mimeType = `${media.mime_type || ""}`.trim();
    const metadata = [typeLabel, formatFileSize(media.file_size_bytes), mimeType].filter(Boolean);

    if (item.error || !item.signedUrl) {
      return `
        <article class="admin-media-card is-error">
          <div class="admin-media-preview admin-media-preview--error">
            <span class="admin-review-media-state__icon" aria-hidden="true">!</span>
            <strong>Enlace no disponible</strong>
            <span>Prueba a generar uno nuevo.</span>
          </div>
          <div class="admin-media-card__body">
            <strong title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</strong>
            <span>${escapeHtml(metadata.join(" · "))}</span>
          </div>
          <button class="admin-media-reload-button" type="button" data-review-media-reload="${escapeHtml(reviewId)}">Reintentar</button>
        </article>
      `;
    }

    const preview = isImageMedia(media)
      ? `<button class="admin-media-image-trigger" type="button" data-image-lightbox-open="${escapeHtml(media.id)}" data-review-id="${escapeHtml(reviewId)}" aria-label="Ver imagen en grande: ${escapeHtml(fileName)}">
          <img src="${escapeHtml(item.signedUrl)}" alt="Vista previa de ${escapeHtml(fileName)}" loading="lazy" data-review-media-asset="${escapeHtml(media.id)}" />
          <span class="admin-media-image-trigger__overlay" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" /></svg>
            Ver imagen
          </span>
        </button>`
      : `<video src="${escapeHtml(item.signedUrl)}" controls preload="metadata" aria-label="Vista previa de ${escapeHtml(fileName)}" data-review-media-asset="${escapeHtml(media.id)}"></video>`;

    return `
      <article class="admin-media-card">
        <div class="admin-media-preview" aria-busy="true">
          ${preview}
          <span class="admin-media-preview__status">Cargando vista previa…</span>
        </div>
        <div class="admin-media-card__body">
          <strong title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</strong>
          <span>${escapeHtml(metadata.join(" · "))}</span>
        </div>
        <button class="admin-media-download-button" type="button" data-review-media-download="${escapeHtml(media.id)}" data-review-id="${escapeHtml(reviewId)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
          <span>Descargar</span>
        </button>
      </article>
    `;
  };

  const bindReviewMediaAssets = (panel) => {
    panel.querySelectorAll("[data-review-media-asset]").forEach((asset) => {
      const preview = asset.closest(".admin-media-preview");
      const status = preview?.querySelector(".admin-media-preview__status");
      const markLoaded = () => {
        preview?.classList.add("is-loaded");
        preview?.setAttribute("aria-busy", "false");
      };
      const markError = () => {
        preview?.classList.add("is-error");
        preview?.setAttribute("aria-busy", "false");
        if (status) status.textContent = "No se pudo abrir. Vuelve a cargar el enlace.";
      };

      asset.addEventListener(asset.tagName === "VIDEO" ? "loadedmetadata" : "load", markLoaded, { once: true });
      asset.addEventListener("error", markError, { once: true });
      if (asset.tagName === "IMG" && asset.complete) {
        if (asset.naturalWidth) markLoaded();
        else markError();
      }
    });
  };

  const renderReviewMediaPreview = (reviewId) => {
    const panel = getReviewMediaPanel(reviewId);
    if (!panel) return;
    const state = adminState.mediaGalleryStates.get(reviewId) || { status: "idle", items: [] };
    panel.dataset.state = state.status;

    if (state.status === "loading") {
      panel.innerHTML = `
        <div class="admin-review-media-state" role="status">
          <span class="admin-media-spinner" aria-hidden="true"></span>
          <div><strong>Generando enlaces seguros</strong><p>Las vistas previas estarán disponibles en unos segundos.</p></div>
        </div>
      `;
      return;
    }

    if (state.status === "error") {
      panel.innerHTML = renderMediaError(reviewId, state.message);
      return;
    }

    if (state.status === "expired") {
      panel.innerHTML = `
        <div class="admin-review-media-state admin-review-media-state--expired" role="status">
          <span class="admin-review-media-state__icon" aria-hidden="true">↻</span>
          <div><strong>Los enlaces han caducado</strong><p>Genera enlaces nuevos para volver a ver o descargar estos archivos.</p></div>
          <button class="admin-media-reload-button" type="button" data-review-media-reload="${escapeHtml(reviewId)}">Volver a cargar</button>
        </div>
      `;
      return;
    }

    if (state.status === "empty") {
      panel.innerHTML = `
        <div class="admin-review-media-state" role="status">
          <div><strong>Sin multimedia</strong><p>Esta reseña no tiene archivos asociados.</p></div>
        </div>
      `;
      return;
    }

    if (state.status !== "loaded") {
      panel.innerHTML = "";
      return;
    }

    const successfulItems = state.items.filter((item) => item.signedUrl);
    if (!successfulItems.length) {
      panel.innerHTML = renderMediaError(reviewId);
      return;
    }

    panel.innerHTML = `
      <div class="admin-review-media-toolbar">
        <div>
          <strong>${pluralize(state.items.length, "archivo", "archivos")}</strong>
          <span><i aria-hidden="true"></i> Enlaces temporales, 10 minutos</span>
        </div>
        <button class="admin-media-reload-button" type="button" data-review-media-reload="${escapeHtml(reviewId)}">Volver a cargar</button>
      </div>
      <div class="admin-media-grid">
        ${state.items.map((item) => renderMediaCard(reviewId, item)).join("")}
      </div>
      <p class="admin-review-media-live" role="status" aria-live="polite" data-review-media-live></p>
    `;
    bindReviewMediaAssets(panel);
  };

  const createMediaSignedUrl = async (media, options = {}) => {
    if (!adminState.accessGranted || !adminState.session?.user) {
      throw new Error("La sesión admin ya no está validada.");
    }
    if (!isSupportedMedia(media) || !media?.file_path) {
      throw new Error("El archivo no tiene una ruta o un tipo válido.");
    }

    const supabase = getSupabaseClient();
    if (!supabase?.storage) throw new Error("Supabase Storage no está disponible.");
    const signedOptions = options.download
      ? { download: safeDownloadFileName(media.file_name) }
      : undefined;
    const { data, error } = await supabase.storage
      .from(REVIEW_MEDIA_BUCKET)
      .createSignedUrl(media.file_path, SIGNED_MEDIA_TTL_SECONDS, signedOptions);

    if (error) throw error;
    const signedUrl = data?.signedUrl || "";
    let parsedUrl;
    try {
      parsedUrl = new URL(signedUrl, window.location.origin);
    } catch {
      throw new Error("Storage devolvió un enlace no válido.");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Storage devolvió un enlace no válido.");
    }
    return {
      signedUrl: parsedUrl.href,
      expiresAt: Date.now() + (SIGNED_MEDIA_TTL_SECONDS * 1000),
    };
  };

  const resetImageLightbox = () => {
    adminState.activeLightboxReviewId = "";
    imageLightboxImage?.removeAttribute("src");
    if (imageLightboxImage) imageLightboxImage.alt = "";
    if (imageLightboxName) imageLightboxName.textContent = "";
  };

  const closeImageLightbox = () => {
    if (imageLightbox?.open) {
      imageLightbox.close();
      return;
    }
    resetImageLightbox();
  };

  const openImageLightbox = (reviewId, mediaId) => {
    if (!adminState.accessGranted || !adminState.session?.user || !imageLightbox || !imageLightboxImage) return;
    const state = adminState.mediaGalleryStates.get(reviewId);
    const item = state?.status === "loaded"
      ? state.items.find((candidate) => candidate.media.id === mediaId && isImageMedia(candidate.media))
      : null;
    const isActiveUrl = item?.signedUrl && state.expiresAt > Date.now();
    if (!isActiveUrl) {
      const liveRegion = getReviewMediaPanel(reviewId)?.querySelector("[data-review-media-live]");
      if (liveRegion) liveRegion.textContent = "La imagen ya no está disponible. Vuelve a cargar los enlaces.";
      return;
    }

    const fileName = `${item.media.file_name || ""}`.trim() || "Imagen sin nombre";
    adminState.activeLightboxReviewId = reviewId;
    imageLightboxImage.src = item.signedUrl;
    imageLightboxImage.alt = `Imagen ampliada: ${fileName}`;
    if (imageLightboxName) imageLightboxName.textContent = fileName;
    if (!imageLightbox.open) imageLightbox.showModal();
  };

  const scheduleReviewMediaExpiry = (reviewId, expiresAt) => {
    window.clearTimeout(adminState.mediaExpiryTimers.get(reviewId));
    const delay = Math.max(0, expiresAt - Date.now() + 250);
    const timer = window.setTimeout(() => {
      const current = adminState.mediaGalleryStates.get(reviewId);
      if (!current || current.expiresAt !== expiresAt) return;
      if (adminState.activeLightboxReviewId === reviewId) closeImageLightbox();
      adminState.mediaGalleryStates.set(reviewId, {
        status: "expired",
        items: current.items.map((item) => ({ media: item.media, signedUrl: "", error: null })),
      });
      renderReviewMediaPreview(reviewId);
    }, delay);
    adminState.mediaExpiryTimers.set(reviewId, timer);
  };

  const loadSignedMediaForReview = async (reviewId) => {
    if (!adminState.accessGranted || !adminState.session?.user) return;
    const mediaRows = getReviewMedia(reviewId);
    if (!mediaRows.length) {
      adminState.mediaGalleryStates.set(reviewId, { status: "empty", items: [] });
      renderReviewMediaPreview(reviewId);
      return;
    }

    adminState.mediaGalleryStates.set(reviewId, { status: "loading", items: [] });
    renderReviewMediaPreview(reviewId);

    const results = await Promise.allSettled(mediaRows.map((media) => createMediaSignedUrl(media)));
    if (!adminState.accessGranted) return;

    const items = results.map((result, index) => ({
      media: mediaRows[index],
      signedUrl: result.status === "fulfilled" ? result.value.signedUrl : "",
      error: result.status === "rejected" ? result.reason : null,
    }));
    const successfulResults = results.filter((result) => result.status === "fulfilled");
    const expiresAt = successfulResults.length
      ? Math.min(...successfulResults.map((result) => result.value.expiresAt))
      : 0;

    adminState.mediaGalleryStates.set(reviewId, successfulResults.length
      ? { status: "loaded", items, expiresAt }
      : { status: "error", items, message: "Storage no pudo crear ningún enlace temporal." });
    renderReviewMediaPreview(reviewId);
    if (expiresAt) scheduleReviewMediaExpiry(reviewId, expiresAt);
  };

  const openReviewMedia = async (reviewId) => {
    if (!adminState.accessGranted || !adminState.session?.user) return;
    const panel = getReviewMediaPanel(reviewId);
    const button = getReviewMediaButton(reviewId);
    if (!panel || !button || !getReviewMedia(reviewId).length) return;

    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    const label = button.querySelector("span");
    if (label) label.textContent = willOpen ? "Ocultar multimedia" : "Ver multimedia";
    if (!willOpen) return;

    const state = adminState.mediaGalleryStates.get(reviewId);
    if (state?.status === "loaded" && state.expiresAt > Date.now()) {
      renderReviewMediaPreview(reviewId);
      return;
    }
    await loadSignedMediaForReview(reviewId);
  };

  const downloadReviewMedia = async (reviewId, mediaId, button) => {
    if (!adminState.accessGranted || !adminState.session?.user) return;
    const media = getReviewMedia(reviewId).find((item) => item.id === mediaId);
    if (!media) return;
    const panel = getReviewMediaPanel(reviewId);
    const liveRegion = panel?.querySelector("[data-review-media-live]");
    const label = button.querySelector("span");
    const previousLabel = label?.textContent || "Descargar";
    button.disabled = true;
    if (label) label.textContent = "Preparando…";
    if (liveRegion) liveRegion.textContent = "Preparando descarga segura…";

    try {
      const { signedUrl } = await createMediaSignedUrl(media, { download: true });
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = safeDownloadFileName(media.file_name);
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (liveRegion) liveRegion.textContent = `Descarga preparada: ${link.download}`;
    } catch (error) {
      console.error("No se pudo generar el enlace temporal de descarga.", error);
      if (liveRegion) liveRegion.textContent = "No se pudo preparar la descarga. Vuelve a intentarlo.";
    } finally {
      button.disabled = false;
      if (label) label.textContent = previousLabel;
    }
  };

  const renderReviewDetail = (review) => {
    const imageCount = review.media.filter((media) => media.file_type === "image").length;
    const videoCount = review.media.filter((media) => media.file_type === "video").length;
    const context = getReviewContext(review);
    const reviewHasMedia = hasReviewMedia(review);
    const mediaMarkup = !adminState.partialErrors.media && reviewHasMedia
        ? `<div class="admin-review-card__media">
            <div class="admin-review-card__media-chips">
              ${imageCount ? `<span>${pluralize(imageCount, "imagen", "imágenes")}</span>` : ""}
              ${videoCount ? `<span>${pluralize(videoCount, "vídeo", "vídeos")}</span>` : ""}
            </div>
            <button class="admin-review-media-button" type="button" data-review-media-open="${escapeHtml(review.id)}" aria-expanded="false" aria-controls="${escapeHtml(mediaDomId(review.id))}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h.01M4 15l4-4 4 4 2-2 6 5" /></svg>
              <span>Ver multimedia</span>
            </button>
          </div>
          <div class="admin-review-media-panel" id="${escapeHtml(mediaDomId(review.id))}" data-review-media-panel="${escapeHtml(review.id)}" data-state="idle" hidden></div>`
      : "";

    return `
      <article class="admin-review-card">
        <header>
          <div class="admin-review-card__identity"><span>Reseña ${Number(review.review_index) || ""}</span><strong>${escapeHtml(context.label)}</strong></div>
          <span class="admin-state-chip" data-tone="${reviewTone(review.status)}">${escapeHtml(reviewStatusLabels[review.status] || "Sin estado")}</span>
        </header>
        ${renderReviewRating(review)}
        <div class="admin-review-card__text"><span>${escapeHtml(context.label)}</span><p>${review.review_text ? escapeHtml(review.review_text) : escapeHtml(context.empty)}</p></div>
        ${review.review_notes ? `<div class="admin-review-card__note"><span>Nota específica</span><p>${escapeHtml(review.review_notes)}</p></div>` : ""}
        ${mediaMarkup}
      </article>
    `;
  };

  const renderOrderDetail = (orderId) => {
    const order = adminState.viewOrders.find((item) => item.id === orderId);
    if (!order || !orderDialog || !orderDialogBody) return;
    adminState.activeOrderId = orderId;

    const mapsUrl = getValidGoogleMapsUrl(order.google_maps_url);
    const mailtoHref = getMailtoHref(order.customer_email);
    const whatsappHref = getWhatsappHref(order.whatsapp);
    const itemMarkup = adminState.partialErrors.items
      ? `<p class="admin-detail-muted">Los packs no están disponibles en esta carga.</p>`
      : order.items.length
        ? order.items.map((item) => `
          <article class="admin-detail-line">
            <div><strong>${escapeHtml(item.pack_name || "Pack")}</strong><span>${Number(item.quantity) || 1} × ${escapeHtml(formatMoney(item.unit_price_cents, order.currency))}</span></div>
            <strong>${escapeHtml(formatMoney(item.subtotal_cents, order.currency))}</strong>
          </article>
        `).join("")
        : `<p class="admin-detail-muted">No hay packs asociados.</p>`;

    const reviewsMarkup = adminState.partialErrors.reviews
      ? `<div class="admin-detail-inline-error">No se pudieron cargar las reseñas en esta consulta.</div>`
      : order.reviews.length
        ? order.reviews.map(renderReviewDetail).join("")
        : `<div class="admin-detail-empty"><strong>Sin reseñas asociadas</strong><p>Este pedido todavía no tiene reseñas disponibles.</p></div>`;

    if (orderDialogTitle) orderDialogTitle.textContent = order.ref;
    if (dialogCopyRef) dialogCopyRef.dataset.copyValue = order.ref;
    if (orderDialogStatus) orderDialogStatus.textContent = `${orderStatusLabels[order.status] || "Sin estado"} · ${paymentStatusLabels[order.payment_status] || "Pago sin estado"}`;

    orderDialogBody.innerHTML = `
      <section class="admin-detail-section admin-detail-section--customer">
        <div class="admin-detail-section__head"><h3>Cliente</h3><span class="admin-management-chip" data-mode="${escapeHtml(order.management_mode)}" aria-label="Gestión: ${escapeHtml(managementLabel(order.management_mode))}">${escapeHtml(managementLabel(order.management_mode))}</span></div>
        <div class="admin-detail-customer">
          <div><span>Nombre</span><strong>${escapeHtml(order.customer_name || "No disponible")}</strong></div>
          ${order.customer_email ? `
            <button class="admin-copy-value" type="button" data-copy-value="${escapeHtml(order.customer_email)}" aria-label="Copiar email ${escapeHtml(order.customer_email)}">
              <span>Email</span><strong>${escapeHtml(order.customer_email)}</strong>${copyIconMarkup}
            </button>
          ` : `<div><span>Email</span><strong>No disponible</strong></div>`}
          ${order.whatsapp ? `
            <button class="admin-copy-value" type="button" data-copy-value="${escapeHtml(order.whatsapp)}" aria-label="Copiar WhatsApp ${escapeHtml(order.whatsapp)}">
              <span>WhatsApp</span><strong>${escapeHtml(order.whatsapp)}</strong>${copyIconMarkup}
            </button>
          ` : `<div><span>WhatsApp</span><strong>No disponible</strong></div>`}
        </div>
        <div class="admin-detail-actions">
          ${mailtoHref ? `<a href="${escapeHtml(mailtoHref)}">Enviar email</a>` : ""}
          ${whatsappHref ? `<a href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>` : ""}
          ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>` : ""}
        </div>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Resumen</h3></div>
        <dl class="admin-detail-grid">
          <div><dt>Fecha</dt><dd>${escapeHtml(formatDate(order.created_at, true))}</dd></div>
          <div><dt>Total</dt><dd>${escapeHtml(formatMoney(order.total_cents, order.currency))}</dd></div>
          <div><dt>Estado</dt><dd><span class="admin-state-chip" data-tone="${orderTone(order.status)}">${escapeHtml(orderStatusLabels[order.status] || "Sin estado")}</span></dd></div>
          <div><dt>Pago</dt><dd><span class="admin-state-chip" data-tone="${paymentTone(order.payment_status)}">${escapeHtml(paymentStatusLabels[order.payment_status] || "Pago sin estado")}</span></dd></div>
          <div><dt>Gestión</dt><dd><span class="admin-management-chip" data-mode="${escapeHtml(order.management_mode)}">${escapeHtml(managementLabel(order.management_mode))}</span></dd></div>
          <div><dt>Reseñas</dt><dd>${order.reviewCount}</dd></div>
        </dl>
        <div class="admin-detail-note"><span>Notas generales</span><p>${order.notes ? escapeHtml(order.notes) : "Sin notas generales."}</p></div>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Packs comprados</h3></div>
        <div class="admin-detail-lines">${itemMarkup}</div>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Reseñas asociadas</h3><span>${order.reviewCount}</span></div>
        <div class="admin-detail-reviews">${reviewsMarkup}</div>
      </section>
    `;

    if (copyFeedback) copyFeedback.textContent = "";
    orderDialog.showModal();
    document.body.classList.add("admin-dialog-open");
  };

  const closeOrderDialog = () => {
    if (!orderDialog?.open) return;
    closeImageLightbox();
    orderDialog.close();
    document.body.classList.remove("admin-dialog-open");
    adminState.activeOrderId = "";
  };

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const clearFilters = () => {
    adminState.filters = { search: "", status: "", payment: "", mode: "" };
    renderFilters();
  };

  const initAdminPanel = async () => {
    renderLoading();
    adminState.accessGranted = false;
    adminState.session = null;

    try {
      const session = await getAdminSession();
      if (!session?.user) {
        renderSignedOut();
        return;
      }

      const hasAdminAccess = await checkAdminAccess();
      if (!hasAdminAccess) {
        renderForbidden();
        return;
      }

      adminState.session = session;
      adminState.accessGranted = true;
      renderAdminShell(session);
      await loadAdminData();
    } catch (error) {
      console.error("No se pudo validar el acceso al panel admin.", error);
      renderError();
    }
  };

  retryButton?.addEventListener("click", initAdminPanel);
  dataRetryButton?.addEventListener("click", loadAdminData);

  filtersForm?.addEventListener("submit", (event) => event.preventDefault());
  searchInput?.addEventListener("input", () => {
    adminState.filters.search = searchInput.value;
    renderOrdersList();
  });
  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      adminState.filters[input.dataset.adminFilter] = input.value;
      renderOrdersList();
    });
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => activateAdminView(button.dataset.adminViewTarget));
  });

  root.addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-order-open]");
    if (openButton) {
      renderOrderDetail(openButton.dataset.orderOpen);
      return;
    }

    const mediaButton = event.target.closest("[data-review-media-open]");
    if (mediaButton) {
      await openReviewMedia(mediaButton.dataset.reviewMediaOpen);
      return;
    }

    const mediaReloadButton = event.target.closest("[data-review-media-reload]");
    if (mediaReloadButton) {
      await loadSignedMediaForReview(mediaReloadButton.dataset.reviewMediaReload);
      return;
    }

    const mediaDownloadButton = event.target.closest("[data-review-media-download]");
    if (mediaDownloadButton) {
      await downloadReviewMedia(
        mediaDownloadButton.dataset.reviewId,
        mediaDownloadButton.dataset.reviewMediaDownload,
        mediaDownloadButton,
      );
      return;
    }

    const imageLightboxButton = event.target.closest("[data-image-lightbox-open]");
    if (imageLightboxButton) {
      openImageLightbox(
        imageLightboxButton.dataset.reviewId,
        imageLightboxButton.dataset.imageLightboxOpen,
      );
      return;
    }

    const clearButton = event.target.closest("[data-admin-clear-filters]");
    if (clearButton) {
      clearFilters();
      return;
    }

    const ordersButton = event.target.closest("[data-admin-go-orders]");
    if (ordersButton) {
      activateAdminView("orders");
      return;
    }

    const copyButton = event.target.closest("[data-copy-value]");
    if (copyButton) {
      try {
        await copyText(copyButton.dataset.copyValue || "");
        if (copyFeedback) {
          copyFeedback.textContent = "Copiado";
          window.clearTimeout(adminState.copyFeedbackTimer);
          adminState.copyFeedbackTimer = window.setTimeout(() => {
            copyFeedback.textContent = "";
          }, 1600);
        }
      } catch {
        if (copyFeedback) copyFeedback.textContent = "No se pudo copiar automáticamente.";
      }
    }
  });

  orderDialogClose?.addEventListener("click", closeOrderDialog);
  orderDialog?.addEventListener("close", () => document.body.classList.remove("admin-dialog-open"));
  orderDialog?.addEventListener("click", (event) => {
    if (event.target !== orderDialog) return;
    const rect = orderDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeOrderDialog();
  });
  imageLightboxClose?.addEventListener("click", closeImageLightbox);
  imageLightbox?.addEventListener("close", resetImageLightbox);
  imageLightbox?.addEventListener("click", (event) => {
    if (event.target !== imageLightbox) return;
    const rect = imageLightbox.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeImageLightbox();
  });
  imageLightboxImage?.addEventListener("error", () => {
    const reviewId = adminState.activeLightboxReviewId;
    closeImageLightbox();
    const liveRegion = getReviewMediaPanel(reviewId)?.querySelector("[data-review-media-live]");
    if (liveRegion) liveRegion.textContent = "No se pudo abrir la imagen ampliada. Vuelve a cargar los enlaces.";
  });

  window.DestroyerAdmin = {
    adminState,
    initAdminPanel,
    getAdminSession,
    checkAdminAccess,
    loadAdminData,
    fetchOrders,
    fetchOrderItems,
    fetchOrderReviews,
    fetchReviewMedia,
    getReviewMedia,
    hasReviewMedia,
    openReviewMedia,
    loadSignedMediaForReview,
    createMediaSignedUrl,
    renderReviewMediaPreview,
    renderMediaError,
    openImageLightbox,
    closeImageLightbox,
    formatFileSize,
    isImageMedia,
    isVideoMedia,
    buildAdminViewModel,
    renderLoading,
    renderSignedOut,
    renderForbidden,
    renderAdminShell,
    renderError,
    renderAdminSummary,
    renderAttentionActions,
    renderSummaryShortcut,
    renderOrdersList,
    renderOrderDetail,
    renderFilters,
    activateAdminView,
  };

  initAdminPanel();
})();
