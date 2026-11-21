-- Lignes téléphoniques affichées sur le site (« Asaad 1 », « Asaad 2 »…)
-- La première ligne cochée WhatsApp reçoit les réservations envoyées par les clients.
alter table public.luxus_settings
  add column if not exists contact_lines jsonb not null
  default '[
    {"label": "Asaad 1", "phone": "+221772966462", "whatsapp": true},
    {"label": "Asaad 1 · 2e ligne", "phone": "+221765107848", "whatsapp": true}
  ]'::jsonb;

-- Remplace les numéros provisoires s'ils n'ont pas encore été modifiés
update public.luxus_settings
   set whatsapp_number = '+221772966462',
       phone_number = '+221772966462'
 where whatsapp_number = '+221770000000';

update public.luxus_settings
   set contact_lines = '[
     {"label": "Asaad 1", "phone": "+221772966462", "whatsapp": true},
     {"label": "Asaad 1 · 2e ligne", "phone": "+221765107848", "whatsapp": true}
   ]'::jsonb
 where contact_lines::text like '%+221770000000%';
