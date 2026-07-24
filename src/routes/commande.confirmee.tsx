import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/commande/confirmee")({
  validateSearch: z.object({ numero: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Commande confirmée — Charis FERME" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => {
    const { numero } = Route.useSearch();
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center md:px-6">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-6 font-display text-4xl font-semibold">Merci !</h1>
        <p className="mt-4 text-muted-foreground">
          Votre commande {numero && numero !== "wa" ? `n°${numero} ` : ""}a bien été enregistrée. Nous vous contactons rapidement sur WhatsApp pour la confirmation et la livraison.
        </p>
        <Link to="/produits" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          Continuer à explorer
        </Link>
      </div>
    );
  },
});
