-- Align RLS with workspace role matrix (R2, R4, R4 faculty, R2R4).
-- Hinweis: application_status-Enum hat kein needs_adjustment / in_decision (nur needs_correction, in_implementation).

DROP POLICY IF EXISTS "applications_select_r2_worklist" ON public.applications;
CREATE POLICY "applications_select_r2_worklist"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() = ANY (
      ARRAY['R2'::user_role, 'R2R4'::user_role, 'R3'::user_role, 'R5'::user_role, 'R6'::user_role]
    )
    AND status = ANY (
      ARRAY[
        'submitted'::application_status,
        'in_review'::application_status,
        'needs_correction'::application_status,
        'in_implementation'::application_status,
        'approved'::application_status,
        'rejected'::application_status
      ]
    )
  );

-- R4 decision write: in_implementation (UI «In Entscheid» / «Entscheid ausstehend»)
DROP POLICY IF EXISTS "applications_update_r4_decision" ON public.applications;
CREATE POLICY "applications_update_r4_decision"
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND status = 'in_implementation'::application_status
  )
  WITH CHECK (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND status = ANY (
      ARRAY['in_implementation'::application_status, 'approved'::application_status]
    )
  );
