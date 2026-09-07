import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { useDocTitle } from "@/lib/brand";
import { getStudioAndServices } from "@/lib/booking.functions";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Informativa privacy" },
      {
        name: "description",
        content: "Come trattiamo i dati personali per le prenotazioni, ai sensi del GDPR.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const fetchData = useServerFn(getStudioAndServices);
  const { data } = useQuery({ queryKey: ["studio"], queryFn: () => fetchData() });
  useDocTitle("Informativa privacy");
  const studioName = data?.studio?.name ?? "lo studio";
  const studioPhone = data?.studio?.phone ?? "+39 333 1234567";
  const studioAddress = data?.studio?.address ?? "Via della Bellezza 12, Milano";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <p className="eyebrow">GDPR · Reg. (UE) 2016/679</p>
        <h1 className="mt-2 font-display text-5xl">Informativa privacy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Ultimo aggiornamento: settembre 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-relaxed">
          <Section title="1. Chi tratta i tuoi dati">
            <p>
              <strong>Titolare del trattamento</strong> è il centro estetico presso cui prenoti:{" "}
              <strong>{studioName}</strong>, {studioAddress}, tel. {studioPhone}. Decide perché e
              come vengono usati i tuoi dati per erogare il servizio prenotato.
            </p>
            <p className="mt-2">
              <strong>Responsabile del trattamento</strong> è <strong>Veluna</strong>, la
              piattaforma software che fornisce lo strumento di prenotazione online: tratta i dati
              solo per conto del Titolare, per far funzionare agenda e conferme, senza usarli per
              proprie finalità.
            </p>
          </Section>

          <Section title="2. Quali dati raccogliamo (minimo necessario)">
            <ul className="list-disc space-y-1 pl-5">
              <li>Nome e cognome, numero di telefono</li>
              <li>Indirizzo email, solo se lo inserisci per ricevere la conferma</li>
              <li>
                Note libere sull'appuntamento (non inserire dati sanitari: bastano idee e colori)
              </li>
              <li>Dettagli tecnici della prenotazione: servizio, data, ora</li>
            </ul>
            <p className="mt-2">
              Non raccogliamo dati sanitari, non facciamo profilazione e non inviamo comunicazioni
              di marketing.
            </p>
          </Section>

          <Section title="3. Perché li usiamo (base giuridica)">
            <p>
              I dati servono a <strong>eseguire il servizio che hai richiesto</strong>: registrare
              l'appuntamento, mostrarti la disponibilità, inviarti la conferma via email e
              permetterti di spostarlo o cancellarlo dal tuo link personale (art. 6.1.b GDPR). Per
              questo non ti chiediamo alcun consenso con checkbox: prenotare è sufficiente.
            </p>
          </Section>

          <Section title="4. Dove sono salvati e per quanto">
            <p>
              I dati sono conservati su server sicuri nell'Unione Europea (database Supabase con
              accesso protetto e connessioni cifrate HTTPS) e restano separati per ogni studio. Li
              conserviamo solo il tempo necessario a gestire appuntamenti e obblighi di legge, poi
              vengono cancellati o anonimizzati.
            </p>
          </Section>

          <Section title="5. I tuoi diritti">
            <p>
              Puoi chiedere in qualsiasi momento accesso, rettifica o{" "}
              <strong>cancellazione dei tuoi dati</strong> (diritto all'oblio), oltre a limitazione,
              portabilità e opposizione. Per farlo contatta il Titolare ({studioName}, tel.{" "}
              {studioPhone}) oppure usa il link personale del tuo appuntamento per cancellarlo
              direttamente.
            </p>
            <p className="mt-2">
              Hai anche diritto a proporre reclamo al Garante per la protezione dei dati personali
              (garanteprivacy.it).
            </p>
          </Section>

          <Section title="6. Cookie">
            <p>
              Questo sito usa <strong>solo cookie tecnici</strong> indispensabili (mantenere
              l'accesso dell'operatore, ricordare le preferenze essenziali). Nessun cookie di
              profilazione, nessuna analytics di terze parti: per questo non ti mostriamo alcun
              banner.
            </p>
          </Section>

          <Section title="7. Sicurezza">
            <p>
              Connessioni cifrate, accessi protetti da autenticazione, dati isolati per studio e
              permessi differenziati tra operatore e proprietario. Nessun dato personale è esposto
              pubblicamente: le pagine di gestione appuntamento funzionano solo tramite link
              personale non indicizzato.
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
