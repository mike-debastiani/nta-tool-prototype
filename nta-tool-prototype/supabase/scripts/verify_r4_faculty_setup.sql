-- Prüfliste R4 Fakultäts-Scope (Supabase SQL Editor)
-- Nach dem UZH-Seed sollten r4.test alle und r4.rf nur RWF sehen.

-- 1) Test-Accounts + Scope
SELECT u.email, u.role, s.all_departments, d.slug AS faculty_slug, d.name AS faculty_name
FROM public.users u
LEFT JOIN public.r4_department_scopes s ON s.user_id = u.id
LEFT JOIN public.departments d ON d.id = s.department_id
WHERE u.email IN ('r4.test@example.com', 'r4.rf.test@example.com');

-- 2) Studiengänge pro Fakultät (Auszug RWF)
SELECT d.slug, COUNT(sp.id) AS program_count
FROM public.departments d
LEFT JOIN public.study_programs sp ON sp.department_id = d.id
GROUP BY d.slug
ORDER BY d.slug;

-- 3) Anträge nach Status (was R4 grundsätzlich sehen kann)
SELECT status::text, COUNT(*) AS count
FROM public.applications
GROUP BY status
ORDER BY count DESC;

-- 4) Sichtbarkeit ohne Login (nur Daten-Check: Studiengang im Katalog?)
SELECT
  a.status::text,
  a.data->'personalData'->>'studiengang' AS studiengang,
  d.slug AS faculty_slug
FROM public.applications a
LEFT JOIN public.study_programs sp
  ON sp.name = NULLIF(TRIM(a.data->'personalData'->>'studiengang'), '')
LEFT JOIN public.departments d ON d.id = sp.department_id
WHERE a.status::text <> 'draft'
ORDER BY a.updated_at DESC;

-- 5) Scope-Zuweisung setzen (nur falls Schritt 1 leer ist)
INSERT INTO public.r4_department_scopes (user_id, all_departments, department_id)
SELECT u.id, true, NULL FROM public.users u WHERE u.email = 'r4.test@example.com'
ON CONFLICT (user_id) DO UPDATE
SET all_departments = EXCLUDED.all_departments, department_id = EXCLUDED.department_id;

INSERT INTO public.r4_department_scopes (user_id, all_departments, department_id)
SELECT u.id, false, d.id
FROM public.users u
CROSS JOIN public.departments d
WHERE u.email = 'r4.rf.test@example.com' AND d.slug = 'rwf'
ON CONFLICT (user_id) DO UPDATE
SET all_departments = EXCLUDED.all_departments, department_id = EXCLUDED.department_id;
