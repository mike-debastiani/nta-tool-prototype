-- R4: Schreibzugriff auf Anträge im Status «In Entscheid» (Bewilligung) sowie Abschluss auf «Genehmigt».
-- Ohne diese Policy schlagen POST /api/applications/r4-persist-decision und r4-complete-decision
-- mit dem Session-Supabase-Client fehl, wenn kein SUPABASE_SERVICE_ROLE_KEY gesetzt ist.
-- Muster: current_user_role() wie bei applications_select_r4_workspace (kein EXISTS auf users).

DROP POLICY IF EXISTS "applications_update_r4_decision" ON public.applications;
CREATE POLICY "applications_update_r4_decision"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  (current_user_role() = 'R4'::user_role)
  AND (status::text = 'in_implementation')
)
WITH CHECK (
  (current_user_role() = 'R4'::user_role)
  AND (
    status::text = 'in_implementation'
    OR status::text = 'approved'
  )
);
