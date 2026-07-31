// Client KkiaPay : chargement paresseux du SDK + ouverture du widget.
export const KKIAPAY_PUBLIC_KEY = "716a101082d411f1ac978f68d5f4d598";
const SDK_URL = "https://cdn.kkiapay.me/k.js";

type KkiapayWindow = Window & {
  openKkiapay?: (opts: Record<string, unknown>) => void;
  addSuccessListener?: (cb: (response: unknown) => void) => void;
  addFailedListener?: (cb: (response: unknown) => void) => void;
};

let loading: Promise<void> | undefined;

/** Précharge le SDK (appelé au montage du panier pour un paiement instantané). */
export function preloadKkiapay(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as KkiapayWindow;
  if (w.openKkiapay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing ?? document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Impossible de charger le module de paiement"));
    };
    if (!existing) document.body.appendChild(script);
    if (existing && (window as KkiapayWindow).openKkiapay) resolve();
  });
  return loading;
}

export type KkiapayResult =
  | { status: "success"; transactionId: string }
  | { status: "failed"; reason?: string };

function extractTransactionId(response: unknown): string | undefined {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    const id = r.transactionId ?? r.transaction_id ?? r.id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

/** Ouvre le widget de paiement et résout dès que KkiaPay renvoie un résultat. */
export async function payWithKkiapay(opts: {
  amount: number;
  sandbox?: boolean;
  data?: string;
  email?: string;
  phone?: string;
  fullname?: string;
}): Promise<KkiapayResult> {
  await preloadKkiapay();
  const w = window as KkiapayWindow;
  if (!w.openKkiapay) throw new Error("Module de paiement indisponible");

  return new Promise<KkiapayResult>((resolve) => {
    let settled = false;
    const done = (r: KkiapayResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    w.addSuccessListener?.((response) => {
      const transactionId = extractTransactionId(response);
      if (transactionId) done({ status: "success", transactionId });
      else done({ status: "failed", reason: "transaction_id_manquant" });
    });
    w.addFailedListener?.(() => done({ status: "failed" }));

    w.openKkiapay!({
      amount: Math.max(1, Math.round(opts.amount)),
      key: KKIAPAY_PUBLIC_KEY,
      sandbox: opts.sandbox ?? false,
      position: "center",
      theme: "#2f6d3a",
      data: opts.data ?? "",
      email: opts.email || undefined,
      phone: opts.phone || undefined,
      name: opts.fullname || undefined,
    });
  });
}
