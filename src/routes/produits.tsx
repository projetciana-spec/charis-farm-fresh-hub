import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listProduits, listCategories } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/site/ProductCard";
import { z } from "zod";

const produitsQO = queryOptions({ queryKey: ["produits"], queryFn: () => listProduits() });
const categoriesQO = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

const searchSchema = z.object({ cat: z.string().optional() });

export const Route = createFileRoute("/produits")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Nos produits — Charis FERME" },
      { name: "description", content: "Découvrez le catalogue complet de Charis FERME : volailles, bovins, porcins, maraîchage bio et visites." },
      { property: "og:title", content: "Nos produits — Charis FERME" },
      { property: "og:description", content: "Catalogue complet des produits fermiers de Charis FERME." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(produitsQO);
    context.queryClient.ensureQueryData(categoriesQO);
  },
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Catalogue momentanément indisponible</h1>
      <p className="mt-3 text-muted-foreground">La connexion au serveur a échoué. Réessayez dans un instant.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        Recharger la page
      </button>
    </div>
  ),
  component: ProductsPage,
});


function ProductsPage() {
  const { data: produits } = useSuspenseQuery(produitsQO);
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();

  const filtered = cat
    ? produits.filter((p) => p.categories?.slug === cat)
    : produits;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Nos produits</h1>
        <p className="mt-3 text-muted-foreground">Tout ce que la ferme a à offrir cette semaine.</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => navigate({ search: {} })}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${!cat ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}
        >
          Tous
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate({ search: { cat: c.slug } })}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${cat === c.slug ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">Aucun produit dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
