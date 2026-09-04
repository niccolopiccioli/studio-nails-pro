import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Sparkles, MapPin } from "lucide-react";

import heroImg from "@/assets/hero-nails.jpg";
import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getStudioAndServices } from "@/lib/booking.functions";
import { formatDuration, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Nails — Atelier di nail art a Milano" },
      {
        name: "description",
        content:
          "Manicure semipermanente, ricostruzione gel e nail art su misura. Prenota online in pochi secondi, senza account.",
      },
      { property: "og:title", content: "Studio Nails — Atelier di nail art a Milano" },
      {
        property: "og:description",
        content: "Nail art su misura e cura delle mani. Prenota online in pochi secondi.",
      },
    ],
  }),
  component: Home,
});

const gallery = [work1, work2, work3, work4];

function Home() {
  const fetchData = useServerFn(getStudioAndServices);
  const { data } = useQuery({ queryKey: ["studio"], queryFn: () => fetchData() });
  const services = data?.services?.slice(0, 3) ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="gradient-blush absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-5xl gap-10 px-5 pt-14 pb-20 md:grid-cols-2 md:items-center md:pt-24">
          <div className="animate-rise">
            <p className="eyebrow">Milano · Atelier su appuntamento</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] sm:text-6xl">
              La cura delle mani,
              <span className="block italic text-muted-foreground">come un rituale.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {data?.studio?.about ??
                "Nail art su misura, gel e semipermanente in un ambiente intimo e curato in ogni dettaglio."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/prenota"
                className="silk rounded-full bg-primary px-7 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground hover:shadow-[var(--shadow-lift)]"
              >
                Prenota appuntamento
              </Link>
              <Link
                to="/servizi"
                className="silk rounded-full border border-primary/25 px-7 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase hover:bg-card"
              >
                Scopri i servizi
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-3.5" /> Nail art personalizzata
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="size-3.5" /> Prenotazione senza account
              </span>
            </div>
          </div>

          <div className="animate-rise relative">
            <div className="overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
              <img
                src={heroImg}
                alt="Manicure nude rosato su seta color crema"
                width={1280}
                height={1600}
                className="h-[420px] w-full object-cover md:h-[560px]"
              />
            </div>
            <div className="surface-card absolute -bottom-6 left-4 px-5 py-4 sm:left-8">
              <p className="eyebrow">Da oltre 8 anni</p>
              <p className="font-display text-2xl">+1.200 clienti</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 className="mt-2 font-display text-4xl">I nostri lavori</h2>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {gallery.map((src, i) => (
            <div
              key={src}
              className="silk group overflow-hidden rounded-2xl hover:shadow-[var(--shadow-lift)]"
            >
              <img
                src={src}
                alt={`Lavoro di nail art ${i + 1}`}
                loading="lazy"
                width={900}
                height={900}
                className="silk aspect-square w-full object-cover group-hover:scale-[1.04]"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/60 py-20">
        <div className="mx-auto max-w-5xl px-5">
          <p className="eyebrow">Trattamenti</p>
          <h2 className="mt-2 font-display text-4xl">I più richiesti</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="surface-card silk p-6 hover:shadow-[var(--shadow-lift)]">
                <h3 className="font-display text-2xl">{s.name}</h3>
                <p className="mt-2 min-h-[3rem] text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatDuration(s.duration_minutes)}
                  </span>
                  <span className="font-display text-xl">{formatPrice(s.price_cents)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/servizi"
              className="silk text-xs tracking-[0.24em] uppercase underline underline-offset-8 hover:opacity-70"
            >
              Tutti i servizi
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="surface-card gradient-blush flex flex-col items-start gap-5 p-9 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Studio</p>
            <h2 className="mt-2 font-display text-3xl">
              {data?.studio?.name ?? "Studio Nails"}
            </h2>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {data?.studio?.address ?? "Milano"}
            </p>
          </div>
          <Link
            to="/prenota"
            className="silk rounded-full bg-primary px-7 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground hover:opacity-90"
          >
            Prenota ora
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
