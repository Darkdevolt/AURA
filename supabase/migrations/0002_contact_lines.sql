-- Lignes téléphoniques affichées sur le site (« Asaad 1 », « Asaad 2 »…)
alter table public.settings
  add column if not exists contact_lines jsonb not null
  default '[{"label": "Asaad 1", "phone": "+221770000000"}]'::jsonb;
