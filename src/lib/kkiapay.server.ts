// Vérification serveur-à-serveur des transactions KkiaPay.
// Aucune confiance n'est accordée au client : le montant et le statut viennent
// toujours de l'API KkiaPay, jamais du navigateur.
const KKIAPAY_API_LIVE = "https://api.kkiapay.me/api/v1/transactions/status";
const KKIAPAY_API_SANDBOX = "https://api-sandbox.kkiapay.me/api/v1/transactions/status";

function isSandbox() {
  return (
    (process.env.KKIAPAY_SANDBOX ?? process.env.VITE_KKIAPAY_SANDBOX ?? "").toLowerCase() === "true"
  );
}


export type VerifiedTransaction = {
  ok: boolean;
  status: string;
  amount: number | null;
  method: string | null;
  raw: unknown;
};

export function kkiapayKeys() {
  return {
    publicKey: process.env.KKIAPAY_PUBLIC_KEY || "716a101082d411f1ac978f68d5f4d598",
    privateKey: process.env.KKIAPAY_PRIVATE_KEY,
    secret: process.env.KKIAPAY_SECRET,
  };
}

async function callStatus(url: string, transactionId: string, keys: { publicKey: string; privateKey: string; secret: string }) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": keys.publicKey,
      "x-private-key": keys.privateKey,
      "x-secret-key": keys.secret,
    },
    body: JSON.stringify({ transactionId }),
  });
}

export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction> {
  const { publicKey, privateKey, secret } = kkiapayKeys();
  if (!privateKey || !secret) {
    return { ok: false, status: "keys_missing", amount: null, method: null, raw: null };
  }
  const keys = { publicKey, privateKey, secret };

  // Sandbox et production ont des hôtes distincts : on essaie celui du mode
  // configuré, puis l'autre si les clés y sont refusées (401/403).
  const urls = isSandbox()
    ? [KKIAPAY_API_SANDBOX, KKIAPAY_API_LIVE]
    : [KKIAPAY_API_LIVE, KKIAPAY_API_SANDBOX];

  let res = await callStatus(urls[0]!, transactionId, keys);
  if (res.status === 401 || res.status === 403) {
    res = await callStatus(urls[1]!, transactionId, keys);
  }

  if (!res.ok) {
    return { ok: false, status: `http_${res.status}`, amount: null, method: null, raw: await res.text() };
  }

  const data = (await res.json()) as Record<string, unknown>;
  const status = String(data.status ?? data.state ?? "UNKNOWN").toUpperCase();
  const amountRaw = data.amount ?? data.montant;
  const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw ?? NaN);
  return {
    ok: status === "SUCCESS",
    status,
    amount: Number.isFinite(amount) ? amount : null,
    method: typeof data.source === "string" ? data.source : null,
    raw: data,
  };
}


/**
 * Applique un résultat de paiement à une commande de façon idempotente.
 * Rejette toute transaction dont le montant est inférieur au total de la commande.
 */
export async function applyPayment(transactionId: string, commandeId?: string | null) {
  const verified = await verifyTransaction(transactionId);
  // Client serveur résilient : clé service role si disponible (SUPABASE_ ou
  // OWN_SUPABASE_), sinon clé publique — jamais de crash faute de variable.
  const { createServerDbClient } = await import("@/lib/supabase-public.server");
  const admin = createServerDbClient() as unknown as {
    from: (t: string) => any;
  };


  // Journal des évènements : la contrainte unique rend le rejeu inoffensif.
  await admin
    .from("paiement_events")
    .upsert(
      {
        transaction_id: transactionId,
        commande_id: commandeId ?? null,
        statut: verified.status,
        montant: verified.amount,
        methode: verified.method,
        payload: verified.raw ?? null,
      },
      { onConflict: "transaction_id" },
    );

  if (!commandeId) {
    return { paid: verified.ok, status: verified.status, reason: "commande_absente" };
  }

  const { data: commande } = await admin
    .from("commandes")
    .select("id, total, paiement_statut")
    .eq("id", commandeId)
    .maybeSingle();

  if (!commande) return { paid: false, status: verified.status, reason: "commande_introuvable" };
  if (commande.paiement_statut === "paye") {
    return { paid: true, status: "SUCCESS", reason: "deja_paye" };
  }

  const amountOk = verified.amount != null && verified.amount >= Number(commande.total ?? 0);
  const paid = verified.ok && amountOk;

  await admin
    .from("commandes")
    .update({
      paiement_statut: paid ? "paye" : verified.ok ? "montant_invalide" : "echoue",
      paiement_transaction_id: transactionId,
      paiement_montant: verified.amount,
      paiement_methode: verified.method,
      paiement_verifie_at: new Date().toISOString(),
      ...(paid ? { statut: "confirme" } : {}),
    })
    .eq("id", commandeId);

  return {
    paid,
    status: verified.status,
    reason: paid ? "ok" : amountOk ? verified.status : "montant_insuffisant",
  };
}
