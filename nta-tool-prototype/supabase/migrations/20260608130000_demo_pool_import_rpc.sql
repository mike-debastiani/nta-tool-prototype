-- Demo-Pool Import ohne Service-Role-Key (nur für r1.demo.pool@example.com).
-- Aufruf via supabase.rpc('import_demo_pool_case', ...) mit Import-Token.

CREATE OR REPLACE FUNCTION public.import_demo_pool_case(
  p_import_token text,
  p_status application_status,
  p_data jsonb,
  p_current_phase int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_demo constant uuid := '3bd3ec82-841a-4b93-b62c-bd284e3de937';
BEGIN
  IF p_import_token IS DISTINCT FROM 'nta-demo-pool-import-v1' THEN
    RAISE EXCEPTION 'invalid demo pool import token';
  END IF;

  INSERT INTO public.applications (applicant_id, status, data, current_phase)
  VALUES (v_demo, p_status, p_data, p_current_phase)
  RETURNING id INTO v_id;

  INSERT INTO public.application_events (
    application_id,
    actor_id,
    actor_role,
    event_type,
    payload
  )
  VALUES (
    v_id,
    v_demo,
    'R1'::public.user_role,
    'submitted'::public.event_type,
    '{"note":"Demo-Pool Import"}'::jsonb
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.import_demo_pool_case(text, application_status, jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_demo_pool_case(text, application_status, jsonb, int)
  TO anon, authenticated, service_role;
