import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Charis FERME" },
      { name: "description", content: "Contactez Charis FERME à Zogbodomè. Téléphone, WhatsApp, ou envoyez-nous un message." },
      { property: "og:title", content: "Contact — Charis FERME" },
      { property: "og:description", content: "Nous joindre à Zogbodomè." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", whatsapp: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim() || !form.message.trim()) {
      toast.error("Nom et message requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Message envoyé ! Nous vous répondrons vite.");
      setForm({ nom: "", email: "", whatsapp: "", message: "" });
    } catch {
      toast.error("Erreur d'envoi, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6">
      <div>
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Nous contacter</h1>
        <p className="mt-4 text-muted-foreground">Une question, une commande spéciale, une suggestion ? Écrivez-nous.</p>
        <div className="mt-8 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div><strong>Adresse</strong><br />Zogbodomè - Hlagba Denou</div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 text-primary" />
            <div><strong>Téléphone</strong><br />01 91 75 20 20</div>
          </div>
          <a href="https://wa.me/22991752020" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-primary">
            <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div><strong>WhatsApp</strong><br />+229 01 91 75 20 20</div>
          </a>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Nom *</label>
          <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} maxLength={100} required />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input type="email" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
        </div>
        <div>
          <label className="text-sm font-medium">WhatsApp</label>
          <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={30} placeholder="+229 ..." />
        </div>
        <div>
          <label className="text-sm font-medium">Message *</label>
          <textarea className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} required />
        </div>
        <button disabled={loading} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "Envoi..." : "Envoyer le message"}
        </button>
      </form>
    </div>
  );
}
