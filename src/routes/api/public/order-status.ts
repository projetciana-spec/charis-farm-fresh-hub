import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = { "content-type": "application/json", "cache-control": "no-store" };
const Schema = z.object({ id: z.string().uuid() });

/** Statut de paiement d'une commande — utilisé par le panier pour attendre
 *  la confirmation (vérification serveur ou webhook KkiaPay). */
export const Route = createFileRoute("/api/public/order-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = Schema.safeParse({
          id: new URL(request.url).searchParams.get("id") ?? "",
        });
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: json });
        }
        try {
          const { createServerDbClient } = await import("@/lib/supabase-public.server");
          const db = createServerDbClient();
          const { data } = await (db as any)
            .from("commandes")
            .select("numero, statut, paiement_statut")
            .eq("id", parsed.data.id)
            .maybeSingle();
          if (!data) {
            return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: json });
          }
          return new Response(
            JSON.stringify({
              numero: data.numero,
              statut: data.statut,
              paiement_statut: data.paiement_statut,
              paid: data.paiement_statut === "paye",
            }),
            { status: 200, headers: json },
          );
        } catch (error) {
          console.error("[order-status]", error);
          return new Response(JSON.stringify({ error: "status_failed" }), { status: 500, headers: json });
        }
      },
    },
  },
});
