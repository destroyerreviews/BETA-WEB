(() => {
  const SUPABASE_URL = "https://hvovbacsvecguoiomlnp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bEAFNsUR9jNfHG8DIkC1Fw_ljC2bF3J";

  const createClient = window.supabase?.createClient;

  if (!createClient) {
    console.error("Supabase SDK no esta disponible.");
    window.DestroyerSupabase = { client: null, isReady: false };
    return;
  }

  window.DestroyerSupabase = {
    client: createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
    isReady: true,
  };
})();
