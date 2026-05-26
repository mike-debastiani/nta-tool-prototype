-- Step 2: RLS + functions + test account (requires committed enum value R2R4).

CREATE OR REPLACE FUNCTION public.r4_application_in_department_scope(app public.applications)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sg text;
  dept_id uuid;
BEGIN
  IF current_user_role() IS DISTINCT FROM 'R4'::user_role
     AND current_user_role() IS DISTINCT FROM 'R2R4'::user_role THEN
    RETURN true;
  END IF;
  IF public.r4_user_has_all_departments() THEN
    RETURN true;
  END IF;
  SELECT s.department_id INTO dept_id
  FROM public.r4_department_scopes AS s
  WHERE s.user_id = auth.uid() AND s.all_departments = false;
  IF dept_id IS NULL THEN
    RETURN false;
  END IF;
  sg := public.application_studiengang_from_data(app.data);
  IF sg IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.study_programs AS sp
    WHERE sp.name = sg AND sp.department_id = dept_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_r2_application_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() IN (
    'R2'::user_role,
    'R2R4'::user_role,
    'R3'::user_role,
    'R5'::user_role,
    'R6'::user_role
  ) THEN
    IF new.applicant_id IS DISTINCT FROM old.applicant_id THEN
      RAISE EXCEPTION 'R2 may not change applicant_id';
    END IF;
    IF new.created_at IS DISTINCT FROM old.created_at THEN
      RAISE EXCEPTION 'R2 may not change created_at';
    END IF;
    IF (new.data - 'recommendation' - 'consultation')
      IS DISTINCT FROM (old.data - 'recommendation' - 'consultation') THEN
      RAISE EXCEPTION 'R2 may not change data except recommendation/consultation';
    END IF;
  END IF;
  RETURN new;
END;
$$;

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

DROP POLICY IF EXISTS "applications_select_r4_workspace" ON public.applications;
CREATE POLICY "applications_select_r4_workspace"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND status::text = ANY (
      ARRAY[
        'draft', 'submitted', 'in_review', 'needs_correction', 'needs_adjustment',
        'in_decision', 'in_implementation', 'approved', 'rejected'
      ]
    )
    AND r4_application_in_department_scope(applications.*)
  );

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
        'needs_correction'::application_status
      ]
    )
  );

DROP POLICY IF EXISTS "applications_update_r4_decision" ON public.applications;
CREATE POLICY "applications_update_r4_decision"
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND status::text = 'in_implementation'
  )
  WITH CHECK (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND status::text IN ('in_implementation', 'approved')
  );

DROP POLICY IF EXISTS "users_select_r4_workspace_applicants" ON public.users;
CREATE POLICY "users_select_r4_workspace_applicants"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() = ANY (ARRAY['R4'::user_role, 'R2R4'::user_role])
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.applicant_id = users.id
          AND a.status::text = ANY (
            ARRAY[
              'draft', 'submitted', 'in_review', 'needs_correction', 'needs_adjustment',
              'in_decision', 'in_implementation', 'approved', 'rejected'
            ]
          )
      )
    )
  );

INSERT INTO public.users (id, email, role, display_name)
VALUES (
  'f0867404-478d-45f9-8222-e7f5ca01136c',
  'r2and4.combined.test@example.com',
  'R2R4',
  'Suzanne Beispiel (R2+R4)'
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

INSERT INTO public.r4_department_scopes (user_id, all_departments, department_id)
VALUES ('f0867404-478d-45f9-8222-e7f5ca01136c', true, NULL)
ON CONFLICT (user_id) DO UPDATE
SET all_departments = EXCLUDED.all_departments, department_id = EXCLUDED.department_id;
