import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminGetParametres, saveParametres } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/parametres")({
  component: AdminParametres,
});

const FIELDS: { cle: string; label: string; textarea?: boolean; help?: string }[] = [
  { cle: "whatsapp_admin", label: "Numéro WhatsApp de la ferme", help: "Format international, ex. 22955345916" },
  { cle: "telephone", label: "Téléphone" },
  { cle: "email", label: "Email de contact" },
  { cle: "adresse", label: "Adresse", textarea: true },
  { cle: "horaires", label: "Horaires d'ouverture", textarea: true },
  { cle: "facebook", label: "Lien Facebook" },
];

function AdminParametres() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin", "parametres"],
    queryFn: () => adminGetParametres(),
  });

  useEffect(() => {
    if (data) setValues(data as Record<string, string>);
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveParametres({ data: { values } }),
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["admin", "parametres"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Coordonnées de la ferme utilisées sur le site et pour les notifications.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5">
        {FIELDS.map((f) => (
          <div key={f.cle} className="space-y-1.5">
            <Label>{f.label}</Label>
            {f.textarea ? (
              <Textarea
                rows={2}
                value={values[f.cle] ?? ""}
                onChange={(e) => setValues({ ...values, [f.cle]: e.target.value })}
              />
            ) : (
              <Input
                value={values[f.cle] ?? ""}
                onChange={(e) => setValues({ ...values, [f.cle]: e.target.value })}
              />
            )}
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
