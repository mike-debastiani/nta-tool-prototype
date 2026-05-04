export type StudiengangGroup = {
  department: string
  programs: string[]
}

/** Beispiel-Daten – gruppiert wie in Figma (Combobox). */
export const STUDIENGAENGE: StudiengangGroup[] = [
  {
    department: "Departement Informatik",
    programs: [
      "BSc Computer Science",
      "BSc Information & Cyber Security",
      "BSc Immersive Technologies",
    ],
  },
  {
    department: "Departement Wirtschaft",
    programs: [
      "BSc Economics and Data Science",
      "BSc Business Administration",
    ],
  },
  {
    department: "Departement Design",
    programs: [
      "BA Digital Ideation",
      "BA Data Design & Art",
      "BA Design management",
    ],
  },
]

export function alleStudiengaenge(): string[] {
  return STUDIENGAENGE.flatMap((g) => g.programs)
}
