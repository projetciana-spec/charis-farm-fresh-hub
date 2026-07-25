import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListProduits,
  adminListCategories,
  saveProduit,
  deleteProduit,
} from "@/lib/admin.functions";
import { uploadFarmImage } from "@/lib/upload";
import { formatXOF } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/produits")({
  component: AdminProduits,
});

type Form = {
  id?: string;
  nom: string;
  description: string;
  prix: string;
  prix_sur_demande: boolean;
  unite: string;
  categorie_id: string;
  image_url: string;
  en_stock: boolean;
  mis_en_avant: boolean;
  ordre: string;
};

const EMPTY: Form = {
  nom: "",
  description: "",
  prix: "",
  prix_sur_demande: false,
  unite: "",
  categorie_id: "",
  image_url: "",
  en_stock: true,
  mis_en_avant: false,
  ordre: "0",
};

function AdminProduits() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [uploading, setUploading] = useState(false);

  const produits = useQuery({ queryKey: ["admin", "produits"], queryFn: () => adminListProduits() });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminListCategories(),
  });

  const save = useMutation({
    mutationFn: (f: Form) =>
      saveProduit({
        data: {
          id: f.id,
          nom: f.nom,
          description: f.description || null,
          prix: f.prix ? Number(f.prix) : null,
          prix_sur_demande: f.prix_sur_demande,
          unite: f.unite || null,
          categorie_id: f.categorie_id || null,
          image_url: f.image_url || null,
          en_stock: f.en_stock,
          mis_en_avant: f.mis_en_avant,
          ordre: Number(f.ordre) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Produit enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "produits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduit({ data: { id } }),
    onSuccess: () => {
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["admin", "produits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (produits.data ?? []).filter((p: any) => {
    const okSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const okCat = !filterCat || p.categorie_id === filterCat;
    return okSearch && okCat;
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFarmImage(file, "produits");
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Image téléversée");
    } catch (err: any) {
      toast.error(err?.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{rows.length} produit(s)</p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nouveau produit
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Toutes les catégories</option>
          {(categories.data ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5">Produit</th>
              <th className="px-4 py-2.5">Catégorie</th>
              <th className="px-4 py-2.5">Prix</th>
              <th className="px-4 py-2.5">Stock</th>
              <th className="px-4 py-2.5">Vedette</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.nom}
                        className="h-9 w-9 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted" />
                    )}
                    <span className="font-medium">{p.nom}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {p.categories?.nom ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  {p.prix_sur_demande ? "Sur demande" : p.prix ? formatXOF(Number(p.prix)) : "—"}
                  {p.unite && !p.prix_sur_demande ? ` / ${p.unite}` : ""}
                </td>
                <td className="px-4 py-2.5">{p.en_stock ? "Oui" : "Rupture"}</td>
                <td className="px-4 py-2.5">{p.mis_en_avant ? "★" : ""}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          id: p.id,
                          nom: p.nom,
                          description: p.description ?? "",
                          prix: p.prix != null ? String(p.prix) : "",
                          prix_sur_demande: p.prix_sur_demande,
                          unite: p.unite ?? "",
                          categorie_id: p.categorie_id ?? "",
                          image_url: p.image_url ?? "",
                          en_stock: p.en_stock,
                          mis_en_avant: p.mis_en_avant,
                          ordre: String(p.ordre ?? 0),
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Supprimer « ${p.nom} » ?`)) remove.mutate(p.id);
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun produit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix (XOF)</Label>
                <Input
                  type="number"
                  disabled={form.prix_sur_demande}
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unité</Label>
                <Input
                  placeholder="kg, douzaine, litre…"
                  value={form.unite}
                  onChange={(e) => setForm({ ...form, unite: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.prix_sur_demande}
                onCheckedChange={(v) => setForm({ ...form, prix_sur_demande: v })}
              />
              Prix sur demande
            </label>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <select
                value={form.categorie_id}
                onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Aucune</option>
                {(categories.data ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Aperçu"
                  className="h-24 w-24 rounded object-cover"
                />
              )}
              <Input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Téléversement…</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={form.en_stock}
                  onCheckedChange={(v) => setForm({ ...form, en_stock: v })}
                />
                En stock
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={form.mis_en_avant}
                  onCheckedChange={(v) => setForm({ ...form, mis_en_avant: v })}
                />
                Mis en avant
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={form.ordre}
                onChange={(e) => setForm({ ...form, ordre: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.nom}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
