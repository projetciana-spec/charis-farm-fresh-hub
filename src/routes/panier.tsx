import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart, formatXOF } from "@/lib/cart";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ArrowLeft, ShoppingBag, MessageCircle, CreditCard } from "lucide-react";
import { payWithKkiapay, preloadKkiapay } from "@/lib/kkiapay";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon panier — Charis FERME" },
      { name: "description", content: "Finalisez votre commande Charis FERME et payez en ligne (Mobile Money ou carte)." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "preconnect", href: "https://cdn.kkiapay.me" }, { rel: "preconnect", href: "https://api.kkiapay.me" }],
  }),
  component: PanierPage,
});

function PanierPage() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const removeItem = useCart((s) => s.removeItem);
  const updateQty = useCart((s) => s.updateQty);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Précharge le module de paiement dès l'ouverture du panier → widget instantané.
  useEffect(() => {
    void preloadKkiapay().catch(() => {});
  }, []);

  const [form, setForm] = useState({
    nom: "", prenom: "", whatsapp: "", email: "", adresse: "", notes: "",
  });

  const payable = items.every((i) => i.prix != null) && total > 0;

  function validate(): string | null {
    if (!form.prenom.trim() || !form.nom.trim()) return "Nom et prénom requis";
    if (!form.whatsapp.trim() || form.whatsapp.length < 6) return "Numéro WhatsApp requis";
    if (items.length === 0) return "Panier vide";
    return null;
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
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Erreur");
    return data as { id: string; numero: number };
  }

  async function submitOnline() {
    const err = validate();
    if (err) return toast.error(err);
    setLoading(true);
    try {
      const cmd = await createOrder("site");
      clear();
      navigate({ to: "/commande/confirmee", search: { numero: String(cmd.numero) } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  }

  async function payOnline() {
    const err = validate();
    if (err) return toast.error(err);
    if (!payable) return toast.error("Certains articles sont sur devis : commandez via WhatsApp");
    setLoading(true);
    try {
      // Le widget s'ouvre immédiatement, l'enregistrement de la commande se fait en parallèle.
      const orderPromise = createOrder("site");
      const payPromise = payWithKkiapay({
        amount: total,
        email: form.email,
        phone: form.whatsapp,
        fullname: `${form.prenom} ${form.nom}`.trim(),
      });
      const [result, cmd] = await Promise.all([payPromise, orderPromise]);

      if (result.status !== "success") {
        toast.error("Paiement non abouti. Votre commande est enregistrée, nous vous contacterons.");
        return;
      }

      // Vérification serveur en arrière-plan (le webhook KkiaPay reste la source de vérité).
      void fetch("/api/public/kkiapay-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: result.transactionId, commandeId: cmd.id }),
        keepalive: true,
      }).catch(() => {});

      toast.success("Paiement reçu, merci !");
      clear();
      navigate({ to: "/commande/confirmee", search: { numero: String(cmd.numero) } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur de paiement");
    } finally {
      setLoading(false);
    }
  }



  async function submitWhatsapp() {
    const err = validate();
    if (err) return toast.error(err);
    // Save in DB first
    setLoading(true);
    try {
      await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "whatsapp",
          items: items.map((i) => ({
            produit_id: i.produit_id, nom: i.nom, prix: i.prix, quantite: i.quantite,
          })),
        }),
      });
    } catch {
      // continue anyway
    }
    const lines = items.map((i) => `• ${i.quantite}× ${i.nom}${i.prix ? ` — ${formatXOF(i.prix * i.quantite)}` : ""}`).join("\n");
    const msg = `Bonjour Charis FERME, je souhaite commander :\n${lines}\n\nTotal : ${formatXOF(total)}\n\nNom : ${form.prenom} ${form.nom}\nWhatsApp : ${form.whatsapp}${form.email ? `\nEmail : ${form.email}` : ""}${form.adresse ? `\nAdresse : ${form.adresse}` : ""}${form.notes ? `\nNotes : ${form.notes}` : ""}`;
    const url = `https://wa.me/22955345916?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clear();
    setLoading(false);
    navigate({ to: "/commande/confirmee", search: { numero: "wa" } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Link to="/produits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Continuer mes achats
      </Link>
      <h1 className="mt-4 font-display text-4xl font-semibold">Mon panier</h1>

      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Votre panier est vide.</p>
          <Link to="/produits" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Voir les produits
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.produit_id} className="flex gap-4 rounded-xl border bg-card p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {i.image_url ? <img src={i.image_url} alt={i.nom} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">🌿</div>}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{i.nom}</div>
                  <div className="text-sm text-muted-foreground">
                    {i.prix != null ? `${formatXOF(i.prix)}${i.unite ? ` / ${i.unite}` : ""}` : "Prix sur demande"}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-full border text-sm">
                      <button onClick={() => updateQty(i.produit_id, i.quantite - 1)} className="px-3 py-1">−</button>
                      <span className="w-8 text-center">{i.quantite}</span>
                      <button onClick={() => updateQty(i.produit_id, i.quantite + 1)} className="px-3 py-1">+</button>
                    </div>
                    <button onClick={() => removeItem(i.produit_id)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right font-semibold">
                  {i.prix != null ? formatXOF(i.prix * i.quantite) : "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Vos informations</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Prénom *" className="rounded-lg border bg-background px-3 py-2 text-sm" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} maxLength={100} />
              <input placeholder="Nom *" className="rounded-lg border bg-background px-3 py-2 text-sm" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} maxLength={100} />
            </div>
            <input placeholder="WhatsApp * (+229...)" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={30} />
            <input placeholder="Email" type="email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
            <input placeholder="Adresse de livraison" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} maxLength={500} />
            <textarea placeholder="Notes (facultatif)" rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} />

            <div className="my-3 flex justify-between border-t pt-4 text-lg font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatXOF(total)}</span>
            </div>

            <button
              onClick={payOnline}
              disabled={loading || !payable}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {loading ? "Traitement…" : `Payer maintenant ${formatXOF(total)}`}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              MTN / Moov Money, cartes bancaires — paiement sécurisé par KkiaPay
            </p>
            <button
              onClick={submitOnline}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" /> Commander sans payer maintenant
            </button>

            <button
              onClick={submitWhatsapp}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-primary/5 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" /> Commander via WhatsApp
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
