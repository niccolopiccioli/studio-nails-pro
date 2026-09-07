-- Studio piattaforma Veluna (landing multisito, theme veluna).
insert into public.studios (id, name, slug, phone, address, instagram, about, theme, brand, domains)
values ('33333333-3333-3333-3333-333333333333','Veluna','veluna',null,'Italia',null,
'Veluna è la piattaforma che porta centri estetici e studi beauty online: prenotazioni senza account, agenda semplice, un sito per ogni studio.',
'veluna',
jsonb_build_object(
  'tagline', 'La piattaforma per centri beauty',
  'desc', 'Un sito per ogni studio, un unico gestionale semplice.',
  'eyebrow', 'Veluna · Beauty SaaS',
  'hero', jsonb_build_array('Il tuo studio', 'online,', 'in un giorno.'),
  'cta', jsonb_build_array('Apri il tuo sito', 'con Veluna.'),
  'rating', 'Prenotazioni senza account',
  'badgeK', 'Multisito',
  'badgeV', '2 studi live',
  'workLabels', jsonb_build_array()
),
array['veluna-niccolopicciolis-projects.vercel.app','veluna-git-main-niccolopicciolis-projects.vercel.app'])
on conflict (slug) do update set
  theme = excluded.theme,
  brand = excluded.brand,
  domains = excluded.domains,
  about = excluded.about;
