import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  transactionId: z.string().trim().min(4).max(120),
  commandeId: z.string().uuid().optional(),
});

const cors = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

// Confirmation appelée par le navigateur après le widget.
// Le statut réel est TOUJOURS revérifié auprès de KkiaPay côté serveur.
export const Route = createFileRoute("/api/public/kkiapay-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: cors });
        }
        const parsed = Schema.safeParse(payload);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: cors });
        }
        try {
          const { applyPayment } = await import("@/lib/kkiapay.server");
          const result = await applyPayment(parsed.data.transactionId, parsed.data.commandeId ?? null);
          return new Response(JSON.stringify(result), { status: 200, headers: cors });
        } catch (error) {
          console.error("[kkiapay-verify]", error);
          return new Response(JSON.stringify({ error: "verify_failed" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
