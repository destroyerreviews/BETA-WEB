(() => {
  const client = () => window.DestroyerSupabase?.client || null;
  const auth = () => window.DestroyerAuth || null;
  const profiles = () => window.DestroyerProfileData || null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const whatsappPattern = /^[+()0-9\s.-]{6,24}$/;
  const emailChangeConfirmationMessage =
    "Te hemos enviado correos de confirmación. Para completar el cambio, confirma el enlace desde tu correo actual y desde el correo nuevo.";

  const sitePath = (path) => path;

  const shell = document.querySelector("[data-profile-shell]");
  const loading = document.querySelector("[data-profile-loading]");
  const accountForm = document.querySelector("[data-profile-account-form]");
  const emailForm = document.querySelector("[data-profile-email-form]");
  const passwordForm = document.querySelector("[data-profile-password-form]");
  const recoveryForm = document.querySelector("[data-profile-recovery-form]");
  const tabButtons = [...document.querySelectorAll("[data-profile-tab]")];
  const panels = [...document.querySelectorAll("[data-profile-panel]")];

  let currentUser = null;
  let currentProfile = null;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value || "No disponible";
  };

  const formatDate = (value) => {
    if (!value) return "No disponible";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No disponible";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  };

  const setStatus = (form, type, message) => {
    const status = form?.querySelector("[data-profile-status]");
    if (!status) return;
    status.textContent = message || "";
    status.dataset.state = type || "";
  };

  const setLoading = (button, isLoading) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
  };

  const hasPendingEmailChange = (user) => {
    const pendingEmail = `${user?.new_email || user?.email_change || ""}`.trim();
    return Boolean(pendingEmail && pendingEmail !== user?.email);
  };

  const showProfile = () => {
    if (loading) loading.hidden = true;
    if (shell) shell.hidden = false;
  };

  const showBlockingError = () => {
    if (!loading) return;
    const spinner = loading.querySelector("span");
    const text = loading.querySelector("p");
    if (spinner) spinner.hidden = true;
    if (text) text.textContent = "No se pudo cargar el perfil. Inténtalo de nuevo en unos minutos.";
   };

  const renderProfile = () => {
    if (!currentUser) return;
    const profile = currentProfile || {};
    const emailVerified = Boolean(currentUser.email_confirmed_at || currentUser.confirmed_at);

    setText("[data-profile-name]", profile.full_name || "Pendiente");
    setText("[data-profile-email]", currentUser.email || "");
    setText("[data-profile-whatsapp]", profile.whatsapp || "Sin WhatsApp");
    setText("[data-profile-created]", formatDate(currentUser.created_at || profile.created_at));
    setText(
      "[data-profile-email-state]",
      hasPendingEmailChange(currentUser)
        ? "Cambio de email pendiente de confirmación."
        : emailVerified
          ? "Email verificado"
          : "Email pendiente de verificar",
    );

    if (accountForm) {
      accountForm.elements.full_name.value = profile.full_name || "";
      accountForm.elements.whatsapp.value = profile.whatsapp || "";
    }
    if (emailForm) emailForm.elements.email.value = currentUser.email || "";
    if (recoveryForm) recoveryForm.elements.recovery_email.value = profile.recovery_email || "";
  };

  const activateTab = (tab) => {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.profileTab === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.profilePanel !== tab;
    });
  };

  const loadMfaState = async () => {
    const stateNode = document.querySelector("[data-profile-mfa-state]");
    const noteNode = document.querySelector("[data-profile-mfa-note]");
    const recoveryNode = document.querySelector("[data-profile-recovery-codes-note]");
    const authClient = client();

    if (!authClient?.auth?.mfa?.listFactors) {
      if (stateNode) stateNode.textContent = "Próximamente";
      if (noteNode) noteNode.textContent = "Verificación en dos pasos preparada para una siguiente fase.";
      if (recoveryNode) recoveryNode.textContent = "Los códigos de recuperación se añadirán en una fase posterior.";
      return;
    }

    try {
      const { data, error } = await authClient.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotp = (data?.totp || []).some((factor) => factor?.status === "verified");
      if (stateNode) stateNode.textContent = verifiedTotp ? "Activada" : "Desactivada";
      if (noteNode) {
        noteNode.textContent = verifiedTotp
          ? "La verificación con app autenticadora está activa."
          : "Preparada para activar en una siguiente fase.";
      }
      if (recoveryNode) {
        recoveryNode.textContent = verifiedTotp
          ? "Los códigos de recuperación se añadirán en una fase posterior."
          : "Los códigos de recuperación estarán disponibles después de activar la verificación en dos pasos.";
      }
    } catch {
      if (stateNode) stateNode.textContent = "Próximamente";
      if (noteNode) noteNode.textContent = "No se ha podido leer el estado MFA ahora mismo.";
      if (recoveryNode) recoveryNode.textContent = "Los códigos de recuperación se añadirán en una fase posterior.";
    }
  };

  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    const fullName = accountForm.elements.full_name.value.trim();
    const whatsapp = accountForm.elements.whatsapp.value.trim();

    setStatus(accountForm, "", "");
    if (whatsapp && !whatsappPattern.test(whatsapp)) {
      setStatus(accountForm, "error", "Introduce un WhatsApp válido.");
      return;
    }

    setLoading(submit, true);
    try {
      currentProfile = await profiles().updateUserProfile(currentUser, { full_name: fullName, whatsapp });
      renderProfile();
      setStatus(accountForm, "success", "Cambios guardados correctamente.");
    } catch {
      setStatus(accountForm, "error", "No se pudo actualizar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(submit, false);
    }
  });

  emailForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    const nextEmail = emailForm.elements.email.value.trim();

    setStatus(emailForm, "", "");
    if (!emailPattern.test(nextEmail)) {
      setStatus(emailForm, "error", "Introduce un email válido.");
      return;
    }
    if (nextEmail === currentUser?.email) {
      setStatus(emailForm, "info", "Ese email ya está asociado a tu cuenta.");
      return;
    }

    setLoading(submit, true);
    try {
      const { data, error } = await client().auth.updateUser({ email: nextEmail });
      if (error) throw error;
      if (data?.user) currentUser = data.user;
      renderProfile();
      setStatus(emailForm, "info", emailChangeConfirmationMessage);
      emailForm.elements.email.value = currentUser.email || "";
    } catch {
      setStatus(emailForm, "error", "No se pudo iniciar el cambio de email. Inténtalo de nuevo.");
    } finally {
      setLoading(submit, false);
    }
  });

  passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    const password = passwordForm.elements.password.value;
    const confirmPassword = passwordForm.elements.confirm_password.value;

    setStatus(passwordForm, "", "");
    if (password.length < 8) {
      setStatus(passwordForm, "error", "La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus(passwordForm, "error", "Las contraseñas deben coincidir.");
      return;
    }

    setLoading(submit, true);
    try {
      const { error } = await client().auth.updateUser({ password });
      if (error) throw error;
      passwordForm.reset();
      setStatus(passwordForm, "success", "Contraseña actualizada correctamente.");
    } catch {
      setStatus(passwordForm, "error", "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setLoading(submit, false);
    }
  });

  recoveryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    const recoveryEmail = recoveryForm.elements.recovery_email.value.trim();

    setStatus(recoveryForm, "", "");
    if (recoveryEmail && !emailPattern.test(recoveryEmail)) {
      setStatus(recoveryForm, "error", "Introduce un correo de recuperación válido.");
      return;
    }

    setLoading(submit, true);
    try {
      currentProfile = await profiles().updateUserProfile(currentUser, { recovery_email: recoveryEmail });
      renderProfile();
      setStatus(recoveryForm, "success", "Correo de recuperación guardado correctamente.");
    } catch {
      setStatus(recoveryForm, "error", "No se pudo guardar el correo de recuperación.");
    } finally {
      setLoading(submit, false);
    }
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.profileTab));
  });

  const initProfile = async () => {
    try {
      const session = await auth()?.getSession?.();
      if (!session?.user) {
        window.location.replace(sitePath("login.html"));
        return;
      }
      currentUser = session.user;
      currentProfile = await profiles()?.ensureUserProfile?.(currentUser);
      renderProfile();
      await loadMfaState();
      showProfile();
    } catch {
      showBlockingError();
    }
  };

  initProfile();
})();
