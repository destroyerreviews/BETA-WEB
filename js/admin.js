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
  const reviewsCount = root.querySelector("[data-admin-reviews-count]");
  const reviewsMetrics = root.querySelector("[data-admin-reviews-metrics]");
  const reviewsFiltersForm = root.querySelector("[data-admin-reviews-filters]");
  const reviewsSearchInput = root.querySelector("[data-admin-reviews-search]");
  const reviewsFilterInputs = [...root.querySelectorAll("[data-admin-reviews-filter]")];
  const reviewsStatusInput = root.querySelector('[data-admin-reviews-filter="status"]');
  const reviewsRatingFilter = root.querySelector("[data-admin-reviews-rating-filter]");
  const reviewsMediaFilter = root.querySelector("[data-admin-reviews-media-filter]");
  const reviewsWarning = root.querySelector("[data-admin-reviews-warning]");
  const reviewsList = root.querySelector("[data-admin-reviews-list]");
  const orderDialog = root.querySelector("[data-admin-order-dialog]");
  const orderDialogTitle = root.querySelector("[data-admin-order-dialog-title]");
  const orderDialogStatus = root.querySelector("[data-admin-order-dialog-status]");
  const orderDialogBody = root.querySelector("[data-admin-order-dialog-body]");
  const orderDialogClose = root.querySelector("[data-admin-order-dialog-close]");
  const copyFeedback = root.querySelector("[data-admin-copy-feedback]");
  const dialogCopyRef = root.querySelector("[data-admin-dialog-copy-ref]");
  const reviewDialog = root.querySelector("[data-admin-review-dialog]");
  const reviewDialogTitle = root.querySelector("[data-admin-review-dialog-title]");
  const reviewDialogStatus = root.querySelector("[data-admin-review-dialog-status]");
  const reviewDialogBody = root.querySelector("[data-admin-review-dialog-body]");
  const reviewDialogClose = root.querySelector("[data-admin-review-dialog-close]");
  const reviewCopyRef = root.querySelector("[data-admin-review-copy-ref]");
  const reviewCopyFeedback = root.querySelector("[data-admin-review-copy-feedback]");
  const reviewPrepareDialog = root.querySelector("[data-admin-review-prepare-dialog]");
  const reviewPrepareDialogTitle = root.querySelector("[data-admin-review-prepare-dialog-title]");
  const reviewPrepareDialogStatus = root.querySelector("[data-admin-review-prepare-dialog-status]");
  const reviewPrepareDialogClose = root.querySelector("[data-admin-review-prepare-dialog-close]");
  const reviewPrepareForm = root.querySelector("[data-admin-review-prepare-form]");
  const reviewPrepareOrder = root.querySelector("[data-admin-review-prepare-order]");
  const reviewPrepareNumber = root.querySelector("[data-admin-review-prepare-number]");
  const reviewPrepareCurrentStatus = root.querySelector("[data-admin-review-prepare-current-status]");
  const reviewPrepareText = root.querySelector("[data-admin-review-prepare-text]");
  const reviewPrepareNotes = root.querySelector("[data-admin-review-prepare-notes]");
  const reviewPrepareFeedback = root.querySelector("[data-admin-review-prepare-feedback]");
  const reviewPrepareCancel = root.querySelector("[data-admin-review-prepare-cancel]");
  const reviewPrepareSave = root.querySelector("[data-admin-review-prepare-save]");
  const reviewEditDialog = root.querySelector("[data-admin-review-edit-dialog]");
  const reviewEditDialogTitle = root.querySelector("[data-admin-review-edit-dialog-title]");
  const reviewEditDialogStatus = root.querySelector("[data-admin-review-edit-dialog-status]");
  const reviewEditDialogClose = root.querySelector("[data-admin-review-edit-dialog-close]");
  const reviewEditForm = root.querySelector("[data-admin-review-edit-form]");
  const reviewEditOrder = root.querySelector("[data-admin-review-edit-order]");
  const reviewEditNumber = root.querySelector("[data-admin-review-edit-number]");
  const reviewEditCurrentStatus = root.querySelector("[data-admin-review-edit-current-status]");
  const reviewEditText = root.querySelector("[data-admin-review-edit-text]");
  const reviewEditNotes = root.querySelector("[data-admin-review-edit-notes]");
  const reviewEditFeedback = root.querySelector("[data-admin-review-edit-feedback]");
  const reviewEditCancel = root.querySelector("[data-admin-review-edit-cancel]");
  const reviewEditSave = root.querySelector("[data-admin-review-edit-save]");
  const reviewCompleteDialog = root.querySelector("[data-admin-review-complete-dialog]");
  const reviewCompleteDialogClose = root.querySelector("[data-admin-review-complete-dialog-close]");
  const reviewCompleteForm = root.querySelector("[data-admin-review-complete-form]");
  const reviewCompleteOrder = root.querySelector("[data-admin-review-complete-order]");
  const reviewCompleteNumber = root.querySelector("[data-admin-review-complete-number]");
  const reviewCompleteSource = root.querySelector("[data-admin-review-complete-source]");
  const reviewCompleteCurrentStatus = root.querySelector("[data-admin-review-complete-current-status]");
  const reviewCompleteFeedback = root.querySelector("[data-admin-review-complete-feedback]");
  const reviewCompleteCancel = root.querySelector("[data-admin-review-complete-cancel]");
  const reviewCompleteSave = root.querySelector("[data-admin-review-complete-save]");
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
  const freeTrialsCount = root.querySelector("[data-free-trials-count]");
  const freeTrialsMetrics = root.querySelector("[data-free-trials-metrics]");
  const freeTrialsFilters = root.querySelector("[data-free-trials-filters]");
  const freeTrialsSearch = root.querySelector("[data-free-trials-search]");
  const freeTrialsStatus = root.querySelector("[data-free-trials-status]");
  const freeTrialsError = root.querySelector("[data-free-trials-error]");
  const freeTrialsList = root.querySelector("[data-free-trials-list]");
  const freeTrialDialog = root.querySelector("[data-free-trial-dialog]");
  const freeTrialDialogTitle = root.querySelector("[data-free-trial-dialog-title]");
  const freeTrialDialogStatus = root.querySelector("[data-free-trial-dialog-status]");
  const freeTrialDialogBody = root.querySelector("[data-free-trial-dialog-body]");
  const freeTrialDialogClose = root.querySelector("[data-free-trial-dialog-close]");
  const freeTrialCopyRef = root.querySelector("[data-free-trial-copy-ref]");
  const freeTrialCopyFeedback = root.querySelector("[data-free-trial-copy-feedback]");
  const freeTrialStatusDialog = root.querySelector("[data-free-trial-status-dialog]");
  const freeTrialStatusDialogClose = root.querySelector("[data-free-trial-status-dialog-close]");
  const freeTrialStatusForm = root.querySelector("[data-free-trial-status-form]");
  const freeTrialStatusRef = root.querySelector("[data-free-trial-status-ref]");
  const freeTrialStatusCurrent = root.querySelector("[data-free-trial-status-current]");
  const freeTrialStatusMapsRow = root.querySelector("[data-free-trial-status-maps-row]");
  const freeTrialStatusMaps = root.querySelector("[data-free-trial-status-maps]");
  const freeTrialStatusClientNote = root.querySelector("[data-free-trial-status-client-note]");
  const freeTrialStatusReviewText = root.querySelector("[data-free-trial-status-review-text]");
  const freeTrialReviewRequirement = root.querySelector("[data-free-trial-review-requirement]");
  const freeTrialStatusFeedback = root.querySelector("[data-free-trial-status-feedback]");
  const freeTrialStatusCancel = root.querySelector("[data-free-trial-status-cancel]");
  const freeTrialStatusSave = root.querySelector("[data-free-trial-status-save]");
  const freeTrialStatusToast = root.querySelector("[data-free-trial-status-toast]");
  const clientsCount = root.querySelector("[data-admin-clients-count]");
  const clientsMetrics = root.querySelector("[data-admin-clients-metrics]");
  const clientsFiltersForm = root.querySelector("[data-admin-clients-filters]");
  const clientsSearchInput = root.querySelector("[data-admin-clients-search]");
  const clientsFilterInputs = [...root.querySelectorAll("[data-admin-clients-filter]")];
  const clientsList = root.querySelector("[data-admin-clients-list]");
  const clientDialog = root.querySelector("[data-admin-client-dialog]");
  const clientDialogTitle = root.querySelector("[data-admin-client-dialog-title]");
  const clientDialogStatus = root.querySelector("[data-admin-client-dialog-status]");
  const clientDialogBody = root.querySelector("[data-admin-client-dialog-body]");
  const clientDialogClose = root.querySelector("[data-admin-client-dialog-close]");
  const clientCopyFeedback = root.querySelector("[data-admin-client-copy-feedback]");
  const REVIEW_MEDIA_BUCKET = "review-media";
  const SIGNED_MEDIA_TTL_SECONDS = 600;

  const adminState = {
    session: null,
    accessGranted: false,
    dataReady: false,
    orders: [],
    items: [],
    reviews: [],
    media: [],
    viewOrders: [],
    viewReviews: [],
    freeTrialRequests: [],
    viewFreeTrialRequests: [],
    clients: [],
    partialErrors: {},
    filters: {
      search: "",
      status: "",
      payment: "",
      mode: "",
    },
    reviewFilters: {
      search: "",
      source: "",
      status: "",
      rating: "",
      media: "",
    },
    freeTrialFilters: {
      search: "",
      status: "",
    },
    clientFilters: {
      search: "",
      whatsapp: "",
      recurrent: "",
      mode: "",
    },
    activeView: "summary",
    activeOrderId: "",
    activeReviewId: "",
    activePreparationReviewId: "",
    preparationOrigin: "",
    preparationSaving: false,
    activeClientEditReviewId: "",
    clientEditOrigin: "",
    clientEditSaving: false,
    activeCompletionReviewId: "",
    completionOrigin: "",
    completionSaving: false,
    activeFreeTrialId: "",
    activeFreeTrialStatusId: "",
    freeTrialStatusOrigin: "",
    freeTrialStatusSaving: false,
    freeTrialStatusToastTimer: null,
    activeClientKey: "",
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
      description: "Textos y valoraciones asociados a pedidos.",
      meta: "Más recientes primero",
    },
    trials: {
      title: "Pruebas gratuitas",
      description: "Solicitudes recibidas desde la web.",
      meta: "Más recientes primero",
    },
    clients: {
      title: "Clientes",
      description: "Clientes detectados a partir de pedidos reales.",
      meta: "Último pedido primero",
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

  const reviewStatusOrder = [
    "awaiting_client",
    "draft",
    "submitted",
    "awaiting_team",
    "prepared",
    "approved",
    "completed",
  ];

  const freeTrialStatusLabels = {
    pending: "Pendiente",
    review: "En revisión",
    active: "En proceso",
    completed: "Completada",
  };
  const validFreeTrialStatuses = new Set(Object.keys(freeTrialStatusLabels));

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
  const shortFreeTrialRef = (id) => `#PT-${`${id || ""}`.replaceAll("-", "").slice(0, 8).toUpperCase() || "SOLICITUD"}`;

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

  const getReviewMediaContainer = () => {
    if (reviewDialog?.open) return reviewDialogBody;
    if (orderDialog?.open) return orderDialogBody;
    return reviewDialogBody || orderDialogBody;
  };

  const getReviewMediaPanel = (reviewId) => [...(getReviewMediaContainer()?.querySelectorAll("[data-review-media-panel]") || [])]
    .find((panel) => panel.dataset.reviewMediaPanel === reviewId) || null;

  const getReviewMediaButton = (reviewId) => [...(getReviewMediaContainer()?.querySelectorAll("[data-review-media-open]") || [])]
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

  const formatReviewStatus = (status) => reviewStatusLabels[status] || `${status || ""}`.trim() || "Sin estado";

  const formatReviewSource = (source) => ({
    client: "Cliente",
    team: "Equipo",
  })[source] || `${source || ""}`.trim() || "Sin origen";

  const getReviewBadgeType = (status) => reviewTone(status);

  const canPrepareTeamReview = (review) => Boolean(
    adminState.accessGranted
    && adminState.session?.user
    && adminState.dataReady
    && review?.source === "team"
    && ["awaiting_team", "prepared"].includes(review.status)
  );

  const canEditClientReview = (review) => Boolean(
    adminState.accessGranted
    && adminState.session?.user
    && adminState.dataReady
    && review?.source === "client"
    && review.status === "submitted"
  );

  const canCompleteReview = (review) => Boolean(
    adminState.accessGranted
    && adminState.session?.user
    && adminState.dataReady
    && (
      (review?.source === "team" && review.status === "prepared")
      || (review?.source === "client" && review.status === "submitted")
    )
  );

  const formatFreeTrialStatus = (status) => freeTrialStatusLabels[status] || "Sin estado";

  const getFreeTrialBadgeType = (status) => ({
    pending: "warning",
    review: "info",
    active: "active",
    completed: "success",
  })[status] || "neutral";

  const canManageFreeTrialRequest = (request) => Boolean(
    adminState.accessGranted
    && adminState.session?.user
    && adminState.dataReady
    && request?.id
  );

  const summarizeFreeTrialNote = (value, maxLength = 150) => {
    const note = `${value || ""}`.trim().replace(/\s+/g, " ");
    if (note.length <= maxLength) return note;
    return `${note.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };

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
    window.clearTimeout(adminState.freeTrialStatusToastTimer);
    if (freeTrialStatusToast) freeTrialStatusToast.hidden = true;
    adminState.orders = [];
    adminState.items = [];
    adminState.reviews = [];
    adminState.media = [];
    adminState.viewOrders = [];
    adminState.viewReviews = [];
    adminState.freeTrialRequests = [];
    adminState.viewFreeTrialRequests = [];
    adminState.clients = [];
    adminState.partialErrors = {};
    adminState.dataReady = false;
    adminState.activeOrderId = "";
    adminState.activeReviewId = "";
    adminState.activePreparationReviewId = "";
    adminState.preparationOrigin = "";
    adminState.preparationSaving = false;
    adminState.activeClientEditReviewId = "";
    adminState.clientEditOrigin = "";
    adminState.clientEditSaving = false;
    adminState.activeFreeTrialId = "";
    adminState.activeFreeTrialStatusId = "";
    adminState.freeTrialStatusOrigin = "";
    adminState.freeTrialStatusSaving = false;
    adminState.activeClientKey = "";
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
    adminState.dataReady = false;
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

  const assertAdminAccess = () => {
    if (!adminState.accessGranted || !adminState.session?.user) {
      throw new Error("La lectura requiere acceso admin confirmado");
    }
  };

  const fetchOrders = async () => {
    assertAdminAccess();
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("orders")
      .select("id,user_id,customer_name,customer_email,whatsapp,google_maps_url,notes,management_mode,currency,total_cents,status,payment_status,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchOrderItems = async (orderIds) => {
    if (!orderIds.length) return [];
    assertAdminAccess();
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
    assertAdminAccess();
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase
      .from("order_reviews")
      .select("id,order_id,review_index,source,rating,review_text,review_notes,status,created_at,updated_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false })
      .order("review_index", { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchReviewMedia = async (orderIds) => {
    if (!orderIds.length) return [];
    assertAdminAccess();
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

  const fetchFreeTrialRequests = async () => {
    assertAdminAccess();
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está disponible");
    const { data, error } = await supabase.rpc("admin_list_free_trial_requests");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
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

  const getClientKey = (order) => {
    const email = `${order?.customer_email || ""}`.trim().toLowerCase();
    if (email) return `email:${email}`;

    const userId = `${order?.user_id || ""}`.trim();
    if (userId) return `user:${userId}`;

    const name = normalizeSearch(order?.customer_name);
    const whatsapp = `${order?.whatsapp || ""}`.replace(/\D/g, "");
    if (name || whatsapp) return `contact:${name}|${whatsapp}`;

    return `order:${order?.id || ""}`;
  };

  const getClientOrders = (clientKey) => (
    adminState.clients.find((client) => client.key === clientKey)?.orders || []
  );

  const getClientStats = (orders) => {
    const activeStatuses = new Set(["pending", "review", "in_progress"]);
    return {
      orders: orders.length,
      active: orders.filter((order) => activeStatuses.has(order.status)).length,
      completed: orders.filter((order) => order.status === "completed").length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    };
  };

  const formatClientManagementMode = (orders) => {
    const modes = orders
      .map((order) => order.management_mode)
      .filter((mode) => mode === "manual" || mode === "team");
    if (!modes.length) return { value: "", label: "" };

    const counts = modes.reduce((result, mode) => {
      result[mode] = (result[mode] || 0) + 1;
      return result;
    }, {});
    const manualCount = counts.manual || 0;
    const teamCount = counts.team || 0;
    const firstKnownMode = orders.find((order) => order.management_mode === "manual" || order.management_mode === "team")?.management_mode;
    const value = manualCount === teamCount
      ? firstKnownMode
      : manualCount > teamCount ? "manual" : "team";
    return { value, label: managementLabel(value) };
  };

  const buildClientsViewModel = () => {
    assertAdminAccess();
    const groupedClients = new Map();

    adminState.viewOrders.forEach((order) => {
      const key = getClientKey(order);
      const current = groupedClients.get(key) || [];
      current.push(order);
      groupedClients.set(key, current);
    });

    adminState.clients = [...groupedClients.entries()].map(([key, groupedOrders]) => {
      const orders = [...groupedOrders].sort((a, b) => (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      const latestValue = (field) => orders.find((order) => `${order[field] || ""}`.trim())?.[field] || "";
      const currencyTotals = new Map();
      orders.forEach((order) => {
        const currency = `${order.currency || "EUR"}`.trim().toUpperCase() || "EUR";
        currencyTotals.set(currency, (currencyTotals.get(currency) || 0) + (Number(order.total_cents) || 0));
      });

      return {
        key,
        name: latestValue("customer_name"),
        email: latestValue("customer_email"),
        whatsapp: latestValue("whatsapp"),
        userId: latestValue("user_id"),
        orders,
        stats: getClientStats(orders),
        management: formatClientManagementMode(orders),
        currencyTotals: [...currencyTotals.entries()].map(([currency, totalCents]) => ({ currency, totalCents })),
        firstOrder: orders.at(-1) || null,
        lastOrder: orders[0] || null,
        mapsUrl: orders.map((order) => getValidGoogleMapsUrl(order.google_maps_url)).find(Boolean) || "",
      };
    }).sort((a, b) => (
      new Date(b.lastOrder?.created_at || 0).getTime() - new Date(a.lastOrder?.created_at || 0).getTime()
    ));

    return adminState.clients;
  };

  const formatClientSpend = (client) => client.currencyTotals
    .map(({ currency, totalCents }) => formatMoney(totalCents, currency))
    .join(" · ");

  const getClientSearchText = (client) => normalizeSearch([
    client.name,
    client.email,
    client.whatsapp,
  ].filter(Boolean).join(" "));

  const filterClients = () => {
    const search = normalizeSearch(adminState.clientFilters.search);
    return adminState.clients.filter((client) => (
      (!search || getClientSearchText(client).includes(search))
      && (!adminState.clientFilters.whatsapp || Boolean(client.whatsapp))
      && (!adminState.clientFilters.recurrent || client.stats.orders > 1)
      && (!adminState.clientFilters.mode || client.management.value === adminState.clientFilters.mode)
    ));
  };

  const formatClientStatusSummary = (client) => {
    const labels = [];
    if (client.stats.active) labels.push(pluralize(client.stats.active, "activo", "activos"));
    if (client.stats.completed) labels.push(pluralize(client.stats.completed, "completado", "completados"));
    if (client.stats.cancelled) labels.push(pluralize(client.stats.cancelled, "cancelado", "cancelados"));
    return labels.join(" · ") || "Sin estado";
  };

  const getReviewMediaCounts = (review) => {
    const media = Array.isArray(review?.media) ? review.media.filter(isSupportedMedia) : [];
    return {
      images: media.filter(isImageMedia).length,
      videos: media.filter(isVideoMedia).length,
      total: media.length,
    };
  };

  const buildReviewsViewModel = () => {
    if (adminState.partialErrors.reviews) {
      adminState.viewReviews = [];
      return adminState.viewReviews;
    }

    const ordersById = new Map(adminState.viewOrders.map((order) => [order.id, order]));
    const mediaByReview = new Map();
    if (!adminState.partialErrors.media) {
      adminState.media.filter(isSupportedMedia).forEach((media) => {
        const current = mediaByReview.get(media.order_review_id) || [];
        current.push(media);
        mediaByReview.set(media.order_review_id, current);
      });
    }

    adminState.viewReviews = adminState.reviews.map((review) => {
      const order = ordersById.get(review.order_id) || null;
      const media = mediaByReview.get(review.id) || [];
      return {
        ...review,
        order,
        orderRef: order?.ref || shortRef(review.order_id),
        sourceLabel: formatReviewSource(review.source),
        statusLabel: formatReviewStatus(review.status),
        badgeType: getReviewBadgeType(review.status),
        media,
        mediaCounts: getReviewMediaCounts({ media }),
      };
    }).sort((a, b) => {
      const dateA = new Date(a.created_at || a.order?.created_at || 0).getTime();
      const dateB = new Date(b.created_at || b.order?.created_at || 0).getTime();
      return dateB - dateA || (Number(a.review_index) || 0) - (Number(b.review_index) || 0);
    });

    return adminState.viewReviews;
  };

  const summarizeReviewText = (value, maxLength = 190) => {
    const text = `${value || ""}`.trim().replace(/\s+/g, " ");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };

  const getReviewSearchText = (review) => normalizeSearch([
    review.orderRef,
    review.order_id,
    review.review_text,
    review.review_notes,
    review.status,
    review.statusLabel,
    review.source,
    review.sourceLabel,
    review.order?.customer_name,
    review.order?.customer_email,
  ].filter(Boolean).join(" "));

  const filterReviews = () => {
    const search = normalizeSearch(adminState.reviewFilters.search);
    return adminState.viewReviews.filter((review) => (
      (!search || getReviewSearchText(review).includes(search))
      && (!adminState.reviewFilters.source || review.source === adminState.reviewFilters.source)
      && (!adminState.reviewFilters.status || review.status === adminState.reviewFilters.status)
      && (!adminState.reviewFilters.rating || `${review.rating ?? ""}` === adminState.reviewFilters.rating)
      && (!adminState.reviewFilters.media
        || (adminState.reviewFilters.media === "with" ? review.mediaCounts.total > 0 : review.mediaCounts.total === 0))
    ));
  };

  const renderReviewStars = (review, compact = false) => {
    const rating = Number(review?.rating);
    const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
    if (!hasRating) return "";
    const stars = Array.from({ length: 5 }, (_, index) => `<span class="${index < rating ? "is-filled" : ""}">★</span>`).join("");
    return `
      <div class="admin-review-stars-display${compact ? " admin-review-stars-display--compact" : ""}" aria-label="${rating} de 5 estrellas">
        <span class="admin-review-stars" aria-hidden="true">${stars}</span>
        <strong>${rating}/5</strong>
      </div>
    `;
  };

  const renderReviewMediaChips = (review) => {
    if (adminState.partialErrors.media || !review.mediaCounts.total) return "";
    return `
      <div class="admin-review-media-chips">
        ${review.mediaCounts.images ? `<span>${pluralize(review.mediaCounts.images, "imagen", "imágenes")}</span>` : ""}
        ${review.mediaCounts.videos ? `<span>${pluralize(review.mediaCounts.videos, "vídeo", "vídeos")}</span>` : ""}
      </div>
    `;
  };

  const renderReviewCard = (review) => {
    const reviewNumber = Number(review.review_index) || "";
    const text = summarizeReviewText(review.review_text);
    const note = summarizeReviewText(review.review_notes, 120);
    const context = getReviewContext(review);
    const order = review.order;

    return `
      <article class="admin-review-row">
        <header class="admin-review-row__head">
          <div class="admin-review-row__identity">
            <span class="admin-order-ref">${escapeHtml(review.orderRef)}</span>
            <div>
              <h4>Reseña ${escapeHtml(reviewNumber)}</h4>
              <p>${escapeHtml(order?.customer_name || order?.customer_email || "Pedido relacionado")}</p>
            </div>
          </div>
          <div class="admin-review-row__chips">
            <span class="admin-review-source-chip" data-source="${escapeHtml(review.source)}">${escapeHtml(review.sourceLabel)}</span>
            <span class="admin-state-chip" data-tone="${escapeHtml(review.badgeType)}">${escapeHtml(review.statusLabel)}</span>
          </div>
        </header>

        <div class="admin-review-row__content">
          <div class="admin-review-row__text${text ? "" : " is-empty"}">
            <span>${escapeHtml(context.label)}</span>
            <p>${escapeHtml(text || context.empty)}</p>
          </div>
          ${note ? `
            <div class="admin-review-row__note">
              <span>Nota</span>
              <p>${escapeHtml(note)}</p>
            </div>
          ` : ""}
        </div>

        <footer class="admin-review-row__foot">
          <div class="admin-review-row__facts">
            ${renderReviewStars(review, true)}
            ${renderReviewMediaChips(review)}
            ${review.created_at ? `<span class="admin-review-date">Creada ${escapeHtml(formatDate(review.created_at))}</span>` : ""}
          </div>
          <div class="admin-review-row__actions">
            <button class="admin-row-button" type="button" data-review-open="${escapeHtml(review.id)}">Ver detalle</button>
            ${order ? `<button class="admin-row-button admin-row-button--quiet" type="button" data-order-open="${escapeHtml(order.id)}">Abrir pedido</button>` : ""}
          </div>
        </footer>
      </article>
    `;
  };

  const renderReviewFilterOptions = () => {
    if (reviewsStatusInput) {
      const statuses = [...new Set(adminState.viewReviews.map((review) => review.status).filter(Boolean))]
        .sort((a, b) => {
          const indexA = reviewStatusOrder.indexOf(a);
          const indexB = reviewStatusOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      reviewsStatusInput.innerHTML = `
        <option value="">Todos</option>
        ${statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(formatReviewStatus(status))}</option>`).join("")}
      `;
    }

    const ratingInput = reviewsFilterInputs.find((input) => input.dataset.adminReviewsFilter === "rating");
    const ratings = [...new Set(adminState.viewReviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5))]
      .sort((a, b) => b - a);
    if (ratingInput) {
      ratingInput.innerHTML = `
        <option value="">Todas</option>
        ${ratings.map((rating) => `<option value="${rating}">${rating} ${rating === 1 ? "estrella" : "estrellas"}</option>`).join("")}
      `;
    }
    if (reviewsRatingFilter) reviewsRatingFilter.hidden = !ratings.length;
    if (!ratings.length) adminState.reviewFilters.rating = "";
    if (reviewsMediaFilter) reviewsMediaFilter.hidden = Boolean(adminState.partialErrors.media);
    if (adminState.partialErrors.media) adminState.reviewFilters.media = "";
  };

  const renderReviewsMetrics = () => {
    if (!reviewsMetrics) return;
    if (adminState.partialErrors.reviews) {
      reviewsMetrics.innerHTML = "";
      return;
    }

    const reviews = adminState.viewReviews;
    const metrics = [
      { label: "Reseñas totales", value: reviews.length, tone: "neutral" },
      { label: "Reseñas de cliente", value: reviews.filter((review) => review.source === "client").length, tone: "info" },
      { label: "Reseñas de equipo", value: reviews.filter((review) => review.source === "team").length, tone: "info" },
      { label: "Pendientes de cliente", value: reviews.filter((review) => review.source === "client" && ["awaiting_client", "draft"].includes(review.status)).length, tone: "warning" },
      { label: "Pendientes de equipo", value: reviews.filter((review) => review.source === "team" && review.status === "awaiting_team").length, tone: "warning" },
    ];
    if (!adminState.partialErrors.media) {
      metrics.push({ label: "Con multimedia", value: reviews.filter((review) => review.mediaCounts.total > 0).length, tone: "success" });
    }

    reviewsMetrics.innerHTML = metrics.map((metric) => `
      <article class="admin-metric" data-tone="${metric.tone}">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${metric.value}</strong>
      </article>
    `).join("");
  };

  const renderReviewsWarning = () => {
    if (!reviewsWarning) return;
    const reviewsFailed = Boolean(adminState.partialErrors.reviews);
    const mediaFailed = Boolean(adminState.partialErrors.media);
    reviewsWarning.hidden = !reviewsFailed && !mediaFailed;
    if (reviewsFailed) {
      reviewsWarning.innerHTML = "<strong>Reseñas no disponibles</strong><span>No se pudieron recuperar las reseñas en esta carga.</span>";
      return;
    }
    if (mediaFailed) {
      reviewsWarning.innerHTML = "<strong>Carga parcial</strong><span>Los conteos y el visor multimedia no están disponibles en esta carga.</span>";
      return;
    }
    reviewsWarning.innerHTML = "";
  };

  const renderReviewsView = () => {
    if (!reviewsList) return;
    const hasError = Boolean(adminState.partialErrors.reviews);
    if (reviewsFiltersForm) reviewsFiltersForm.hidden = hasError;
    renderReviewsMetrics();
    renderReviewsWarning();
    renderReviewFilterOptions();

    if (hasError) {
      if (reviewsCount) reviewsCount.textContent = "Datos no disponibles";
      reviewsList.innerHTML = "";
      return;
    }

    if (reviewsSearchInput && reviewsSearchInput.value !== adminState.reviewFilters.search) {
      reviewsSearchInput.value = adminState.reviewFilters.search;
    }
    reviewsFilterInputs.forEach((input) => {
      const filterName = input.dataset.adminReviewsFilter;
      if (filterName && input.value !== adminState.reviewFilters[filterName]) {
        input.value = adminState.reviewFilters[filterName];
      }
    });

    const filteredReviews = filterReviews();
    const total = adminState.viewReviews.length;
    if (reviewsCount) {
      reviewsCount.textContent = filteredReviews.length === total
        ? pluralize(total, "reseña", "reseñas")
        : `${filteredReviews.length} de ${total} reseñas`;
    }

    if (!total) {
      reviewsList.innerHTML = `
        <div class="admin-reviews-empty">
          <span class="admin-reviews-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"></path></svg>
          </span>
          <h4>Todavía no hay reseñas</h4>
          <p>Las reseñas asociadas a pedidos aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    if (!filteredReviews.length) {
      reviewsList.innerHTML = `
        <div class="admin-reviews-empty">
          <h4>No hay resultados con estos filtros</h4>
          <p>Prueba otra referencia, texto, nota, origen, estado o valoración.</p>
          <button class="admin-row-button" type="button" data-admin-reviews-clear>Limpiar filtros</button>
        </div>
      `;
      return;
    }

    reviewsList.innerHTML = filteredReviews.map(renderReviewCard).join("");
  };

  const buildFreeTrialsViewModel = () => {
    adminState.viewFreeTrialRequests = adminState.freeTrialRequests.map((request) => ({
      ...request,
      ref: shortFreeTrialRef(request.id),
      mapsUrl: getValidGoogleMapsUrl(request.google_maps_url),
      noteSummary: summarizeFreeTrialNote(request.note),
      statusLabel: formatFreeTrialStatus(request.status),
      badgeType: getFreeTrialBadgeType(request.status),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return adminState.viewFreeTrialRequests;
  };

  const getFreeTrialSearchText = (request) => normalizeSearch([
    request.ref,
    request.id,
    request.google_maps_url,
    request.note,
    request.review_text,
    request.status,
    request.statusLabel,
  ].filter(Boolean).join(" "));

  const filterFreeTrialRequests = () => {
    const search = normalizeSearch(adminState.freeTrialFilters.search);
    return adminState.viewFreeTrialRequests.filter((request) => (
      (!search || getFreeTrialSearchText(request).includes(search))
      && (!adminState.freeTrialFilters.status || request.status === adminState.freeTrialFilters.status)
    ));
  };

  const renderFreeTrialCard = (request) => `
    <article class="admin-free-trial-row">
      <div class="admin-free-trial-row__identity">
        <span class="admin-order-ref">${escapeHtml(request.ref)}</span>
        <div>
          <h4>Solicitud de prueba gratuita</h4>
          <p>${escapeHtml(request.google_maps_url || "Google Maps no disponible")}</p>
        </div>
      </div>
      <div class="admin-free-trial-row__meta">
        <div><span>Recibida</span><strong>${escapeHtml(formatDate(request.created_at))}</strong></div>
        <div><span>Estado</span><strong><span class="admin-state-chip" data-tone="${request.badgeType}">${escapeHtml(request.statusLabel)}</span></strong></div>
      </div>
      <div class="admin-free-trial-row__note">
        <span>Nota del cliente</span>
        <p>${escapeHtml(request.noteSummary || "Sin nota del cliente.")}</p>
      </div>
      <div class="admin-free-trial-row__actions">
        ${request.mapsUrl ? `<a class="admin-row-button" href="${escapeHtml(request.mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>` : ""}
        <button class="admin-row-button admin-free-trial-manage-button" type="button" data-free-trial-manage="${escapeHtml(request.id)}">Gestionar</button>
        <button class="admin-row-button" type="button" data-free-trial-open="${escapeHtml(request.id)}">Ver detalle</button>
      </div>
    </article>
  `;

  const renderFreeTrialMetrics = () => {
    if (!freeTrialsMetrics) return;
    if (adminState.partialErrors.freeTrials) {
      freeTrialsMetrics.innerHTML = "";
      return;
    }

    const requests = adminState.viewFreeTrialRequests;
    const metrics = [
      { label: "Solicitudes totales", value: requests.length, tone: "neutral" },
      { label: "Últimos 7 días", value: requests.filter((request) => isWithinDays(request.created_at, 7)).length, tone: "info" },
      { label: "Pendientes", value: requests.filter((request) => request.status === "pending").length, tone: "warning" },
      { label: "En proceso o completadas", value: requests.filter((request) => ["active", "completed"].includes(request.status)).length, tone: "success" },
    ];

    freeTrialsMetrics.innerHTML = metrics.map((metric) => `
      <article class="admin-metric" data-tone="${metric.tone}">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${metric.value}</strong>
      </article>
    `).join("");
  };

  const renderFreeTrialsView = () => {
    if (!freeTrialsList) return;
    const hasError = Boolean(adminState.partialErrors.freeTrials);
    if (freeTrialsError) freeTrialsError.hidden = !hasError;
    if (freeTrialsFilters) freeTrialsFilters.hidden = hasError;
    if (freeTrialsCount) {
      freeTrialsCount.textContent = hasError
        ? "Datos no disponibles"
        : pluralize(adminState.viewFreeTrialRequests.length, "solicitud", "solicitudes");
    }
    renderFreeTrialMetrics();

    if (hasError) {
      freeTrialsList.innerHTML = "";
      return;
    }

    if (freeTrialsSearch && freeTrialsSearch.value !== adminState.freeTrialFilters.search) {
      freeTrialsSearch.value = adminState.freeTrialFilters.search;
    }
    if (freeTrialsStatus && freeTrialsStatus.value !== adminState.freeTrialFilters.status) {
      freeTrialsStatus.value = adminState.freeTrialFilters.status;
    }

    const filteredRequests = filterFreeTrialRequests();
    if (!adminState.viewFreeTrialRequests.length) {
      freeTrialsList.innerHTML = `
        <div class="admin-free-trials-empty">
          <span class="admin-free-trials-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"></path></svg>
          </span>
          <h4>Todavía no hay solicitudes de prueba gratuita.</h4>
          <p>Las nuevas solicitudes recibidas desde la web aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    if (!filteredRequests.length) {
      freeTrialsList.innerHTML = `
        <div class="admin-free-trials-empty">
          <h4>No hay resultados con estos filtros</h4>
          <p>Prueba otra referencia, URL, nota del cliente, reseña o estado.</p>
          <button class="admin-row-button" type="button" data-free-trials-clear>Limpiar filtros</button>
        </div>
      `;
      return;
    }

    if (freeTrialsCount) {
      const total = adminState.viewFreeTrialRequests.length;
      freeTrialsCount.textContent = filteredRequests.length === total
        ? pluralize(total, "solicitud", "solicitudes")
        : `${filteredRequests.length} de ${total} solicitudes`;
    }
    freeTrialsList.innerHTML = filteredRequests.map(renderFreeTrialCard).join("");
  };

  const renderClientCard = (client) => {
    const displayName = client.name || client.email || client.whatsapp || "Cliente sin nombre";
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CL";
    const mailtoHref = getMailtoHref(client.email);
    const whatsappHref = getWhatsappHref(client.whatsapp);

    return `
      <article class="admin-client-row">
        <div class="admin-client-row__identity">
          <span class="admin-client-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
          <div>
            <h4>${escapeHtml(displayName)}</h4>
            <div class="admin-client-contact">
              ${client.email ? `
                <button type="button" data-copy-value="${escapeHtml(client.email)}" aria-label="Copiar email ${escapeHtml(client.email)}">
                  ${escapeHtml(client.email)}${copyIconMarkup}
                </button>
              ` : ""}
              ${client.whatsapp ? `
                <button type="button" data-copy-value="${escapeHtml(client.whatsapp)}" aria-label="Copiar WhatsApp ${escapeHtml(client.whatsapp)}">
                  ${escapeHtml(client.whatsapp)}${copyIconMarkup}
                </button>
              ` : ""}
            </div>
          </div>
        </div>
        <div class="admin-client-row__metrics">
          <div><span>Pedidos</span><strong>${client.stats.orders}</strong></div>
          <div><span>Importe total</span><strong>${escapeHtml(formatClientSpend(client))}</strong></div>
          <div><span>Último pedido</span><strong>${escapeHtml(formatDate(client.lastOrder?.created_at))}</strong></div>
        </div>
        <div class="admin-client-row__status">
          <span>${escapeHtml(formatClientStatusSummary(client))}</span>
          ${client.stats.orders > 1 ? `<strong class="admin-client-recurrent-chip">Recurrente</strong>` : ""}
          ${client.management.value ? `<strong class="admin-management-chip" data-mode="${escapeHtml(client.management.value)}">${escapeHtml(client.management.label)}</strong>` : ""}
        </div>
        <div class="admin-client-row__actions">
          ${mailtoHref ? `<a class="admin-client-quick-action" href="${escapeHtml(mailtoHref)}" aria-label="Enviar email a ${escapeHtml(client.email)}">Email</a>` : ""}
          ${whatsappHref ? `<a class="admin-client-quick-action" href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp de ${escapeHtml(client.whatsapp)}">WhatsApp</a>` : ""}
          <button class="admin-row-button" type="button" data-client-open="${escapeHtml(client.key)}">Ver detalle</button>
        </div>
      </article>
    `;
  };

  const renderClientsView = () => {
    if (!clientsList) return;
    const filteredClients = filterClients();
    const clients = adminState.clients;
    const metrics = [
      { label: "Clientes totales", value: clients.length, tone: "neutral" },
      { label: "Con pedidos activos", value: clients.filter((client) => client.stats.active > 0).length, tone: "info" },
      { label: "Con pedidos completados", value: clients.filter((client) => client.stats.completed > 0).length, tone: "success" },
      { label: "Con WhatsApp", value: clients.filter((client) => Boolean(client.whatsapp)).length, tone: "info" },
      { label: "Recurrentes", value: clients.filter((client) => client.stats.orders > 1).length, tone: "warning" },
    ];

    if (clientsMetrics) {
      clientsMetrics.innerHTML = metrics.map((metric) => `
        <article class="admin-metric" data-tone="${metric.tone}">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${metric.value}</strong>
        </article>
      `).join("");
    }

    if (clientsCount) {
      clientsCount.textContent = filteredClients.length === clients.length
        ? pluralize(clients.length, "cliente", "clientes")
        : `${filteredClients.length} de ${clients.length} clientes`;
    }

    if (clientsSearchInput && clientsSearchInput.value !== adminState.clientFilters.search) {
      clientsSearchInput.value = adminState.clientFilters.search;
    }
    clientsFilterInputs.forEach((input) => {
      const filterName = input.dataset.adminClientsFilter;
      if (filterName && input.value !== adminState.clientFilters[filterName]) {
        input.value = adminState.clientFilters[filterName];
      }
    });

    if (!clients.length) {
      clientsList.innerHTML = `
        <div class="admin-clients-empty">
          <span class="admin-client-avatar" aria-hidden="true">CL</span>
          <h4>No hay clientes detectados</h4>
          <p>Los clientes aparecerán aquí cuando existan pedidos reales autorizados.</p>
        </div>
      `;
      return;
    }

    if (!filteredClients.length) {
      clientsList.innerHTML = `
        <div class="admin-clients-empty">
          <h4>No hay clientes con estos filtros</h4>
          <p>Prueba otra búsqueda o combinación de filtros.</p>
          <button class="admin-row-button" type="button" data-admin-clients-clear>Limpiar filtros</button>
        </div>
      `;
      return;
    }

    clientsList.innerHTML = filteredClients.map(renderClientCard).join("");
  };

  const renderClientDetail = (clientKey) => {
    const client = adminState.clients.find((item) => item.key === clientKey);
    if (!client || !clientDialog || !clientDialogBody) return;
    adminState.activeClientKey = clientKey;

    const displayName = client.name || client.email || client.whatsapp || "Cliente sin nombre";
    const mailtoHref = getMailtoHref(client.email);
    const whatsappHref = getWhatsappHref(client.whatsapp);
    const clientOrders = getClientOrders(clientKey);
    const internalId = client.userId ? `${client.userId}`.slice(0, 8).toUpperCase() : "";

    if (clientDialogTitle) clientDialogTitle.textContent = displayName;
    if (clientDialogStatus) {
      clientDialogStatus.textContent = `${pluralize(client.stats.orders, "pedido", "pedidos")} · ${formatClientStatusSummary(client)}`;
    }

    clientDialogBody.innerHTML = `
      <section class="admin-detail-section admin-client-detail-hero">
        <div class="admin-detail-section__head">
          <h3>Contacto</h3>
          ${client.stats.orders > 1 ? `<span class="admin-client-recurrent-chip">Cliente recurrente</span>` : ""}
        </div>
        <div class="admin-detail-customer">
          ${client.name ? `<div><span>Nombre</span><strong>${escapeHtml(client.name)}</strong></div>` : ""}
          ${client.email ? `
            <button class="admin-copy-value" type="button" data-copy-value="${escapeHtml(client.email)}" aria-label="Copiar email ${escapeHtml(client.email)}">
              <span>Email</span><strong>${escapeHtml(client.email)}</strong>${copyIconMarkup}
            </button>
          ` : ""}
          ${client.whatsapp ? `
            <button class="admin-copy-value" type="button" data-copy-value="${escapeHtml(client.whatsapp)}" aria-label="Copiar WhatsApp ${escapeHtml(client.whatsapp)}">
              <span>WhatsApp</span><strong>${escapeHtml(client.whatsapp)}</strong>${copyIconMarkup}
            </button>
          ` : ""}
          ${internalId ? `<div><span>ID interno</span><strong>${escapeHtml(internalId)}</strong></div>` : ""}
        </div>
        ${(mailtoHref || whatsappHref || client.mapsUrl) ? `
          <div class="admin-detail-actions">
            ${mailtoHref ? `<a href="${escapeHtml(mailtoHref)}">Enviar email</a>` : ""}
            ${whatsappHref ? `<a href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>` : ""}
            ${client.mapsUrl ? `<a href="${escapeHtml(client.mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>` : ""}
          </div>
        ` : ""}
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Resumen real</h3></div>
        <dl class="admin-detail-grid">
          <div><dt>Pedidos totales</dt><dd>${client.stats.orders}</dd></div>
          <div><dt>Importe total</dt><dd>${escapeHtml(formatClientSpend(client))}</dd></div>
          <div><dt>Primer pedido</dt><dd>${escapeHtml(formatDate(client.firstOrder?.created_at, true))}</dd></div>
          <div><dt>Último pedido</dt><dd>${escapeHtml(formatDate(client.lastOrder?.created_at, true))}</dd></div>
          ${client.stats.active ? `<div><dt>Pedidos activos</dt><dd>${client.stats.active}</dd></div>` : ""}
          ${client.stats.completed ? `<div><dt>Completados</dt><dd>${client.stats.completed}</dd></div>` : ""}
          ${client.stats.cancelled ? `<div><dt>Cancelados</dt><dd>${client.stats.cancelled}</dd></div>` : ""}
          ${client.management.value ? `<div><dt>Gestión predominante</dt><dd><span class="admin-management-chip" data-mode="${escapeHtml(client.management.value)}">${escapeHtml(client.management.label)}</span></dd></div>` : ""}
        </dl>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Pedidos asociados</h3>
          <span>${clientOrders.length}</span>
        </div>
        <div class="admin-client-orders">
          ${clientOrders.map((order) => `
            <article class="admin-client-order">
              <div class="admin-client-order__ref">
                <button type="button" data-copy-value="${escapeHtml(order.ref)}" aria-label="Copiar referencia ${escapeHtml(order.ref)}">
                  ${escapeHtml(order.ref)}${copyIconMarkup}
                </button>
                <span>${escapeHtml(formatDate(order.created_at))}</span>
              </div>
              <div class="admin-client-order__total">
                <span>Total</span>
                <strong>${escapeHtml(formatMoney(order.total_cents, order.currency))}</strong>
              </div>
              <div class="admin-client-order__chips">
                <span class="admin-state-chip" data-tone="${orderTone(order.status)}">${escapeHtml(orderStatusLabels[order.status] || "Sin estado")}</span>
                <span class="admin-state-chip" data-tone="${paymentTone(order.payment_status)}">${escapeHtml(paymentStatusLabels[order.payment_status] || "Pago sin estado")}</span>
                ${order.management_mode ? `<span class="admin-management-chip" data-mode="${escapeHtml(order.management_mode)}">${escapeHtml(managementLabel(order.management_mode))}</span>` : ""}
              </div>
              <button class="admin-row-button" type="button" data-client-order-open="${escapeHtml(order.id)}">Abrir pedido</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;

    if (clientCopyFeedback) clientCopyFeedback.textContent = "";
    clientDialog.showModal();
    document.body.classList.add("admin-dialog-open");
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
      { label: "Clientes", value: adminState.clients.length, tone: "info" },
      { label: "Pruebas gratuitas", value: adminState.partialErrors.freeTrials ? "—" : adminState.viewFreeTrialRequests.length, tone: "info" },
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
    const failedParts = Object.keys(adminState.partialErrors).filter((part) => part !== "freeTrials");
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
    buildClientsViewModel();
    buildReviewsViewModel();
    buildFreeTrialsViewModel();
    adminState.dataReady = true;
    renderAdminSummary();
    renderAttentionActions();
    renderSummaryShortcut();
    renderPartialWarning();
    renderFilters();
    renderReviewsView();
    renderFreeTrialsView();
    renderClientsView();
    setDataState("ready");
    activateAdminView(adminState.activeView);
  };

  const loadAdminData = async () => {
    if (!adminState.accessGranted) return;
    adminState.dataReady = false;
    setDataState("loading");
    adminState.partialErrors = {};

    try {
      const [ordersResult, freeTrialsResult] = await Promise.allSettled([
        fetchOrders(),
        fetchFreeTrialRequests(),
      ]);

      if (ordersResult.status === "rejected") throw ordersResult.reason;
      adminState.orders = ordersResult.value;
      if (freeTrialsResult.status === "fulfilled") {
        adminState.freeTrialRequests = freeTrialsResult.value;
      } else {
        adminState.freeTrialRequests = [];
        adminState.partialErrors.freeTrials = true;
        console.error("No se pudieron cargar las solicitudes de prueba gratuita.", freeTrialsResult.reason);
      }

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

  const reloadFreeTrialRequests = async () => {
    if (!adminState.accessGranted) return;
    if (freeTrialsError) freeTrialsError.hidden = true;

    try {
      adminState.freeTrialRequests = await fetchFreeTrialRequests();
      delete adminState.partialErrors.freeTrials;
    } catch (error) {
      adminState.freeTrialRequests = [];
      adminState.partialErrors.freeTrials = true;
      console.error("No se pudieron recargar las solicitudes de prueba gratuita.", error);
    }

    buildFreeTrialsViewModel();
    renderAdminSummary();
    renderFreeTrialsView();
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

  const renderTeamReviewPrepareAction = (review, variant = "detail") => {
    if (!canPrepareTeamReview(review)) return "";
    const isPrepared = review.status === "prepared";
    const label = variant === "order"
      ? (isPrepared ? "Editar preparación" : "Preparar")
      : (isPrepared ? "Editar preparación" : "Preparar reseña");

    if (variant === "order") {
      return `<button class="admin-review-prepare-link" type="button" data-review-prepare="${escapeHtml(review.id)}">${escapeHtml(label)}</button>`;
    }

    return `
      <section class="admin-team-prepare-callout">
        <div>
          <span>${isPrepared ? "Texto preparado" : "Preparación pendiente"}</span>
          <p>${isPrepared ? "Puedes corregir la valoración, el texto o la nota interna." : "Prepara la valoración y el texto interno de esta reseña de equipo."}</p>
        </div>
        <button class="admin-button admin-button--primary" type="button" data-review-prepare="${escapeHtml(review.id)}">${escapeHtml(label)}</button>
      </section>
    `;
  };

  const renderClientReviewEditAction = (review, variant = "detail") => {
    if (!canEditClientReview(review)) return "";

    if (variant === "order") {
      return `<button class="admin-review-edit-link" type="button" data-review-edit="${escapeHtml(review.id)}">Corregir</button>`;
    }

    return `
      <section class="admin-client-edit-callout">
        <div>
          <span>Texto enviado por el cliente</span>
          <p>Corrige la valoración, el texto o la nota interna. No publica nada ni inicia acciones externas.</p>
        </div>
        <button class="admin-button admin-button--primary" type="button" data-review-edit="${escapeHtml(review.id)}">Corregir reseña</button>
      </section>
    `;
  };

  const renderCompleteReviewAction = (review, variant = "detail") => {
    if (!canCompleteReview(review)) return "";

    if (variant === "order") {
      return `<button class="admin-review-complete-link" type="button" data-review-complete="${escapeHtml(review.id)}">Finalizar</button>`;
    }

    return `
      <section class="admin-review-complete-callout">
        <div>
          <span>Marcar como completada</span>
          <p>Marca esta reseña como completada dentro del panel, sin iniciar acciones externas.</p>
        </div>
        <button class="admin-button admin-button--primary" type="button" data-review-complete="${escapeHtml(review.id)}">Finalizar reseña</button>
      </section>
    `;
  };

  const renderReviewCardActions = (review) => {
    const actions = [
      renderTeamReviewPrepareAction(review, "order"),
      renderClientReviewEditAction(review, "order"),
      renderCompleteReviewAction(review, "order"),
    ].filter(Boolean);
    return actions.length
      ? `<div class="admin-review-card__actions">${actions.join("")}</div>`
      : "";
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
        ${renderReviewCardActions(review)}
      </article>
    `;
  };

  const renderReviewDetailMedia = (review) => {
    if (adminState.partialErrors.media || !review.mediaCounts.total) return "";
    return `
      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Multimedia</h3>
          ${renderReviewMediaChips(review)}
        </div>
        <button class="admin-review-media-button admin-review-media-button--detail" type="button" data-review-media-open="${escapeHtml(review.id)}" aria-expanded="false" aria-controls="${escapeHtml(mediaDomId(review.id))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h.01M4 15l4-4 4 4 2-2 6 5"></path></svg>
          <span>Ver multimedia</span>
        </button>
        <div class="admin-review-media-panel" id="${escapeHtml(mediaDomId(review.id))}" data-review-media-panel="${escapeHtml(review.id)}" data-state="idle" hidden></div>
      </section>
    `;
  };

  const renderReviewDetailModal = (reviewId) => {
    const review = adminState.viewReviews.find((item) => item.id === reviewId);
    if (!review || !reviewDialog || !reviewDialogBody) return;
    const order = review.order;
    const reviewNumber = Number(review.review_index) || "";
    const context = getReviewContext(review);
    const reviewText = `${review.review_text || ""}`.trim();
    const reviewNotes = `${review.review_notes || ""}`.trim();
    const mapsUrl = getValidGoogleMapsUrl(order?.google_maps_url);
    adminState.activeReviewId = reviewId;

    if (reviewDialogTitle) reviewDialogTitle.textContent = `${review.orderRef} · Reseña ${reviewNumber}`;
    if (reviewDialogStatus) reviewDialogStatus.textContent = `${review.sourceLabel} · ${review.statusLabel}`;
    if (reviewCopyRef) reviewCopyRef.dataset.copyValue = review.orderRef;

    reviewDialogBody.innerHTML = `
      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Reseña</h3>
          <div class="admin-review-detail__chips">
            <span class="admin-review-source-chip" data-source="${escapeHtml(review.source)}">${escapeHtml(review.sourceLabel)}</span>
            <span class="admin-state-chip" data-tone="${escapeHtml(review.badgeType)}">${escapeHtml(review.statusLabel)}</span>
          </div>
        </div>
        <dl class="admin-detail-grid admin-review-detail-grid">
          <div><dt>Pedido</dt><dd>${escapeHtml(review.orderRef)}</dd></div>
          <div><dt>Número</dt><dd>Reseña ${escapeHtml(reviewNumber)}</dd></div>
          <div><dt>Origen</dt><dd>${escapeHtml(review.sourceLabel)}</dd></div>
          <div><dt>Estado</dt><dd>${escapeHtml(review.statusLabel)}</dd></div>
          <div><dt>Creada</dt><dd>${escapeHtml(formatDate(review.created_at, true))}</dd></div>
          <div><dt>Actualizada</dt><dd>${escapeHtml(formatDate(review.updated_at, true))}</dd></div>
        </dl>
        ${renderReviewStars(review)}
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Texto completo</h3>
          ${reviewText ? `<button class="admin-copy-section-button" type="button" data-copy-value="${escapeHtml(reviewText)}">${copyIconMarkup}<span>Copiar texto</span></button>` : ""}
        </div>
        <div class="admin-review-detail__text${reviewText ? "" : " is-empty"}">
          <span>${escapeHtml(context.label)}</span>
          <p>${escapeHtml(reviewText || context.empty)}</p>
        </div>
      </section>

      ${renderTeamReviewPrepareAction(review)}
      ${renderClientReviewEditAction(review)}
      ${renderCompleteReviewAction(review)}

      ${reviewNotes ? `
        <section class="admin-detail-section">
          <div class="admin-detail-section__head">
            <h3>Nota</h3>
            <button class="admin-copy-section-button" type="button" data-copy-value="${escapeHtml(reviewNotes)}">${copyIconMarkup}<span>Copiar nota</span></button>
          </div>
          <div class="admin-review-detail__note">
            <p>${escapeHtml(reviewNotes)}</p>
          </div>
        </section>
      ` : ""}

      ${order ? `
        <section class="admin-detail-section">
          <div class="admin-detail-section__head"><h3>Pedido relacionado</h3></div>
          <dl class="admin-detail-grid admin-review-order-grid">
            <div><dt>Cliente</dt><dd>${escapeHtml(order.customer_name || "No disponible")}</dd></div>
            <div><dt>Email</dt><dd>${escapeHtml(order.customer_email || "No disponible")}</dd></div>
            <div><dt>Fecha</dt><dd>${escapeHtml(formatDate(order.created_at, true))}</dd></div>
            <div><dt>Gestión</dt><dd>${escapeHtml(managementLabel(order.management_mode))}</dd></div>
            <div><dt>Estado</dt><dd><span class="admin-state-chip" data-tone="${orderTone(order.status)}">${escapeHtml(orderStatusLabels[order.status] || "Sin estado")}</span></dd></div>
            <div><dt>Pago</dt><dd><span class="admin-state-chip" data-tone="${paymentTone(order.payment_status)}">${escapeHtml(paymentStatusLabels[order.payment_status] || "Pago sin estado")}</span></dd></div>
          </dl>
          <div class="admin-detail-actions">
            <button type="button" data-review-order-open="${escapeHtml(order.id)}">Abrir pedido</button>
            ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>` : ""}
          </div>
        </section>
      ` : ""}

      ${renderReviewDetailMedia(review)}
    `;

    if (reviewCopyFeedback) reviewCopyFeedback.textContent = "";
    if (!reviewDialog.open) reviewDialog.showModal();
    document.body.classList.add("admin-dialog-open");
  };

  const renderFreeTrialDetail = (requestId) => {
    const request = adminState.viewFreeTrialRequests.find((item) => item.id === requestId);
    if (!request || !freeTrialDialog || !freeTrialDialogBody) return;
    adminState.activeFreeTrialId = requestId;

    if (freeTrialDialogTitle) freeTrialDialogTitle.textContent = request.ref;
    if (freeTrialDialogStatus) freeTrialDialogStatus.textContent = request.statusLabel;
    if (freeTrialCopyRef) freeTrialCopyRef.dataset.copyValue = request.ref;

    freeTrialDialogBody.innerHTML = `
      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Solicitud</h3>
          <span class="admin-state-chip" data-tone="${request.badgeType}">${escapeHtml(request.statusLabel)}</span>
        </div>
        <dl class="admin-detail-grid admin-free-trial-detail-grid">
          <div><dt>Referencia</dt><dd>${escapeHtml(request.ref)}</dd></div>
          <div><dt>Fecha de solicitud</dt><dd>${escapeHtml(formatDate(request.created_at, true))}</dd></div>
          <div><dt>Estado</dt><dd>${escapeHtml(request.statusLabel)}</dd></div>
          <div><dt>Última actualización</dt><dd>${escapeHtml(formatDate(request.updated_at, true))}</dd></div>
        </dl>
        <div class="admin-detail-actions">
          <button type="button" data-free-trial-manage="${escapeHtml(request.id)}">Cambiar estado</button>
        </div>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Google Maps</h3></div>
        <div class="admin-free-trial-map">
          <span>URL recibida</span>
          <p>${escapeHtml(request.google_maps_url || "No disponible")}</p>
          ${request.google_maps_url && !request.mapsUrl ? `<small>El enlace guardado no cumple la validación para abrir Google Maps.</small>` : ""}
        </div>
        ${request.mapsUrl ? `
          <div class="admin-detail-actions">
            <a href="${escapeHtml(request.mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>
          </div>
        ` : ""}
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head"><h3>Nota del cliente</h3></div>
        <div class="admin-detail-note">
          <span>Mensaje incluido al solicitar la prueba</span>
          <p>${request.note ? escapeHtml(request.note) : "Sin nota del cliente."}</p>
        </div>
      </section>

      <section class="admin-detail-section">
        <div class="admin-detail-section__head">
          <h3>Reseña gratuita</h3>
          ${renderReviewStars({ rating: 5 }, true)}
        </div>
        <div class="admin-detail-note">
          <span>Texto final preparado por el admin</span>
          <p>${request.review_text ? escapeHtml(request.review_text) : "Aún no hay texto final para esta prueba."}</p>
        </div>
      </section>
    `;

    if (freeTrialCopyFeedback) freeTrialCopyFeedback.textContent = "";
    if (!freeTrialDialog.open) freeTrialDialog.showModal();
    document.body.classList.add("admin-dialog-open");
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
    if (!orderDialog.open) orderDialog.showModal();
    document.body.classList.add("admin-dialog-open");
  };

  const getPreparationErrorMessage = (error) => {
    const errorText = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const knownErrors = [
      ["review_text_required", "Escribe el texto de la reseña."],
      ["invalid_rating", "Elige una valoración entre 3 y 5 estrellas."],
      ["invalid_review_status", "Esta reseña ya no se puede preparar desde aquí."],
      ["only_team_reviews_can_be_prepared", "Solo se pueden preparar reseñas del equipo."],
      ["admin_required", "No tienes permisos para esta acción."],
      ["authentication_required", "No tienes permisos para esta acción."],
    ];
    return knownErrors.find(([errorKey]) => errorText.includes(errorKey))?.[1]
      || "No se pudo guardar la preparación.";
  };

  const showPreparationFeedback = (message = "") => {
    if (!reviewPrepareFeedback) return;
    reviewPrepareFeedback.textContent = message;
    reviewPrepareFeedback.hidden = !message;
  };

  const setPreparationSaving = (isSaving) => {
    adminState.preparationSaving = isSaving;
    if (reviewPrepareSave) {
      reviewPrepareSave.disabled = isSaving;
      reviewPrepareSave.setAttribute("aria-busy", String(isSaving));
      const label = reviewPrepareSave.querySelector("span");
      if (label) label.textContent = isSaving ? "Guardando…" : "Guardar preparación";
    }
    if (reviewPrepareCancel) reviewPrepareCancel.disabled = isSaving;
    if (reviewPrepareDialogClose) reviewPrepareDialogClose.disabled = isSaving;
  };

  const resetPreparationState = () => {
    reviewPrepareForm?.reset();
    showPreparationFeedback();
    setPreparationSaving(false);
    adminState.activePreparationReviewId = "";
    adminState.preparationOrigin = "";
  };

  const closeReviewPreparationDialog = () => {
    if (!reviewPrepareDialog?.open || adminState.preparationSaving) return;
    reviewPrepareDialog.close();
  };

  const openReviewPreparationDialog = (reviewId, origin) => {
    const review = adminState.viewReviews.find((item) => item.id === reviewId);
    if (!reviewPrepareDialog || !reviewPrepareForm || !canPrepareTeamReview(review)) return;
    if (!['review', 'order'].includes(origin)) return;

    adminState.activePreparationReviewId = review.id;
    adminState.preparationOrigin = origin;
    setPreparationSaving(false);
    reviewPrepareForm.reset();
    showPreparationFeedback();

    const isPrepared = review.status === "prepared";
    if (reviewPrepareDialogTitle) reviewPrepareDialogTitle.textContent = isPrepared ? "Editar preparación" : "Preparar reseña";
    if (reviewPrepareDialogStatus) reviewPrepareDialogStatus.textContent = "Solo prepara el texto; no inicia ninguna acción externa.";
    if (reviewPrepareOrder) reviewPrepareOrder.textContent = review.orderRef;
    if (reviewPrepareNumber) reviewPrepareNumber.textContent = `Reseña ${Number(review.review_index) || "—"}`;
    if (reviewPrepareCurrentStatus) reviewPrepareCurrentStatus.textContent = review.statusLabel;

    const rating = Number(review.rating);
    if ([3, 4, 5].includes(rating)) {
      const ratingInput = reviewPrepareForm.querySelector(`input[name="review-rating"][value="${rating}"]`);
      if (ratingInput) ratingInput.checked = true;
    }
    if (reviewPrepareText) reviewPrepareText.value = review.review_text || "";
    if (reviewPrepareNotes) reviewPrepareNotes.value = review.review_notes || "";

    if (!reviewPrepareDialog.open) reviewPrepareDialog.showModal();
    document.body.classList.add("admin-dialog-open");
    window.requestAnimationFrame(() => {
      if (reviewPrepareText?.value) reviewPrepareText.focus();
      else reviewPrepareForm.querySelector('input[name="review-rating"]:checked, input[name="review-rating"]')?.focus();
    });
  };

  const replacePreparedReviewInMemory = (updatedReview) => {
    adminState.reviews = adminState.reviews.map((review) => (
      review.id === updatedReview.id ? { ...review, ...updatedReview } : review
    ));
  };

  const submitReviewPreparation = async () => {
    if (adminState.preparationSaving || !reviewPrepareForm) return;
    const review = adminState.reviews.find((item) => item.id === adminState.activePreparationReviewId);

    if (!adminState.accessGranted || !adminState.session?.user || !adminState.dataReady) {
      showPreparationFeedback("No tienes permisos para esta acción.");
      return;
    }
    if (!review || !["awaiting_team", "prepared"].includes(review.status)) {
      showPreparationFeedback("Esta reseña ya no se puede preparar desde aquí.");
      return;
    }
    if (review.source !== "team") {
      showPreparationFeedback("Solo se pueden preparar reseñas del equipo.");
      return;
    }

    const ratingInput = reviewPrepareForm.querySelector('input[name="review-rating"]:checked');
    const rating = Number(ratingInput?.value);
    const reviewText = `${reviewPrepareText?.value || ""}`.trim();
    const reviewNotes = `${reviewPrepareNotes?.value || ""}`.trim();

    if (![3, 4, 5].includes(rating)) {
      showPreparationFeedback("Elige una valoración entre 3 y 5 estrellas.");
      reviewPrepareForm.querySelector('input[name="review-rating"]')?.focus();
      return;
    }
    if (!reviewText) {
      showPreparationFeedback("Escribe el texto de la reseña.");
      reviewPrepareText?.focus();
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      showPreparationFeedback("No se pudo guardar la preparación.");
      return;
    }

    setPreparationSaving(true);
    showPreparationFeedback();
    try {
      const { data, error } = await supabase.rpc("admin_prepare_team_review", {
        p_review_id: review.id,
        p_rating: rating,
        p_review_text: reviewText,
        p_review_notes: reviewNotes || null,
      });
      if (error) throw error;

      const updatedReview = Array.isArray(data) ? data[0] : data;
      if (!updatedReview || updatedReview.id !== review.id) {
        throw new Error("invalid_prepare_response");
      }

      const origin = adminState.preparationOrigin;
      replacePreparedReviewInMemory(updatedReview);
      setPreparationSaving(false);
      reviewPrepareDialog?.close();
      renderAdminData();

      if (origin === "review" && reviewDialog?.open) {
        renderReviewDetailModal(updatedReview.id);
      } else if (origin === "order" && orderDialog?.open) {
        renderOrderDetail(updatedReview.order_id);
      }
      showCopyFeedback("Preparación guardada.");
    } catch (error) {
      console.error("No se pudo guardar la preparación de la reseña.", error);
      showPreparationFeedback(getPreparationErrorMessage(error));
      setPreparationSaving(false);
    }
  };

  const getClientEditErrorMessage = (error) => {
    const errorText = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const knownErrors = [
      ["review_text_required", "Escribe el texto de la reseña."],
      ["invalid_rating", "Elige una valoración entre 3 y 5 estrellas."],
      ["invalid_review_status", "Esta reseña ya no se puede corregir desde aquí."],
      ["only_client_reviews_can_be_edited", "Solo se pueden corregir reseñas enviadas por clientes."],
      ["admin_required", "No tienes permisos para esta acción."],
      ["authentication_required", "No tienes permisos para esta acción."],
    ];
    return knownErrors.find(([errorKey]) => errorText.includes(errorKey))?.[1]
      || "No se pudo guardar la corrección.";
  };

  const showClientEditFeedback = (message = "") => {
    if (!reviewEditFeedback) return;
    reviewEditFeedback.textContent = message;
    reviewEditFeedback.hidden = !message;
  };

  const setClientEditSaving = (isSaving) => {
    adminState.clientEditSaving = isSaving;
    if (reviewEditSave) {
      reviewEditSave.disabled = isSaving;
      reviewEditSave.setAttribute("aria-busy", String(isSaving));
      const label = reviewEditSave.querySelector("span");
      if (label) label.textContent = isSaving ? "Guardando…" : "Guardar corrección";
    }
    if (reviewEditCancel) reviewEditCancel.disabled = isSaving;
    if (reviewEditDialogClose) reviewEditDialogClose.disabled = isSaving;
  };

  const resetClientEditState = () => {
    reviewEditForm?.reset();
    showClientEditFeedback();
    setClientEditSaving(false);
    adminState.activeClientEditReviewId = "";
    adminState.clientEditOrigin = "";
  };

  const closeClientReviewEditDialog = () => {
    if (!reviewEditDialog?.open || adminState.clientEditSaving) return;
    reviewEditDialog.close();
  };

  const openClientReviewEditDialog = (reviewId, origin) => {
    const review = adminState.viewReviews.find((item) => item.id === reviewId);
    if (!reviewEditDialog || !reviewEditForm || !canEditClientReview(review)) return;
    if (!["review", "order"].includes(origin)) return;

    adminState.activeClientEditReviewId = review.id;
    adminState.clientEditOrigin = origin;
    setClientEditSaving(false);
    reviewEditForm.reset();
    showClientEditFeedback();

    if (reviewEditDialogTitle) reviewEditDialogTitle.textContent = "Corregir reseña";
    if (reviewEditDialogStatus) reviewEditDialogStatus.textContent = "Corrige el texto enviado por el cliente. No publica nada ni inicia acciones externas.";
    if (reviewEditOrder) reviewEditOrder.textContent = review.orderRef;
    if (reviewEditNumber) reviewEditNumber.textContent = `Reseña ${Number(review.review_index) || "—"}`;
    if (reviewEditCurrentStatus) reviewEditCurrentStatus.textContent = review.statusLabel;

    const rating = Number(review.rating);
    if ([3, 4, 5].includes(rating)) {
      const ratingInput = reviewEditForm.querySelector(`input[name="review-edit-rating"][value="${rating}"]`);
      if (ratingInput) ratingInput.checked = true;
    }
    if (reviewEditText) reviewEditText.value = review.review_text || "";
    if (reviewEditNotes) reviewEditNotes.value = review.review_notes || "";

    if (!reviewEditDialog.open) reviewEditDialog.showModal();
    document.body.classList.add("admin-dialog-open");
    window.requestAnimationFrame(() => {
      if (reviewEditText?.value) reviewEditText.focus();
      else reviewEditForm.querySelector('input[name="review-edit-rating"]:checked, input[name="review-edit-rating"]')?.focus();
    });
  };

  const replaceClientReviewContentInMemory = (updatedReview) => {
    adminState.reviews = adminState.reviews.map((review) => (
      review.id === updatedReview.id
        ? {
            ...review,
            rating: updatedReview.rating,
            review_text: updatedReview.review_text,
            review_notes: updatedReview.review_notes,
            updated_at: updatedReview.updated_at,
          }
        : review
    ));
  };

  const submitClientReviewEdit = async () => {
    if (adminState.clientEditSaving || !reviewEditForm) return;
    const review = adminState.reviews.find((item) => item.id === adminState.activeClientEditReviewId);

    if (!adminState.accessGranted || !adminState.session?.user || !adminState.dataReady) {
      showClientEditFeedback("No tienes permisos para esta acción.");
      return;
    }
    if (!review) {
      showClientEditFeedback("No se pudo guardar la corrección.");
      return;
    }
    if (review.source !== "client") {
      showClientEditFeedback("Solo se pueden corregir reseñas enviadas por clientes.");
      return;
    }
    if (review.status !== "submitted") {
      showClientEditFeedback("Esta reseña ya no se puede corregir desde aquí.");
      return;
    }

    const ratingInput = reviewEditForm.querySelector('input[name="review-edit-rating"]:checked');
    const rating = Number(ratingInput?.value);
    const reviewText = `${reviewEditText?.value || ""}`.trim();
    const reviewNotes = `${reviewEditNotes?.value || ""}`.trim();

    if (![3, 4, 5].includes(rating)) {
      showClientEditFeedback("Elige una valoración entre 3 y 5 estrellas.");
      reviewEditForm.querySelector('input[name="review-edit-rating"]')?.focus();
      return;
    }
    if (!reviewText) {
      showClientEditFeedback("Escribe el texto de la reseña.");
      reviewEditText?.focus();
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      showClientEditFeedback("No se pudo guardar la corrección.");
      return;
    }

    setClientEditSaving(true);
    showClientEditFeedback();
    try {
      const { data, error } = await supabase.rpc("admin_update_client_review_content", {
        p_review_id: review.id,
        p_rating: rating,
        p_review_text: reviewText,
        p_review_notes: reviewNotes || null,
      });
      if (error) throw error;

      const updatedReview = Array.isArray(data) ? data[0] : data;
      if (
        !updatedReview
        || updatedReview.id !== review.id
        || updatedReview.source !== "client"
        || updatedReview.status !== "submitted"
      ) {
        throw new Error("invalid_client_edit_response");
      }

      const origin = adminState.clientEditOrigin;
      replaceClientReviewContentInMemory(updatedReview);
      setClientEditSaving(false);
      reviewEditDialog?.close();
      renderAdminData();

      if (origin === "review" && reviewDialog?.open) {
        renderReviewDetailModal(updatedReview.id);
      } else if (origin === "order" && orderDialog?.open) {
        renderOrderDetail(updatedReview.order_id);
      }
      showCopyFeedback("Corrección guardada.");
    } catch (error) {
      console.error("No se pudo guardar la corrección de la reseña.", error);
      showClientEditFeedback(getClientEditErrorMessage(error));
      setClientEditSaving(false);
    }
  };

  const getCompletionErrorMessage = (error) => {
    const errorText = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const knownErrors = [
      ["invalid_review_status", "Esta reseña ya no se puede finalizar desde aquí."],
      ["invalid_review_source", "No se puede finalizar esta reseña desde aquí."],
      ["admin_required", "No tienes permisos para esta acción."],
      ["authentication_required", "No tienes permisos para esta acción."],
      ["review_not_found", "No se encontró la reseña."],
    ];
    return knownErrors.find(([errorKey]) => errorText.includes(errorKey))?.[1]
      || "No se pudo finalizar la reseña.";
  };

  const showCompletionFeedback = (message = "") => {
    if (!reviewCompleteFeedback) return;
    reviewCompleteFeedback.textContent = message;
    reviewCompleteFeedback.hidden = !message;
  };

  const setCompletionSaving = (isSaving) => {
    adminState.completionSaving = isSaving;
    if (reviewCompleteSave) {
      reviewCompleteSave.disabled = isSaving;
      reviewCompleteSave.setAttribute("aria-busy", String(isSaving));
      const label = reviewCompleteSave.querySelector("span");
      if (label) label.textContent = isSaving ? "Finalizando…" : "Finalizar reseña";
    }
    if (reviewCompleteCancel) reviewCompleteCancel.disabled = isSaving;
    if (reviewCompleteDialogClose) reviewCompleteDialogClose.disabled = isSaving;
  };

  const resetCompletionState = () => {
    showCompletionFeedback();
    setCompletionSaving(false);
    adminState.activeCompletionReviewId = "";
    adminState.completionOrigin = "";
  };

  const closeReviewCompletionDialog = () => {
    if (!reviewCompleteDialog?.open || adminState.completionSaving) return;
    reviewCompleteDialog.close();
  };

  const openReviewCompletionDialog = (reviewId, origin) => {
    const review = adminState.viewReviews.find((item) => item.id === reviewId);
    if (!reviewCompleteDialog || !reviewCompleteForm || !canCompleteReview(review)) return;
    if (!["review", "order"].includes(origin)) return;

    adminState.activeCompletionReviewId = review.id;
    adminState.completionOrigin = origin;
    setCompletionSaving(false);
    showCompletionFeedback();

    if (reviewCompleteOrder) reviewCompleteOrder.textContent = review.orderRef;
    if (reviewCompleteNumber) reviewCompleteNumber.textContent = `Reseña ${Number(review.review_index) || "—"}`;
    if (reviewCompleteSource) reviewCompleteSource.textContent = review.sourceLabel;
    if (reviewCompleteCurrentStatus) reviewCompleteCurrentStatus.textContent = review.statusLabel;

    if (!reviewCompleteDialog.open) reviewCompleteDialog.showModal();
    document.body.classList.add("admin-dialog-open");
    window.requestAnimationFrame(() => reviewCompleteCancel?.focus());
  };

  const replaceCompletedReviewInMemory = (updatedReview) => {
    adminState.reviews = adminState.reviews.map((review) => (
      review.id === updatedReview.id
        ? {
            ...review,
            status: updatedReview.status,
            updated_at: updatedReview.updated_at,
          }
        : review
    ));
  };

  const submitReviewCompletion = async () => {
    if (adminState.completionSaving || !reviewCompleteForm) return;
    const review = adminState.reviews.find((item) => item.id === adminState.activeCompletionReviewId);

    if (!adminState.accessGranted || !adminState.session?.user || !adminState.dataReady) {
      showCompletionFeedback("No tienes permisos para esta acción.");
      return;
    }
    if (!review) {
      showCompletionFeedback("No se encontró la reseña.");
      return;
    }
    if (!["team", "client"].includes(review.source)) {
      showCompletionFeedback("No se puede finalizar esta reseña desde aquí.");
      return;
    }
    if (
      (review.source === "team" && review.status !== "prepared")
      || (review.source === "client" && review.status !== "submitted")
    ) {
      showCompletionFeedback("Esta reseña ya no se puede finalizar desde aquí.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      showCompletionFeedback("No se pudo finalizar la reseña.");
      return;
    }

    setCompletionSaving(true);
    showCompletionFeedback();
    try {
      const { data, error } = await supabase.rpc("admin_complete_review", {
        p_review_id: review.id,
      });
      if (error) throw error;

      const updatedReview = Array.isArray(data) ? data[0] : data;
      if (
        !updatedReview
        || updatedReview.id !== review.id
        || updatedReview.order_id !== review.order_id
        || updatedReview.source !== review.source
        || updatedReview.status !== "completed"
      ) {
        throw new Error("invalid_complete_response");
      }

      const origin = adminState.completionOrigin;
      replaceCompletedReviewInMemory(updatedReview);
      setCompletionSaving(false);
      reviewCompleteDialog.close();
      renderAdminData();

      if (origin === "review" && reviewDialog?.open) {
        renderReviewDetailModal(updatedReview.id);
      } else if (origin === "order" && orderDialog?.open) {
        renderOrderDetail(updatedReview.order_id);
      }
      showCopyFeedback("Reseña completada.");
    } catch (error) {
      console.error("No se pudo finalizar la reseña.", error);
      showCompletionFeedback(getCompletionErrorMessage(error));
      setCompletionSaving(false);
    }
  };

  const getFreeTrialStatusErrorMessage = (error) => {
    const errorText = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const knownErrors = [
      ["invalid_free_trial_status", "El estado seleccionado no es válido."],
      ["request_not_found", "No se encontró la solicitud."],
      ["admin_required", "No tienes permisos para esta acción."],
      ["authentication_required", "No tienes permisos para esta acción."],
      ["review_text_required", "Escribe el texto final de la reseña."],
    ];
    return knownErrors.find(([errorKey]) => errorText.includes(errorKey))?.[1]
      || "No se pudo guardar el estado.";
  };

  const showFreeTrialStatusFeedback = (message = "") => {
    if (!freeTrialStatusFeedback) return;
    freeTrialStatusFeedback.textContent = message;
    freeTrialStatusFeedback.hidden = !message;
  };

  const showFreeTrialStatusToast = () => {
    if (!freeTrialStatusToast) return;
    window.clearTimeout(adminState.freeTrialStatusToastTimer);
    freeTrialStatusToast.hidden = false;
    adminState.freeTrialStatusToastTimer = window.setTimeout(() => {
      freeTrialStatusToast.hidden = true;
    }, 2400);
  };

  const syncFreeTrialReviewTextState = () => {
    const selectedStatus = freeTrialStatusForm
      ?.querySelector('input[name="free-trial-status"]:checked')
      ?.value;
    const canPrepareReview = selectedStatus === "active" || selectedStatus === "completed";
    const isCompleted = selectedStatus === "completed";

    if (freeTrialStatusReviewText) {
      freeTrialStatusReviewText.required = isCompleted;
      freeTrialStatusReviewText.setAttribute("aria-required", String(isCompleted));
      freeTrialStatusReviewText.disabled = adminState.freeTrialStatusSaving || !canPrepareReview;
      freeTrialStatusReviewText.closest(".admin-free-trial-review-field")
        ?.classList.toggle("is-disabled", !canPrepareReview);
    }
    if (freeTrialReviewRequirement) {
      freeTrialReviewRequirement.textContent = isCompleted
        ? "Obligatorio"
        : selectedStatus === "active"
          ? "Opcional en En proceso"
          : "Disponible en En proceso";
    }
  };

  const setFreeTrialStatusSaving = (isSaving) => {
    adminState.freeTrialStatusSaving = isSaving;
    if (freeTrialStatusSave) {
      freeTrialStatusSave.disabled = isSaving;
      freeTrialStatusSave.setAttribute("aria-busy", String(isSaving));
      const label = freeTrialStatusSave.querySelector("span");
      if (label) label.textContent = isSaving ? "Guardando…" : "Guardar estado";
    }
    if (freeTrialStatusCancel) freeTrialStatusCancel.disabled = isSaving;
    if (freeTrialStatusDialogClose) freeTrialStatusDialogClose.disabled = isSaving;
    freeTrialStatusForm?.querySelectorAll('input[name="free-trial-status"]').forEach((control) => {
      control.disabled = isSaving;
    });
    syncFreeTrialReviewTextState();
  };

  const resetFreeTrialStatusState = () => {
    freeTrialStatusForm?.reset();
    showFreeTrialStatusFeedback();
    setFreeTrialStatusSaving(false);
    adminState.activeFreeTrialStatusId = "";
    adminState.freeTrialStatusOrigin = "";
  };

  const closeFreeTrialStatusDialog = () => {
    if (!freeTrialStatusDialog?.open || adminState.freeTrialStatusSaving) return;
    freeTrialStatusDialog.close();
  };

  const openFreeTrialStatusDialog = (requestId, origin) => {
    const request = adminState.viewFreeTrialRequests.find((item) => item.id === requestId);
    if (!freeTrialStatusDialog || !freeTrialStatusForm || !canManageFreeTrialRequest(request)) return;
    if (!["list", "detail"].includes(origin)) return;

    adminState.activeFreeTrialStatusId = request.id;
    adminState.freeTrialStatusOrigin = origin;
    freeTrialStatusForm.reset();
    setFreeTrialStatusSaving(false);
    showFreeTrialStatusFeedback();

    if (freeTrialStatusRef) freeTrialStatusRef.textContent = request.ref;
    if (freeTrialStatusCurrent) {
      freeTrialStatusCurrent.textContent = request.statusLabel;
      freeTrialStatusCurrent.dataset.tone = request.badgeType;
    }

    const mapsUrl = `${request.google_maps_url || ""}`.trim();
    if (freeTrialStatusMapsRow) freeTrialStatusMapsRow.hidden = !mapsUrl;
    if (freeTrialStatusMaps) freeTrialStatusMaps.textContent = mapsUrl;

    const clientNote = `${request.note || ""}`.trim();
    if (freeTrialStatusClientNote) {
      freeTrialStatusClientNote.textContent = clientNote || "Sin nota del cliente.";
    }
    if (freeTrialStatusReviewText) {
      freeTrialStatusReviewText.value = request.review_text || "";
    }

    if (validFreeTrialStatuses.has(request.status)) {
      const statusInput = freeTrialStatusForm.querySelector(`input[name="free-trial-status"][value="${request.status}"]`);
      if (statusInput) statusInput.checked = true;
    }
    syncFreeTrialReviewTextState();

    if (!freeTrialStatusDialog.open) freeTrialStatusDialog.showModal();
    document.body.classList.add("admin-dialog-open");
    window.requestAnimationFrame(() => {
      freeTrialStatusForm.querySelector('input[name="free-trial-status"]:checked, input[name="free-trial-status"]')?.focus();
    });
  };

  const replaceFreeTrialRequestInMemory = (requestId, updatedRequest) => {
    adminState.freeTrialRequests = adminState.freeTrialRequests.map((request) => (
      request.id === requestId
        ? {
          ...request,
          status: updatedRequest.status,
          review_text: updatedRequest.review_text,
          updated_at: updatedRequest.updated_at,
        }
        : request
    ));
  };

  const submitFreeTrialStatus = async () => {
    if (adminState.freeTrialStatusSaving || !freeTrialStatusForm) return;
    const request = adminState.freeTrialRequests.find((item) => item.id === adminState.activeFreeTrialStatusId);

    if (!adminState.accessGranted || !adminState.session?.user || !adminState.dataReady) {
      showFreeTrialStatusFeedback("No tienes permisos para esta acción.");
      return;
    }
    if (!request) {
      showFreeTrialStatusFeedback("No se encontró la solicitud.");
      return;
    }

    const statusInput = freeTrialStatusForm.querySelector('input[name="free-trial-status"]:checked');
    const status = `${statusInput?.value || ""}`.trim();
    const reviewTextInput = `${freeTrialStatusReviewText?.value || ""}`.trim();
    const canPrepareReview = status === "active" || status === "completed";
    const reviewText = canPrepareReview ? reviewTextInput : "";

    if (!status) {
      showFreeTrialStatusFeedback("Selecciona un estado.");
      freeTrialStatusForm.querySelector('input[name="free-trial-status"]')?.focus();
      return;
    }
    if (!validFreeTrialStatuses.has(status)) {
      showFreeTrialStatusFeedback("El estado seleccionado no es válido.");
      freeTrialStatusForm.querySelector('input[name="free-trial-status"]')?.focus();
      return;
    }
    if (status === "completed" && !reviewText) {
      showFreeTrialStatusFeedback("Escribe el texto final de la reseña.");
      freeTrialStatusReviewText?.focus();
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      showFreeTrialStatusFeedback("No se pudo guardar el estado.");
      return;
    }

    setFreeTrialStatusSaving(true);
    showFreeTrialStatusFeedback();
    try {
      const { data, error } = await supabase.rpc("admin_update_free_trial_request", {
        p_request_id: request.id,
        p_status: status,
        p_review_text: reviewText || null,
      });
      if (error) throw error;

      const updatedRequest = Array.isArray(data) ? data[0] : data;
      const updatedReviewText = `${updatedRequest?.review_text || ""}`.trim();
      const clearsReviewText = status === "pending" || status === "review";
      if (
        !updatedRequest
        || updatedRequest.id !== request.id
        || updatedRequest.status !== status
        || !validFreeTrialStatuses.has(updatedRequest.status)
        || (clearsReviewText && updatedRequest.review_text !== null)
        || (status === "active" && updatedReviewText !== reviewText)
        || (status === "completed" && updatedReviewText !== reviewText)
      ) {
        throw new Error("invalid_free_trial_status_response");
      }

      const origin = adminState.freeTrialStatusOrigin;
      replaceFreeTrialRequestInMemory(request.id, updatedRequest);
      setFreeTrialStatusSaving(false);
      freeTrialStatusDialog.close();
      renderAdminData();

      if (origin === "detail" && freeTrialDialog?.open) {
        renderFreeTrialDetail(updatedRequest.id);
      }
      showFreeTrialStatusToast();
    } catch (error) {
      console.error("No se pudo guardar el estado de la solicitud.", error);
      showFreeTrialStatusFeedback(getFreeTrialStatusErrorMessage(error));
      setFreeTrialStatusSaving(false);
    }
  };

  const syncDialogOpenClass = () => {
    document.body.classList.toggle("admin-dialog-open", Boolean(
      orderDialog?.open || reviewDialog?.open || reviewPrepareDialog?.open || reviewEditDialog?.open || reviewCompleteDialog?.open || freeTrialDialog?.open || freeTrialStatusDialog?.open || clientDialog?.open,
    ));
  };

  const closeOrderDialog = () => {
    if (!orderDialog?.open) return;
    closeImageLightbox();
    orderDialog.close();
    syncDialogOpenClass();
    adminState.activeOrderId = "";
  };

  const closeReviewDialog = () => {
    if (!reviewDialog?.open) return;
    closeImageLightbox();
    reviewDialog.close();
    syncDialogOpenClass();
    adminState.activeReviewId = "";
  };

  const closeFreeTrialDialog = () => {
    if (!freeTrialDialog?.open) return;
    freeTrialDialog.close();
    syncDialogOpenClass();
    adminState.activeFreeTrialId = "";
  };

  const closeClientDialog = () => {
    if (!clientDialog?.open) return;
    clientDialog.close();
    syncDialogOpenClass();
    adminState.activeClientKey = "";
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

  const showCopyFeedback = (message) => {
    const feedback = clientDialog?.open
      ? clientCopyFeedback
      : reviewDialog?.open
      ? reviewCopyFeedback
      : freeTrialDialog?.open
        ? freeTrialCopyFeedback
        : copyFeedback;
    if (!feedback) return;
    feedback.textContent = message;
    window.clearTimeout(adminState.copyFeedbackTimer);
    adminState.copyFeedbackTimer = window.setTimeout(() => {
      feedback.textContent = "";
    }, 1600);
  };

  const clearFilters = () => {
    adminState.filters = { search: "", status: "", payment: "", mode: "" };
    renderFilters();
  };

  const clearReviewFilters = () => {
    adminState.reviewFilters = { search: "", source: "", status: "", rating: "", media: "" };
    renderReviewsView();
  };

  const clearFreeTrialFilters = () => {
    adminState.freeTrialFilters = { search: "", status: "" };
    renderFreeTrialsView();
  };

  const clearClientFilters = () => {
    adminState.clientFilters = { search: "", whatsapp: "", recurrent: "", mode: "" };
    renderClientsView();
  };

  const initAdminPanel = async () => {
    renderLoading();
    adminState.accessGranted = false;
    adminState.dataReady = false;
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
  reviewsFiltersForm?.addEventListener("submit", (event) => event.preventDefault());
  reviewsSearchInput?.addEventListener("input", () => {
    adminState.reviewFilters.search = reviewsSearchInput.value;
    renderReviewsView();
  });
  reviewsFilterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      adminState.reviewFilters[input.dataset.adminReviewsFilter] = input.value;
      renderReviewsView();
    });
  });
  freeTrialsFilters?.addEventListener("submit", (event) => event.preventDefault());
  freeTrialsSearch?.addEventListener("input", () => {
    adminState.freeTrialFilters.search = freeTrialsSearch.value;
    renderFreeTrialsView();
  });
  freeTrialsStatus?.addEventListener("change", () => {
    adminState.freeTrialFilters.status = freeTrialsStatus.value;
    renderFreeTrialsView();
  });
  clientsFiltersForm?.addEventListener("submit", (event) => event.preventDefault());
  clientsSearchInput?.addEventListener("input", () => {
    adminState.clientFilters.search = clientsSearchInput.value;
    renderClientsView();
  });
  clientsFilterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      adminState.clientFilters[input.dataset.adminClientsFilter] = input.value;
      renderClientsView();
    });
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => activateAdminView(button.dataset.adminViewTarget));
  });

  reviewPrepareForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitReviewPreparation();
  });
  reviewPrepareForm?.addEventListener("input", () => {
    if (!adminState.preparationSaving) showPreparationFeedback();
  });
  reviewEditForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitClientReviewEdit();
  });
  reviewEditForm?.addEventListener("input", () => {
    if (!adminState.clientEditSaving) showClientEditFeedback();
  });
  reviewCompleteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitReviewCompletion();
  });
  freeTrialStatusForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitFreeTrialStatus();
  });
  freeTrialStatusForm?.addEventListener("input", (event) => {
    if (event.target.matches('input[name="free-trial-status"]')) {
      syncFreeTrialReviewTextState();
    }
    if (!adminState.freeTrialStatusSaving) showFreeTrialStatusFeedback();
  });

  root.addEventListener("click", async (event) => {
    const reviewCompleteButton = event.target.closest("[data-review-complete]");
    if (reviewCompleteButton) {
      const origin = reviewCompleteButton.closest("[data-admin-review-dialog]")
        ? "review"
        : reviewCompleteButton.closest("[data-admin-order-dialog]")
          ? "order"
          : "";
      openReviewCompletionDialog(reviewCompleteButton.dataset.reviewComplete, origin);
      return;
    }

    const reviewEditButton = event.target.closest("[data-review-edit]");
    if (reviewEditButton) {
      const origin = reviewEditButton.closest("[data-admin-review-dialog]")
        ? "review"
        : reviewEditButton.closest("[data-admin-order-dialog]")
          ? "order"
          : "";
      openClientReviewEditDialog(reviewEditButton.dataset.reviewEdit, origin);
      return;
    }

    const reviewPrepareButton = event.target.closest("[data-review-prepare]");
    if (reviewPrepareButton) {
      const origin = reviewPrepareButton.closest("[data-admin-review-dialog]")
        ? "review"
        : reviewPrepareButton.closest("[data-admin-order-dialog]")
          ? "order"
          : "";
      openReviewPreparationDialog(reviewPrepareButton.dataset.reviewPrepare, origin);
      return;
    }

    const clientOpenButton = event.target.closest("[data-client-open]");
    if (clientOpenButton) {
      renderClientDetail(clientOpenButton.dataset.clientOpen);
      return;
    }

    const clientOrderOpenButton = event.target.closest("[data-client-order-open]");
    if (clientOrderOpenButton) {
      const orderId = clientOrderOpenButton.dataset.clientOrderOpen;
      closeClientDialog();
      renderOrderDetail(orderId);
      return;
    }

    const reviewOpenButton = event.target.closest("[data-review-open]");
    if (reviewOpenButton) {
      renderReviewDetailModal(reviewOpenButton.dataset.reviewOpen);
      return;
    }

    const reviewOrderOpenButton = event.target.closest("[data-review-order-open]");
    if (reviewOrderOpenButton) {
      const orderId = reviewOrderOpenButton.dataset.reviewOrderOpen;
      closeReviewDialog();
      renderOrderDetail(orderId);
      return;
    }

    const freeTrialManageButton = event.target.closest("[data-free-trial-manage]");
    if (freeTrialManageButton) {
      const origin = freeTrialManageButton.closest("[data-free-trial-dialog]") ? "detail" : "list";
      openFreeTrialStatusDialog(freeTrialManageButton.dataset.freeTrialManage, origin);
      return;
    }

    const freeTrialOpenButton = event.target.closest("[data-free-trial-open]");
    if (freeTrialOpenButton) {
      renderFreeTrialDetail(freeTrialOpenButton.dataset.freeTrialOpen);
      return;
    }

    const freeTrialsRetryButton = event.target.closest("[data-free-trials-retry]");
    if (freeTrialsRetryButton) {
      await reloadFreeTrialRequests();
      return;
    }

    const clearFreeTrialsButton = event.target.closest("[data-free-trials-clear]");
    if (clearFreeTrialsButton) {
      clearFreeTrialFilters();
      return;
    }

    const clearReviewsButton = event.target.closest("[data-admin-reviews-clear]");
    if (clearReviewsButton) {
      clearReviewFilters();
      return;
    }

    const clearClientsButton = event.target.closest("[data-admin-clients-clear]");
    if (clearClientsButton) {
      clearClientFilters();
      return;
    }

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
        showCopyFeedback("Copiado");
      } catch {
        showCopyFeedback("No se pudo copiar automáticamente.");
      }
    }
  });

  orderDialogClose?.addEventListener("click", closeOrderDialog);
  orderDialog?.addEventListener("close", syncDialogOpenClass);
  orderDialog?.addEventListener("click", (event) => {
    if (event.target !== orderDialog) return;
    const rect = orderDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeOrderDialog();
  });
  reviewDialogClose?.addEventListener("click", closeReviewDialog);
  reviewDialog?.addEventListener("close", syncDialogOpenClass);
  reviewDialog?.addEventListener("click", (event) => {
    if (event.target !== reviewDialog) return;
    const rect = reviewDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeReviewDialog();
  });
  reviewPrepareDialogClose?.addEventListener("click", closeReviewPreparationDialog);
  reviewPrepareCancel?.addEventListener("click", closeReviewPreparationDialog);
  reviewPrepareDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeReviewPreparationDialog();
  });
  reviewPrepareDialog?.addEventListener("close", () => {
    resetPreparationState();
    syncDialogOpenClass();
  });
  reviewPrepareDialog?.addEventListener("click", (event) => {
    if (event.target !== reviewPrepareDialog) return;
    const rect = reviewPrepareDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeReviewPreparationDialog();
  });
  reviewEditDialogClose?.addEventListener("click", closeClientReviewEditDialog);
  reviewEditCancel?.addEventListener("click", closeClientReviewEditDialog);
  reviewEditDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeClientReviewEditDialog();
  });
  reviewEditDialog?.addEventListener("close", () => {
    resetClientEditState();
    syncDialogOpenClass();
  });
  reviewEditDialog?.addEventListener("click", (event) => {
    if (event.target !== reviewEditDialog) return;
    const rect = reviewEditDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeClientReviewEditDialog();
  });
  reviewCompleteDialogClose?.addEventListener("click", closeReviewCompletionDialog);
  reviewCompleteCancel?.addEventListener("click", closeReviewCompletionDialog);
  reviewCompleteDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeReviewCompletionDialog();
  });
  reviewCompleteDialog?.addEventListener("close", () => {
    resetCompletionState();
    syncDialogOpenClass();
  });
  reviewCompleteDialog?.addEventListener("click", (event) => {
    if (event.target !== reviewCompleteDialog) return;
    const rect = reviewCompleteDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeReviewCompletionDialog();
  });
  freeTrialDialogClose?.addEventListener("click", closeFreeTrialDialog);
  freeTrialDialog?.addEventListener("close", syncDialogOpenClass);
  freeTrialDialog?.addEventListener("click", (event) => {
    if (event.target !== freeTrialDialog) return;
    const rect = freeTrialDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeFreeTrialDialog();
  });
  freeTrialStatusDialogClose?.addEventListener("click", closeFreeTrialStatusDialog);
  freeTrialStatusCancel?.addEventListener("click", closeFreeTrialStatusDialog);
  freeTrialStatusDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeFreeTrialStatusDialog();
  });
  freeTrialStatusDialog?.addEventListener("close", () => {
    resetFreeTrialStatusState();
    syncDialogOpenClass();
  });
  freeTrialStatusDialog?.addEventListener("click", (event) => {
    if (event.target !== freeTrialStatusDialog) return;
    const rect = freeTrialStatusDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeFreeTrialStatusDialog();
  });
  clientDialogClose?.addEventListener("click", closeClientDialog);
  clientDialog?.addEventListener("close", syncDialogOpenClass);
  clientDialog?.addEventListener("click", (event) => {
    if (event.target !== clientDialog) return;
    const rect = clientDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeClientDialog();
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
    fetchFreeTrialRequests,
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
    buildClientsViewModel,
    buildReviewsViewModel,
    buildFreeTrialsViewModel,
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
    renderClientsView,
    renderClientCard,
    renderClientDetail,
    filterClients,
    getClientSearchText,
    getClientKey,
    getClientOrders,
    getClientStats,
    formatClientManagementMode,
    renderReviewsView,
    renderReviewCard,
    renderReviewDetailModal,
    canCompleteReview,
    openReviewCompletionDialog,
    submitReviewCompletion,
    filterReviews,
    getReviewSearchText,
    formatReviewStatus,
    formatReviewSource,
    getReviewBadgeType,
    renderReviewStars,
    getReviewMediaCounts,
    renderFreeTrialsView,
    renderFreeTrialCard,
    renderFreeTrialDetail,
    filterFreeTrialRequests,
    getFreeTrialSearchText,
    formatFreeTrialStatus,
    getFreeTrialBadgeType,
    renderFilters,
    activateAdminView,
  };

  initAdminPanel();
})();
