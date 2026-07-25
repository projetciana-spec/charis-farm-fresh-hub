import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListBannieres, saveBanniere, deleteBanniere } from "@/lib/admin.functions";
import { uploadFarmImage } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bannieres")({
  component: AdminBannieres,
});

type Form = {
  id?: string;
  titre: string;
  sous_titre: string;
  image_url: string;
  cta_texte: string;
  cta_lien: string;
  actif: boolean;
  ordre: string;
};

const EMPTY: Form = {
  titre: "",
  sous_titre: "",
  image_url: "",
  cta_texte: "",
  cta_lien: "",
  actif: true,
  ordre: "0",
};

function AdminBannieres() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "bannieres"],
    queryFn: () => adminListBannieres(),
  });

  const save = useMutation({
    mutationFn: (f: Form) =>
      saveBanniere({
        data: {
          id: f.id,
          titre: f.titre,
          sous_titre: f.sous_titre || null,
          image_url: f.image_url || null,
          cta_texte: f.cta_texte || null,
          cta_lien: f.cta_lien || null,
          actif: f.actif,
          ordre: Number(f.ordre) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Bannière enregistrée");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "bannieres"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBanniere({ data: { id } }),
    onSuccess: () => {
      toast.success("Bannière supprimée");
      qc.invalidateQueries({ queryKey: ["admin", "bannieres"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFarmImage(file, "bannieres");
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Bannières</h1>
          <p className="text-sm text-muted-foreground">
            Offres et messages affichés sur la page d'accueil.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle bannière
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((b: any) => (
          <div key={b.id} className="overflow-hidden rounded-xl border bg-card">
            {b.image_url && (
              <img src={b.image_url} alt={b.titre} className="h-32 w-full object-cover" />
            )}
            <div className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{b.titre}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    b.actif ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {b.actif ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{b.sous_titre}</p>
              <div className="flex justify-end gap-1 pt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setForm({
                      id: b.id,
                      titre: b.titre,
                      sous_titre: b.sous_titre ?? "",
                      image_url: b.image_url ?? "",
                      cta_texte: b.cta_texte ?? "",
                      cta_lien: b.cta_lien ?? "",
                      actif: b.actif,
                      ordre: String(b.ordre ?? 0),
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
                    if (confirm("Supprimer cette bannière ?")) remove.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune bannière pour le moment.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier la bannière" : "Nouvelle bannière"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sous-titre</Label>
              <Input
                value={form.sous_titre}
                onChange={(e) => setForm({ ...form, sous_titre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Texte du bouton</Label>
                <Input
                  value={form.cta_texte}
                  onChange={(e) => setForm({ ...form, cta_texte: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lien du bouton</Label>
                <Input
                  placeholder="/produits"
                  value={form.cta_lien}
                  onChange={(e) => setForm({ ...form, cta_lien: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              {form.image_url && (
                <img src={form.image_url} alt="Aperçu" className="h-24 w-full rounded object-cover" />
              )}
              <Input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={form.actif}
                  onCheckedChange={(v) => setForm({ ...form, actif: v })}
                />
                Active
              </label>
              <div className="flex items-center gap-2">
                <Label>Ordre</Label>
                <Input
                  type="number"
                  className="w-20"
                  value={form.ordre}
                  onChange={(e) => setForm({ ...form, ordre: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.titre}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
