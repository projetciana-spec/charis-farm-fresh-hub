import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/notre-histoire")({
  head: () => ({
    meta: [
      { title: "Notre histoire — Charis FERME" },
      { name: "description", content: "Charis FERME, une famille passionnée par l'élevage et l'agriculture responsables à Zogbodomè depuis 2018." },
      { property: "og:title", content: "Notre histoire — Charis FERME" },
      { property: "og:description", content: "Depuis 2018, une ferme familiale au cœur du Bénin." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <span className="text-xs font-semibold uppercase tracking-widest text-accent">Depuis 2018</span>
      <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">Notre histoire</h1>
      <div className="prose prose-lg mt-8 space-y-6 text-foreground/90">
        <p>Charis FERME est née en 2018 d'une conviction simple : bien manger commence par bien produire. Installée à Zogbodomè, dans le sud du Bénin, notre ferme familiale allie tradition et respect de la nature.</p>
        <p>Nous élevons nos animaux — lapins, pintades, poules pondeuses, poulets fermiers, bovins, porcs, agoutis — dans le respect de leur bien-être. Nos poissons grandissent dans nos étangs, nourris naturellement.</p>
        <p>Côté maraîchage, aucun produit chimique. Nos légumes sont cultivés à la main, récoltés à maturité, et livrés dans la journée. C'est cette fraîcheur que nous voulons partager avec vous.</p>
        <p>Chaque commande soutient une agriculture locale, éthique et durable. Merci de faire partie de cette aventure.</p>
      </div>
    </div>
  ),
});
