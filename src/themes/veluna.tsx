import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";

import { useBrand } from "@/lib/brand";

export type StudioCard = {
  slug: string;
  name: string;
  about: string | null;
  theme: string;
};

const STUDIO_URLS: Record<string, string> = {
  "studio-nails": "https://studio-nails-niccolopicciolis-projects.vercel.app",
  "estetica-pura": "https://estetica-pura-niccolopicciolis-projects.vercel.app",
};

const THEME_LABELS: Record<string, string> = {
  nails: "Nail art",
  estetica: "Centro estetico",
};

/* ------------------------------- Reveal ------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Header ------------------------------- */

export function VelunaHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-lg tracking-[0.34em] uppercase">
            Veluna
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#studi"
              className="silk text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground"
            >
              Studi
            </a>
            <a
              href="#piattaforma"
              className="silk text-xs tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground"
            >
              Piattaforma
            </a>
            <a
              href="#inizia"
              className="silk bg-primary px-5 py-2.5 text-[0.65rem] tracking-[0.22em] uppercase text-primary-foreground hover:opacity-90"
            >
              Inizia
            </a>
          </nav>
          <button
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((v) => !v)}
            className="silk p-2 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 flex flex-col justify-center bg-background px-8 md:hidden">
          <nav className="flex flex-col">
            {[
              { href: "#studi", label: "Studi" },
              { href: "#piattaforma", label: "Piattaforma" },
              { href: "#inizia", label: "Inizia" },
            ].map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 80}ms` }}
                className="animate-pop-in silk border-b border-border py-5 font-display text-5xl font-light"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

/* ------------------------------- Footer ------------------------------- */

export function VelunaFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 pt-12 pb-8">
        <p className="font-display text-4xl tracking-[0.2em] uppercase md:text-5xl">Veluna</p>
        <div className="mt-8 grid gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="eyebrow">Studi</p>
            <nav className="mt-3 flex flex-col gap-2">
              <a
                href={STUDIO_URLS["studio-nails"]}
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Studio Nails
              </a>
              <a
                href={STUDIO_URLS["estetica-pura"]}
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Estetica Pura
              </a>
            </nav>
          </div>
          <div>
            <p className="eyebrow">Piattaforma</p>
            <nav className="mt-3 flex flex-col gap-2">
              <a href="#studi" className="silk w-fit text-muted-foreground hover:text-foreground">
                Gli studi
              </a>
              <a
                href="#piattaforma"
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Come funziona
              </a>
            </nav>
          </div>
          <div>
            <p className="eyebrow">Note</p>
            <nav className="mt-3 flex flex-col gap-2">
              <Link
                to="/privacy"
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                to="/termini"
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Termini
              </Link>
            </nav>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Veluna</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------- Home -------------------------------- */

export function VelunaHome({ studios }: { studios: StudioCard[] }) {
  const brand = useBrand();
  const live = studios.filter((s) => s.slug !== "veluna");

  return (
    <div className="min-h-screen">
      <VelunaHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-14 md:pt-24 md:pb-20">
        <p className="animate-rise eyebrow">{brand.eyebrow}</p>
        <h1 className="animate-rise mt-6 max-w-4xl font-display text-6xl leading-[0.98] font-light sm:text-7xl lg:text-8xl">
          {brand.hero1} {brand.hero2}{" "}
          <span className="text-muted-foreground italic">{brand.hero3}</span>
        </h1>
        <p
          className="animate-rise mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          {brand.desc} Prenotazioni senza account, agenda semplice.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap gap-4" style={{ animationDelay: "220ms" }}>
          <a
            href="#studi"
            className="silk group inline-flex items-center gap-3 bg-primary px-9 py-4 text-[0.7rem] tracking-[0.26em] uppercase text-primary-foreground hover:opacity-90"
          >
            Scopri gli studi
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#piattaforma"
            className="silk inline-flex items-center border border-border px-9 py-4 text-[0.7rem] tracking-[0.26em] uppercase hover:border-foreground"
          >
            Come funziona
          </a>
        </div>
        <div
          className="animate-rise mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-5 text-xs tracking-[0.18em] uppercase text-muted-foreground"
          style={{ animationDelay: "320ms" }}
        >
          <span>{brand.badgeV}</span>
          <span>{brand.rating}</span>
        </div>
      </section>

      {/* Studi */}
      <section id="studi" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 md:pb-28">
        <Reveal>
          <div className="flex items-end justify-between border-b border-border pb-5">
            <h2 className="font-display text-4xl font-light md:text-6xl">Gli studi</h2>
            <span className="font-display text-sm text-muted-foreground italic">
              {String(live.length).padStart(2, "0")} live
            </span>
          </div>
        </Reveal>
        <div className="grid gap-px border-b border-border bg-border md:grid-cols-2">
          {live.map((s, i) => (
            <Reveal key={s.slug} delay={i * 90} className="bg-background">
              <article className="silk group flex h-full flex-col p-8 hover:bg-card md:p-12">
                <div className="flex items-center justify-between text-xs tracking-[0.22em] uppercase text-muted-foreground">
                  <span>{THEME_LABEL(s.theme)}</span>
                  <span className="font-display italic">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 font-display text-4xl font-light md:text-6xl">{s.name}</h3>
                <p className="mt-4 max-w-md flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.about}
                </p>
                <a
                  href={STUDIO_URLS[s.slug] ?? "#studi"}
                  target="_blank"
                  rel="noreferrer"
                  className="silk mt-8 inline-flex w-fit items-center gap-3 border border-foreground px-8 py-3.5 text-[0.68rem] tracking-[0.26em] uppercase hover:bg-primary hover:text-primary-foreground"
                >
                  Visita il sito <ArrowUpRight className="size-4" />
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Piattaforma */}
      <section id="piattaforma" className="scroll-mt-24 border-y border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <Reveal>
            <p className="eyebrow">Piattaforma</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-light md:text-6xl">
              Un gestionale semplice, <span className="italic">un sito per studio</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Il tuo sito",
                d: "Home, listino e prenotazioni con la tua identità: colori, font e testi su misura.",
              },
              {
                n: "02",
                t: "Prenotazioni online",
                d: "I clienti prenotano senza account e gestiscono tutto dal loro link personale.",
              },
              {
                n: "03",
                t: "Agenda semplice",
                d: "Giorno e settimana, clienti, orari e servizi. Niente complessità, solo l'essenziale.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <p className="font-display text-sm text-muted-foreground italic">{s.n}</p>
                <h3 className="mt-3 font-display text-3xl font-light">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Inizia */}
      <section id="inizia" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:py-28">
        <Reveal>
          <div className="gradient-espresso px-7 py-14 text-center text-cream sm:px-12 md:py-20">
            <p className="eyebrow !text-cream/60">Veluna per il tuo studio</p>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.02] font-light md:text-7xl">
              {brand.cta1} <span className="italic opacity-90">{brand.cta2}</span>
            </h2>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#studi"
                className="silk inline-flex items-center gap-3 bg-cream px-9 py-4 text-[0.7rem] tracking-[0.26em] text-espresso uppercase hover:opacity-90"
              >
                Vedi gli studi live <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <VelunaFooter />
    </div>
  );
}

function THEME_LABEL(theme: string): string {
  return THEME_LABELS[theme] ?? "Studio beauty";
}
