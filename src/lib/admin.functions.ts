import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès réservé aux administrateurs");
  return context.supabase;
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ------------------------------ session ------------------------------ */

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });

/* ------------------------------ dashboard ------------------------------ */

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const [commandes, produits, suggestions] = await Promise.all([
      sb.from("commandes").select("*").order("created_at", { ascending: false }),
      sb.from("produits").select("id, en_stock"),
      sb.from("suggestions").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    if (commandes.error) throw new Error(commandes.error.message);

    const all = commandes.data ?? [];
    const caMois = all
      .filter((c: any) => new Date(c.created_at) >= startMonth && c.statut !== "annulee")
      .reduce((s: number, c: any) => s + Number(c.total || 0), 0);

    return {
      totalCommandes: all.length,
      nouvelles: all.filter((c: any) => c.statut === "nouvelle").length,
      enCours: all.filter((c: any) => c.statut === "en_cours").length,
      livrees: all.filter((c: any) => c.statut === "livree").length,
      caMois,
      totalProduits: produits.data?.length ?? 0,
      ruptures: (produits.data ?? []).filter((p: any) => !p.en_stock).length,
      dernieresCommandes: all.slice(0, 6),
      dernieresSuggestions: suggestions.data ?? [],
      suggestionsNonLues: (suggestions.data ?? []).filter((s: any) => !s.lu).length,
    };
  });

/* ------------------------------ produits ------------------------------ */

export const adminListProduits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb
      .from("produits")
      .select("*, categories(id, nom)")
      .order("ordre");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const produitSchema = z.object({
  id: z.string().uuid().optional(),
  nom: z.string().min(2).max(120),
  description: z.string().max(2000).nullable().optional(),
  prix: z.number().nonnegative().nullable().optional(),
  prix_sur_demande: z.boolean().default(false),
  unite: z.string().max(40).nullable().optional(),
  categorie_id: z.string().uuid().nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  en_stock: z.boolean().default(true),
  mis_en_avant: z.boolean().default(false),
  ordre: z.number().int().default(0),
});

export const saveProduit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => produitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const payload = {
      nom: data.nom,
      slug: slugify(data.nom) || crypto.randomUUID().slice(0, 8),
      description: data.description ?? null,
      prix: data.prix_sur_demande ? null : (data.prix ?? null),
      prix_sur_demande: data.prix_sur_demande,
      unite: data.unite ?? null,
      categorie_id: data.categorie_id ?? null,
      image_url: data.image_url ?? null,
      en_stock: data.en_stock,
      mis_en_avant: data.mis_en_avant,
      ordre: data.ordre,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await sb.from("produits").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("produits").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteProduit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { error } = await sb.from("produits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ catégories ------------------------------ */

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const [cats, prods] = await Promise.all([
      sb.from("categories").select("*").order("ordre"),
      sb.from("produits").select("categorie_id"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    const counts: Record<string, number> = {};
    (prods.data ?? []).forEach((p: any) => {
      if (p.categorie_id) counts[p.categorie_id] = (counts[p.categorie_id] ?? 0) + 1;
    });
    return (cats.data ?? []).map((c: any) => ({ ...c, nb_produits: counts[c.id] ?? 0 }));
  });

export const saveCategorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nom: z.string().min(2).max(80),
        ordre: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const payload = { nom: data.nom, slug: slugify(data.nom), ordre: data.ordre };
    if (data.id) {
      const { error } = await sb.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("categories").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCategorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { count } = await sb
      .from("produits")
      .select("id", { count: "exact", head: true })
      .eq("categorie_id", data.id);
    if ((count ?? 0) > 0) throw new Error("Impossible : des produits utilisent cette catégorie.");
    const { error } = await sb.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ bannières ------------------------------ */

export const adminListBannieres = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb.from("bannieres").select("*").order("ordre");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveBanniere = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        titre: z.string().min(2).max(120),
        sous_titre: z.string().max(300).nullable().optional(),
        image_url: z.string().max(2000).nullable().optional(),
        cta_texte: z.string().max(60).nullable().optional(),
        cta_lien: z.string().max(300).nullable().optional(),
        actif: z.boolean().default(true),
        ordre: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await sb.from("bannieres").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await sb.from("bannieres").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteBanniere = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { error } = await sb.from("bannieres").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ commandes ------------------------------ */

export const adminListCommandes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetCommande = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const [c, items] = await Promise.all([
      sb.from("commandes").select("*").eq("id", data.id).maybeSingle(),
      sb.from("commande_items").select("*").eq("commande_id", data.id),
    ]);
    if (c.error) throw new Error(c.error.message);
    return { commande: c.data, items: items.data ?? [] };
  });

export const updateStatutCommande = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        statut: z.enum(["nouvelle", "en_cours", "livree", "annulee"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { error } = await sb.from("commandes").update({ statut: data.statut }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCommande = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    await sb.from("commande_items").delete().eq("commande_id", data.id);
    const { error } = await sb.from("commandes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ suggestions ------------------------------ */

export const adminListSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), lu: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { error } = await sb.from("suggestions").update({ lu: data.lu }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { error } = await sb.from("suggestions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ paramètres ------------------------------ */

export const adminGetParametres = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb.from("parametres").select("*");
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: any) => {
      map[r.cle] = r.valeur ?? "";
    });
    return map;
  });

export const saveParametres = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ values: z.record(z.string(), z.string().max(500)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const rows = Object.entries(data.values).map(([cle, valeur]) => ({ cle, valeur }));
    const { error } = await sb.from("parametres").upsert(rows, { onConflict: "cle" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
