/**
 * Zwei Initialen für Avatar / Workspace-Chrome (Anzeigename bevorzugt, sonst E-Mail-Lokalteil).
 */
export function initialsFromProfile(
  displayName: string | null | undefined,
  email: string,
): string {
  const name = displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) return `${a}${b}`.toUpperCase();
    }
    const compact = name.replace(/\s+/g, "");
    if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
    if (compact.length === 1) return `${compact[0]!}${compact[0]!}`.toUpperCase();
  }
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return `${local[0]!}${local[0]!}`.toUpperCase();
  return "??";
}
