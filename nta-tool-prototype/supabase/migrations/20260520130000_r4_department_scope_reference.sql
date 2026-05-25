-- Referenz: Bereits auf dem Remote-Projekt angewendet als `r4_department_scope` (20260525183056).
-- Tabellen: departments (Fakultät), study_programs (Studiengang), r4_department_scopes (R4-Berechtigung).
-- RLS: applications_select_r4_workspace nutzt r4_application_in_department_scope(app).
-- Seed UZH: siehe 20260520120000_uzh_faculties_study_programs.sql + nachgelagerte MCP-Migrationen uzh_study_programs_*.

-- Test-Accounts (public.users):
--   r4.test@example.com     → all_departments = true
--   r4.rf.test@example.com  → department slug rwf (Rechtswissenschaftliche Fakultät)
