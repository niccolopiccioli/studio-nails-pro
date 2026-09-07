-- Multisito: un utente può avere lo stesso ruolo in più studi
-- (es. owner di due studi). Prima il vincolo unique(user_id, role) lo impediva.
alter table public.user_roles
  drop constraint if exists user_roles_user_id_role_key;
alter table public.user_roles
  add constraint user_roles_user_studio_role_unique unique (user_id, studio_id, role);
