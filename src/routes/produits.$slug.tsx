import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getProduit } from "@/lib/catalog.functions";
import { useCart, formatXOF } from "@/lib/cart";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const qo = (slug: string) =>
  queryOptions({
    queryKey: ["produit", slug],
    queryFn: () => getProduit({ data: { slug } }),
  });

export const Route = createFileRoute("/produits/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!p) throw notFound();
    return { p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.p.nom} — Charis FERME` },
          { name: "description", content: loaderData.p.description ?? `${loaderData.p.nom} produit à la ferme Charis à Zogbodomè.` },
          { property: "og:title", content: `${loaderData.p.nom} — Charis FERME` },
          { property: "og:description", content: loaderData.p.description ?? "" },
        ]
      : [{ title: "Produit — Charis FERME" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Produit introuvable</h1>
      <Link to="/produits" className="mt-6 inline-flex text-primary underline">Retour aux produits</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Erreur de chargement</h1>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(qo(slug));
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.addItem);

  if (!p) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Link to="/produits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Retour aux produits
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-secondary">
          {p.image_url ? (
            <img src={p.image_url} alt={p.nom} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-9xl opacity-25">🌿</div>
          )}
        </div>
        <div className="flex flex-col">
          {p.categories?.nom && (
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">{p.categories.nom}</span>
          )}
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">{p.nom}</h1>
          <div className="mt-4 text-3xl font-semibold text-primary">
            {p.prix_sur_demande || p.prix == null
              ? "Prix sur demande"
              : `${formatXOF(Number(p.prix))}${p.unite ? ` / ${p.unite}` : ""}`}
          </div>
          {p.description && <p className="mt-6 text-muted-foreground">{p.description}</p>}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-full border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2 text-lg">−</button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-4 py-2 text-lg">+</button>
            </div>
            <button
              onClick={() => {
                add(
                  {
                    produit_id: p.id,
                    nom: p.nom,
                    prix: p.prix != null ? Number(p.prix) : null,
                    unite: p.unite,
                    prix_sur_demande: p.prix_sur_demande,
                    image_url: p.image_url,
                  },
                  qty,
                );
                toast.success(`${p.nom} ajouté au panier`);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4" /> Ajouter au panier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
