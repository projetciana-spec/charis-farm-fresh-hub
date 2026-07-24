import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  produit_id: string;
  nom: string;
  prix: number | null;
  unite: string | null;
  prix_sur_demande: boolean;
  image_url: string | null;
  quantite: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantite">, quantite?: number) => void;
  removeItem: (produit_id: string) => void;
  updateQty: (produit_id: string, quantite: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantite = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.produit_id === item.produit_id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.produit_id === item.produit_id
                  ? { ...i, quantite: i.quantite + quantite }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantite }] };
        }),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.produit_id !== id) })),
      updateQty: (id, q) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.produit_id === id ? { ...i, quantite: Math.max(1, q) } : i))
            .filter((i) => i.quantite > 0),
        })),
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, i) => sum + (i.prix ?? 0) * i.quantite, 0),
      count: () => get().items.reduce((n, i) => n + i.quantite, 0),
    }),
    { name: "charis-cart" },
  ),
);

export function formatXOF(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
