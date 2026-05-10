# Kontext: Antrag Review (zwischen R1 und R2) — NTA Prototyp

> **Zweck:** Einheitliche Referenz für neue Chats zum **Review nach finaler Einreichung**, **Workspace-UI**, **Layout** und **Code-Ankern**.  
> **Ergänzen:** Daten-Migrationen/RLS, wenn Block-Review persistiert wird.  
> **Verwandt:** `Antragerstellung_Kontext.md` · `General_Prototype_Kontext.md` · `Prototyp_Funktionen.md` (F6)

---

## 1. Ausgangslage (fachlich)

- Nach **finalem Submit** durch R1 ist der Antrag fachlich **„In Review“** (Submit-Marker und Ableitung in `lib/application-status.ts`; Details `Antragerstellung_Kontext.md`).
- **Review nach Einreichung** wird aktuell **nur von R2** durchgeführt (kein paralleler R3-Review in dieser Phase).
- **Workspace-Einstieg:** **`/workspace`** (Route **`/workspace/test`** entfernt; alles unter `/workspace`).

---

## 2. Rollen, Status, Korrektur-Loop (Zielbild)

### R2

- Antrag mit kanonischem Status **„In Review“** öffnen → **Review-Ansicht** (kein separater „Review starten“-Schritt; Persistenz eines Starters optional).
- Pro **Block:** **Bestätigen** oder **Anpassung anfordern** mit **Pflichtbemerkung** (Logik/Persistenz folgt).
- Solange **„In Review“** und R2 am Prüfen: Block-Aktionen vorgesehen.
- Sobald **Anpassungen angefordert** und Korrekturphase aktiv: **R2 read-only** bis zur nächsten Runde nach R1-Freigabe.

### R1

- **„In Review“** ohne offene Anpassungen: Antrag **read-only**.
- Nach **Anpassungsanforderung:** R1 **„Anpassung erforderlich“**, R2-Label z. B. **„Anpassung angefordert“** (kanonischer State z. B. `needs_adjustment`; Labels über `getStatusLabelForAudience` / Erweiterung).
- Sicht auf **bestätigte vs. angepasste** Blöcke inkl. Bemerkungen; **nur betroffene Blöcke** editierbar; erneute **Freigabe zur Review** → wieder **„In Review“**.

### Loop & Entscheid

- Wiederholung bis **alle relevanten Blöcke von R2 bestätigt** → **Weiterleitung Entscheid** (Produktsprache teils „R4“; im Repo/Konzept oft **R3** — beim Implementieren **Rollen/Status** abstimmen).

---

## 3. Status & Badges

- **Zentral:** `lib/application-status.ts` — **`deriveCanonicalApplicationState`**, **`getApplicationStatusMeta`**, Export **`ApplicationStatusMeta`** (`ReturnType` der Meta-Funktion).
- UI-Badges: `components/domain/application-status-badge.tsx`.
- Keine zweite Statuslogik in Screens duplizieren.

---

## 4. Daten & Backend

- **Kern:** `applications` + JSONB **`data`**, Spalte **`status`**.
- **Trigger** `enforce_r2_application_update_columns`: R2 darf `data` aktuell nur **`consultation`** / **`recommendation`** ändern. **Block-Review** (Bestätigen, Anpassungslisten, Bemerkungen) braucht **Erweiterung** (JSON-Pfade, eigene Tabellen, Policies) — vor Deploy **Policies im Repo lesen**.
- Zielbild langfristig: **F6** / `Prototyp_Funktionen.md` (`application_annotations`, Events, Realtime).

---

## 5. Implementierter UI-Stand (R2 Review „In Review“)

### Auslösung

- **`workspace-test-flow.tsx`:** Wenn ein ausgewählter Antrag **`deriveCanonicalApplicationState === "in_review"`** ist → **`WorkspaceApplicationReview`** statt Karten-Detail mit „Empfehlung freigeben“.
- Andere Zustände (z. B. vor finalem Submit / Beratung): weiterhin **Liste** bzw. **Legacy-Karten-Detail**.

### Hauptkomponenten

| Komponente | Pfad | Rolle |
|------------|------|--------|
| Review-Screen | `components/domain/workspace-application-review.tsx` | Blöcke, linke Scrollspalte, rechte Detailspalte |
| Detail-Sidebar | `components/domain/application-review-detail-sidebar.tsx` | „Antragdetails“ (Notion-ähnlich), „Kommentare“ |
| Labels / Konstanten | `lib/application-review-labels.ts` | Scope-Optionen, Massnahmen-Labels, Hilfsfunktionen |
| Toolbar-Slot | `components/domain/workspace-r2-toolbar-context.tsx` | **`WorkspaceR2ToolbarProvider`** + **`useWorkspaceR2Toolbar`** |
| Workspace-Flow | `components/domain/workspace-test-flow.tsx` | Liste, Routing Review vs. Detail, setzt **„Zurück zur Liste“** in die Topbar |
| Layout | `components/domain/role-dashboard-layout.tsx` | R2-Topbar, Sidebar, Shell |

### Block-Zuschnitt (Inhalt → UI)

Reihenfolge wie umgesetzt:

1. **Antragsteller** — Daten aus **Persönliche Angaben** ohne **Antragsart** (Figma-Titel „Antragsteller“).
2. **Fachärztliches Attest** — Dateizeilen (Placeholder-Links, wenn keine Storage-URL).
3. **Empfehlungsschreiben der Fachstelle** — gleiche **Dateikachel** wie Attest; **keine** Footer-Aktionen Bestätigen/Anpassen; Hinweis Informationscharakter.
4. **Antragsdefinition** — Freitext `situationDescription`.
5. **Gültigkeitsdauer** — Darstellung als Vergleich beider Optionen (gewählt vs. nicht gewählt).
6. **Geltungsbereich** — Checkbox-Liste aus `APPLICATION_SCOPE_OPTIONS`, klar gewählt/nicht gewählt.
7. **Ausgleichsmassnahmen LV / Leistungsnachweise** — Keys wie im Antragsformular; Sonstige-Text wenn gesetzt.

Pro Block (außer Empfehlungsschreiben): Footer mit **„Anpassung anfordern“** (amber/teal Stil, Icon **`SquarePen`**) und **„Bestätigen“** — **Handler noch_leer** (`onClick` Platzhalter). Unterhalb: Button **„Anpassungen anfordern“** (gesamt) **disabled**, Hinweis dass Anbindung folgt.

### Rechte Spalte „Antragdetails“

- **Status-Pill**, Antragsteller-**Name** (Priorität Formular `vorname`/`name`, dann Profil), **Eingereicht**, **Zuletzt aktualisiert**, **Zugewiesen an** (Reviewr aus Login), **Antrags-ID**.
- **Antragsteller-ID:** Tooltip/Hover auf Name; **Kopieren** per Icon.
- **Kommentare:** Platzhaltertext; **nur dieser Bereich** soll langfristig scrollbar sein (siehe Layout).

### Workspace-Chrome (Review)

- Kein **„Workspace“**-Titel und kein **„Eingeloggt als …“** auf der Workspace-Page (`userLabel=""`).
- **„Zurück zur Liste“:** **Ghost-Button** mit **`ArrowLeft`** in der **R2-Topbar** (links), gesetzt über **`setLeadingSlot`** im **`WorkspaceTestFlow`** wenn `in_review`.
- Kein **zweiter Status** unter dem NTA-Titel (`summary` im Review nicht angezeigt — Vermeidung Doppelung zur Sidebar).

### Figma / Visuelles

- Referenz-Frame (Kit): z. B. Node **3542-9146** im Prototyp-shadcn-Kit (Cards, Teal/Amber-Aktionen).
- Detailzeilen an **Notion-Property-Liste** angelehnt (Icons, Labels, Werte).

---

## 6. Layout-Verhalten (Workspace / Review)

Implementiert in **`role-dashboard-layout.tsx`** und Review-Komponenten:

| Bereich | Verhalten |
|---------|-----------|
| Gesamt-Shell | **`h-screen overflow-hidden`** — kein Scroll der ganzen Seite |
| Linke Navigations-Sidebar | **Nicht scrollbar**; **`overflow-hidden`**; eingeklappt **`overflow-visible`** damit Aufklapp-Icon nicht abgeschnitten wird |
| R2-Topbar (Suche, Inbox, Avatar, Leading-Slot) | **`sticky top-0 z-30`**, **`shrink-0`** |
| Hauptinhalt Review | **Nur die mittlere Spalte** (`overflow-y-auto`) mit den Review-Blöcken scrollt |
| Rechte Detail-Leiste | **Volle Höhe**, **fixiert** am rechten Rand; **ohne** früheres **`max-w-[1600px]`** auf der Workspace-Page — bündig rechts |
| Kommentar-Bereich | **Nur** der innere Container unter „Kommentare“ **`overflow-y-auto`**; „Antragdetails“ oben **nicht** scrollend |

### Sidebar ein-/ausklappen (nur Layout)

- Aufklapp-**Chevron** absolut: **`left-[calc(100%+16px)]`**, vertikal zur Logo-Zeile **`top-[calc(2rem+1.125rem)]`** mit **`-translate-y-1/2`**.
- Eingeklappte **`aside`:** **`z-50`**; Button **`z-[60]`** — liegt **über** der R2-Topbar (**`z-30`**), damit das Icon nicht verdeckt wird.
- Klick auf eingeklappte **`aside`** → aufklappen; **Einklappen**-Chevron mit **`stopPropagation`**.

---

## 7. Server / Page

- **`app/workspace/page.tsx`:** **`WorkspaceR2ToolbarProvider`**, **`RoleDashboardLayout role="R2"`**, **`userLabel=""`**, Kinder **`flex min-h-0 flex-1 overflow-hidden`**, **`WorkspaceTestFlow`** mit **`reviewerDisplayName`**.
- Liste und Nicht-Review-Detail: **`px-6 py-6`** Wrapper im **`workspace-test-flow.tsx`**; Review-Vollansicht **ohne** diesen Außen-Padding-Wrapper (volle Fläche).

---

## 8. Offen / Nächste Schritte

- **Persistenz** für Block-Status, Bemerkungen, Review-Runden; **RLS**; optional **`application_events`**.
- **Handler** für Bestätigen / Anpassung anfordern / Gesamt „Anpassungen anfordern“.
- **Entscheid**-Übergang (Status, Rolle R3 vs. Produktbegriff R4).
- **Echte Datei-URLs** Attest/Empfehlung (Storage).
- **Kommentar-Thread** + Realtime.

---

*Letzte Aktualisierung: Review-UI, Workspace-Layout, Sidebar-Z-Index und Code-Anker für neue Chats dokumentiert.*
