import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/servizi", label: "Servizi" },
  { to: "/prenota", label: "Prenota" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-[0.14em] uppercase">Studio</span>
          <span className="font-display text-xl italic text-muted-foreground">Nails</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="silk text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/prenota"
            className="silk rounded-full bg-primary px-5 py-2.5 text-[0.65rem] tracking-[0.22em] uppercase text-primary-foreground hover:opacity-90"
          >
            Prenota ora
          </Link>
        </nav>

        <button
          aria-label="Apri menu"
          onClick={() => setOpen((v) => !v)}
          className="silk rounded-full border border-border p-2 md:hidden"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {open && (
        <div className="animate-rise border-t border-border/60 bg-background px-5 pb-5 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="silk rounded-xl px-3 py-3 text-sm tracking-[0.12em] uppercase text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/60">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg tracking-[0.14em] uppercase">Studio Nails</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Atelier di nail art e cura delle mani.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="eyebrow mb-2">Contatti</p>
          <p>Via della Bellezza 12, Milano</p>
          <p>+39 333 1234567</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="eyebrow mb-2">Area riservata</p>
          <Link to="/auth" className="silk hover:text-foreground">
            Accesso staff
          </Link>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Studio Nails
      </p>
    </footer>
  );
}
