import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { splitName, useBrand } from "@/lib/brand";

const links = [
  { to: "/", label: "Home" },
  { to: "/servizi", label: "Servizi" },
] as const;

export function SiteHeader() {
  const brand = useBrand();
  const { first, rest, initial } = splitName(brand.name);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-3 z-40 px-4">
        <div
          className={[
            "silk mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border py-2.5 pr-2.5 pl-4 backdrop-blur-xl",
            scrolled
              ? "border-border bg-background/90 shadow-[var(--shadow-soft)]"
              : "border-border/50 bg-background/60",
          ].join(" ")}
        >
          <Link
            to="/"
            className="group flex items-center gap-2.5"
            aria-label={`${brand.name} — home`}
          >
            <span className="silk flex size-9 items-center justify-center rounded-full bg-primary font-display text-lg italic text-primary-foreground group-hover:scale-105">
              {initial}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-lg tracking-[0.14em] uppercase">{first}</span>
              {rest && (
                <span className="font-display text-lg italic text-muted-foreground">{rest}</span>
              )}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="silk relative py-1 text-xs tracking-[0.22em] uppercase text-muted-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:text-foreground hover:after:w-full"
                activeProps={{ className: "text-foreground after:w-full" }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/prenota"
              className="silk group relative overflow-hidden rounded-full bg-primary px-5 py-2.5 text-[0.65rem] tracking-[0.22em] uppercase text-primary-foreground hover:shadow-[var(--shadow-soft)]"
            >
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <span className="relative inline-flex items-center gap-1.5">
                Prenota ora
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </nav>

          <button
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((v) => !v)}
            className="silk rounded-full border border-border bg-card/70 p-2.5 md:hidden"
          >
            <span className="relative block size-4">
              <Menu
                className={`absolute inset-0 size-4 transition-all duration-300 ${open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
              />
              <X
                className={`absolute inset-0 size-4 transition-all duration-300 ${open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
              />
            </span>
          </button>
        </div>
      </header>

      {open && (
        <div className="gradient-blush fixed inset-0 z-30 flex flex-col justify-center px-8 md:hidden">
          <p className="eyebrow">Menu</p>
          <nav className="mt-4 flex flex-col gap-2">
            {[
              { to: "/", label: "Home" },
              { to: "/servizi", label: "Servizi" },
              { to: "/prenota", label: "Prenota" },
            ].map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 90}ms` }}
                className="animate-pop-in silk border-b border-border/50 py-4 font-display text-5xl hover:pl-2 hover:text-primary"
                activeProps={{ className: "italic text-primary" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/prenota"
            onClick={() => setOpen(false)}
            style={{ animationDelay: "300ms" }}
            className="animate-pop-in silk mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground"
          >
            Prenota appuntamento <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  const brand = useBrand();
  return (
    <footer className="gradient-espresso relative mt-10 overflow-hidden text-cream md:mt-14">
      <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-blush/15 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-5 pt-12 pb-8 md:pt-16">
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="eyebrow !text-cream/50">Esplora</p>
            <nav className="mt-3 flex flex-col gap-2.5">
              <Link to="/" className="silk w-fit text-cream/80 hover:text-cream">
                Home
              </Link>
              <Link to="/servizi" className="silk w-fit text-cream/80 hover:text-cream">
                Servizi
              </Link>
              <Link to="/prenota" className="silk w-fit text-cream/80 hover:text-cream">
                Prenota
              </Link>
            </nav>
          </div>
          <div>
            <p className="eyebrow !text-cream/50">Contatti</p>
            <div className="mt-3 space-y-2 text-cream/80">
              <p>{brand.address}</p>
              <a
                href={`tel:${brand.phone.replace(/\s/g, "")}`}
                className="silk block w-fit hover:text-cream"
              >
                {brand.phone}
              </a>
            </div>
          </div>
          <div>
            <p className="eyebrow !text-cream/50">Studio</p>
            <nav className="mt-3 flex flex-col gap-2.5">
              <Link to="/privacy" className="silk w-fit text-cream/80 hover:text-cream">
                Privacy
              </Link>
              <Link to="/termini" className="silk w-fit text-cream/80 hover:text-cream">
                Termini
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/15 pt-5 text-center text-xs text-cream/50">
          <p>
            © {new Date().getFullYear()} {brand.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
