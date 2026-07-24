import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatXOF } from "@/lib/cart";

type Produit = {
  id: string;
  nom: string;
  slug: string;
  prix: number | null;
  unite: string | null;
  image_url: string | null;
  prix_sur_demande: boolean;
  description?: string | null;
  categories?: { nom: string; slug: string } | null;
};

export function ProductCard({ p }: { p: Produit }) {
  const add = useCart((s) => s.addItem);
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg">
      <Link to="/produits/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-square overflow-hidden bg-secondary">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.nom}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl opacity-25">🌿</div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {p.categories?.nom && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {p.categories.nom}
          </span>
        )}
        <Link to="/produits/$slug" params={{ slug: p.slug }} className="font-display text-lg font-medium leading-tight hover:text-primary">
          {p.nom}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-primary">
            {p.prix_sur_demande || p.prix == null
              ? "Sur demande"
              : `${formatXOF(p.prix)}${p.unite ? ` / ${p.unite}` : ""}`}
          </span>
          <button
            onClick={() =>
              add({
                produit_id: p.id,
                nom: p.nom,
                prix: p.prix ?? null,
                unite: p.unite,
                prix_sur_demande: p.prix_sur_demande,
                image_url: p.image_url,
              })
            }
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label={`Ajouter ${p.nom}`}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
