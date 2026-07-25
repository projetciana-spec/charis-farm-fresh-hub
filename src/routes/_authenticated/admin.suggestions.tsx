import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListSuggestions, markSuggestion, deleteSuggestion } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Trash2, MailOpen, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/suggestions")({
  component: AdminSuggestions,
});

function AdminSuggestions() {
  const qc = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "suggestions"],
    queryFn: () => adminListSuggestions(),
  });

  const mark = useMutation({
    mutationFn: (v: { id: string; lu: boolean }) => markSuggestion({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSuggestion({ data: { id } }),
    onSuccess: () => {
      toast.success("Message supprimé");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((s: any) => !onlyUnread || !s.lu);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Suggestions</h1>
          <p className="text-sm text-muted-foreground">{rows.length} message(s)</p>
        </div>
        <Button variant="outline" onClick={() => setOnlyUnread((v) => !v)}>
          {onlyUnread ? "Voir tous" : "Non lus seulement"}
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((s: any) => (
          <article
            key={s.id}
            className={`rounded-xl border p-5 ${s.lu ? "bg-card" : "border-primary/40 bg-primary/5"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{s.nom}</h2>
                <p className="text-xs text-muted-foreground">
                  {s.email && <span>{s.email} · </span>}
                  {s.whatsapp && <span>{s.whatsapp} · </span>}
                  {new Date(s.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-1">
                {s.whatsapp && (
                  <Button size="icon" variant="ghost" asChild>
                    <a
                      href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Répondre sur WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={s.lu ? "Marquer non lu" : "Marquer lu"}
                  onClick={() => mark.mutate({ id: s.id, lu: !s.lu })}
                >
                  {s.lu ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Supprimer ce message ?")) remove.mutate(s.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{s.message}</p>
          </article>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        )}
      </div>
    </div>
  );
}
