import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  transactionId: z.string().trim().min(4).max(120).optional(),
  transaction_id: z.string().trim().min(4).max(120).optional(),
  data: z.string().max(500).optional(),
  stateData: z.record(z.string(), z.unknown()).optional(),
});

const json = { "content-type": "application/json", "cache-control": "no-store" };

function extractCommandeId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const uuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuid?.[0];
}

/**
 * Webhook KkiaPay — inviolable par conception :
 *  1. secret partagé obligatoire (en-tête `x-kkiapay-secret`) ;
 *  2. le corps de la requête n'est jamais cru : chaque transaction est
 *     revérifiée auprès de l'API KkiaPay avec les clés privées ;
 *  3. le montant doit couvrir le total de la commande ;
 *  4. idempotent (index unique sur `transaction_id`).
 */
export const Route = createFileRoute("/api/public/kkiapay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.KKIAPAY_WEBHOOK_SECRET;
        const provided =
          request.headers.get("x-kkiapay-secret") ??
          new URL(request.url).searchParams.get("secret");
        if (!expected || !provided || provided !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: json });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: json });
        }
        const parsed = Schema.safeParse(payload);
        const transactionId = parsed.success
          ? (parsed.data.transactionId ?? parsed.data.transaction_id)
          : undefined;
        if (!transactionId) {
          return new Response(JSON.stringify({ error: "transaction_id_manquant" }), { status: 400, headers: json });
        }

        const commandeId =
          extractCommandeId(parsed.success ? parsed.data.data : undefined) ??
          extractCommandeId(
            typeof (parsed.success && parsed.data.stateData?.commandeId) === "string"
              ? String(parsed.data.stateData!.commandeId)
              : undefined,
          );

        try {
          const { applyPayment } = await import("@/lib/kkiapay.server");
          const result = await applyPayment(transactionId, commandeId ?? null);
          return new Response(JSON.stringify({ received: true, ...result }), { status: 200, headers: json });
        } catch (error) {
          console.error("[kkiapay-webhook]", error);
          return new Response(JSON.stringify({ error: "processing_failed" }), { status: 500, headers: json });
        }
      },
      GET: async () => new Response(JSON.stringify({ ok: true }), { headers: json }),
    },
  },
});
