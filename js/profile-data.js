(() => {
  const duplicateCodes = new Set(["23505", "409"]);

  const getClient = () => window.DestroyerSupabase?.client || null;

  const isDuplicateProfileError = (error) => {
    const code = `${error?.code || error?.status || ""}`;
    const message = `${error?.message || ""}`.toLowerCase();
    return duplicateCodes.has(code) || message.includes("duplicate") || message.includes("unique");
  };

  const pickMetadata = (user) => {
    const metadata = user?.user_metadata || {};
    return {
      full_name: `${metadata.name || ""}`.trim(),
      whatsapp: `${metadata.whatsapp || ""}`.trim(),
    };
  };

  const normalizeProfile = (profile, user) => {
    return {
      id: profile?.id || "",
      user_id: profile?.user_id || user?.id || "",
      full_name: `${profile?.full_name || ""}`.trim(),
      whatsapp: `${profile?.whatsapp || ""}`.trim(),
      recovery_email: `${profile?.recovery_email || ""}`.trim(),
      created_at: profile?.created_at || "",
      updated_at: profile?.updated_at || "",
    };
  };

  const fetchUserProfile = async (user) => {
    const client = getClient();
    if (!client || !user?.id) return null;

    const { data, error } = await client
      .from("user_profiles")
      .select("id,user_id,full_name,whatsapp,recovery_email,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  };

  const createInitialUserProfile = async (user) => {
    const client = getClient();
    if (!client || !user?.id) return null;

    const fallback = pickMetadata(user);
    const payload = {
      full_name: fallback.full_name || null,
      whatsapp: fallback.whatsapp || null,
      recovery_email: null,
    };

    const { data, error } = await client
      .from("user_profiles")
      .insert(payload)
      .select("id,user_id,full_name,whatsapp,recovery_email,created_at,updated_at")
      .single();

    if (error) {
      if (isDuplicateProfileError(error)) return fetchUserProfile(user);
      throw error;
    }

    return data || null;
  };

  const ensureUserProfile = async (user) => {
    if (!user?.id) return null;

    const existing = await fetchUserProfile(user);
    if (existing) return normalizeProfile(existing, user);

    const created = await createInitialUserProfile(user);
    return normalizeProfile(created, user);
  };

  const updateUserProfile = async (user, values) => {
    const client = getClient();
    if (!client || !user?.id) throw new Error("Supabase no esta disponible.");

    await ensureUserProfile(user);

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(values, "full_name")) payload.full_name = values.full_name || null;
    if (Object.prototype.hasOwnProperty.call(values, "whatsapp")) payload.whatsapp = values.whatsapp || null;
    if (Object.prototype.hasOwnProperty.call(values, "recovery_email")) payload.recovery_email = values.recovery_email || null;

    const { data, error } = await client
      .from("user_profiles")
      .update(payload)
      .eq("user_id", user.id)
      .select("id,user_id,full_name,whatsapp,recovery_email,created_at,updated_at")
      .maybeSingle();

    if (error) throw error;
    return normalizeProfile(data, user);
  };

  window.DestroyerProfileData = {
    ensureUserProfile,
    fetchUserProfile,
    updateUserProfile,
  };
})();
