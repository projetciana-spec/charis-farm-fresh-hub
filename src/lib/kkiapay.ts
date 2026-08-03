// Client KkiaPay : chargement paresseux du SDK + ouverture du widget.
export const KKIAPAY_PUBLIC_KEY =
  import.meta.env.VITE_KKIAPAY_PUBLIC_KEY || "716a101082d411f1ac978f68d5f4d598";
export const KKIAPAY_SANDBOX = import.meta.env.VITE_KKIAPAY_SANDBOX === "true";
const SDK_URL = "https://cdn.kkiapay.me/k.js";

type KkiapayWindow = Window & {
  openKkiapay?: (opts: Record<string, unknown>) => void;
  closeKkiapayWidget?: () => void;
  addSuccessListener?: (cb: (response: unknown) => void) => void;
  addFailedListener?: (cb: (response: unknown) => void) => void;
};

let loading: Promise<void> | undefined;
let listenersBound = false;

/** Précharge le SDK (appelé au montage du panier pour un paiement instantané). */
export function preloadKkiapay(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as KkiapayWindow;
  if (w.openKkiapay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      if (w.openKkiapay) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          loading = undefined;
          reject(new Error("Impossible de charger le module de paiement"));
        },
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Impossible de charger le module de paiement"));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export type KkiapayResult =
  | { status: "success"; transactionId: string }
  | { status: "failed"; reason?: string }
  | { status: "cancelled" };

function extractTransactionId(response: unknown): string | undefined {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    const id = r.transactionId ?? r.transaction_id ?? r.id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

// Un seul jeu de listeners pour toute la session : le SDK KkiaPay empile
// sinon les callbacks et rejoue d'anciennes fermetures.
type Handler = (r: KkiapayResult) => void;
let currentHandler: Handler | undefined;

function bindListeners() {
  if (listenersBound) return;
  const w = window as KkiapayWindow;
  w.addSuccessListener?.((response) => {
    const transactionId = extractTransactionId(response);
    currentHandler?.(
      transactionId
        ? { status: "success", transactionId }
        : { status: "failed", reason: "transaction_id_manquant" },
    );
  });
  w.addFailedListener?.((response) => {
    currentHandler?.({ status: "failed", reason: extractTransactionId(response) });
  });
  listenersBound = true;
}

function widgetIsOpen(): boolean {
  return Boolean(
    document.querySelector(
      'iframe[src*="kkiapay"], kkiapay-widget, [id*="kkiapay"] iframe, .kkiapay-modal',
    ),
  );
}

/** Ferme le widget si le SDK l'expose (sinon on nettoie le DOM). */
export function closeKkiapay() {
  const w = window as KkiapayWindow;
  try {
    w.closeKkiapayWidget?.();
  } catch {
    /* noop */
  }
}

/**
 * Ouvre le widget de paiement.
 * Résout TOUJOURS : succès, échec, ou annulation (fermeture du widget /
 * expiration) — le bouton d'appel ne peut donc jamais rester bloqué.
 */
export async function payWithKkiapay(opts: {
  amount: number;
  sandbox?: boolean;
  data?: string;
  email?: string;
  phone?: string;
  fullname?: string;
  timeoutMs?: number;
}): Promise<KkiapayResult> {
  await preloadKkiapay();
  const w = window as KkiapayWindow;
  if (!w.openKkiapay) throw new Error("Module de paiement indisponible");
  bindListeners();

  return new Promise<KkiapayResult>((resolve) => {
    let settled = false;
    let watcher: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let opened = false;

    const done = (r: KkiapayResult) => {
      if (settled) return;
      settled = true;
      currentHandler = undefined;
      if (watcher) clearInterval(watcher);
      if (timer) clearTimeout(timer);
      resolve(r);
    };

    currentHandler = done;

    // Surveille l'ouverture puis la fermeture du widget : si l'utilisateur
    // ferme la fenêtre, KkiaPay n'émet aucun évènement.
    watcher = setInterval(() => {
      const open = widgetIsOpen();
      if (open) opened = true;
      else if (opened) done({ status: "cancelled" });
    }, 600);

    // Filet de sécurité : 10 minutes maximum.
    timer = setTimeout(() => done({ status: "cancelled" }), opts.timeoutMs ?? 10 * 60 * 1000);

    try {
      w.openKkiapay!({
        amount: Math.max(1, Math.round(opts.amount)),
        key: KKIAPAY_PUBLIC_KEY,
        sandbox: opts.sandbox ?? KKIAPAY_SANDBOX,
        position: "center",
        theme: "#2f6d3a",
        data: opts.data ?? "",
        email: opts.email || undefined,
        phone: opts.phone || undefined,
        name: opts.fullname || undefined,
      });
    } catch {
      done({ status: "failed", reason: "ouverture_impossible" });
    }
  });
}
