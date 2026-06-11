-- Demo-Pool R1: r1.demo.pool@example.com
-- applicant_id: 3bd3ec82-841a-4b93-b62c-bd284e3de937
-- Alle Seed-Anträge dieses Batches verwenden diese applicant_id.
-- Löschen: supabase/scripts/demo_pool_cleanup.sql

INSERT INTO public.users (id, email, role, display_name)
VALUES (
  '3bd3ec82-841a-4b93-b62c-bd284e3de937',
  'r1.demo.pool@example.com',
  'R1',
  'Studento Beispiel'
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;
