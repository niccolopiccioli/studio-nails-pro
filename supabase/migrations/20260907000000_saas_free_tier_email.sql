-- SaaS free-tier: serve l'email di contatto per la SOLA notifica consentita
-- (email di conferma prenotazione). Nessuna automazione/reminder.
alter table public.clients
  add column if not exists email text not null default '';

alter table public.appointments
  add column if not exists client_email text not null default '';
