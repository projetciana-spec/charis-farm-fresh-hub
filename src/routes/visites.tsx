import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Users, MapPin } from "lucide-react";

export const Route = createFileRoute("/visites")({
  head: () => ({
    meta: [
      { title: "Visites de la ferme — Charis FERME" },
      { name: "description", content: "Visitez Charis FERME à Zogbodomè : découvrez nos animaux, notre maraîchage et notre philosophie. 5 000 XOF individuel, 10 000 XOF couple." },
      { property: "og:title", content: "Visites de la ferme — Charis FERME" },
      { property: "og:description", content: "Réservez une visite guidée à Zogbodomè." },
    ],
  }),
  component: VisitPage,
});

function VisitPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
      <span className="text-xs font-semibold uppercase tracking-widest text-accent">Découverte</span>
      <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">Visitez notre ferme</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Une expérience immersive au cœur de Zogbodomè. Rencontrez nos animaux, nos maraîchers, et goûtez la fraîcheur de nos produits.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-8">
          <Users className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-2xl font-medium">Tarif individuel</h2>
          <div className="mt-3 text-3xl font-semibold text-primary">5 000 XOF</div>
          <p className="mt-2 text-sm text-muted-foreground">Par personne — visite guidée d'environ 1h30.</p>
        </div>
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-8">
          <Users className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-2xl font-medium">Tarif couple</h2>
          <div className="mt-3 text-3xl font-semibold text-primary">10 000 XOF</div>
          <p className="mt-2 text-sm text-muted-foreground">Pour deux personnes.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-6 rounded-2xl bg-cream p-6 text-sm">
        <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Photos autorisées</div>
        <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Zogbodomè - Hlagba Denou</div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/contact" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          Réserver ma visite
        </Link>
        <a href="https://wa.me/22991752020?text=Bonjour%2C%20je%20souhaite%20r%C3%A9server%20une%20visite%20de%20la%20ferme" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary">
          WhatsApp
        </a>
      </div>
    </div>
  );
}
