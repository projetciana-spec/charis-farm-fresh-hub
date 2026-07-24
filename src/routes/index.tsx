import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listFeatured, listBanners, listCategories } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/site/ProductCard";
import { Leaf, Truck, ShieldCheck, HeartHandshake, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-farm.jpg";

const featuredQO = queryOptions({ queryKey: ["featured"], queryFn: () => listFeatured() });
const bannersQO = queryOptions({ queryKey: ["banners"], queryFn: () => listBanners() });
const categoriesQO = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Charis FERME — De la ferme à votre table à Zogbodomè" },
      { name: "description", content: "Œufs bio, poulet fermier, bœuf, lait frais, wagashi, légumes bio et visites de la ferme. Livraison au Bénin, commande en ligne ou WhatsApp." },
      { property: "og:title", content: "Charis FERME — De la ferme à votre table" },
      { property: "og:description", content: "Élevage responsable et maraîchage bio depuis 2018 à Zogbodomè." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredQO);
    context.queryClient.ensureQueryData(bannersQO);
    context.queryClient.ensureQueryData(categoriesQO);
  },
  component: Home,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredQO);
  const { data: banners } = useSuspenseQuery(bannersQO);
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const banner = banners[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="La ferme Charis" className="h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-primary/30" />
        </div>
        <div className="relative mx-auto flex min-h-[70vh] max-w-7xl flex-col justify-center px-4 py-24 text-primary-foreground md:px-6">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Leaf className="h-3.5 w-3.5" /> Depuis 2018 à Zogbodomè
          </span>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
            {banner?.titre ?? "De la ferme à votre table."}
          </h1>
          <p className="mt-6 max-w-xl text-base opacity-90 md:text-lg">
            {banner?.sous_titre ?? "Élevage responsable et maraîchage bio. Des produits frais, sains, livrés directement chez vous."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/produits" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition-transform hover:scale-[1.02]">
              Voir les produits <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/visites" className="inline-flex items-center gap-2 rounded-full border-2 border-primary-foreground/40 bg-primary-foreground/10 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-primary-foreground/20">
              Visiter la ferme
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y bg-cream">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
          {[
            { i: Leaf, t: "100% bio & naturel" },
            { i: ShieldCheck, t: "Élevage responsable" },
            { i: Truck, t: "Livraison rapide" },
            { i: HeartHandshake, t: "Direct producteur" },
          ].map(({ i: Icon, t }) => (
            <div key={t} className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Nos catégories</h2>
            <p className="mt-2 text-muted-foreground">Toute la ferme, en un clic.</p>
          </div>
          <Link to="/produits" className="hidden text-sm font-medium text-primary hover:underline md:inline">
            Voir tout →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/produits"
              search={{ cat: c.slug }}
              className="group aspect-square rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-full flex-col justify-between">
                <span className="text-2xl">{catEmoji(c.slug)}</span>
                <span className="font-display text-lg font-medium group-hover:text-primary">{c.nom}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Produits phares</h2>
            <p className="mt-2 text-muted-foreground">Les incontournables de la ferme.</p>
          </div>
          <Link to="/produits" className="text-sm font-medium text-primary hover:underline">
            Tout voir →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:px-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Notre histoire</span>
            <h2 className="mt-3 font-display text-4xl font-semibold">Une ferme née en 2018.</h2>
          </div>
          <div className="space-y-4 text-base opacity-90">
            <p>Charis FERME est le fruit d'une passion familiale pour l'élevage responsable et l'agriculture durable. Nous croyons qu'une nourriture saine commence dans un sol sain et un élevage respectueux.</p>
            <p>De nos lapins à nos pintades, de nos agoutis à nos poissons, chaque animal est élevé avec soin. Nos maraîchers travaillent sans produits chimiques pour vous offrir des légumes vibrants de saveur.</p>
            <Link to="/notre-histoire" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">
              Découvrir notre philosophie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-accent/20 via-cream to-primary/10 p-10 text-center md:p-16">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Prêt à goûter la ferme ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Commandez en ligne ou directement par WhatsApp. Nous vous répondons rapidement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/produits" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Commander en ligne
            </Link>
            <a
              href="https://wa.me/22991752020?text=Bonjour%20Charis%20FERME%2C%20je%20souhaite%20commander"
              target="_blank" rel="noopener noreferrer"
              className="rounded-full border-2 border-primary px-6 py-3 text-sm font-semibold text-primary"
            >
              Écrire sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function catEmoji(slug: string) {
  const m: Record<string, string> = {
    volailles: "🐔", bovins: "🐄", porcins: "🐖",
    "elevage-special": "🐇", maraichage: "🥬", visites: "🌾",
  };
  return m[slug] ?? "🌿";
}
