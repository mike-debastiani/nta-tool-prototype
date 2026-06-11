-- Demo-Pool Batch 01 — Fake-Anträge für r1.demo.pool@example.com
-- applicant_id: 3bd3ec82-841a-4b93-b62c-bd284e3de937
--
-- Vor jedem Re-Seed: bestehende Demo-Pool-Anträge dieses Accounts entfernen.
-- Andere Accounts (r1.test, r1.2.test, …) bleiben unberührt.

DELETE FROM public.application_events
WHERE application_id IN (
  SELECT id
  FROM public.applications
  WHERE applicant_id = '3bd3ec82-841a-4b93-b62c-bd284e3de937'
);

DELETE FROM public.applications
WHERE applicant_id = '3bd3ec82-841a-4b93-b62c-bd284e3de937';

-- ---------------------------------------------------------------------------
-- Ab hier: INSERT pro Case (JSON aus Claude-Projekt).
-- Titel realistisch, z. B. "NTA Antrag Anna Müller" — kein Demo-Präfix.
--
-- Status-Spalte (DB)     → UI-State (vereinfacht)
-- draft                  → Entwurf
-- submitted              → Beratung & Empfehlung (ohne finalSubmitted)
-- in_review              → In Review (mit finalSubmitted + applicationDefinition)
-- needs_correction       → Anpassung erforderlich
-- in_implementation      → In Entscheid
-- approved / rejected    → Bewilligt / Abgelehnt (+ r4DecisionReview)
--
-- Attest: Datei unter public/attest/seed/<dateiname>.md ablegen, dann z. B.:
--   "attestFiles": [{"id":"…","name":"Attest_Psychiatrie.pdf","size":2100,
--     "type":"text/markdown","url":"/attest/seed/attest-anna-mueller.md"}]
-- ---------------------------------------------------------------------------

-- Beispiel (auskommentiert) — ersten Case aus Claude hier einfügen:
--
-- INSERT INTO public.applications (applicant_id, status, data, current_phase)
-- VALUES (
--   '3bd3ec82-841a-4b93-b62c-bd284e3de937',
--   'in_review'::application_status,
--   $seed${ ... JSON ... }$seed$::jsonb,
--   5
-- );

-- Optional nach allen INSERTs: Events für Timeline
-- INSERT INTO public.application_events (application_id, actor_id, actor_role, event_type, payload)
-- SELECT a.id,
--   '3bd3ec82-841a-4b93-b62c-bd284e3de937',
--   'R1'::user_role,
--   'submitted'::event_type,
--   jsonb_build_object('note', 'Antrag eingereicht')
-- FROM public.applications a
-- WHERE a.applicant_id = '3bd3ec82-841a-4b93-b62c-bd284e3de937';
