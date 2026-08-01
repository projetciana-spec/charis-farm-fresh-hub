import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// process.env is only populated in the deployed worker; in the dev server the
// values come from Vite's build-time env replacement (VITE_*).
export function getPublicSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.OWN_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Configuration Supabase manquante (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  return { url: url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""), key };
}

export function createPublicServerClient() {
  const { url, key } = getPublicSupabaseConfig();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Client de base pour les écritures publiques (commandes, suggestions).
 * Utilise la clé service role si elle est disponible, sinon la clé publique
 * (les écritures passent par des RPC security definer / policies anon),
 * afin de ne jamais renvoyer 500 quand la clé service role manque sur l'hôte.
 */
export function createServerDbClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.OWN_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.OWN_SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL manquant");
  if (!serviceKey) return createPublicServerClient();

  const clean = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return createClient<Database>(clean, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (serviceKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${serviceKey}`) {
          h.delete("Authorization");
        }
        h.set("apikey", serviceKey);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
