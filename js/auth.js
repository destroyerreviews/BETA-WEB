(() => {
  const getClient = () => window.DestroyerSupabase?.client || null;

  const getSiteBaseUrl = () => {
    const { origin, pathname, protocol } = window.location;
    if (!/^https?:$/.test(protocol)) return "";

    let basePath = pathname;

    if (/\/(login|register)\/?$/.test(basePath)) {
      basePath = basePath.replace(/(login|register)\/?$/, "");
    } else if (/\/(login|register)\/index\.html$/.test(basePath)) {
      basePath = basePath.replace(/(login|register)\/index\.html$/, "");
    } else {
      basePath = basePath.replace(/[^/]*$/, "");
    }

    return `${origin}${basePath}`;
  };

  const getRootRelativePath = (fileName) => {
    const path = window.location.pathname;
    const isNestedAuthPage = /\/(login|register)\/(?:index\.html)?$/.test(path);
    return `${isNestedAuthPage ? "../" : ""}${fileName}`;
  };

  const getEmailRedirectTo = () => {
    const baseUrl = getSiteBaseUrl();
    return baseUrl ? `${baseUrl}index.html` : undefined;
  };

  const isAuthEntryPage = () => /(?:^|\/)(login|register)(?:\.html|\/(?:index\.html)?)?$/.test(window.location.pathname);

  const normalizeError = (error) => {
    const message = `${error?.message || ""}`.toLowerCase();
    const code = `${error?.code || error?.status || ""}`.toLowerCase();
    return { message, code };
  };

  const mapAuthError = (error, mode) => {
    const { message, code } = normalizeError(error);

    if (!window.DestroyerSupabase?.isReady || !getClient()) {
      return {
        field: "",
        message: "No se ha podido cargar Supabase. Revisa tu conexion e intentalo de nuevo.",
      };
    }

    if (message.includes("email not confirmed") || code.includes("email_not_confirmed")) {
      return {
        field: "email",
        message: "Tu cuenta existe, pero todavia no has confirmado el correo. Revisa tu email antes de iniciar sesion.",
      };
    }

    if (message.includes("invalid login credentials") || code.includes("invalid_credentials")) {
      return {
        field: mode === "login" ? "password" : "",
        message: "El email o la contrasena no son correctos. Revisa los datos e intentalo de nuevo.",
      };
    }

    if (
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("user already") ||
      code.includes("user_already_exists")
    ) {
      return {
        field: "email",
        message: "Ya existe una cuenta con este email. Inicia sesion o recupera la contrasena.",
      };
    }

    if (message.includes("password")) {
      return {
        field: "password",
        message: "La contrasena debe tener al menos 8 caracteres y cumplir los requisitos de seguridad.",
      };
    }

    if (message.includes("email")) {
      return {
        field: "email",
        message: "Introduce un email valido.",
      };
    }

    if (message.includes("rate limit") || message.includes("too many")) {
      return {
        field: "",
        message: "Has hecho demasiados intentos. Espera un momento y vuelve a probar.",
      };
    }

    if (message.includes("failed to fetch") || message.includes("network")) {
      return {
        field: "",
        message: "No se ha podido conectar con Supabase. Revisa tu conexion e intentalo de nuevo.",
      };
    }

    return {
      field: "",
      message: mode === "login"
        ? "No hemos podido iniciar sesion. Revisa tus datos e intentalo de nuevo."
        : "No hemos podido crear la cuenta. Revisa los datos e intentalo de nuevo.",
    };
  };

  const hasExistingIdentity = (data) => {
    const identities = data?.user?.identities;
    return !Array.isArray(identities) || identities.length > 0;
  };

  const register = async (form) => {
    const client = getClient();
    if (!client) throw new Error("Supabase SDK no disponible");

    const formData = new FormData(form);
    const name = `${formData.get("name") || ""}`.trim();
    const email = `${formData.get("email") || ""}`.trim();
    const whatsapp = `${formData.get("whatsapp") || ""}`.trim();
    const password = `${formData.get("password") || ""}`;
    const emailRedirectTo = getEmailRedirectTo();

    const options = {
      data: {
        name,
        whatsapp,
      },
    };

    if (emailRedirectTo) {
      options.emailRedirectTo = emailRedirectTo;
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options,
    });

    if (error) throw error;

    if (!hasExistingIdentity(data)) {
      return {
        ok: false,
        field: "email",
        status: "error",
        message: "Ya existe una cuenta con este email. Inicia sesion o recupera la contrasena.",
      };
    }

    return {
      ok: true,
      status: "success",
      message: "Cuenta creada. Revisa tu correo para confirmar la cuenta.",
    };
  };

  const login = async (form) => {
    const client = getClient();
    if (!client) throw new Error("Supabase SDK no disponible");

    const formData = new FormData(form);
    const email = `${formData.get("email") || ""}`.trim();
    const password = `${formData.get("password") || ""}`;

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      ok: true,
      status: "success",
      message: "Acceso correcto. Redirigiendo...",
      redirectTo: getRootRelativePath("index.html"),
    };
  };

  const submitAuthForm = async ({ form, mode }) => {
    try {
      return mode === "register" ? await register(form) : await login(form);
    } catch (error) {
      const mappedError = mapAuthError(error, mode);
      return {
        ok: false,
        status: "error",
        ...mappedError,
      };
    }
  };

  const getSession = async () => {
    const client = getClient();
    if (!client) return null;

    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data?.session || null;
  };

  const onSessionChange = (callback) => {
    const client = getClient();
    if (!client || typeof callback !== "function") return null;

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      callback(session || null);
    });

    return data?.subscription || null;
  };

  const signOut = async () => {
    const client = getClient();
    if (!client) return { ok: false };

    const { error } = await client.auth.signOut();
    return { ok: !error, error };
  };

  const redirectSignedInAuthPage = async () => {
    if (!isAuthEntryPage()) return;

    const session = await getSession();
    if (session) window.location.replace(getRootRelativePath("index.html"));
  };

  window.DestroyerAuth = {
    getSession,
    onSessionChange,
    signOut,
    submitAuthForm,
  };

  redirectSignedInAuthPage();
})();
