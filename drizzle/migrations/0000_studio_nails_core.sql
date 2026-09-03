-- ROLES
create type public.app_role as enum ('owner','artist');

-- STUDIOS (multi-tenant ready)
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  address text,
  instagram text,
  about text,
  slot_interval_minutes int not null default 30,
  created_at timestamptz not null default now()
);
grant select on public.studios to anon, authenticated;
grant all on public.studios to service_role;
grant update on public.studios to authenticated;
alter table public.studios enable row level security;

create table public.profiles (
  id uuid primary key,
  studio_id uuid not null references public.studios(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  studio_id uuid not null references public.studios(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_studio_id()
returns uuid language sql stable security definer set search_path = public as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents int not null default 0,
  duration_minutes int not null default 60,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  full_name text not null,
  phone text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (studio_id, phone)
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

-- AVAILABILITY (weekly rules)
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  closed boolean not null default false,
  unique (studio_id, weekday)
);
grant select on public.availability_rules to anon, authenticated;
grant insert, update, delete on public.availability_rules to authenticated;
grant all on public.availability_rules to service_role;
alter table public.availability_rules enable row level security;

-- CLOSURES (specific days off)
create table public.closures (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid,
  day date not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.closures to anon, authenticated;
grant insert, update, delete on public.closures to authenticated;
grant all on public.closures to service_role;
alter table public.closures enable row level security;

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents int not null default 0,
  status text not null default 'confirmed',
  manage_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index appointments_studio_start_idx on public.appointments (studio_id, starts_at);
create unique index appointments_manage_token_idx on public.appointments (manage_token);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

-- POLICIES
create policy "studios public read" on public.studios for select to anon, authenticated using (true);
create policy "owner updates studio" on public.studios for update to authenticated
  using (public.has_role(auth.uid(),'owner') and id = public.current_studio_id());

create policy "staff read profiles" on public.profiles for select to authenticated
  using (public.is_staff(auth.uid()) and studio_id = public.current_studio_id());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'owner'));

create policy "services public read" on public.services for select to anon, authenticated using (active or public.is_staff(auth.uid()));
create policy "owner manage services" on public.services for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "staff manage clients" on public.clients for all to authenticated
  using (public.is_staff(auth.uid()) and studio_id = public.current_studio_id())
  with check (public.is_staff(auth.uid()) and studio_id = public.current_studio_id());

create policy "availability public read" on public.availability_rules for select to anon, authenticated using (true);
create policy "staff manage availability" on public.availability_rules for all to authenticated
  using (public.is_staff(auth.uid()) and studio_id = public.current_studio_id())
  with check (public.is_staff(auth.uid()) and studio_id = public.current_studio_id());

create policy "closures public read" on public.closures for select to anon, authenticated using (true);
create policy "staff manage closures" on public.closures for all to authenticated
  using (public.is_staff(auth.uid()) and studio_id = public.current_studio_id())
  with check (public.is_staff(auth.uid()) and studio_id = public.current_studio_id());

create policy "staff manage appointments" on public.appointments for all to authenticated
  using (public.is_staff(auth.uid()) and studio_id = public.current_studio_id())
  with check (public.is_staff(auth.uid()) and studio_id = public.current_studio_id());

-- SEED
insert into public.studios (id, name, slug, phone, address, instagram, about)
values ('11111111-1111-1111-1111-111111111111','Studio Nails','studio-nails','+39 333 1234567','Via della Bellezza 12, Milano','@studionails',
'Studio Nails è un atelier dedicato alla cura delle mani: nail art su misura, gel e semipermanente in un ambiente intimo e curato in ogni dettaglio.');

insert into public.services (studio_id, name, description, price_cents, duration_minutes, sort_order) values
('11111111-1111-1111-1111-111111111111','Manicure Semipermanente','Cura della cuticola, limatura e applicazione semipermanente a lunga tenuta.',3500,60,1),
('11111111-1111-1111-1111-111111111111','Ricostruzione Gel','Ricostruzione completa in gel con forma e lunghezza personalizzate.',6000,120,2),
('11111111-1111-1111-1111-111111111111','Refill Gel','Mantenimento della ricostruzione con rinnovo del colore.',4500,90,3),
('11111111-1111-1111-1111-111111111111','Nail Art Personalizzata','Decorazioni artistiche su misura, dal minimal al couture.',2000,45,4),
('11111111-1111-1111-1111-111111111111','Pedicure Estetico','Trattamento completo del piede con smalto semipermanente.',4000,75,5);

insert into public.availability_rules (studio_id, weekday, start_time, end_time, break_start, break_end, closed) values
('11111111-1111-1111-1111-111111111111',0,'10:00','18:00',null,null,true),
('11111111-1111-1111-1111-111111111111',1,'09:30','19:00','13:00','14:00',false),
('11111111-1111-1111-1111-111111111111',2,'09:30','19:00','13:00','14:00',false),
('11111111-1111-1111-1111-111111111111',3,'09:30','19:00','13:00','14:00',false),
('11111111-1111-1111-1111-111111111111',4,'09:30','20:00','13:00','14:00',false),
('11111111-1111-1111-1111-111111111111',5,'09:00','18:00',null,null,false),
('11111111-1111-1111-1111-111111111111',6,'10:00','16:00',null,null,true);
