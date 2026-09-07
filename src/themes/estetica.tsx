import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Menu, Phone, X } from "lucide-react";

import heroImg from "@/assets/hero-nails.jpg";
import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import { splitName, useBrand } from "@/lib/brand";
import { formatDuration, formatPrice } from "@/lib/time";

export type StudioInfo = {
  name: string;
  about: string;
  address: string;
  phone: string;
};

export type ServiceInfo = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
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

const NAV = [
  { n: "01", to: "/", label: "Home" },
  { n: "02", to: "/servizi", label: "Rituali" },
  { n: "03", to: "/prenota", label: "Prenota" },
] as const;

export function EsteticaHeader() {
  const brand = useBrand();
  const { first, rest } = splitName(brand.name);
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
      <header
        className={[
          "silk sticky top-0 z-40 border-b backdrop-blur-xl",
          scrolled ? "border-border bg-background/95" : "border-transparent bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:py-6">
          <Link to="/" className="flex items-baseline gap-3" aria-label={`${brand.name} — home`}>
            <span className="flex size-8 items-center justify-center border border-primary font-display text-base text-primary">
              {first.charAt(0)}
            </span>
            <span className="font-display text-lg tracking-[0.28em] uppercase">
              {first}
              {rest ? <span className="ml-2 italic opacity-70">{rest}</span> : null}
            </span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {NAV.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="silk group inline-flex items-baseline gap-2 text-[0.7rem] tracking-[0.24em] uppercase text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                <span className="font-display text-[0.65rem] italic opacity-60">{l.n}</span>
                <span className="underline-offset-8 group-hover:underline">{l.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${brand.phone.replace(/\s/g, "")}`}
              className="silk hidden items-center gap-2 text-xs tracking-[0.14em] text-muted-foreground hover:text-foreground lg:inline-flex"
            >
              <Phone className="size-3.5" /> {brand.phone}
            </a>
            <Link
              to="/prenota"
              className="silk hidden border border-primary px-6 py-2.5 text-[0.65rem] tracking-[0.24em] uppercase text-primary hover:bg-primary hover:text-primary-foreground md:inline-flex"
            >
              Prenota
            </Link>
            <button
              aria-label={open ? "Chiudi menu" : "Apri menu"}
              onClick={() => setOpen((v) => !v)}
              className="silk p-2 md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-background px-6 pb-12 md:hidden">
          <nav className="flex flex-col">
            {NAV.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 80}ms` }}
                className="animate-pop-in silk flex items-baseline gap-4 border-t border-border py-5 last:border-b"
              >
                <span className="font-display text-sm italic text-muted-foreground">{l.n}</span>
                <span className="font-display text-5xl">{l.label}</span>
              </Link>
            ))}
          </nav>
          <p className="animate-pop-in mt-8 text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {brand.address} · {brand.phone}
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------- Footer ------------------------------- */

export function EsteticaFooter() {
  const brand = useBrand();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-8">
        <Link
          to="/"
          className="block font-display text-[13vw] leading-none tracking-tight md:text-8xl"
        >
          {brand.name}
        </Link>
        <div className="mt-10 grid gap-8 border-t border-border pt-8 text-sm sm:grid-cols-3">
          <div>
            <p className="eyebrow">Studio</p>
            <p className="mt-3 text-muted-foreground">{brand.address}</p>
            <a
              href={`tel:${brand.phone.replace(/\s/g, "")}`}
              className="silk mt-1 block w-fit hover:text-foreground"
            >
              {brand.phone}
            </a>
          </div>
          <div>
            <p className="eyebrow">Esplora</p>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/" className="silk w-fit text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link
                to="/servizi"
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Rituali
              </Link>
              <Link
                to="/prenota"
                className="silk w-fit text-muted-foreground hover:text-foreground"
              >
                Prenota
              </Link>
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
        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {brand.name}
          </p>
          <p className="tracking-[0.2em] uppercase">Powered by Veluna</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------- Home ------------------------------- */

export function EsteticaHome({
  services,
  studio,
}: {
  services: ServiceInfo[];
  studio: StudioInfo;
}) {
  const brand = useBrand();
  const marquee = [
    ...services.slice(0, 5).map((s) => s.name),
    ...(services.length > 0 ? [] : ["Viso", "Corpo", "Relax"]),
    "Prenota senza account",
  ];
  const gallery = [
    { src: work1, label: brand.workLabels[0] ?? "Look 01" },
    { src: work2, label: brand.workLabels[1] ?? "Look 02" },
    { src: work3, label: brand.workLabels[2] ?? "Look 03" },
    { src: work4, label: brand.workLabels[3] ?? "Look 04" },
  ];

  return (
    <div className="min-h-screen">
      <EsteticaHeader />

      {/* Hero immersivo */}
      <section className="relative flex min-h-[94svh] items-end overflow-hidden">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="animate-ken-burns absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-36 pb-12 md:pb-16">
          <p className="animate-rise eyebrow">{brand.eyebrow}</p>
          <h1 className="animate-rise mt-6 max-w-4xl font-display text-6xl leading-[0.98] sm:text-7xl lg:text-8xl">
            {brand.hero1} {brand.hero2}{" "}
            <span className="font-light italic text-primary">{brand.hero3}</span>
          </h1>
          <p
            className="animate-rise mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            {studio.about}
          </p>
          <div
            className="animate-rise mt-9 flex flex-wrap gap-4"
            style={{ animationDelay: "220ms" }}
          >
            <Link
              to="/prenota"
              className="silk group inline-flex items-center gap-3 bg-primary px-9 py-4 text-[0.7rem] tracking-[0.26em] uppercase text-primary-foreground hover:opacity-90"
            >
              Prenota un rituale
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/servizi"
              className="silk inline-flex items-center border border-border px-9 py-4 text-[0.7rem] tracking-[0.26em] uppercase hover:border-primary hover:text-primary"
            >
              I rituali
            </Link>
          </div>
          <div
            className="animate-rise mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-border/70 pt-5 text-xs tracking-[0.18em] uppercase text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            <span>{brand.rating}</span>
            <span>{studio.address}</span>
            <span className="hidden sm:inline">Senza account</span>
          </div>
        </div>
      </section>

      {/* Nastro */}
      <section aria-hidden className="overflow-hidden border-y border-border py-5">
        <div className="animate-marquee flex w-max items-center gap-10 pr-10">
          {[...marquee, ...marquee].map((item, i) => (
            <span
              key={i}
              className="font-display text-2xl whitespace-nowrap italic opacity-80 md:text-3xl"
            >
              {item}{" "}
              <span className="ml-10 inline-block size-1.5 rounded-full bg-primary align-middle" />
            </span>
          ))}
        </div>
      </section>

      {/* Manifesto */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28">
        <Reveal>
          <p className="eyebrow">Filosofia</p>
          <p className="mt-6 font-display text-4xl leading-[1.15] md:text-6xl">
            “Il tempo dedicato a sé è <span className="italic text-primary">la cura</span> più
            profonda.”
          </p>
          <p className="mt-8 text-xs tracking-[0.24em] uppercase text-muted-foreground">
            {brand.badgeK} · {brand.badgeV}
          </p>
        </Reveal>
      </section>

      {/* Indice rituali */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <Reveal>
          <div className="flex items-end justify-between border-b border-border pb-5">
            <h2 className="font-display text-4xl md:text-6xl">Rituali</h2>
            <Link
              to="/servizi"
              className="silk hidden items-center gap-2 text-xs tracking-[0.24em] uppercase text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Tutti <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <div>
          {services.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 5) * 60}>
              <Link
                to="/prenota"
                search={{ servizio: s.id }}
                className="silk group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border py-6 hover:bg-card/60 sm:gap-8 md:py-8"
              >
                <span className="font-display text-sm italic text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-3xl transition-transform duration-300 group-hover:translate-x-2 md:text-5xl">
                    {s.name}
                  </span>
                  <span className="mt-2 hidden max-w-xl text-sm text-muted-foreground md:block">
                    {s.description}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl whitespace-nowrap md:text-2xl">
                    {formatPrice(s.price_cents)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDuration(s.duration_minutes)}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Spazi */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <Reveal>
          <p className="eyebrow">Lo studio</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl md:text-6xl">
            Un luogo pensato per <span className="italic text-primary">rallentare</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-12 md:gap-6">
          {gallery.map((g, i) => (
            <Reveal
              key={g.src}
              delay={i * 80}
              className={i % 2 === 0 ? "md:col-span-7" : "md:col-span-5 md:mt-16"}
            >
              <figure>
                <div className="overflow-hidden">
                  <img
                    src={g.src}
                    alt={g.label}
                    loading="lazy"
                    className="silk aspect-[4/5] w-full object-cover brightness-[0.85] hover:scale-[1.03] hover:brightness-100 md:aspect-[16/11]"
                  />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  <span>{g.label}</span>
                  <span className="font-display italic">0{i + 1}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Visita */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
          <Reveal>
            <p className="eyebrow">Vieni a trovarci</p>
            <h2 className="mt-3 font-display text-5xl leading-[1.02] md:text-7xl">
              Inizia dal <span className="italic text-primary">respiro</span>
            </h2>
            <p className="mt-6 text-muted-foreground">{studio.address}</p>
            <a
              href={`tel:${studio.phone.replace(/\s/g, "")}`}
              className="silk mt-2 block w-fit font-display text-3xl hover:text-primary md:text-4xl"
            >
              {studio.phone}
            </a>
          </Reveal>
          <Reveal delay={120}>
            <div className="border border-border p-8 md:p-12">
              <p className="eyebrow">Prenotazione</p>
              <p className="mt-4 font-display text-3xl leading-snug">
                Scegli il tuo rituale. Ti basta un minuto, senza account.
              </p>
              <Link
                to="/prenota"
                className="silk group mt-8 inline-flex w-full items-center justify-center gap-3 bg-primary px-9 py-4 text-[0.7rem] tracking-[0.26em] uppercase text-primary-foreground hover:opacity-90"
              >
                Prenota ora
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Conferma immediata via email
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <EsteticaFooter />
    </div>
  );
}

/* ------------------------------ Servizi ------------------------------ */

export function EsteticaServizi({
  services,
  studio,
}: {
  services: ServiceInfo[];
  studio: StudioInfo;
}) {
  return (
    <div className="min-h-screen">
      <EsteticaHeader />
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-8 md:pt-20">
        <p className="eyebrow">Menu dei trattamenti</p>
        <h1 className="mt-4 max-w-3xl font-display text-6xl leading-[0.98] md:text-8xl">
          I <span className="italic text-primary">rituali</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          Ogni trattamento è pensato su misura. Durata e prezzo possono variare in base alle tue
          esigenze: ne parliamo insieme in studio.
        </p>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="border-t border-border">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 6) * 50}>
              <article className="grid gap-4 border-b border-border py-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10 md:py-10">
                <span className="font-display text-sm italic text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="font-display text-3xl md:text-5xl">{s.name}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                  <p className="mt-3 text-xs tracking-[0.2em] uppercase text-muted-foreground">
                    {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
                  </p>
                </div>
                <Link
                  to="/prenota"
                  search={{ servizio: s.id }}
                  className="silk inline-flex w-fit items-center gap-3 border border-primary px-8 py-3.5 text-[0.68rem] tracking-[0.26em] uppercase text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Prenota <ArrowRight className="size-4" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {studio.name} · {studio.address} · {studio.phone}
          </p>
        </Reveal>
      </section>
      <EsteticaFooter />
    </div>
  );
}
