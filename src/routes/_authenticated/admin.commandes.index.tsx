import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListCommandes, updateStatutCommande, deleteCommande } from "@/lib/admin.functions";
import { formatXOF } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/commandes")({
  component: AdminCommandes,
});

const STATUTS = [
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_cours", label: "En cours" },
  { value: "livree", label: "Livrée" },
  { value: "annulee", label: "Annulée" },
] as const;

function AdminCommandes() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("");
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "commandes"],
    queryFn: () => adminListCommandes(),
  });

  const setStatut = useMutation({
    mutationFn: (v: { id: string; statut: any }) => updateStatutCommande({ data: v }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCommande({ data: { id } }),
    onSuccess: () => {
      toast.success("Commande supprimée");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((c: any) => {
    const okStatut = !filtre || c.statut === filtre;
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
      String(c.numero).includes(q) ||
      (c.whatsapp ?? "").includes(q);
    return okStatut && okSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Commandes</h1>
        <p className="text-sm text-muted-foreground">{rows.length} commande(s)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher (nom, n°, WhatsApp)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5">N°</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">WhatsApp</th>
              <th className="px-4 py-2.5">Total</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5">
                  <Link
                    to="/admin/commandes/$id"
                    params={{ id: c.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    #{c.numero}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {c.prenom} {c.nom}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.whatsapp}</td>
                <td className="px-4 py-2.5">{formatXOF(Number(c.total))}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={c.statut}
                    onChange={(e) => setStatut.mutate({ id: c.id, statut: e.target.value })}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    {STATUTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" asChild>
                      <a
                        href={`https://wa.me/${(c.whatsapp ?? "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Ouvrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Supprimer la commande #${c.numero} ?`)) remove.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
