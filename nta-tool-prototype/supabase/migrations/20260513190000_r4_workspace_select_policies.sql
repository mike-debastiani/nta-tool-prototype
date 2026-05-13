-- R4: gleiche Workspace-Inbox wie R2 (Session-Client).
-- WICHTIG: In RLS auf `users` oder `applications` darf **nicht** `EXISTS (SELECT … FROM public.users …)`
-- verwendet werden — das triggert erneut `users`-RLS → „infinite recursion detected in policy for relation users“.
-- Stattdessen: `current_user_role()` (bereits im Projekt, SECURITY DEFINER, gleiches Muster wie `applications_select_r2_worklist`).

-- 1) Anträge sichtbar für R4
DROP POLICY IF EXISTS "applications_select_r4_workspace" ON public.applications;
CREATE POLICY "applications_select_r4_workspace"
ON public.applications
FOR SELECT
TO authenticated
USING (
  (current_user_role() = 'R4'::user_role)
  AND (
    status::text = ANY (
      ARRAY[
        'draft',
        'submitted',
        'in_review',
        'needs_correction',
        'needs_adjustment',
        'in_decision',
        'in_implementation',
        'approved',
        'rejected'
      ]
    )
  )
);

-- 2) Antragsteller-Zeilen für Embed `users!applications_applicant_id_fkey`
DROP POLICY IF EXISTS "users_select_r4_workspace_applicants" ON public.users;
CREATE POLICY "users_select_r4_workspace_applicants"
ON public.users
FOR SELECT
TO authenticated
USING (
  (current_user_role() = 'R4'::user_role)
  AND (
    users.id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.applicant_id = users.id
        AND a.status::text = ANY (
          ARRAY[
            'draft',
            'submitted',
            'in_review',
            'needs_correction',
            'needs_adjustment',
            'in_decision',
            'in_implementation',
            'approved',
            'rejected'
          ]
        )
    )
  )
);
