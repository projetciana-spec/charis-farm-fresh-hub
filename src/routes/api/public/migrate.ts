import { createFileRoute } from "@tanstack/react-router";

// Déclenchement manuel de la migration/seed. Protégé par la clé service role.
export const Route = createFileRoute("/api/public/migrate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token");
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.OWN_SUPABASE_SERVICE_ROLE_KEY;
        if (!expected || token !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        try {
          const { runMigrations } = await import("@/lib/db-migrate.server");
          const result = await runMigrations();
          return Response.json(result);
        } catch (error) {
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
