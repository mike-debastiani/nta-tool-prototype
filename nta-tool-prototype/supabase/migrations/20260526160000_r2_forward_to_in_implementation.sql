-- R2/R2R4: Review abschliessen → Status «In Entscheid» (in_implementation).
-- USING bleibt auf Worklist-Status (kein Bearbeiten bereits in Entscheid);
-- WITH CHECK erlaubt zusätzlich in_implementation als Ziel nach Forward.

DROP POLICY IF EXISTS "applications_update_r2_worklist" ON public.applications;
CREATE POLICY "applications_update_r2_worklist"
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (
    current_user_role() = ANY (
      ARRAY['R2'::user_role, 'R2R4'::user_role, 'R3'::user_role, 'R5'::user_role, 'R6'::user_role]
    )
    AND status = ANY (
      ARRAY[
        'submitted'::application_status,
        'in_review'::application_status,
        'needs_correction'::application_status
      ]
    )
  )
  WITH CHECK (
    current_user_role() = ANY (
      ARRAY['R2'::user_role, 'R2R4'::user_role, 'R3'::user_role, 'R5'::user_role, 'R6'::user_role]
    )
    AND status = ANY (
      ARRAY[
        'submitted'::application_status,
        'in_review'::application_status,
        'needs_correction'::application_status,
        'in_implementation'::application_status
      ]
    )
  );
