import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
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

export const listProduits = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("produits")
    .select("*, categories(nom, slug)")
    .order("ordre");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("produits")
    .select("*, categories(nom, slug)")
    .eq("mis_en_avant", true)
    .order("ordre")
    .limit(8);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb.from("categories").select("*").order("ordre");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listBanners = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("bannieres")
    .select("*")
    .eq("actif", true)
    .order("ordre");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getProduit = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = serverClient();
    const { data: p, error } = await sb
      .from("produits")
      .select("*, categories(nom, slug)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p;
  });

export const getParametres = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb.from("parametres").select("*");
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => {
    if (r.valeur) map[r.cle] = r.valeur;
  });
  return map;
});
