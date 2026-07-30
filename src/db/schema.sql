-- =============================================
-- Charis FERME — Schéma complet Supabase
-- À exécuter dans SQL Editor de votre projet Supabase
-- =============================================

-- ---------- 20260724230613_0c4ccded-242a-45ab-a937-d744e12e69f4.sql ----------

-- Enum rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- produits
CREATE TABLE public.produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  prix NUMERIC(10,2),
  unite TEXT,
  categorie_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  en_stock BOOLEAN NOT NULL DEFAULT true,
  mis_en_avant BOOLEAN NOT NULL DEFAULT false,
  prix_sur_demande BOOLEAN NOT NULL DEFAULT false,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.produits TO anon, authenticated;
GRANT ALL ON public.produits TO service_role;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read produits" ON public.produits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage produits" ON public.produits FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- bannieres
CREATE TABLE public.bannieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  sous_titre TEXT,
  image_url TEXT,
  cta_texte TEXT,
  cta_lien TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bannieres TO anon, authenticated;
GRANT ALL ON public.bannieres TO service_role;
ALTER TABLE public.bannieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active bannieres" ON public.bannieres FOR SELECT TO anon, authenticated USING (actif = true);
CREATE POLICY "admin manage bannieres" ON public.bannieres FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- commandes
CREATE TABLE public.commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'nouveau',
  source TEXT NOT NULL DEFAULT 'site',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.commandes TO anon, authenticated;
GRANT SELECT, UPDATE ON public.commandes TO authenticated;
GRANT ALL ON public.commandes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE commandes_numero_seq TO anon, authenticated, service_role;
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert commandes" ON public.commandes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read commandes" ON public.commandes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update commandes" ON public.commandes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- commande_items
CREATE TABLE public.commande_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES public.produits(id) ON DELETE SET NULL,
  nom_snapshot TEXT NOT NULL,
  prix_snapshot NUMERIC(10,2),
  quantite INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.commande_items TO anon, authenticated;
GRANT SELECT ON public.commande_items TO authenticated;
GRANT ALL ON public.commande_items TO service_role;
ALTER TABLE public.commande_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert commande_items" ON public.commande_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read commande_items" ON public.commande_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- suggestions
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.suggestions TO anon, authenticated;
GRANT SELECT, UPDATE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert suggestions" ON public.suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read suggestions" ON public.suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update suggestions" ON public.suggestions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- parametres
CREATE TABLE public.parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);
GRANT SELECT ON public.parametres TO anon, authenticated;
GRANT ALL ON public.parametres TO service_role;
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read parametres" ON public.parametres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage parametres" ON public.parametres FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed catégories
INSERT INTO public.categories (nom, slug, ordre) VALUES
('Volailles','volailles',1),
('Bovins','bovins',2),
('Porcins','porcins',3),
('Élevage spécial','elevage-special',4),
('Maraîchage','maraichage',5),
('Visites','visites',6);

-- Seed produits
INSERT INTO public.produits (nom, slug, description, prix, unite, categorie_id, mis_en_avant, prix_sur_demande, ordre) VALUES
('Œufs frais bio','oeufs-frais-bio','Œufs pondus par nos poules élevées en plein air, sans OGM.',1500,'douzaine',(SELECT id FROM categories WHERE slug='volailles'),true,false,1),
('Poulet fermier entier','poulet-fermier','Poulet fermier élevé au grain, chair savoureuse.',4000,'kg',(SELECT id FROM categories WHERE slug='volailles'),true,false,2),
('Pintade','pintade','Pintade fermière élevée en plein air.',NULL,NULL,(SELECT id FROM categories WHERE slug='volailles'),false,true,3),
('Lapin','lapin','Lapins élevés à la ferme, viande fine et saine.',NULL,NULL,(SELECT id FROM categories WHERE slug='elevage-special'),true,true,1),
('Viande de bœuf','viande-boeuf','Viande de bœuf locale, découpe au choix.',3500,'kg',(SELECT id FROM categories WHERE slug='bovins'),false,false,1),
('Lait frais','lait-frais','Lait frais du jour, non pasteurisé.',500,'litre',(SELECT id FROM categories WHERE slug='bovins'),true,false,2),
('Fromage wagashi','wagashi','Fromage traditionnel béninois, texture ferme.',1000,'pièce',(SELECT id FROM categories WHERE slug='bovins'),true,false,3),
('Viande de porc','viande-porc','Viande de porc fraîche, élevage local.',2800,'kg',(SELECT id FROM categories WHERE slug='porcins'),false,false,1),
('Charcuterie / saucisses fumées','charcuterie','Saucisses fumées maison.',3500,'kg',(SELECT id FROM categories WHERE slug='porcins'),false,false,2),
('Agoutis','agoutis','Agoutis d''élevage, viande de brousse durable.',NULL,NULL,(SELECT id FROM categories WHERE slug='elevage-special'),true,true,2),
('Poisson','poisson','Poissons d''étang, pêche à la commande.',NULL,NULL,(SELECT id FROM categories WHERE slug='elevage-special'),false,true,3),
('Panier de légumes bio (5 kg)','panier-legumes-bio','Assortiment de légumes bio de saison, 5 kg.',3000,'panier',(SELECT id FROM categories WHERE slug='maraichage'),true,false,1),
('Légumes à l''unité','legumes-unite','Légumes bio à l''unité, prix selon la saison.',NULL,NULL,(SELECT id FROM categories WHERE slug='maraichage'),false,true,2),
('Visite de la ferme - Individuel','visite-individuel','Visite guidée de la ferme, photos autorisées.',5000,'personne',(SELECT id FROM categories WHERE slug='visites'),true,false,1),
('Visite de la ferme - Couple','visite-couple','Visite guidée pour deux personnes.',10000,'couple',(SELECT id FROM categories WHERE slug='visites'),false,false,2);

-- Seed bannière
INSERT INTO public.bannieres (titre, sous_titre, cta_texte, cta_lien, actif, ordre) VALUES
('Bienvenue chez Charis FERME','Direct de la ferme à votre table depuis 2018.','Découvrir nos produits','/produits',true,1);

-- Paramètres
INSERT INTO public.parametres (cle, valeur) VALUES
('whatsapp_admin','+22955345916'),
('whatsapp_public','+22991752020'),
('adresse','Zogbodomè - Hlagba Denou'),
('telephone','+22991752020'),
('nom_ferme','Charis FERME');


-- ---------- Storage : bucket farm-images ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read farm-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'farm-images');
CREATE POLICY "admin insert farm-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update farm-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete farm-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));

-- ---------- Suppressions admin ----------
CREATE POLICY "admin delete commandes" ON public.commandes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete commande_items" ON public.commande_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete suggestions" ON public.suggestions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
