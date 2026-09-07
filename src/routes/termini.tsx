import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { useDocTitle } from "@/lib/brand";

export const Route = createFileRoute("/termini")({
  head: () => ({
    meta: [
      { title: "Termini di servizio" },
      {
        name: "description",
        content: "Condizioni d'uso della piattaforma di prenotazione.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  useDocTitle("Termini di servizio");
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <p className="eyebrow">Condizioni d'uso</p>
        <h1 className="mt-2 font-display text-5xl">Termini di servizio</h1>
        <p className="mt-3 text-sm text-muted-foreground">Ultimo aggiornamento: settembre 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-relaxed">
          <Section title="1. Cos'è questo servizio">
            <p>
              La piattaforma offre al centro estetico uno strumento di prenotazione online (agenda,
              rubrica clienti, gestione servizi) e ai clienti la possibilità di prenotare senza
              creare un account, gestendo l'appuntamento tramite link personale.
            </p>
          </Section>

          <Section title="2. Uso consentito">
            <p>
              Ti impegni a usare la piattaforma in modo lecito: dati veritieri in prenotazione,
              nessun uso improprio dei link personali, nessuna attività che danneggi il servizio o
              violi diritti di terzi. Il centro estetico è responsabile dei contenuti che pubblica
              (servizi, prezzi, orari) e dei dati dei propri clienti.
            </p>
          </Section>

          <Section title="3. Ruoli privacy">
            <p>
              Il <strong>centro estetico è Titolare</strong> dei dati dei propri clienti;{" "}
              <strong>Veluna è Responsabile</strong> del trattamento e li usa solo per far
              funzionare il servizio. Dettagli nell'
              <Link to="/privacy" className="underline underline-offset-4">
                informativa privacy
              </Link>
              .
            </p>
          </Section>

          <Section title="4. Disponibilità e limitazioni">
            <p>
              Il servizio è fornito <strong>“così com'è”, senza garanzia di uptime</strong>: possono
              verificarsi interruzioni, errori o rallentamenti per manutenzione o cause tecniche. In
              caso di problemi con una prenotazione online, contatta direttamente il centro
              estetico. Non sono inclusi reminder automatici, messaggistica promozionale o
              integrazioni di marketing.
            </p>
          </Section>

          <Section title="5. Responsabilità">
            <p>
              Nei limiti consentiti dalla legge, Veluna non risponde di danni indiretti derivanti da
              uso, mancata disponibilità o errori del servizio, né della qualità dei trattamenti
              erogati dal centro estetico, che resta l'unico responsabile del rapporto con i propri
              clienti.
            </p>
          </Section>

          <Section title="6. Modifiche">
            <p>
              Questi termini possono essere aggiornati; la versione vigente è sempre quella
              pubblicata in questa pagina. L'uso continuato del servizio dopo le modifiche ne
              implica l'accettazione.
            </p>
          </Section>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6 md:p-7">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}
