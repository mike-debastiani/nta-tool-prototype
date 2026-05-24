export type StudiengangGroup = {
  department: string
  programs: string[]
}

/** Beispiel-Daten – gruppiert wie in Figma (Combobox). Präfix BSc/BA = Bachelor, MSc/MA = Master. */
export const STUDIENGAENGE: StudiengangGroup[] = [
  {
    department: "Departement Informatik",
    programs: [
      "BSc Computer Science",
      "BSc Information & Cyber Security",
      "BSc Immersive Technologies",
      "MSc Computer Science",
      "MSc Information & Cyber Security",
      "MSc Immersive Technologies",
    ],
  },
  {
    department: "Departement Wirtschaft",
    programs: [
      "BSc Economics and Data Science",
      "BSc Business Administration",
      "MSc Economics and Data Science",
      "MSc Business Administration",
    ],
  },
  {
    department: "Departement Design",
    programs: [
      "BA Digital Ideation",
      "BA Data Design & Art",
      "BA Design management",
      "MA Digital Ideation",
      "MA Data Design & Art",
      "MA Design management",
    ],
  },
];

/** Studienstufe aus gewähltem Studiengang (Bachelor / Master). */
export function studienstufeFromStudiengang(studiengang?: string): string {
  const sg = studiengang?.trim() ?? "";
  if (!sg) return "—";
  if (/\bMSc\b|\bMA\b|\(MA\)|Master/i.test(sg)) return "Master";
  if (/\bBSc\b|\bBA\b|\(BA\)|Bachelor/i.test(sg)) return "Bachelor";
  return "—";
}

export function alleStudiengaenge(): string[] {
  return STUDIENGAENGE.flatMap((g) => g.programs);
}
