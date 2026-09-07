-- Admin equiparato a owner nelle policy di gestione.
drop policy if exists "owner manage services" on public.services;
create policy "owner manage services" on public.services for all to authenticated
  using (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'admin'));

drop policy if exists "owner updates studio" on public.studios;
create policy "owner updates studio" on public.studios for update to authenticated
  using ((public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'admin')) and id = public.current_studio_id());
