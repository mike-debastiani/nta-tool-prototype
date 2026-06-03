-- R2R4: in_implementation → rejected bleibt in der Entscheidungsphase (nur r4DecisionReview).

CREATE OR REPLACE FUNCTION public.enforce_r2_application_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role public.user_role;
  in_decision_phase boolean;
  completing_r4_decision boolean;
BEGIN
  role := current_user_role();

  IF role IS NULL THEN
    RETURN new;
  END IF;

  in_decision_phase :=
    old.status::text IN ('in_implementation', 'in_decision')
    OR new.status::text IN ('in_implementation', 'approved', 'rejected');

  completing_r4_decision :=
    old.status::text = 'in_implementation'
    AND new.status::text = 'approved';

  IF role = 'R2R4'::user_role THEN
    IF new.applicant_id IS DISTINCT FROM old.applicant_id THEN
      RAISE EXCEPTION 'R2 may not change applicant_id';
    END IF;
    IF new.created_at IS DISTINCT FROM old.created_at THEN
      RAISE EXCEPTION 'R2 may not change created_at';
    END IF;

    IF in_decision_phase THEN
      IF completing_r4_decision THEN
        IF (new.data - 'recommendation' - 'consultation' - 'r4DecisionReview' - 'applicationDefinition')
          IS DISTINCT FROM (old.data - 'recommendation' - 'consultation' - 'r4DecisionReview' - 'applicationDefinition') THEN
          RAISE EXCEPTION
            'R2R4 may not change data except recommendation/consultation/r4DecisionReview/applicationDefinition on approve';
        END IF;
      ELSE
        IF (new.data - 'recommendation' - 'consultation' - 'r4DecisionReview')
          IS DISTINCT FROM (old.data - 'recommendation' - 'consultation' - 'r4DecisionReview') THEN
          RAISE EXCEPTION
            'R2R4 may not change data except recommendation/consultation/r4DecisionReview';
        END IF;
      END IF;
    ELSE
      IF (new.data - 'recommendation' - 'consultation')
        IS DISTINCT FROM (old.data - 'recommendation' - 'consultation') THEN
        RAISE EXCEPTION 'R2 may not change data except recommendation/consultation';
      END IF;
    END IF;
    RETURN new;
  END IF;

  IF role IN (
    'R2'::user_role,
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
