import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Tags,
  Image,
  ShoppingBag,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Charis FERME" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/produits", label: "Produits", icon: Package },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
  { to: "/admin/bannieres", label: "Bannières", icon: Image },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { to: "/admin/suggestions", label: "Suggestions", icon: MessageSquare },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce compte n'a pas le rôle administrateur. Contactez le responsable de la ferme pour
            obtenir l'accès.
          </p>
          <Button className="mt-6" variant="outline" onClick={signOut}>
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="border-b px-5 py-4">
          <Link to="/" className="font-display text-lg font-bold text-primary">
            Charis FERME
          </Link>
          <p className="text-xs text-muted-foreground">Administration</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex gap-1 overflow-x-auto border-b bg-card p-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
          <button onClick={signOut} className="whitespace-nowrap px-3 py-1.5 text-xs">
            Quitter
          </button>
        </div>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
