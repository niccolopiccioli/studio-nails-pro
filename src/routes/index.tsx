import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Clock, MapPin, Phone, Sparkles, Star } from "lucide-react";

import heroImg from "@/assets/hero-nails.jpg";
import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { useBrand, useDocTitle } from "@/lib/brand";
import { EsteticaHome } from "@/themes/estetica";
import { VelunaHome } from "@/themes/veluna";
import { getPublicStudios, getStudioAndServices } from "@/lib/booking.functions";
import { formatDuration, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prenota online" },
      {
        name: "description",
        content: "Prenota online i tuoi trattamenti di bellezza, senza account.",
      },
      { property: "og:title", content: "Prenota online" },
    ],
  }),
  component: Home,
});

const MARQUEE_FALLBACK = [
  "Semipermanente",
  "Ricostruzione Gel",
  "Nail Art su misura",
  "Refill",
  "Pedicure",
  "Prenota senza account",
];

const QUOTES = [
  {
    text: "Non sono mai stata così curata: ambiente intimo, risultato impeccabile.",
    name: "Giulia R.",
  },
  {
    text: "Prenotato in un minuto dal telefono, senza account. Esperienza perfetta.",
    name: "Federica M.",
  },
  {
    text: "Il mio appuntamento fisso ogni mese. Non cambierei mai.",
    name: "Sara L.",
  },
];

function Home() {
  const fetchData = useServerFn(getStudioAndServices);
  const { data } = useQuery({ queryKey: ["studio"], queryFn: () => fetchData() });
  const brand = useBrand();
  useDocTitle(`${brand.name} — ${brand.tagline}`);
  const fetchSites = useServerFn(getPublicStudios);
  const { data: sitesData } = useQuery({
    queryKey: ["public-studios"],
    queryFn: () => fetchSites(),
    enabled: brand.theme === "veluna",
  });
  if (brand.theme === "veluna") {
    return <VelunaHome studios={sitesData?.studios ?? []} />;
  }
  const services = data?.services ?? [];
  const studioName = data?.studio?.name ?? brand.name;
  const address = data?.studio?.address ?? brand.address;
  if (brand.theme === "estetica") {
    return (
      <EsteticaHome
        services={services}
        studio={{
          name: studioName,
          about: data?.studio?.about ?? brand.desc,
          address,
          phone: data?.studio?.phone ?? brand.phone,
        }}
      />
    );
  }
  const marquee =
    services.length > 0
      ? [...services.slice(0, 5).map((s) => s.name), "Prenota senza account"]
      : MARQUEE_FALLBACK;

  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="gradient-blush absolute inset-0" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-32 size-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-10 pb-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-16 md:pb-14">
          <div className="animate-rise">
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="inline-block h-px w-10 bg-primary/50" />
              {brand.eyebrow}
            </p>
            <h1 className="mt-5 font-display text-6xl leading-[0.98] sm:text-7xl lg:text-8xl">
              {brand.hero1}
              <span className="block">{brand.hero2}</span>
              <span className="block font-light italic text-primary">{brand.hero3}</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {data?.studio?.about ??
                "Nail art su misura, gel e semipermanente in un ambiente intimo e curato in ogni dettaglio."}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/prenota"
                className="silk group relative overflow-hidden rounded-full bg-primary px-8 py-4 text-[0.72rem] tracking-[0.24em] uppercase text-primary-foreground hover:shadow-[var(--shadow-lift)]"
              >
                <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <span className="relative inline-flex items-center gap-2">
                  Prenota appuntamento
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                to="/servizi"
                className="silk rounded-full border border-primary/25 px-8 py-4 text-[0.72rem] tracking-[0.24em] uppercase backdrop-blur hover:bg-card"
              >
                Scopri i servizi
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </span>
                {brand.rating}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4" /> Senza account
              </span>
            </div>
          </div>

          <div className="animate-rise relative mx-auto w-full max-w-sm md:max-w-none">
            <div
              className="overflow-hidden shadow-[var(--shadow-lift)]"
              style={{ borderRadius: "999px 999px 2rem 2rem" }}
            >
              <img
                src={heroImg}
                alt="Manicure nude rosato su seta color crema"
                width={1280}
                height={1600}
                className="animate-ken-burns h-[440px] w-full object-cover md:h-[580px]"
              />
            </div>

            <div className="animate-float-soft surface-card absolute top-10 -left-3 flex items-center gap-3 px-4 py-3 sm:-left-8">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
              </span>
              <div>
                <p className="text-xs font-medium">Disponibile oggi</p>
                <p className="text-[0.7rem] text-muted-foreground">Prenota in un minuto</p>
              </div>
            </div>

            <div
              className="animate-float-soft surface-card absolute -bottom-5 right-2 px-5 py-4 sm:right-6"
              style={{ animationDelay: "1.4s" }}
            >
              <p className="eyebrow">{brand.badgeK}</p>
              <p className="font-display text-3xl">{brand.badgeV}</p>
            </div>

            <Link
              to="/prenota"
              aria-label="Prenota ora"
              className="silk group absolute -top-4 right-4 hidden size-28 items-center justify-center sm:flex"
            >
              <svg viewBox="0 0 120 120" className="animate-spin-slower absolute inset-0 size-full">
                <defs>
                  <path id="badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
                </defs>
                <text className="fill-foreground text-[10.5px] tracking-[0.32em] uppercase">
                  <textPath href="#badge-circle">Prenota ora · senza account ·</textPath>
                </text>
              </svg>
              <span className="silk flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:scale-110">
                <ArrowUpRight className="size-5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ NASTRO ============ */}
      <section aria-hidden className="overflow-hidden py-3">
        <div className="-rotate-[1.5deg] scale-[1.03] bg-espresso py-4 text-cream shadow-[var(--shadow-soft)]">
          <div className="animate-marquee flex w-max items-center gap-8 pr-8">
            {[...marquee, ...marquee].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-8 text-sm tracking-[0.28em] whitespace-nowrap uppercase"
              >
                {item}
                <Sparkles className="size-4 shrink-0 opacity-70" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PORTFOLIO ============ */}
      <section className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2 className="mt-2 font-display text-5xl md:text-6xl">
                Lavori che <span className="italic text-primary">parlano</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Ogni trattamento è disegnato su di te: forma, colore, dettagli. Nulla di standard.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
          {[
            { src: work1, label: brand.workLabels[0] ?? "Look 01", tall: true },
            { src: work2, label: brand.workLabels[1] ?? "Look 02", tall: false },
            { src: work3, label: brand.workLabels[2] ?? "Look 03", tall: false },
            { src: work4, label: brand.workLabels[3] ?? "Look 04", tall: true },
          ].map((w, i) => (
            <Reveal key={w.src} delay={i * 90} className={w.tall ? "md:-mt-8" : "md:mt-8"}>
              <figure className="silk group relative overflow-hidden rounded-[1.75rem] hover:shadow-[var(--shadow-lift)]">
                <img
                  src={w.src}
                  alt={`Lavoro dello studio: ${w.label}`}
                  loading="lazy"
                  width={900}
                  height={900}
                  className={`silk w-full object-cover group-hover:scale-[1.06] ${
                    w.tall ? "aspect-[3/4]" : "aspect-square"
                  }`}
                />
                <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="font-display text-xl text-white italic">{w.label}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ RITUALE / COME FUNZIONA ============ */}
      <section className="bg-card/60 py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="eyebrow">Semplice per davvero</p>
            <h2 className="mt-2 max-w-xl font-display text-5xl md:text-6xl">
              Prenoti in <span className="italic text-primary">tre gesti</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Scegli",
                text: "Trattamento, giorno e orario dal calendario in tempo reale.",
              },
              {
                n: "02",
                title: "Conferma",
                text: "Solo nome e telefono, nessun account. Ricevi tutto via email.",
              },
              {
                n: "03",
                title: "Goditi",
                text: "Arriva e rilassati: al resto pensiamo noi, con link per spostare.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="silk surface-card group h-full p-8 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
                  <p className="font-display text-6xl text-primary/25 transition-colors group-hover:text-primary/50">
                    {s.n}
                  </p>
                  <h3 className="mt-4 font-display text-3xl">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVIZI ============ */}
      <section className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Trattamenti</p>
              <h2 className="mt-2 font-display text-5xl md:text-6xl">
                Il <span className="italic text-primary">menu</span>
              </h2>
            </div>
            <Link
              to="/servizi"
              className="silk inline-flex items-center gap-2 text-xs tracking-[0.24em] uppercase underline underline-offset-8 hover:opacity-70"
            >
              Tutti i servizi <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-border/70">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 5) * 70}>
              <Link
                to="/prenota"
                search={{ servizio: s.id }}
                className="silk group flex items-center gap-5 border-b border-border/60 bg-card/40 p-5 last:border-0 hover:bg-accent/40 sm:gap-8 sm:p-7"
              >
                <span className="font-display text-lg text-muted-foreground/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-2xl sm:text-3xl">{s.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                    {formatDuration(s.duration_minutes)}
                  </span>
                </span>
                <span className="font-display text-xl whitespace-nowrap sm:text-2xl">
                  {formatPrice(s.price_cents)}
                </span>
                <span className="silk flex size-11 shrink-0 items-center justify-center rounded-full border border-border group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowUpRight className="size-5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ VOCI ============ */}
      <section className="mx-auto max-w-6xl px-5 pb-10 md:pb-14">
        <Reveal>
          <p className="eyebrow">Dicono di noi</p>
          <h2 className="mt-2 font-display text-5xl md:text-6xl">
            Clienti <span className="italic text-primary">felici</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 110}>
              <blockquote className="silk surface-card flex h-full flex-col p-8 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-4 fill-current" />
                  ))}
                </span>
                <p className="mt-4 flex-1 font-display text-2xl leading-snug italic">“{q.text}”</p>
                <footer className="mt-5 text-xs tracking-[0.22em] uppercase text-muted-foreground">
                  {q.name}
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CTA FINALE ============ */}
      <section className="mx-auto max-w-6xl px-5 pb-2 md:pb-4">
        <Reveal>
          <div className="gradient-espresso relative overflow-hidden rounded-[2rem] px-7 py-14 text-center text-cream shadow-[var(--shadow-lift)] sm:px-12 md:py-20">
            <div className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-blush/20 blur-3xl" />
            <p className="eyebrow !text-cream/70">Ultimo passo</p>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.02] md:text-7xl">
              {brand.cta1} <span className="italic opacity-90">{brand.cta2}</span>
            </h2>
            <p className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-cream/75">
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" /> {address}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="size-4" /> {data?.studio?.phone ?? brand.phone}
              </span>
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/prenota"
                className="silk group relative overflow-hidden rounded-full bg-cream px-9 py-4 text-[0.72rem] tracking-[0.24em] text-espresso uppercase hover:shadow-[var(--shadow-lift)]"
              >
                <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
                <span className="relative inline-flex items-center gap-2">
                  Prenota ora
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
            <p className="mt-6 text-xs tracking-[0.2em] text-cream/60 uppercase">
              {studioName} · senza account · conferma via email
            </p>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

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
      { threshold: 0.12 },
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
