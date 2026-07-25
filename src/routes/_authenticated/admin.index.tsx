import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/admin.functions";
import { formatXOF } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const STATUT_LABEL: Record<string, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  livree: "Livrée",
  annulee: "Annulée",
};

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getDashboard(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const cards = [
    { label: "Commandes totales", value: data.totalCommandes },
    { label: "Nouvelles commandes", value: data.nouvelles },
    { label: "En cours", value: data.enCours },
    { label: "CA du mois", value: formatXOF(data.caMois) },
    { label: "Produits", value: data.totalProduits },
    { label: "Ruptures de stock", value: data.ruptures },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité de la ferme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Dernières commandes</h2>
            <Link to="/admin/commandes" className="text-xs text-primary underline">
              Tout voir
            </Link>
          </div>
          <ul className="divide-y">
            {data.dernieresCommandes.length === 0 && (
              <li className="px-5 py-4 text-sm text-muted-foreground">Aucune commande.</li>
            )}
            {data.dernieresCommandes.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link to="/admin/commandes/$id" params={{ id: c.id }} className="hover:underline">
                  #{c.numero} — {c.prenom} {c.nom}
                </Link>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{formatXOF(Number(c.total))}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {STATUT_LABEL[c.statut] ?? c.statut}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">
              Suggestions {data.suggestionsNonLues > 0 && `(${data.suggestionsNonLues} non lues)`}
            </h2>
            <Link to="/admin/suggestions" className="text-xs text-primary underline">
              Tout voir
            </Link>
          </div>
          <ul className="divide-y">
            {data.dernieresSuggestions.length === 0 && (
              <li className="px-5 py-4 text-sm text-muted-foreground">Aucun message.</li>
            )}
            {data.dernieresSuggestions.map((s: any) => (
              <li key={s.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{s.nom}</p>
                <p className="line-clamp-2 text-muted-foreground">{s.message}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
