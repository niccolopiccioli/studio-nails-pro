// Helper SOLO server: invio della SOLA notifica consentita dal piano free,
// l'email di conferma prenotazione. Niente reminder, niente WhatsApp,
// niente follow-up. Importare solo dentro gli handler delle server function
// (import dinamico), mai nel bundle client.

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
 * Invia la conferma via Resend. Fail-soft: se il servizio non è configurato
 * o l'invio fallisce, logga e non blocca la prenotazione (l'operatore la vede
 * comunque in agenda).
 */
export async function sendBookingConfirmationEmail(input: BookingEmail): Promise<void> {
  const apiKey = serverEnv("RESEND_API_KEY");
  const from = serverEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM non configurati: conferma non inviata.");
    return;
  }

  const appUrl = input.appUrl.replace(/\/$/, "");
  const manageUrl = appUrl ? `${appUrl}/appuntamento/${input.manageToken}` : null;
  const when = formatWhen(input.startsAt, input.endsAt);

  const html = [
    `<p>Ciao ${escapeHtml(input.clientName)},</p>`,
    `<p>la tua prenotazione <strong>${escapeHtml(input.serviceName)}</strong> presso <strong>${escapeHtml(input.studioName)}</strong> è confermata:</p>`,
    `<p><strong style="text-transform:capitalize">${escapeHtml(when)}</strong></p>`,
    manageUrl
      ? `<p>Gestisci l'appuntamento (sposta/cancella) da qui:<br><a href="${manageUrl}">${manageUrl}</a></p>`
      : `<p>Conserva il link ricevuto in pagina per spostare o cancellare l'appuntamento.</p>`,
    `<p>A presto!</p>`,
    `<hr style="border:none;border-top:1px solid #eee;margin:16px 0">`,
    `<p style="font-size:12px;color:#888">Usiamo i tuoi dati solo per gestire questo appuntamento, senza marketing. Info e cancellazione: ${
      appUrl
        ? `<a href="${appUrl}/privacy">${appUrl}/privacy</a>`
        : "informativa privacy sul sito dello studio"
    }.</p>`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: `Conferma prenotazione — ${input.studioName}`,
        html,
      }),
    });
    if (!res.ok) {
      console.warn("[email] invio conferma fallito:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[email] invio conferma fallito:", e);
  }
}
