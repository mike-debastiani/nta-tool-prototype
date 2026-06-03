-- R4: Entscheid abschliessen darf Zielstatus «rejected» sein (abgelehnte Verfügung).

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
      ARRAY[
        'in_implementation'::application_status,
        'approved'::application_status,
        'rejected'::application_status
      ]
    )
  );
