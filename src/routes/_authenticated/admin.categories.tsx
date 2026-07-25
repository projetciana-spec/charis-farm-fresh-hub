import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListCategories, saveCategorie, deleteCategorie } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const [nom, setNom] = useState("");
  const [ordre, setOrdre] = useState("0");

  const { data } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminListCategories(),
  });

  const save = useMutation({
    mutationFn: (v: { id?: string; nom: string; ordre: number }) => saveCategorie({ data: v }),
    onSuccess: () => {
      toast.success("Catégorie enregistrée");
      setNom("");
      setOrdre("0");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategorie({ data: { id } }),
    onSuccess: () => {
      toast.success("Catégorie supprimée");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Catégories</h1>
        <p className="text-sm text-muted-foreground">Organisez le catalogue de la ferme.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm">Nom de la catégorie</label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Volailles" />
        </div>
        <div className="w-28 space-y-1.5">
          <label className="text-sm">Ordre</label>
          <Input type="number" value={ordre} onChange={(e) => setOrdre(e.target.value)} />
        </div>
        <Button
          disabled={nom.length < 2 || save.isPending}
          onClick={() => save.mutate({ nom, ordre: Number(ordre) || 0 })}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5">Nom</th>
              <th className="px-4 py-2.5">Ordre</th>
              <th className="px-4 py-2.5">Produits</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-2">
                  <Input
                    defaultValue={c.nom}
                    className="h-8 max-w-xs"
                    onBlur={(e) => {
                      if (e.target.value !== c.nom && e.target.value.length >= 2) {
                        save.mutate({ id: c.id, nom: e.target.value, ordre: c.ordre });
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    defaultValue={c.ordre}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (v !== c.ordre) save.mutate({ id: c.id, nom: c.nom, ordre: v });
                    }}
                  />
                </td>
                <td className="px-4 py-2 text-muted-foreground">{c.nb_produits}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Supprimer « ${c.nom} » ?`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune catégorie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
