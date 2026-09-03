grant insert, update, delete on public.user_roles to authenticated;
create policy "owner manage roles" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(),'owner') or not exists (select 1 from public.user_roles));
create policy "owner update roles" on public.user_roles for update to authenticated
  using (public.has_role(auth.uid(),'owner'));
create policy "owner delete roles" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(),'owner'));