import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { useDocTitle } from "@/lib/brand";
import { getStudioAndServices } from "@/lib/booking.functions";
import { formatDuration, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/servizi")({
  head: () => ({
    meta: [
      { title: "Servizi e listino" },
      {
        name: "description",
        content: "Tutti i trattamenti con prezzo e durata. Prenota online senza account.",
      },
      { property: "og:title", content: "Servizi e listino" },
    ],
  }),
  component: ServicesPage,
});

const photos = [work1, work2, work3, work4];

function ServicesPage() {
  useDocTitle("Servizi e listino");
  const fetchData = useServerFn(getStudioAndServices);
  const { data, isLoading } = useQuery({ queryKey: ["studio"], queryFn: () => fetchData() });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-5 py-14">
        <p className="eyebrow">Listino</p>
        <h1 className="mt-2 font-display text-5xl">Servizi</h1>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          Ogni trattamento è pensato su misura. Durata e prezzo sono indicativi e possono variare in
          base alla lunghezza e alla decorazione scelta.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {isLoading &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="surface-card h-64 animate-pulse bg-muted/40" />
            ))}
          {(data?.services ?? []).map((s, i) => (
            <article
              key={s.id}
              className="surface-card silk animate-rise overflow-hidden hover:shadow-[var(--shadow-lift)]"
            >
              <img
                src={s.image_url ?? photos[i % photos.length]}
                alt={s.name}
                loading="lazy"
                width={900}
                height={900}
                className="h-44 w-full object-cover"
              />
              <div className="p-6">
                <h2 className="font-display text-2xl">{s.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                    {formatDuration(s.duration_minutes)}
                  </span>
                  <span className="font-display text-2xl">{formatPrice(s.price_cents)}</span>
                </div>
                <Link
                  to="/prenota"
                  search={{ servizio: s.id }}
                  className="silk mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-[0.68rem] tracking-[0.24em] uppercase text-primary-foreground hover:opacity-90"
                >
                  Prenota
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
