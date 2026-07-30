import { createServerFn } from "@tanstack/react-start";
import { createPublicServerClient as serverClient } from "@/lib/supabase-public.server";


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
