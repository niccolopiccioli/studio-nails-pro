import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LogOut, Scissors, Settings2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brand";

const navItems = [
  { to: "/dashboard", label: "Agenda", icon: CalendarDays },
  { to: "/clienti", label: "Clienti", icon: Users },
  { to: "/disponibilita", label: "Orari", icon: Settings2 },
  { to: "/gestionale", label: "Servizi", icon: Scissors },
] as const;

export function StaffShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="eyebrow">{BRAND_NAME}</p>
            <h1 className="font-display text-2xl leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="silk rounded-full px-4 py-2 text-xs tracking-[0.16em] uppercase text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={signOut}
              aria-label="Esci"
              className="silk rounded-full border border-border p-2.5 hover:bg-accent/40"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="silk flex flex-col items-center gap-1 py-3 text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
