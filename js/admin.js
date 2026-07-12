(() => {
  "use strict";

  const root = document.querySelector("[data-admin-root]");
  if (!root) return;

  const stateNodes = [...root.querySelectorAll("[data-admin-state]")];
  const adminEmail = root.querySelector("[data-admin-email]");
  const errorMessage = root.querySelector("[data-admin-error-message]");
  const retryButton = root.querySelector("[data-admin-retry]");

  const getSupabaseClient = () => window.DestroyerSupabase?.client || null;

  const escapeHtml = (value) => `${value ?? ""}`.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);

  const showState = (stateName) => {
    stateNodes.forEach((node) => {
      node.hidden = node.dataset.adminState !== stateName;
    });
    root.setAttribute("aria-busy", String(stateName === "loading"));
    document.body.dataset.adminState = stateName;
  };

  const renderLoading = () => {
    showState("loading");
  };

  const renderSignedOut = () => {
    showState("signed-out");
  };

  const renderForbidden = () => {
    showState("forbidden");
  };

  const renderAdminShell = (session) => {
    const email = session?.user?.email || "Admin verificado";
    if (adminEmail) adminEmail.innerHTML = escapeHtml(email);
    showState("shell");
  };

  const renderError = () => {
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

  const initAdminPanel = async () => {
    renderLoading();

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

      renderAdminShell(session);
    } catch (error) {
      console.error("No se pudo validar el acceso al panel admin.", error);
      renderError();
    }
  };

  retryButton?.addEventListener("click", initAdminPanel);

  window.DestroyerAdmin = {
    initAdminPanel,
    getAdminSession,
    checkAdminAccess,
    renderLoading,
    renderSignedOut,
    renderForbidden,
    renderAdminShell,
    renderError,
  };

  initAdminPanel();
})();
