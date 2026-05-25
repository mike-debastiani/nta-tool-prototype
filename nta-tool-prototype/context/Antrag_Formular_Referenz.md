# Antragsformular — Eingabefelder & erwarteter Inhalt

Referenz für realistische Mock-Anträge: **Was wird wo abgefragt, in welchem Format, und welcher Inhalt ist sinnvoll?**  
Ohne technische Persistenz — nur aus Sicht der studierenden Person im Antragsflow.

---

## Überblick: Die fünf Schritte

| Schritt | Thema | Kurz |
|--------|--------|------|
| 1 | Persönliche Angaben | Wer beantragt, welches Studium |
| 2 | Fachärztliches Attest | Medizinischer Nachweis hochladen |
| 3 | Beratung & Empfehlung | Termin buchen, Empfehlung der Fachstelle lesen |
| 4 | Antragsstellung | Situation beschreiben, Dauer, Geltung, Massnahmen wählen |
| 5 | Übersicht | Alles prüfen und einreichen |

---

## Schritt 1 — Persönliche Angaben

### Persönliche Angaben

| Feld | Was eintragen? | Format / Hinweise |
|------|----------------|-------------------|
| **Vorname** | Vorname der antragstellenden Person | Freitext, z. B. «Lara», «Jonas» |
| **Name** | Nachname | Freitext |
| **E-Mail** | Kontakt-E-Mail | Gültige E-Mail-Adresse, typisch Hochschul-Domain, z. B. `name@students.uzh.ch` |
| **Telefonnummer** | Erreichbarkeit | Freitext, oft Schweizer Format, z. B. `+41 79 123 45 67` |

### Angaben zum Studium

| Feld | Was eintragen? | Format / Hinweise |
|------|----------------|-------------------|
| **Matrikelnummer** | Hochschul-Matrikel | **Format: `00-000-000`** (8 Ziffern mit Bindestrichen), z. B. `21-456-789` |
| **Studiengang** | Aktueller Studiengang | Aus Liste wählen — **exakter offizieller Name**, z. B. «BA Psychologie», «BSc Informatik», «BLaw Rechtswissenschaft» |
| **Semester** | Studiensemester | Auswahl **1. bis 12. Semester** |

### Antragsart

Eine Option wählen:

| Option | Wann passend? |
|--------|----------------|
| **Für Studium** | Bereits immatrikuliert; Nachteilsausgleich während des laufenden Studiums |
| **Für Aufnahmeverfahren** | Noch nicht immatrikuliert; NTA für das Aufnahmeverfahren |

---

## Schritt 2 — Fachärztliches Attest

| Was? | Erwarteter Inhalt |
|------|-------------------|
| **Datei-Upload** | Mindestens **eine** Datei (mehrere möglich) |
| **Dateityp** | Empfohlen: **PDF** oder **DOCX** |
| **Grösse** | Empfohlen max. ca. **10 MB** pro Datei |
| **Inhalt laut Formular** | Fachärztliches Attest im **ICF-Format** mit **Diagnose**, **Auswirkungen auf studienrelevante Aktivitäten** und **empfohlenen Massnahmen** |

**Mock-Tipp:** Realistische Dateinamen, z. B. `Attest_Psychiatrie_2025.pdf`, `ICF_Attest_Neurologie.docx`. Der Inhalt der Datei muss im Prototyp nicht wirklich existieren — ein plausibler Dateiname reicht oft.

---

## Schritt 3 — Beratung & Empfehlung

### Beratungstermin (durch Studierende wählbar)

| Feld | Was wählen? | Format / Hinweise |
|------|-------------|-------------------|
| **Datum** | Tag im Kalender | Beliebiger verfügbarer Termin |
| **Zeitslot** | Uhrzeit | Einer der Slots, z. B. `13:30 - 14:30` |

Ort und Beraterin/Berater werden im Prototyp automatisch vorgegeben (Mock-Adresse und «Frau Dr. Suzanne Beispiel»).

### Empfehlungsschreiben (von der Fachstelle)

- Wird **nicht** von der studierenden Person geschrieben.
- Die **NTA-Fachstelle (R2)** verfasst und gibt ein **Empfehlungsschreiben** frei.
- Die studierende Person **liest** es und bestätigt:

| Feld | Was? |
|------|------|
| **Kenntnisnahme** | Checkbox: «Ich habe das Empfehlungsschreiben zur Kenntnis genommen» — muss aktiviert werden, um weiterzugehen |

**Inhalt des Empfehlungsschreibens (für Mocks):**  
Formeller Brief an die antragstellende Person: Bezug auf die Beratung, Zusammenfassung der Situation, welche Massnahmen die Fachstelle grundsätzlich empfiehlt oder bestätigt. 2–4 Absätze, sachlich-freundlich.

---

## Schritt 4 — Antragsstellung

### Beschreibung der gesundheitlichen Situation

| Feld | Was eintragen? | Erwarteter Inhalt |
|------|----------------|-------------------|
| **Beschreibung der gesundheitlichen Situation und Nachteile** | Freitext (mehrzeilig) | **Kernfeld für Mock-Vielfalt:** Krankheitsbild / Beeinträchtigung und **konkrete Nachteile im Studium** (Lesen, Prüfungen, Lehrveranstaltungen, Konzentration, Müdigkeit, Schmerz, Hören, Motorik, Angst, …). Bei wenig Studienerfahrung: Bezug auf Schule und Alltag. **3–10 Sätze**, konkret und nachvollziehbar — keine leeren Floskeln. |

**Beispiel-Themen für Mock-Cases:** ADHS, chronische Migräne, Hörbeeinträchtigung, Dyslexie/LRS, Angststörung/Prüfungsangst, chronische Schmerzen, Verletzung mit temporärer Einschränkung, Diabetes mit Unterzuckerungsrisiko, psychische Belastung/Depression.

---

### Gültigkeitsdauer des Nachteilsausgleichs

Eine Option:

| Option | Wann sinnvoll? |
|--------|----------------|
| **Gesamte Studiendauer** | Dauerhafte oder chronische Beeinträchtigung |
| **Einmalig für ein Semester** | Vorübergehende Erkrankung, Erstbeantragung zur Erprobung, episodische Probleme |

---

### Geltungsbereich

**Mehrfachauswahl** — mindestens eine Option. Wo soll der Nachteilsausgleich gelten?

| Option |
|--------|
| Schriftliche Prüfungen |
| Mündliche Prüfungen |
| Schriftliche Arbeiten |
| Während Lehrveranstaltungen |

**Mock-Tipp:** Nicht immer alles ankreuzen — realistische Profile wählen gezielt (z. B. nur schriftliche Prüfungen + Arbeiten bei Dyslexie; Lehrveranstaltungen + mündliche bei ADHS/Angst).

---

### Ausgleichsmassnahmen für Lehrveranstaltungen

**Regel:** Entweder **«Keine»** wählen **oder** mindestens eine Massnahme **oder** unter «Sonstige» etwas Freies eintragen.

| Option | Kurzbeschreibung |
|--------|------------------|
| **Keine** | Keine Massnahmen in Lehrveranstaltungen nötig |
| Zusätzliche Pausen | Extra Pausen während LV |
| Einzelarbeit statt Gruppenarbeit | Gruppenarbeit durch Einzelarbeit ersetzen |
| Angepasste Präsenzpflicht | Weniger/reduzierte Anwesenheitspflicht |
| Audioaufnahme-Erlaubnis | LV zu Lernzwecken aufzeichnen dürfen |
| Reservierter Sitzplatz | Fester Platz (Ausgang, Fenster, …) |
| Kein unaufgefordertes Aufrufen | Kein spontanes mündliches Abfragen |
| **Sonstige** | Freitext-Zeile(n), z. B. «Rückzugsmöglichkeit bei Überforderung» |

---

### Ausgleichsmassnahmen für Leistungsnachweise

Gleiche Logik wie bei Lehrveranstaltungen: **Keine** oder mindestens eine Option oder **Sonstige**.

| Option | Kurzbeschreibung |
|--------|------------------|
| **Keine** | Keine Massnahmen bei Prüfungen/Leistungsnachweisen |
| Einsatz technischer Hilfsmittel | Notebook, Screenreader, … |
| Anpassung der Prüfungsunterlagen | Schriftart, Grösse, Farbe |
| Einsatz personeller Unterstützung | z. B. Dolmetscher, Schreibassistenz |
| Zeitverlängerung | Mehr Prüfungszeit |
| Angepasste Pausenregelung | Extra/längere Pausen in Prüfungen |
| Separater Prüfungsraum | Prüfung einzeln / abgesetzt |
| Mündliche statt schriftliche Prüfung | Schriftliche Prüfung durch mündliche ersetzen |
| **Sonstige** | Freitext, z. B. «Prüfung in zwei Teilen an zwei Tagen» |

---

## Schritt 5 — Übersicht

Keine neuen Felder. Alle Angaben werden **zur Kontrolle angezeigt**; persönliche Daten aus Schritt 1 sind ab der Buchung **nicht mehr editierbar**.

Abschluss: Antrag **final einreichen** → danach Status «In Review».

---

## Mock-Cases: sinnvolle Kombinationen

| Profil | Situation (Kurz) | Dauer | Geltung | LV-Massnahmen | LN-Massnahmen |
|--------|------------------|-------|---------|---------------|---------------|
| ADHS | Konzentration, Unruhe, Prüfungsstress | Gesamte Studiendauer | Schriftlich, LV, Arbeiten | Pausen, Sitzplatz, kein Aufrufen | Zeitverlängerung, separater Raum |
| Migräne | Anfälle, Licht-/Lärmempfindlichkeit | Ein Semester | Schriftlich, mündlich | Angepasste Präsenz | Pausen, separater Raum |
| Hören | Hörbeeinträchtigung, LV schwer verständlich | Gesamte Studiendauer | LV, mündlich | Audioaufnahme | Technische Hilfsmittel, personelle Unterstützung |
| Dyslexie | Langsames Lesen, Rechtschreibung | Gesamte Studiendauer | Schriftlich, Arbeiten | Keine | Angepasste Unterlagen, Zeitverlängerung |
| Verletzung Hand | Schreiben eingeschränkt, temporär | Ein Semester | Schriftlich | Angepasste Präsenz | Technische Hilfsmittel, Zeitverlängerung |
| Prüfungsangst | Panik in Prüfungssituationen | Ein Semester | Schriftlich, mündlich | Kein Aufrufen | Separater Raum, Pausen, ggf. mündlich statt schriftlich |
| Aufnahmeverfahren | Noch nicht immatrikuliert, LRS | Ein Semester | Schriftlich | — | Angepasste Unterlagen |

---

## Checkliste für realistische Mock-Anträge

- [ ] Vorname/Name passen zum gewählten Profil (verschiedene Personen pro Case)
- [ ] Matrikel im Format `00-000-000`
- [ ] Studiengang = realistischer offizieller Name aus der UZH-Liste
- [ ] Semester passt zum Profil (z. B. 2. Semester Aufnahme vs. 8. Semester Master)
- [ ] Antragsart passt zum Szenario (`studium` vs. `aufnahmeverfahren`)
- [ ] Mindestens ein Attest mit plausiblem Dateinamen
- [ ] Situationsbeschreibung nennt **Diagnose/Beeinträchtigung** und **konkrete Studien-Nachteile**
- [ ] Geltungsbereich und Massnahmen **passen zur Situation** (nicht willkürlich alles ankreuzen)
- [ ] Empfehlungsschreiben (Fachstelle) bezieht sich auf dieselbe Situation und Massnahmen

---

## Studiengänge — Beispielnamen

Für Mocks einen **exakten** Namen aus der Hochschulliste verwenden, z. B.:

- BA Psychologie, BA Digital Humanities, MA Digital Humanities  
- BSc Informatik, BA Wirtschaftswissenschaften, MSc Informatik  
- BLaw Rechtswissenschaft, MLaw Rechtswissenschaft  
- B Med Humanmedizin, BSc Biologie  

Vollständige Liste im Projekt: `lib/uzh-studiengaenge-data.ts`.
