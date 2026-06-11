-- Demo-Pool: alle Anträge dieses Accounts löschen (andere R1-Accounts unberührt).
-- Account: r1.demo.pool@example.com
-- Ausführen: Supabase SQL Editor oder `supabase db execute -f supabase/scripts/demo_pool_cleanup.sql`

DELETE FROM public.application_events
WHERE application_id IN (
  SELECT id
  FROM public.applications
  WHERE applicant_id = '3bd3ec82-841a-4b93-b62c-bd284e3de937'
);

DELETE FROM public.applications
WHERE applicant_id = '3bd3ec82-841a-4b93-b62c-bd284e3de937';
