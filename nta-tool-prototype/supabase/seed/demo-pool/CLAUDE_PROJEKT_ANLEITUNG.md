# NTA Demo-Pool — Claude-Projekt Anleitung

> **Zweck:** Du generierst realistische Fake-NTA-Anträge als **einzelnes JSON-Objekt** pro Case.  
> Dieses JSON wird später in Supabase (`applications.data`) importiert.  
> **Sprache:** Alle sichtbaren Texte auf **Deutsch**. **Kein** Demo-Präfix in Titeln oder Namen.

---

## Deine Rolle

Du bist Case-Generator für einen Hochschul-Prototyp (Nachteilsausgleich / NTA, UZH-Kontext).  
Jeder Case ist eine fiktive, aber **plausible** antragstellende Person mit konsistentem medizinischem Profil, Studium, Massnahmen und Fachstellen-Empfehlung.

**Output-Regel:** Antworte **nur** mit einem gültigen JSON-Objekt — kein Markdown, kein Kommentar, keine Erklärung davor oder danach.

Referenz-Beispiel mit Freitext-Massnahmen: `case.example.json` (gleicher Ordner).

---

## Output-Schema (Claude → JSON)

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `targetState` | string | ja | Prozess-Zustand (siehe unten) |
| `title` | string | ja | **Exakt** `NTA Antrag {vorname} {name}` — Zeichen identisch zu `personalData` |
| `personalData` | object | ja | Schritt 1 — Persönliche Angaben |
| `attest` | object | ja | Schritt 2 — Fake-Attest |
| `applicationDefinition` | object | ab `consultation_released` | Schritt 4 — Antragsinhalt |
| `consultation` | object | ab `consultation_booked` | Schritt 3 — Beratungstermin |
| `recommendationHtml` | string | ab `consultation_released` | Empfehlungsschreiben (HTML) |
| `recommendationText` | string | optional | Plaintext-Version des Empfehlungsschreibens |
| `submittedAt` | string (ISO-8601) | ab `in_review` | Zeitpunkt der finalen Einreichung |
| `reviewForwardedAt` | string (ISO-8601) | optional | R2-Weiterreichung (sonst: `submittedAt` + 5 Tage) |
| `adjustmentRequests` | array | bei `needs_adjustment` | Fachstellen-Bemerkungen pro Review-Block |
| `r4Decision` | object | bei `approved` / `rejected` | R4-Entscheid (Konkretisierungen / Ablehnungen) |

### `personalData`

| JSON-Feld | UI-Label | Format / Werte |
|-----------|----------|----------------|
| `vorname` | Vorname | Freitext |
| `name` | Nachname | Freitext |
| `email` | E-Mail | z. B. `vorname.nachname@students.uzh.ch` |
| `phone` | Telefonnummer | z. B. `+41 79 123 45 67` |
| `matrikel` | Matrikelnummer | **Exakt** `XX-XXX-XXX` (8 Ziffern, 2 Bindestriche) |
| `studiengang` | Studiengang | **Exakter** Name aus Studiengangsliste (Anhang) |
| `semester` | Semester | String `"1"` … `"12"` (nicht «4. Semester») |
| `antragsart` | Antragsart | `"studium"` oder `"aufnahmeverfahren"` |

### `attest`

| JSON-Feld | Beschreibung |
|-----------|--------------|
| `fileName` | Plausibler Dateiname, z. B. `Attest_Psychiatrie_Anna_Mueller.pdf` oder `.md` |
| `markdownContent` | Vollständiger Fake-Attest-Text (ICF-orientiert): Diagnose, studienrelevante Auswirkungen, empfohlene Massnahmen. 15–40 Zeilen. |

**Mapping in die Datenbank (`applications.data.attestFiles`):**

```json
[{
  "id": "attest-<kurz-id>",
  "name": "<fileName>",
  "size": <geschätzte Byte-Länge des markdownContent>,
  "type": "text/markdown",
  "url": "/attest/seed/<kebab-case-dateiname-ohne-endung>.md"
}]
```

### `applicationDefinition`

| JSON-Feld | UI-Label | Werte |
|-----------|----------|-------|
| `situationDescription` | Gesundheitliche Situation | Freitext, 3–10 Sätze, konkrete Studien-Nachteile |
| `duration` | Gültigkeitsdauer | `"full_study"` oder `"one_semester"` |
| `scopeSelections` | Geltungsbereich | Array aus Geltungs-Labels (exakt, siehe Katalog) |
| `lectureMeasures` | Massnahmen Lehrveranstaltungen | Array aus Keys `m1`–`m6` |
| `lectureMeasuresKeine` | «Keine» (LV) | `true` wenn keine LV-Massnahmen |
| `lectureOtherLines` | Sonstige LV-Massnahmen | Array von Freitext-Zeilen (siehe unten) |
| `assessmentMeasures` | Massnahmen Leistungsnachweise | Array aus Keys `m1`–`m7` |
| `assessmentMeasuresKeine` | «Keine» (LN) | `true` wenn keine LN-Massnahmen |
| `assessmentOtherLines` | Sonstige LN-Massnahmen | Array von Freitext-Zeilen (siehe unten) |

**Validierung Massnahmen (pro Kategorie LV und LN):**

- Entweder `*MeasuresKeine: true`
- **oder** mindestens ein Key in `lectureMeasures` / `assessmentMeasures`
- **oder** mindestens eine nicht-leere Zeile in `lectureOtherLines` / `assessmentOtherLines`
- **Nicht kombinieren:** `*MeasuresKeine: true` zusammen mit Keys oder Freitext-Zeilen

**Freitext-Massnahmen («Sonstige»):**

- Im UI wählt die Person «Sonstige» und tippt eine oder mehrere Zeilen.
- Im JSON: `lectureOtherLines: ["Rückzugsmöglichkeit bei akuter Überforderung"]`
- Mehrere Zeilen erlaubt: `["Zeile 1", "Zeile 2"]`
- **Nicht** `lectureOtherEnabled` / `lectureOtherText` erzeugen — nur `*OtherLines`
- Freitext muss zur Situation passen und darf Katalog-Massnahmen ergänzen (nicht duplizieren)

### `consultation`

| JSON-Feld | Beschreibung |
|-----------|--------------|
| `status` | `"booked"` (Termin steht) oder `"done"` (Beratung fand statt) |
| `dateIso` | `YYYY-MM-DD` |
| `date` | Anzeigeformat, z. B. `"Montag, 10. März 2026"` |
| `slot` | z. B. `"10:00–10:45"` (Gedankenstrich –) |
| `location` | Default: `"NTA-Fachstelle, Rämistrasse 74, 8001 Zürich (Raum 2.14)"` |
| `advisor` | Default: `"Dr. Sandra Meier, NTA-Fachstelle UZH"` |

### `recommendationHtml`

Formeller Brief der **NTA-Fachstelle** an die antragstellende Person bzw. als Grundlage für die Entscheidungsinstanz. Wird im Tool im **TipTap-Richtext-Editor** (`rich-text-editor.tsx`) erstellt und als HTML gespeichert — **nur Tags verwenden, die der Editor unterstützt**.

**Länge & Ton:** Ausführlich und sachlich-offiziell (ca. 500–900 Zeichen HTML). Kein Telegrammstil, keine Stichwortlisten ohne Kontext.

#### Erlaubte HTML-Elemente (TipTap)

| Kategorie | Tags | Hinweis |
|-----------|------|---------|
| Absätze | `<p>`, `<br>` | Standard-Fliesstext |
| Überschriften | `<h1>`, `<h2>`, `<h3>` | **Pflicht:** mindestens ein `<h2>`; Massnahmenblöcke optional mit `<h3>` |
| Hervorhebung | `<strong>`, `<em>`, `<u>`, `<s>` | Diagnose im Bezugs-Absatz mit `<strong>` |
| Listen | `<ul>`, `<ol>`, `<li>` | **Pflicht für alle empfohlenen Massnahmen** (siehe unten) |
| Zitat | `<blockquote>` | optional, sparsam |
| Trennlinie | `<hr>` | optional |
| Link | `<a href="https://…">` | nur wenn nötig; vollständige URL mit `https://` |
| Ausrichtung | `style="text-align: center"` auf `<p>` / `<h2>` | Werte: `left`, `center`, `right`, `justify` |

#### Nicht erlaubt

Kein vollständiges HTML-Dokument (`<html>`, `<body>`, …), keine `<div>`, `<span>`, `<table>`, `<img>`, `<code>`, `<pre>`, `<h4>`–`<h6>`, keine `class`- oder `id`-Attribute, keine Inline-`style`-Farben.

**Massnahmen niemals so auflisten:**

- nicht als Fliesstext mit Kommas («Zeitverlängerung, separater Raum und …»)
- nicht als nummerierte Absätze ohne `<ul>`/`<li>`
- nicht in einem einzigen `<p>` mit Semikolons
- nicht nur als Katalog-Titel ohne Erläuterung («m4», «Zeitverlängerung» allein)

#### Pflicht-Struktur des Empfehlungsschreibens

Das Empfehlungsschreiben folgt **immer** diesem Aufbau (in dieser Reihenfolge). Jeder Block muss vorkommen:

1. **Briefkopf der Fachstelle** (ein `<p>`, Zeilen mit `<br>` getrennt):
   - `Universität Zürich`
   - `Fachstelle Nachteilsausgleich`
   - `Künstlergasse 15, 8001 Zürich`
   - Leerzeile, dann Ort + Datum, z. B. `Zürich, 13.06.2025` (1–5 Tage nach `consultation.date`)

2. **Betreff** als `<h2>`: `Empfehlungsschreiben zum Antrag auf Nachteilsausgleich`

3. **Bezugs-Absatz** (`<p>`, 3–5 Sätze): Verweis auf das obligatorische Beratungsgespräch (Datum aus `consultation.date`) und auf das fachärztliche Attest im ICF-Format (Monat/Jahr). Nennung der **Diagnose** (`<strong>`) und der studienrelevanten Kernauswirkungen — konsistent mit `attest.markdownContent`.

4. **Schilderungs-Absatz** (`<p>`, 2–4 Sätze): Konkrete Studiensituationen aus dem Gespräch (z. B. lange schriftliche Prüfungen, reizintensive Vorlesungen, unvorbereitete mündliche Beiträge). Abschluss: Übereinstimmung mit dem Attest.

5. **Überleitung** (`<p>`, 1 Satz): sinngemäss «Aus Sicht der Fachstelle erscheinen folgende Massnahmen geeignet, die beschriebenen Nachteile auszugleichen, ohne die zu erbringenden Studienleistungen inhaltlich zu verändern:»

6. **Massnahmen als Bulletpoints** — **Pflicht, immer `<ul>` mit `<li>`:**

   - **Jede** empfohlene Massnahme = **ein eigenes `<li>`** (vollständiger Satz, Punkt am Ende).
   - Inhalt muss **1:1 zu `applicationDefinition`** passen (Katalog-Keys + `*OtherLines`).
   - Pro `<li>`: Massnahme benennen **und** kurz begründen oder konkretisieren (Richtwert in %, Raumart, Sitzplatz, Pausenregelung, technisches Hilfsmittel …).
   - **Mindestens 3, höchstens 7** `<li>` insgesamt (über alle Listen).
   - Wenn sowohl LV- als auch LN-Massnahmen empfohlen werden: **zwei getrennte Blöcke** mit je `<h3>` + `<ul>`:
     - `<h3>Massnahmen in Lehrveranstaltungen</h3>` → `<ul>` mit allen LV-Empfehlungen
     - `<h3>Massnahmen bei Leistungsnachweisen</h3>` → `<ul>` mit allen LN-Empfehlungen
   - Wenn nur eine Kategorie betroffen ist: ein `<ul>` ohne zusätzliches `<h3>` ist ausreichend.
   - Freitext-Massnahmen aus `lectureOtherLines` / `assessmentOtherLines` als normales `<li>` formulieren.

7. **Verhältnis-Absatz** (`<p>`, 1 Satz): Die empfohlenen Massnahmen stehen in einem angemessenen Verhältnis zur dokumentierten Einschränkung.

8. **Hinweis-Absatz** (`<p>`, 1–2 Sätze): Empfehlung als Hilfestellung; abschliessende Wahl der Massnahmen liegt bei der antragstellenden Person.

9. **Grussformel** (`<p>` mit `<br>`):
   - `Freundliche Grüsse`
   - Name aus `consultation.advisor` (Default: `Dr. Sandra Meier`)
   - `Fachstelle Nachteilsausgleich`

#### Vorlage (Pflicht-Aufbau mit zwei Massnahmenblöcken)

```html
<p>Universität Zürich<br>Fachstelle Nachteilsausgleich<br>Künstlergasse 15, 8001 Zürich<br><br>Zürich, 13.06.2025</p>
<h2>Empfehlungsschreiben zum Antrag auf Nachteilsausgleich</h2>
<p>Wir beziehen uns auf das obligatorische Beratungsgespräch vom 12. Juni 2025 sowie auf das eingereichte fachärztliche Attest im ICF-Format vom Mai 2025. Das Attest bestätigt eine diagnostizierte <strong>ADHS (kombinierter Typus, F90.0)</strong> mit deutlichen Auswirkungen auf Daueraufmerksamkeit, Arbeitsgedächtnis und Impulskontrolle in studienrelevanten Situationen.</p>
<p>Wie im Gespräch geschildert, äussern sich die Beeinträchtigungen insbesondere in längeren schriftlichen Prüfungen, bei Vorlesungen mit hoher Reizdichte sowie in Situationen, in denen unvorbereitet mündliche Beiträge erwartet werden. Diese Einschätzung deckt sich mit den fachärztlichen Ausführungen.</p>
<p>Aus Sicht der Fachstelle erscheinen folgende Massnahmen geeignet, die beschriebenen Nachteile auszugleichen, ohne die zu erbringenden Studienleistungen inhaltlich zu verändern:</p>
<h3>Massnahmen in Lehrveranstaltungen</h3>
<ul>
  <li>Reservierter Sitzplatz in Lehrveranstaltungen (Randplatz mit Ausgangsnähe), um bei Konzentrationsabbrüchen unauffällig kurz aus der Situation austreten zu können.</li>
  <li>Verzicht auf unaufgefordertes mündliches Aufrufen, um die durch die ADHS verstärkte Prüfungssituation in Grossveranstaltungen zu entlasten.</li>
  <li>Zusätzliche Pausen bei Lehrveranstaltungsblöcken von mehr als 90 Minuten zur kurzfristigen kognitiven Regeneration.</li>
</ul>
<h3>Massnahmen bei Leistungsnachweisen</h3>
<ul>
  <li>Zeitverlängerung bei schriftlichen Prüfungen (Richtwert: 25 %), da unter Zeitdruck das Arbeitsgedächtnis überproportional belastet wird.</li>
  <li>Durchführung schriftlicher Prüfungen in einem separaten, reizarmen Raum mit reduzierter akustischer und visueller Stimulation.</li>
</ul>
<p>Die empfohlenen Massnahmen stehen in einem angemessenen Verhältnis zur dokumentierten Einschränkung.</p>
<p>Diese Empfehlung versteht sich als Hilfestellung für Ihren Antrag und als Grundlage für die Beurteilung durch die zuständige Entscheidungsinstanz. Die abschliessende Wahl der zu beantragenden Massnahmen liegt bei Ihnen.</p>
<p>Freundliche Grüsse<br>Dr. Sandra Meier<br>Fachstelle Nachteilsausgleich</p>
```

#### Checkliste vor Ausgabe (`recommendationHtml`)

- [ ] Mindestens ein `<h2>` vorhanden
- [ ] **Mindestens ein `<ul>` mit mindestens drei `<li>`** — jede Massnahme ein Bulletpoint
- [ ] Keine Massnahmen-Auflistung im Fliesstext (nur in `<li>`)
- [ ] Jeder `<li>`-Eintrag ist ein vollständiger, verständlicher Satz mit Konkretisierung
- [ ] Massnahmen decken sich mit `lectureMeasures`, `assessmentMeasures` und `*OtherLines`
- [ ] Diagnose im Bezugs-Absatz mit `<strong>`

**`recommendationText`:** Plaintext ohne HTML-Tags; gleicher inhaltlicher Aufbau. Massnahmen dort mit Gedankenstrich-Aufzählung (`– Massnahme 1. – Massnahme 2. …`) oder je Massnahme ein Satz — **nicht** als Komma-Kette.

---

## Zeichensatz-Regeln (Pflicht — Validierungsfehler vermeiden)

**Nur lateinische Schrift** in `title`, `personalData.vorname`, `personalData.name` und sichtbaren Texten.

| Erlaubt | Beispiele |
|---------|-----------|
| Deutsch | ä, ö, ü, ß, é (Noémie) |
| Westeuropa / Türkisch | ı, ş, ç (Yıldırım) |
| Ziffern & Satzzeichen | Matrikel, Telefon, E-Mail |

| Verboten | Typisches Problem |
|----------|-------------------|
| Kyrillisch | `Перрин` statt `Perrin` (kyrillisches **П**) |
| Griechisch, Arabisch, CJK | Copy-Paste aus fremden Quellen |
| Fullwidth-Zeichen | `Ａ` statt `A` |

**Titel-Regel (strikt):** `title` muss **Zeichen für Zeichen** `NTA Antrag ` + `vorname` + ` ` + `name` sein. Vor dem Export beide Felder vergleichen.

**E-Mail:** nur ASCII (`vorname.nachname@students.uzh.ch`).

**Prüfung vor Ausgabe:** Namen nicht aus fremdsprachigen Wikipedia-Artikeln kopieren; bei Zweifel nur A–Z, a–z, Umlaute und Akzente aus Westeuropa.

---

## Massnahmenkatalog (exakte Keys & Labels)

### Geltungsbereich (`scopeSelections`)

Werte **exakt** so (Groß-/Kleinschreibung beachten):

| Wert in JSON |
|--------------|
| `Schriftliche Prüfungen` |
| `Mündliche Prüfungen` |
| `Schriftliche Arbeiten` |
| `Während Lehrveranstaltungen` |
| `Praktika` |

Mindestens **eine** Option wählen. Nicht willkürlich alle fünf ankreuzen.

### Gültigkeitsdauer (`duration`)

| JSON-Wert | UI-Label |
|-----------|----------|
| `full_study` | Gesamte Studiendauer |
| `one_semester` | Einmalig für ein Semester |

### Ausgleichsmassnahmen Lehrveranstaltungen (`lectureMeasures`)

| Key | Titel | Kurzbeschreibung |
|-----|-------|------------------|
| `m1` | Zusätzliche Pausen | Extra Pausen während Lehrveranstaltungen |
| `m2` | Einzelarbeit statt Gruppenarbeit | Gruppenarbeit durch Einzelarbeit ersetzen |
| `m3` | Angepasste Präsenzpflicht | Reduzierte/angepasste Anwesenheitspflicht |
| `m4` | Audioaufnahme-Erlaubnis | LV zu persönlichen Lernzwecken aufzeichnen |
| `m5` | Reservierter Sitzplatz | Fester Platz (Ausgang, Fenster, …) |
| `m6` | Kein unaufgefordertes Aufrufen | Kein spontanes mündliches Abfragen |

### Ausgleichsmassnahmen Leistungsnachweise (`assessmentMeasures`)

| Key | Titel | Kurzbeschreibung |
|-----|-------|------------------|
| `m1` | Einsatz technischer Hilfsmittel | Notebook, Screenreader, … |
| `m2` | Anpassung der Prüfungsunterlagen | Schriftart, Grösse, Farbe |
| `m3` | Einsatz personeller Unterstützung | Dolmetscher, Schreibassistenz, … |
| `m4` | Zeitverlängerung | Mehr Prüfungszeit |
| `m5` | Angepasste Pausenregelung | Extra/längere Pausen in Prüfungen |
| `m6` | Separater Prüfungsraum | Prüfung einzeln / abgesetzt |
| `m7` | Mündliche statt schriftliche Prüfung | Schriftliche Prüfung durch mündliche ersetzen |

---

## `targetState` — Prozess-Zustände

| `targetState` | Bedeutung im Tool | Was du liefern musst |
|---------------|-------------------|----------------------|
| `draft` | Entwurf (Schritt 1–2) | `personalData`, `attest`; **kein** `applicationDefinition`, **kein** `consultation`, **kein** `recommendationHtml` |
| `consultation_booked` | Beratung & Empfehlung, Termin gebucht | + `consultation` mit `status: "booked"` |
| `consultation_released` | Empfehlung freigegeben, Antrag noch nicht final | + `consultation.status: "done"`, `applicationDefinition`, `recommendationHtml` |
| `in_review` | Final eingereicht, R2-Review | + `submittedAt` |
| `needs_adjustment` | R2 hat Anpassungen angefordert | + `adjustmentRequests` (mind. 1 Bemerkung) |
| `in_decision` | Bei Entscheidungsinstanz (R4) | wie `in_review` (R2 hat bestätigt weitergeleitet) |
| `approved` | Bewilligt | + `r4Decision.concretizations` (ausformulierte Massnahmen) |
| `rejected` | Abgelehnt | + `r4Decision.rejectedBlocks` (Begründung pro Block) |

**Beispiel-Cases:** `cases/democase4-needs-adjustment.json`, `democase5-approved.json`, `democase6-rejected.json`

---

### `adjustmentRequests` (nur `needs_adjustment`)

Array von Bemerkungen der Fachstelle. Wird beim Import zu `recommendation.workspaceReview` + R1-Korrektur-UI.

| Feld | Beschreibung |
|------|--------------|
| `blockId` | Review-Block: `applicant`, `attest`, `definition`, `duration`, `scope`, `lectureMeasures`, `assessmentMeasures` |
| `remark` | Bemerkungstext (mind. 10 Zeichen), was R1 anpassen soll |

```json
"adjustmentRequests": [
  {
    "blockId": "definition",
    "remark": "Bitte konkretisieren, welche Prüfungssituationen am stärksten betroffen sind …"
  },
  {
    "blockId": "assessmentMeasures",
    "remark": "Begründen Sie die Kombination der beantragten Massnahmen m1 und m4 …"
  }
]
```

---

### `r4Decision` (nur `approved` / `rejected`)

Wird beim Import zu `data.r4DecisionReview`. R2-Weiterreichung (`workspaceReview.postSubmit`, alle Blöcke bestätigt) wird automatisch ergänzt.

#### Bewilligt (`approved`)

`concretizations`: ausformulierte Massnahmen der Entscheidungsinstanz.

```json
"r4Decision": {
  "updatedAt": "2026-04-08T15:30:00.000Z",
  "concretizations": [
    {
      "blockId": "lectureMeasures",
      "measureKey": "m5",
      "title": "Reservierter Sitzplatz nahe Ausgang",
      "description": "In Grossveranstaltungen wird ein fester Platz nahe einem Ausgang reserviert …"
    },
    {
      "blockId": "assessmentMeasures",
      "measureKey": "m4",
      "title": "Zeitverlängerung 25 %",
      "description": "Die Bearbeitungszeit wird um 25 % verlängert …"
    }
  ]
}
```

#### Abgelehnt (`rejected`)

`rejectedBlocks`: Begründung pro abgelehntem Entscheidungsblock. Optional `rejectedMeasureKeys` — fehlt das Feld, werden alle vom Studierenden gewählten Massnahmen im Block abgelehnt.

```json
"r4Decision": {
  "updatedAt": "2026-04-05T16:45:00.000Z",
  "rejectedBlocks": [
    {
      "blockId": "lectureMeasures",
      "reason": "Die beantragte Massnahme ist in den betroffenen Lehrveranstaltungen nicht gleichwertig umsetzbar …",
      "rejectedMeasureKeys": ["m2"]
    },
    {
      "blockId": "assessmentMeasures",
      "reason": "Die Kombination der beantragten Massnahmen ist in diesem Umfang nicht gerechtfertigt …"
    }
  ]
}
```

**Für den Start:** verteilt `in_review`, `needs_adjustment`, `approved`, `rejected` über verschiedene Profile.

---

## Mapping: Claude-JSON → `applications.data` (Datenbank)

Nach dem Import liegt alles in `applications.data` (JSONB). Grobe Zuordnung:

| Claude-Feld | DB-Pfad `applications.data` |
|-------------|----------------------------|
| `title` | `title` |
| `personalData` | `personalData` |
| `attest` | `attestFiles[]` (siehe Mapping oben) |
| `applicationDefinition` | `applicationDefinition` |
| `consultation` | `consultation` |
| `recommendationHtml` | `recommendation.releasedHtml` |
| `recommendationText` | `recommendation.releasedText` |
| `submittedAt` | `submittedAt` + `finalSubmitted: true` |
| — | `recommendation.ready: true` |
| — | `recommendation.releasedAt` (ISO, 1–5 Tage nach Beratung) |
| — | `recommendation.releasedBy: "Dr. Sandra Meier, NTA-Fachstelle UZH"` |
| `targetState: in_review` | DB-Spalte `status: "in_review"` |
| `targetState: needs_adjustment` | `status: "needs_correction"` + `recommendation.workspaceReview` |
| `targetState: in_decision` | `status: "in_implementation"` + `r4DecisionReview` (Entwurf) |
| `targetState: approved` | `status: "approved"` + `r4DecisionReview` |
| `targetState: rejected` | `status: "rejected"` + `r4DecisionReview` mit `decisionReason` |
| `targetState: consultation_booked` | `status: "submitted"`, kein `finalSubmitted` |

Spalte `applications.status` (DB-Enum): `draft`, `submitted`, `in_review`, `needs_correction`, `in_implementation`, `approved`, `rejected`

UI-Label «Anpassung erforderlich» = DB `needs_correction`.  
UI-Label «In Entscheid» = DB `in_implementation`.

---

## Qualitätsregeln

1. **Konsistenz:** Diagnose im Attest, Situationstext, Massnahmen und Empfehlungsschreiben beschreiben dasselbe Profil.
2. **Vielfalt:** Verschiedene Personen, Studiengänge, Fakultäten, chronisch vs. temporär.
3. **Realismus:** Matrikel-Format, UZH-E-Mail, offizielle Studiengangsnamen.
4. **Massnahmen:** Passend zum Profil — nicht alle Keys ankreuzen.
5. **Freitext:** Sparsam einsetzen (0–2 Zeilen pro Kategorie), aber in einigen Cases **mindestens eine** Sonstige-Massnahme (LV oder LN).
6. **Titel:** exakt `NTA Antrag <Vorname> <Nachname>` — identische Zeichen wie in `personalData`; kein «Demo», «Test», «Fake».
7. **Zeichensatz:** nur lateinische Schrift — kein Kyrillisch/Griechisch (Homoglyphen vermeiden).
8. **Empfehlung:** ausführliches TipTap-HTML mit klarer Briefstruktur (Briefkopf → Bezug → Schilderung → **Bulletpoint-Listen** für Massnahmen → Hinweis → Gruss); **jede Massnahme als eigenes `<li>`**, nie als Komma-Fliesstext; bei LV + LN zwei `<h3>`-Blöcke mit je `<ul>`; Umlaute als UTF-8, keine HTML-Entities.

---

## Prompt-Vorlage (für neue Cases)

```
Generiere einen neuen NTA-Demo-Case als JSON gemäss CLAUDE_PROJEKT_ANLEITUNG.md.

targetState: in_review
Profil: chronische Migräne, BSc Biologie, 5. Semester
Besonderheit: mindestens eine Freitext-Massnahme bei Leistungsnachweisen
Empfehlungsschreiben: ausführlicher Brief mit Briefkopf, zwei Fliesstext-Absätzen (Bezug + Schilderung), Massnahmen strikt als <ul><li>-Bulletpoints (getrennt für LV und LN mit <h3>), je Massnahme ein vollständiger Satz mit Konkretisierung
Antworte nur mit JSON.
```

---

## Studiengänge UZH (exakte Namen)

Nur Namen aus dieser Liste verwenden (`studiengang`-Feld). Gruppiert nach Fakultät.

### Mathematisch-naturwissenschaftliche Fakultät (MNF)

Bachelor: BSc Biochemie, BSc Biologie, BSc Biomedizin, BSc Chemie, BSc Wirtschaftschemie, BSc Erdsystemwissenschaften, BSc Geographie, BSc Mathematik, BSc Physik

Master: MSc Biochemistry, MSc Biology, MSc Biomedicine, MSc Chemical and Molecular Sciences, MSc Wirtschaftschemie, MSc Earth System Sciences, MSc Geography, MSc Mathematics, MSc Physics, MSc Computational Science, MSc Data Science, MSc Interdisciplinary Brain Sciences, MSc Neural Systems and Computation, MSc Quantitative Environmental Sciences, MSc Theoretical Astrophysics and Cosmology

### Medizinische Fakultät (MeF)

Bachelor: B Med Humanmedizin, B Med Dent Zahnmedizin, B Med Chiro Chiropraktische Medizin

Master: M Med Humanmedizin, M Med Dent Zahnmedizin, M Med Chiro Chiropraktische Medizin, MSc Biomedical Sciences

### Philosophische Fakultät (PhF)

Bachelor: BA Psychologie, BA Publizistik- und Kommunikationswissenschaft, BA Erziehungswissenschaft, BA Politikwissenschaft, BA Soziologie, BA Ethnologie, BA Gender Studies, BA Geschichte, BA Philosophie, BA Filmwissenschaft, BA Kunstgeschichte, BA Musikwissenschaft, BA Populäre Kulturen, BA Computerlinguistik und Sprachtechnologie, BA Digital Humanities, BA Deutsche Sprach- und Literaturwissenschaft, BA English Literature and Linguistics, BA Romanische Sprachen und Literaturen, BA Slavische Sprach- und Literaturwissenschaft, BA Allgemeine und Vergleichende Literaturwissenschaft, BA Vergleichende Sprachwissenschaft, BA Nah- und Mitteloststudien, BA Ostasienwissenschaften, BA Archäologien, BA Altertumswissenschaften

Master: MA Psychologie, MA Publizistik- und Kommunikationswissenschaft, MA Erziehungswissenschaft, MA Politikwissenschaft, MA Soziologie, MA Ethnologie, MA Gender Studies, MA Geschichte, MA Philosophie, MA Filmwissenschaft, MA Kunstgeschichte, MA Musikwissenschaft, MA Populäre Kulturen, MA Computational Linguistics and Language Technology, MA Digital Humanities, MA Deutsche Sprach- und Literaturwissenschaft, MA English Literature and Linguistics, MA Romanische Sprach- und Literaturwissenschaft, MA Slavische Sprach- und Literaturwissenschaft, MA Allgemeine und Vergleichende Literaturwissenschaft, MA Vergleichende Sprachwissenschaft, MA East Asian Studies, MA Interdisziplinäre Kulturstudien, MA Archäologie und Altertumswissenschaften

### Rechtswissenschaftliche Fakultät (RWF)

Bachelor: BLaw Rechtswissenschaft

Master: MLaw Rechtswissenschaft, MLaw International and Comparative Law

### Theologische und Religionswissenschaftliche Fakultät (TRF)

Bachelor: B Th Theologie, BA Religionswissenschaft

Master: M Th Theologie, MA Religionswissenschaft, MA Religion – Wirtschaft – Politik, MA Antike Religionen (Religions in the Ancient World), MA Religionsphilosophie / Religion and Science

### Wirtschaftswissenschaftliche Fakultät (WWF)

Bachelor: BA Wirtschaftswissenschaften, BSc Informatik, BSc Wirtschaftsinformatik

Master: MA Business Administration, MA Economics, MA Banking and Finance, MA Management and Economics, MSc Informatik, MSc Wirtschaftsinformatik, MSc Quantitative Finance

---

## Mock-Profile (Inspiration)

| Profil | Situation | Dauer | Typische Massnahmen |
|--------|-----------|-------|---------------------|
| ADHS | Konzentration, Unruhe | `full_study` oder `one_semester` | m1, m6 (LV); m4, m6 (LN) |
| Migräne | Photosensibilität, Anfälle | `one_semester` | m3, m4 (LV); m5, m6 (LN) |
| Diabetes Typ 1 | Pausen, Essen in Prüfungen | `full_study` | m1, m5 (LV); m1, m4 (LN) |
| Dyslexie | langsames Lesen | `full_study` | keine LV; m2, m4 (LN) |
| Handverletzung | Schreiben eingeschränkt | `one_semester` | m2 (LV); m1, m4 (LN) |
| Autismus-Spektrum | Reizüberflutung, mündliche Exposition | `full_study` | m3, m6 (LV); Freitext oder m7 (LN) |

---

## Schnell-Workflow (empfohlen)

JSON speichern → **ein Befehl** → fertig in Supabase (+ Attest-Datei).

Voraussetzung: `nta-tool-prototype/.env.local` mit `NEXT_PUBLIC_SUPABASE_URL` + Publishable Key (bereits vorhanden). `SUPABASE_SERVICE_ROLE_KEY` ist optional.

```bash
# Vom Repo-Root (nta-tool/):
npm run demo-pool:import -- supabase/seed/demo-pool/cases/democase1.json
# oder mit vollem Pfad — beides funktioniert:
npm run demo-pool:import -- nta-tool-prototype/supabase/seed/demo-pool/cases/democase1.json

# Aus nta-tool-prototype/ direkt:
npm run demo-pool:import -- supabase/seed/demo-pool/cases/democase1.json

# Alle Cases im Ordner cases/:
npm run demo-pool:import -- --all

# Nur prüfen, ohne DB:
npm run demo-pool:import -- --dry-run supabase/seed/demo-pool/cases/mein-case.json
```

Das Import-Skript: validiert → schreibt Attest nach `public/attest/seed/` → `INSERT` in Supabase für `r1.demo.pool@example.com`.

**In Cursor:** JSON in `cases/` speichern und im Chat schreiben: *«Importiere democase1.json in den Demo-Pool»* — der Agent führt `demo-pool:import` aus.

Pool löschen (nur Demo-Account): `supabase/scripts/demo_pool_cleanup.sql` im Supabase SQL Editor.

---

## Validierung & Registry (optional separat)

```bash
npm run validate:demo-case -- --register supabase/seed/demo-pool/cases/mein-case.json
npm run demo-pool:summary
```

Registry: `supabase/seed/demo-pool/case-registry.json`

---

## SQL-Migration (Alternative)

Nur noch für eingefrorene Batch-Stände — der Import-Befehl unterstützt jetzt auch `needs_adjustment`, `approved` und `rejected`.
