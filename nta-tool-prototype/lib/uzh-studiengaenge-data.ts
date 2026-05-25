/** UZH Studiengänge (Quelle: uzh_Studiengangliste_new.md) — Namen 1:1 in `study_programs.name`. */

export type UzhFacultySeed = {
  slug: string;
  shortCode: string;
  name: string;
  sortOrder: number;
  bachelor: readonly string[];
  master: readonly string[];
};

/** Fakultäten alphabetisch nach Anzeigenamen (Combobox + `departments.sort_order`). */
export const UZH_FACULTIES: readonly UzhFacultySeed[] = [
  {
    slug: "mnf",
    shortCode: "MNF",
    name: "Mathematisch-naturwissenschaftliche Fakultät",
    sortOrder: 10,
    bachelor: [
      "BSc Biochemie",
      "BSc Biologie",
      "BSc Biomedizin",
      "BSc Chemie",
      "BSc Wirtschaftschemie",
      "BSc Erdsystemwissenschaften",
      "BSc Geographie",
      "BSc Mathematik",
      "BSc Physik",
    ],
    master: [
      "MSc Biochemistry",
      "MSc Biology",
      "MSc Biomedicine",
      "MSc Chemical and Molecular Sciences",
      "MSc Wirtschaftschemie",
      "MSc Earth System Sciences",
      "MSc Geography",
      "MSc Mathematics",
      "MSc Physics",
      "MSc Computational Science",
      "MSc Data Science",
      "MSc Interdisciplinary Brain Sciences",
      "MSc Neural Systems and Computation",
      "MSc Quantitative Environmental Sciences",
      "MSc Theoretical Astrophysics and Cosmology",
    ],
  },
  {
    slug: "mef",
    shortCode: "MeF",
    name: "Medizinische Fakultät",
    sortOrder: 20,
    bachelor: [
      "B Med Humanmedizin",
      "B Med Dent Zahnmedizin",
      "B Med Chiro Chiropraktische Medizin",
    ],
    master: [
      "M Med Humanmedizin",
      "M Med Dent Zahnmedizin",
      "M Med Chiro Chiropraktische Medizin",
      "MSc Biomedical Sciences",
    ],
  },
  {
    slug: "phf",
    shortCode: "PhF",
    name: "Philosophische Fakultät",
    sortOrder: 30,
    bachelor: [
      "BA Psychologie",
      "BA Publizistik- und Kommunikationswissenschaft",
      "BA Erziehungswissenschaft",
      "BA Politikwissenschaft",
      "BA Soziologie",
      "BA Ethnologie",
      "BA Gender Studies",
      "BA Geschichte",
      "BA Philosophie",
      "BA Filmwissenschaft",
      "BA Kunstgeschichte",
      "BA Musikwissenschaft",
      "BA Populäre Kulturen",
      "BA Computerlinguistik und Sprachtechnologie",
      "BA Digital Humanities",
      "BA Deutsche Sprach- und Literaturwissenschaft",
      "BA English Literature and Linguistics",
      "BA Romanische Sprachen und Literaturen",
      "BA Slavische Sprach- und Literaturwissenschaft",
      "BA Allgemeine und Vergleichende Literaturwissenschaft",
      "BA Vergleichende Sprachwissenschaft",
      "BA Nah- und Mitteloststudien",
      "BA Ostasienwissenschaften",
      "BA Archäologien",
      "BA Altertumswissenschaften",
    ],
    master: [
      "MA Psychologie",
      "MA Publizistik- und Kommunikationswissenschaft",
      "MA Erziehungswissenschaft",
      "MA Politikwissenschaft",
      "MA Soziologie",
      "MA Ethnologie",
      "MA Gender Studies",
      "MA Geschichte",
      "MA Philosophie",
      "MA Filmwissenschaft",
      "MA Kunstgeschichte",
      "MA Musikwissenschaft",
      "MA Populäre Kulturen",
      "MA Computational Linguistics and Language Technology",
      "MA Digital Humanities",
      "MA Deutsche Sprach- und Literaturwissenschaft",
      "MA English Literature and Linguistics",
      "MA Romanische Sprach- und Literaturwissenschaft",
      "MA Slavische Sprach- und Literaturwissenschaft",
      "MA Allgemeine und Vergleichende Literaturwissenschaft",
      "MA Vergleichende Sprachwissenschaft",
      "MA East Asian Studies",
      "MA Interdisziplinäre Kulturstudien",
      "MA Archäologie und Altertumswissenschaften",
    ],
  },
  {
    slug: "rwf",
    shortCode: "RWF",
    name: "Rechtswissenschaftliche Fakultät",
    sortOrder: 40,
    bachelor: ["BLaw Rechtswissenschaft"],
    master: ["MLaw Rechtswissenschaft", "MLaw International and Comparative Law"],
  },
  {
    slug: "trf",
    shortCode: "TRF",
    name: "Theologische und Religionswissenschaftliche Fakultät",
    sortOrder: 50,
    bachelor: ["B Th Theologie", "BA Religionswissenschaft"],
    master: [
      "M Th Theologie",
      "MA Religionswissenschaft",
      "MA Religion – Wirtschaft – Politik",
      "MA Antike Religionen (Religions in the Ancient World)",
      "MA Religionsphilosophie / Religion and Science",
    ],
  },
  {
    slug: "wwf",
    shortCode: "WWF",
    name: "Wirtschaftswissenschaftliche Fakultät",
    sortOrder: 60,
    bachelor: [
      "BA Wirtschaftswissenschaften",
      "BSc Informatik",
      "BSc Wirtschaftsinformatik",
    ],
    master: [
      "MA Business Administration",
      "MA Economics",
      "MA Banking and Finance",
      "MA Management and Economics",
      "MSc Informatik",
      "MSc Wirtschaftsinformatik",
      "MSc Quantitative Finance",
    ],
  },
] as const;

/**
 * Alte Prototyp-Bezeichnungen — bleiben in `study_programs`, bis Anträge migriert sind.
 * Neue Anträge sollen die kanonischen Namen aus `UZH_FACULTIES` verwenden.
 */
export const LEGACY_STUDY_PROGRAMS: readonly {
  facultySlug: string;
  degreeLevel: "bachelor" | "master";
  name: string;
}[] = [
  { facultySlug: "wwf", degreeLevel: "bachelor", name: "BSc Computer Science" },
  { facultySlug: "wwf", degreeLevel: "bachelor", name: "BSc Information & Cyber Security" },
  { facultySlug: "wwf", degreeLevel: "bachelor", name: "BSc Immersive Technologies" },
  { facultySlug: "wwf", degreeLevel: "master", name: "MSc Computer Science" },
  { facultySlug: "wwf", degreeLevel: "master", name: "MSc Information & Cyber Security" },
  { facultySlug: "wwf", degreeLevel: "master", name: "MSc Immersive Technologies" },
  { facultySlug: "wwf", degreeLevel: "bachelor", name: "BSc Economics and Data Science" },
  { facultySlug: "wwf", degreeLevel: "bachelor", name: "BSc Business Administration" },
  { facultySlug: "wwf", degreeLevel: "master", name: "MSc Economics and Data Science" },
  { facultySlug: "wwf", degreeLevel: "master", name: "MSc Business Administration" },
  { facultySlug: "phf", degreeLevel: "bachelor", name: "BA Digital Ideation" },
  { facultySlug: "phf", degreeLevel: "master", name: "MA Digital Ideation" },
  { facultySlug: "rwf", degreeLevel: "bachelor", name: "Rechtswissenschaft" },
  { facultySlug: "rwf", degreeLevel: "bachelor", name: "BSc Rechtswissenschaften" },
  { facultySlug: "rwf", degreeLevel: "master", name: "MSc Rechtswissenschaften" },
  { facultySlug: "wwf", degreeLevel: "master", name: "Economics" },
] as const;

/** Optional: bestehende Anträge in Supabase auf neue Labels heben. */
export const STUDIENANG_MIGRATION_TO_CANONICAL: readonly {
  from: string;
  to: string;
}[] = [
  { from: "Rechtswissenschaft", to: "BLaw Rechtswissenschaft" },
  { from: "BSc Computer Science", to: "BSc Informatik" },
  { from: "BSc Information & Cyber Security", to: "BSc Informatik" },
  { from: "BSc Immersive Technologies", to: "BSc Informatik" },
  { from: "MSc Computer Science", to: "MSc Informatik" },
  { from: "MSc Information & Cyber Security", to: "MSc Informatik" },
  { from: "MSc Immersive Technologies", to: "MSc Informatik" },
  { from: "BSc Business Administration", to: "BA Wirtschaftswissenschaften" },
  { from: "BSc Economics and Data Science", to: "BA Wirtschaftswissenschaften" },
  { from: "MSc Business Administration", to: "MA Business Administration" },
  { from: "MSc Economics and Data Science", to: "MA Economics" },
  { from: "Economics", to: "MA Economics" },
  { from: "BA Digital Ideation", to: "BA Digital Humanities" },
  { from: "MA Digital Ideation", to: "MA Digital Humanities" },
  { from: "BSc Rechtswissenschaften", to: "BLaw Rechtswissenschaft" },
  { from: "MSc Rechtswissenschaften", to: "MLaw Rechtswissenschaft" },
];
