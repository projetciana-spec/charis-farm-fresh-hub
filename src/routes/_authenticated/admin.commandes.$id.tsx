import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetCommande, updateStatutCommande } from "@/lib/admin.functions";
import { formatXOF } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/commandes/$id")({
  component: CommandeDetail,
});

const STATUTS = [
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_cours", label: "En cours" },
  { value: "livree", label: "Livrée" },
  { value: "annulee", label: "Annulée" },
] as const;

function CommandeDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "commande", id],
    queryFn: () => adminGetCommande({ data: { id } }),
  });

  const setStatut = useMutation({
    mutationFn: (statut: any) => updateStatutCommande({ data: { id, statut } }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const c: any = data?.commande;
  if (!c) return <p className="text-sm text-muted-foreground">Commande introuvable.</p>;

  const items: any[] = data?.items ?? [];
  const waNumber = (c.whatsapp ?? "").replace(/\D/g, "");
  const message = encodeURIComponent(
    `Bonjour ${c.prenom}, votre commande #${c.numero} chez Charis FERME :\n` +
      items.map((i) => `- ${i.nom_snapshot} x${i.quantite}`).join("\n") +
      `\nTotal : ${formatXOF(Number(c.total))}`,
  );

  return (
    <div className="space-y-6">
      <Link
        to="/admin/commandes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux commandes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Commande #{c.numero}</h1>
        <div className="flex items-center gap-2">
          <select
            value={c.statut}
            onChange={(e) => setStatut.mutate(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button asChild>
            <a href={`https://wa.me/${waNumber}?text=${message}`} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp client
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border bg-card p-5 text-sm lg:col-span-1">
          <h2 className="font-semibold">Client</h2>
          <p>
            {c.prenom} {c.nom}
          </p>
          <p className="text-muted-foreground">WhatsApp : {c.whatsapp}</p>
          {c.email && <p className="text-muted-foreground">Email : {c.email}</p>}
          {c.adresse && <p className="text-muted-foreground">Adresse : {c.adresse}</p>}
          {c.notes && <p className="text-muted-foreground">Notes : {c.notes}</p>}
          <p className="text-muted-foreground">
            Reçue le {new Date(c.created_at).toLocaleString("fr-FR")}
          </p>
          <p className="text-muted-foreground">Source : {c.source}</p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2.5">Produit</th>
                <th className="px-4 py-2.5">Qté</th>
                <th className="px-4 py-2.5 text-right">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5">{i.nom_snapshot}</td>
                  <td className="px-4 py-2.5">{i.quantite}</td>
                  <td className="px-4 py-2.5 text-right">
                    {i.prix_snapshot != null
                      ? formatXOF(Number(i.prix_snapshot) * i.quantite)
                      : "Sur demande"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatXOF(Number(c.total))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
