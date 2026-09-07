-- Multisito runtime: tema, brand e domini per studio (tenancy by hostname).
-- Nuovo sito = riga in studios + progetto Vercel con sole env condivise.
alter table public.studios
  add column if not exists theme text not null default 'nails';
alter table public.studios
  add column if not exists brand jsonb not null default '{}';
alter table public.studios
  add column if not exists domains text[] not null default '{}';

update public.studios set
  theme = 'nails',
  domains = array[
    'studio-nails-niccolopicciolis-projects.vercel.app',
    'studio-nails-git-main-niccolopicciolis-projects.vercel.app'
  ]
where slug = 'studio-nails';

update public.studios set
  theme = 'estetica',
  domains = array[
    'estetica-pura-niccolopicciolis-projects.vercel.app',
    'estetica-pura-git-main-niccolopicciolis-projects.vercel.app'
  ],
  brand = jsonb_build_object(
    'tagline', 'Benessere viso e corpo',
    'desc', 'Centro estetico a Milano: viso, corpo e relax su misura. Prenota online senza account.',
    'eyebrow', 'Milano · Centro estetico',
    'hero', jsonb_build_array('La bellezza', 'della pelle,', 'ogni giorno.'),
    'cta', jsonb_build_array('La tua pelle', 'se lo merita.'),
    'rating', '4.9 · 200+ recensioni',
    'badgeK', 'Dal 2019',
    'badgeV', '+800 clienti',
    'workLabels', jsonb_build_array('Viso glow', 'Massaggio relax', 'Rituale corpo', 'Pelle luminosa')
  )
where slug = 'estetica-pura';
