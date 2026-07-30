import postgres from "postgres";
import schemaSql from "@/db/schema.sql?raw";

export type MigrationResult = {
  ran: boolean;
  reason: string;
};

let inFlight: Promise<MigrationResult> | undefined;

function getConnectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
}

async function execute(): Promise<MigrationResult> {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return { ran: false, reason: "DATABASE_URL manquant" };
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
    connect_timeout: 15,
    onnotice: () => {},
  });

  try {
    const [{ exists }] = await sql<{ exists: boolean }[]>`
      SELECT to_regclass('public.produits') IS NOT NULL AS exists
    `;
    if (exists) {
      return { ran: false, reason: "schéma déjà présent" };
    }

    console.log("[migrate] application du schéma Charis FERME…");
    await sql.unsafe(schemaSql);
    console.log("[migrate] schéma appliqué avec succès");
    return { ran: true, reason: "schéma appliqué" };
  } catch (error) {
    console.error("[migrate] échec", error);
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Idempotent + dédupliqué : ne s'exécute qu'une fois par instance serveur.
export function runMigrations(): Promise<MigrationResult> {
  if (!inFlight) {
    inFlight = execute().catch((error) => {
      inFlight = undefined; // permet une nouvelle tentative
      throw error;
    });
  }
  return inFlight;
}
