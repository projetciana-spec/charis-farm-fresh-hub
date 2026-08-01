import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const OrderSchema = z.object({
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  whatsapp: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  adresse: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  source: z.enum(["site", "whatsapp"]).default("site"),
  items: z
    .array(
      z.object({
        produit_id: z.string().uuid(),
        nom: z.string().max(200),
        prix: z.number().nullable(),
        quantite: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
});

function formatMessage(order: z.infer<typeof OrderSchema>, numero: number, total: number) {
  const lines = order.items
    .map((i) => `• ${i.quantite}× ${i.nom}${i.prix ? ` — ${i.prix * i.quantite} XOF` : " — prix sur demande"}`)
    .join("\n");
  return `🌱 *Nouvelle commande Charis FERME #${numero}*
👤 ${order.prenom} ${order.nom}
📱 WhatsApp: ${order.whatsapp}
${order.email ? `✉️ ${order.email}\n` : ""}${order.adresse ? `📍 ${order.adresse}\n` : ""}────────────
${lines}
────────────
💰 *Total: ${total} XOF*
${order.notes ? `📝 Notes: ${order.notes}` : ""}`;
}

async function sendTwilioWhatsapp(to: string, body: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (!lovableKey || !twilioKey || !twilioFrom) {
    console.warn("[orders] Twilio non configuré, WhatsApp non envoyé");
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch(
      "https://connector-gateway.lovable.dev/twilio/Messages.json",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${to}`,
          From: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
          Body: body,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[orders] Twilio failed", res.status, text);
      return { sent: false, reason: `twilio_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[orders] Twilio error", e);
    return { sent: false, reason: "exception" };
  }
}

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
        }
        const parsed = OrderSchema.safeParse(payload);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "invalid_input", details: parsed.error.flatten() }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        const order = parsed.data;
        const total = order.items.reduce(
          (s, i) => s + (i.prix ?? 0) * i.quantite,
          0,
        );

        let db: ReturnType<typeof import("@/lib/supabase-public.server").createServerDbClient>;
        try {
          const { createServerDbClient } = await import("@/lib/supabase-public.server");
          db = createServerDbClient();
        } catch (e) {
          console.error("[orders] supabase config", e);
          return new Response(JSON.stringify({ error: "config_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        // Commande + lignes créées en un seul aller-retour (RPC security definer).
        const { data, error } = await (db as any).rpc("creer_commande", {
          payload: {
            nom: order.nom,
            prenom: order.prenom,
            whatsapp: order.whatsapp,
            email: order.email || "",
            adresse: order.adresse || "",
            notes: order.notes || "",
            source: order.source,
            items: order.items,
          },
        });

        const row = Array.isArray(data) ? data[0] : data;
        if (error || !row) {
          console.error("[orders] rpc creer_commande failed", error);
          return new Response(JSON.stringify({ error: "db_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const numero = Number(row.numero);
        // La notification WhatsApp ne doit jamais ralentir le checkout.
        const notif = sendTwilioWhatsapp(
          process.env.WHATSAPP_ADMIN || "+22955345916",
          formatMessage(order, numero, total),
        ).catch(() => ({ sent: false, reason: "exception" }));
        void notif;

        return new Response(
          JSON.stringify({ ok: true, id: row.commande_id, numero }),
          { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } },
        );
      },
    },
  },
});
