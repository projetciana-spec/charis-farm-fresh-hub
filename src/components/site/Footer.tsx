import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Leaf className="h-7 w-7" />
            Charis FERME
          </div>
          <p className="mt-3 max-w-sm text-sm opacity-80">
            Direct de la ferme à votre table depuis 2018. Élevage responsable et maraîchage bio à Zogbodomè.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-90">Boutique</h3>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/produits">Tous les produits</Link></li>
            <li><Link to="/visites">Visites de la ferme</Link></li>
            <li><Link to="/panier">Mon panier</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-90">Contact</h3>
          <ul className="space-y-2 text-sm opacity-80">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Zogbodomè - Hlagba Denou</li>
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /> 01 91 75 20 20</li>
            <li><a href="https://wa.me/22991752020" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs opacity-70 md:px-6">
          © {new Date().getFullYear()} Charis FERME. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
