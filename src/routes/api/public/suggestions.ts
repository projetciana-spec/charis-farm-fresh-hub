import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  nom: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(3).max(2000),
});

export const Route = createFileRoute("/api/public/suggestions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
        }
        const parsed = Schema.safeParse(payload);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400 });
        }
        const { createServerDbClient } = await import("@/lib/supabase-public.server");
        const { error } = await createServerDbClient().from("suggestions").insert({
          nom: parsed.data.nom,
          email: parsed.data.email || null,
          whatsapp: parsed.data.whatsapp || null,
          message: parsed.data.message,
        });
        if (error) {
          console.error("[suggestions]", error);
          return new Response(JSON.stringify({ error: "db_error" }), { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
