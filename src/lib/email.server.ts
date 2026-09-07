// Helper SOLO server: invio della SOLA notifica consentita dal piano free,
// l'email di conferma prenotazione via EmailJS (API REST server-side).
// Niente reminder, niente WhatsApp, niente follow-up.
// Importare solo dentro gli handler delle server function
// (import dinamico), mai nel bundle client.
//
// Setup dashboard EmailJS (una volta):
// 1. Collega un Email Service (es. Gmail)
// 2. Crea un template con "To Email" = {{to_email}} e usa le variabili:
//    {{client_name}} {{service_name}} {{studio_name}} {{when}} {{manage_url}} {{privacy_url}}
// 3. Copia Service ID, Template ID, Public Key e Private Key nelle env.

type BookingEmail = {
  to: string;
  clientName: string;
  serviceName: string;
  studioName: string;
  startsAt: string;
  endsAt: string;
  manageToken: string;
  /** Base URL del sito che ha ricevuto la prenotazione (da request host). */
  appUrl: string;
};

function serverEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function formatWhen(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);
  const time = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time.format(start)} – ${time.format(end)}`;
}

/**
 * Invia la conferma via EmailJS. Fail-soft: se il servizio non è configurato
 * o l'invio fallisce, logga e non blocca la prenotazione (l'operatore la vede
 * comunque in agenda).
 */
export async function sendBookingConfirmationEmail(input: BookingEmail): Promise<void> {
  const serviceId = serverEnv("EMAILJS_SERVICE_ID");
  const templateId = serverEnv("EMAILJS_TEMPLATE_ID");
  const publicKey = serverEnv("EMAILJS_PUBLIC_KEY");
  const privateKey = serverEnv("EMAILJS_PRIVATE_KEY");
  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn("[email] EMAILJS_* non configurati: conferma non inviata.");
    return;
  }

  const appUrl = input.appUrl.replace(/\/$/, "");
  const manageUrl = appUrl ? `${appUrl}/appuntamento/${input.manageToken}` : null;
  const when = formatWhen(input.startsAt, input.endsAt);

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: input.to,
          client_name: input.clientName,
          service_name: input.serviceName,
          studio_name: input.studioName,
          when,
          manage_url: manageUrl ?? "",
          privacy_url: appUrl ? `${appUrl}/privacy` : "",
        },
      }),
    });
    if (!res.ok) {
      console.warn("[email] invio conferma fallito:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[email] invio conferma fallito:", e);
  }
}
