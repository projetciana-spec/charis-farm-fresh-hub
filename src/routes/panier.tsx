import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart, formatXOF } from "@/lib/cart";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  ArrowLeft,
  ShoppingBag,
  MessageCircle,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import { payWithKkiapay, preloadKkiapay } from "@/lib/kkiapay";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon panier — Charis FERME" },
      { name: "description", content: "Finalisez votre commande Charis FERME et payez en ligne (Mobile Money ou carte)." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "preconnect", href: "https://cdn.kkiapay.me" },
      { rel: "preconnect", href: "https://api.kkiapay.me" },
    ],
  }),
  component: PanierPage,
});

type Phase = "idle" | "order" | "widget" | "verify";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function PanierPage() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const removeItem = useCart((s) => s.removeItem);
  const updateQty = useCart((s) => s.updateQty);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const loading = phase !== "idle";

  // Précharge le module de paiement dès l'ouverture du panier → widget instantané.
  useEffect(() => {
    void preloadKkiapay().catch(() => {});
  }, []);

  const [form, setForm] = useState({
    nom: "", prenom: "", whatsapp: "", email: "", adresse: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const payable = items.every((i) => i.prix != null) && total > 0;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = "Prénom requis";
    if (!form.nom.trim()) e.nom = "Nom requis";
    if (form.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = "Numéro WhatsApp invalide";
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Email invalide";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0]);
      return false;
    }
    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return false;
    }
    return true;
  }

  async function createOrder(source: "site" | "whatsapp") {
    const res = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        source,
        items: items.map((i) => ({
          produit_id: i.produit_id,
          nom: i.nom,
          prix: i.prix,
          quantite: i.quantite,
        })),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) {
      throw new Error("Impossible d'enregistrer la commande. Réessayez ou commandez via WhatsApp.");
    }
    return data as { id: string; numero: number };
  }

  /** Confirme le paiement côté serveur, puis attend le webhook si besoin. */
  async function confirmPayment(transactionId: string, commandeId: string) {
    try {
      const res = await fetch("/api/public/kkiapay-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, commandeId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.paid) return true;
    } catch {
      /* on retombe sur le sondage */
    }
    // Sondage court : le webhook KkiaPay reste la source de vérité.
    for (let i = 0; i < 6; i++) {
      await sleep(1500);
      try {
        const r = await fetch(`/api/public/order-status?id=${commandeId}`);
        const d = await r.json().catch(() => null);
        if (d?.paid) return true;
      } catch {
        /* continue */
      }
    }
    return false;
  }

  async function submitOnline() {
    if (!validate()) return;
    setPhase("order");
    try {
      const cmd = await createOrder("site");
      clear();
      navigate({ to: "/commande/confirmee", search: { numero: String(cmd.numero) } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setPhase("idle");
    }
  }

  async function payOnline() {
    if (!validate()) return;
    if (!payable) return toast.error("Certains articles sont sur devis : commandez via WhatsApp");

    let cmd: { id: string; numero: number };
    setPhase("order");
    try {
      // La commande est créée d'abord : le paiement est ainsi toujours rattaché.
      cmd = await createOrder("site");
    } catch (e: unknown) {
      setPhase("idle");
      return toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    }

    setPhase("widget");
    try {
      const result = await payWithKkiapay({
        amount: total,
        data: cmd.id,
        email: form.email,
        phone: form.whatsapp,
        fullname: `${form.prenom} ${form.nom}`.trim(),
      });

      if (result.status === "cancelled") {
        setPhase("idle");
        toast.info(`Paiement annulé. Votre commande n°${cmd.numero} est enregistrée, vous pouvez réessayer.`);
        return;
      }
      if (result.status !== "success") {
        setPhase("idle");
        toast.error("Paiement non abouti. Votre commande est enregistrée, nous vous contacterons sur WhatsApp.");
        return;
      }

      setPhase("verify");
      const paid = await confirmPayment(result.transactionId, cmd.id);
      if (paid) toast.success("Paiement confirmé, merci !");
      else toast.success("Paiement reçu — confirmation en cours de validation.");
      clear();
      navigate({ to: "/commande/confirmee", search: { numero: String(cmd.numero) } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur de paiement");
    } finally {
      setPhase("idle");
    }
  }

  async function submitWhatsapp() {
    if (!validate()) return;
    setPhase("order");
    try {
      await createOrder("whatsapp");
    } catch {
      // on continue quand même vers WhatsApp
    }
    const lines = items.map((i) => `• ${i.quantite}× ${i.nom}${i.prix ? ` — ${formatXOF(i.prix * i.quantite)}` : ""}`).join("\n");
    const msg = `Bonjour Charis FERME, je souhaite commander :\n${lines}\n\nTotal : ${formatXOF(total)}\n\nNom : ${form.prenom} ${form.nom}\nWhatsApp : ${form.whatsapp}${form.email ? `\nEmail : ${form.email}` : ""}${form.adresse ? `\nAdresse : ${form.adresse}` : ""}${form.notes ? `\nNotes : ${form.notes}` : ""}`;
    window.open(`https://wa.me/22955345916?text=${encodeURIComponent(msg)}`, "_blank");
    clear();
    setPhase("idle");
    navigate({ to: "/commande/confirmee", search: { numero: "wa" } });
  }

  const payLabel =
    phase === "order"
      ? "Enregistrement de la commande…"
      : phase === "widget"
        ? "Paiement en cours…"
        : phase === "verify"
          ? "Confirmation du paiement…"
          : `Payer ${formatXOF(total)}`;

  const field =
    "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Link to="/produits" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Continuer mes achats
      </Link>
      <h1 className="mt-4 font-display text-4xl font-semibold">Mon panier</h1>

      {items.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed bg-card/50 py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Votre panier est vide.</p>
          <Link to="/produits" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Voir les produits
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.produit_id} className="flex gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-sm">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {i.image_url ? <img src={i.image_url} alt={i.nom} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">🌿</div>}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{i.nom}</div>
                  <div className="text-sm text-muted-foreground">
                    {i.prix != null ? `${formatXOF(i.prix)}${i.unite ? ` / ${i.unite}` : ""}` : "Prix sur demande"}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-full border text-sm">
                      <button onClick={() => updateQty(i.produit_id, i.quantite - 1)} className="px-3 py-1 transition hover:text-primary" aria-label="Diminuer">−</button>
                      <span className="w-8 text-center tabular-nums">{i.quantite}</span>
                      <button onClick={() => updateQty(i.produit_id, i.quantite + 1)} className="px-3 py-1 transition hover:text-primary" aria-label="Augmenter">+</button>
                    </div>
                    <button onClick={() => removeItem(i.produit_id)} className="text-muted-foreground transition hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right font-semibold tabular-nums">
                  {i.prix != null ? formatXOF(i.prix * i.quantite) : "—"}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-4 rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Paiement sécurisé KkiaPay</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-primary" /> MTN & Moov Money</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> Livraison sur Cotonou & environs</span>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <div>
              <h2 className="font-display text-xl font-semibold">Vos informations</h2>
              <p className="mt-1 text-xs text-muted-foreground">Pas de compte nécessaire — commande en 30 secondes.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Prénom *</label>
                <input className={field} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} maxLength={100} aria-invalid={!!errors.prenom} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom *</label>
                <input className={field} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} maxLength={100} aria-invalid={!!errors.nom} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">WhatsApp *</label>
              <input className={field} placeholder="+229 55 34 59 16" inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={30} aria-invalid={!!errors.whatsapp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (facultatif)</label>
              <input className={field} type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} aria-invalid={!!errors.email} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Adresse de livraison</label>
              <input className={field} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} maxLength={500} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea className={field} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} />
            </div>

            <div className="space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{items.reduce((s, i) => s + i.quantite, 0)} article(s)</span>
                <span className="tabular-nums">{formatXOF(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span>À convenir sur WhatsApp</span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary tabular-nums">{formatXOF(total)}</span>
              </div>
            </div>

            <button
              onClick={payOnline}
              disabled={loading || !payable}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {payLabel}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              MTN / Moov Money, cartes bancaires — sécurisé par KkiaPay
            </p>

            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={submitWhatsapp}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-primary/5 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" /> Commander via WhatsApp
            </button>
            <button
              onClick={submitOnline}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" /> Payer à la livraison
            </button>
            <p className="text-xs text-muted-foreground">
              Les produits sans prix fixe sont sur devis — nous vous confirmerons le montant sur WhatsApp.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
