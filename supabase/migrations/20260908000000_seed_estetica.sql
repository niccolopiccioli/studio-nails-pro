-- Secondo studio demo (multisito): centro estetico sullo stesso backend.
-- Deploy dedicato con STUDIO_SLUG="estetica-pura" e VITE_THEME="estetica".
insert into public.studios (id, name, slug, phone, address, instagram, about)
values ('22222222-2222-2222-2222-222222222222','Estetica Pura','estetica-pura','+39 333 7654321','Via dei Fiori 8, Milano','@esteticapura',
'Estetica Pura è un centro estetico dedicato al benessere di viso e corpo: trattamenti personalizzati in un ambiente calmo e luminoso.');

insert into public.services (studio_id, name, description, price_cents, duration_minutes, sort_order) values
('22222222-2222-2222-2222-222222222222','Pulizia Viso Profonda','Detersione, esfoliazione, maschera purificante e massaggio rilassante.',4500,60,1),
('22222222-2222-2222-2222-222222222222','Massaggio Rilassante','Massaggio corpo distensivo con oli essenziali naturali.',5500,50,2),
('22222222-2222-2222-2222-222222222222','Ceretta Gambe','Epilazione con cera a bassa temperatura, delicata sulla pelle.',2500,30,3),
('22222222-2222-2222-2222-222222222222','Trattamento Corpo Drenante','Impacco e massaggio drenante per gambe leggere.',7000,75,4),
('22222222-2222-2222-2222-222222222222','Epilazione Laser (1 zona)','Seduta di epilazione laser su zona a scelta, con test cutaneo.',3500,20,5);

insert into public.availability_rules (studio_id, weekday, start_time, end_time, break_start, break_end, closed) values
('22222222-2222-2222-2222-222222222222',0,'10:00','18:00',null,null,true),
('22222222-2222-2222-2222-222222222222',1,'09:00','19:00','13:00','14:00',false),
('22222222-2222-2222-2222-222222222222',2,'09:00','19:00','13:00','14:00',false),
('22222222-2222-2222-2222-222222222222',3,'09:00','19:00','13:00','14:00',false),
('22222222-2222-2222-2222-222222222222',4,'09:00','20:00','13:00','14:00',false),
('22222222-2222-2222-2222-222222222222',5,'09:00','18:00',null,null,false),
('22222222-2222-2222-2222-222222222222',6,'10:00','16:00',null,null,true);
