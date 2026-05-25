import { alleStudiengaenge } from "@/lib/uzh-studiengaenge";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type R4DepartmentScope = {
  allDepartments: boolean;
  /** `null` = alle Studiengang-Labels (inkl. Legacy). */
  allowedStudiengangNames: Set<string> | null;
  departmentSlug: string | null;
  departmentName: string | null;
};

function studiengangFromApplication(application: WorkspaceApplication): string | null {
  const value = application.data?.personalData?.studiengang?.trim();
  return value || null;
}

/**
 * Lädt den Fakultäts-Scope eines R4-Accounts (`r4_department_scopes`).
 * Entspricht der DB-Funktion `r4_application_in_department_scope`.
 */
export async function loadR4DepartmentScope(
  client: SupabaseClient,
  userId: string,
): Promise<R4DepartmentScope> {
  const { data: scopeRow, error: scopeError } = await client
    .from("r4_department_scopes")
    .select("all_departments, department_id, departments(slug, name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (scopeError) {
    console.warn("[r4-department-access] scope", scopeError.message);
  }

  if (!scopeRow) {
    return {
      allDepartments: false,
      allowedStudiengangNames: new Set(),
      departmentSlug: null,
      departmentName: null,
    };
  }

  if (scopeRow.all_departments) {
    return {
      allDepartments: true,
      allowedStudiengangNames: null,
      departmentSlug: null,
      departmentName: null,
    };
  }

  const department = Array.isArray(scopeRow.departments)
    ? scopeRow.departments[0]
    : scopeRow.departments;
  const departmentId = scopeRow.department_id as string | null;

  if (!departmentId) {
    return {
      allDepartments: false,
      allowedStudiengangNames: new Set(),
      departmentSlug: department?.slug ?? null,
      departmentName: department?.name ?? null,
    };
  }

  const { data: programs, error: programsError } = await client
    .from("study_programs")
    .select("name")
    .eq("department_id", departmentId);

  if (programsError) {
    console.warn("[r4-department-access] programs", programsError.message);
  }

  return {
    allDepartments: false,
    allowedStudiengangNames: new Set((programs ?? []).map((row) => row.name as string)),
    departmentSlug: department?.slug ?? null,
    departmentName: department?.name ?? null,
  };
}

/** Client-Filter (Service-Role-Fallback & konsistente UI-Zählung). */
export function filterApplicationsForR4DepartmentScope(
  applications: WorkspaceApplication[],
  scope: R4DepartmentScope,
): WorkspaceApplication[] {
  if (scope.allDepartments) return applications;

  const allowed = scope.allowedStudiengangNames;
  if (!allowed || allowed.size === 0) return [];

  return applications.filter((application) => {
    const studiengang = studiengangFromApplication(application);
    return studiengang != null && allowed.has(studiengang);
  });
}

/** Alle bekannten Studiengang-Labels (UZH + Legacy) — für Vollzugriff ohne DB-Roundtrip. */
export function allKnownStudiengangNames(): Set<string> {
  return new Set(alleStudiengaenge());
}
