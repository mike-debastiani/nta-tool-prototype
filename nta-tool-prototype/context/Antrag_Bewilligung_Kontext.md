# Kontext: Antrag Bewilligung (R4 Entscheidungsinstanz) — NTA Prototyp

> **Zweck:** Referenz für den **R4-Bewilligungsflow** nach R2-Weiterreichung an die Entscheidungsinstanz (`in_implementation` / kanonisch **In Entscheid**, Audience R4: **Entscheid erforderlich**). Layout und Block-Struktur entsprechen der **R2-Review-Ansicht**, Funktionen und Sidebar-Inhalt weichen ab.  
> **Verwandt:** `Antrag_Review_Kontext.md` (R2 Block-Review, Forward), `Dashboard_Core_Layout_Kontext.md` (Workspace-Shell), `Antragerstellung_Kontext.md` (RLS § 10, Login § 2), `General_Prototype_Kontext.md`.

---

## 1. Ausgangslage

- R2 bestätigt alle Review-Blöcke und reicht mit **„Antrag weiterreichen“** an die Entscheidungsinstanz weiter → technischer Status **`in_implementation`**, kanonisch **`in_decision`** („In Entscheid“ für R1/R2).
- **R4** nutzt dieselbe **Workspace-Dashboard-Shell** wie R2 (`WorkspaceDashboardShell` via `RoleDashboardLayout`: einklappbare Sidebar 240/68px, **Topbar** mit Suche/Inbox/Avatar-Initialen aus `lib/user-initials.ts` für alle Rollen **R2–R6**). Mechanik → **`Dashboard_Core_Layout_Kontext.md`**. Unterschied ist **nur die Berechtigung je Status**:
  - Ausserhalb **`in_implementation`** (technisch: Entscheid erforderlich): R4 sieht dieselbe **Block-Review-Ansicht** wie R2 im jeweiligen Nur-Lese-Modus (`WorkspaceApplicationReview`, `workspaceViewerRole="R4"`, `viewMode` je Kanon-Status; kein Empfehlungs-Editor für R4).
  - In **`in_implementation`**: zusätzliche **Bewilligungs-Ansicht** (`WorkspaceR4DecisionView`) mit Schaltern und Block-Bestätigung gemäss Figma (Standard / nach Anpassungen / bestätigter Block).
- **Inbox-Liste:** dieselben Anträge wie R2 laden (`app/workspace/page.tsx` + `lib/workspace-applications-list.ts`; Client-Refresh in `workspace-test-flow.tsx` per **`GET /api/workspace/applications`**). Detailansicht auch für kanonisch **`approved`** / **`rejected`** im Modus `readonly_decision` (Lesesicht).
- **Wording Status:** R1 und R2 sehen weiterhin die zentrale Meta-Bezeichnung **In Entscheid** (bzw. kanonisch `in_decision` in `lib/application-status.ts`). **R4** und **R2R4** (bei `in_decision`) sehen für denselben Zustand **„Entscheid erforderlich“** (`StatusAudience` **R4**).

---

## 2. Rechte & Sichtbarkeit

| Rolle | DB-Status `in_implementation` (kanonisch **In Entscheid** / R4-Label **Entscheid erforderlich**) | Andere Status |
|--------|------------------------------------------------------------------------------------------------|---------------|
| **R4** | **`WorkspaceR4DecisionView`** — Schalter, Block-Bestätigung, Freitext-Vorschläge, Abschluss | **`WorkspaceApplicationReview`** read-only (`readonly_decision`); kein Empfehlungs-Editor |
| **R2R4** | Wie **R4** (Capability `hasR4WorkspaceCapabilities`) | Wie **R2** in Review-Phasen (`hasR2WorkspaceCapabilities`); in `in_decision` zusätzlich Status-Audience **R4** («Entscheid erforderlich») |
| **R2** | Read-only Entscheid-Modus (`readonly_decision`) | Interaktives Block-Review bis Forward |

**Capability-Helfer** (`lib/workspace-role.ts`): `hasR4WorkspaceCapabilities` = **R4** \| **R2R4**; `canEditR4DecisionApplication` (`lib/workspace-application-visibility.ts`) = nur wenn `application.status === in_implementation`.

**Routing** (`workspace-test-flow.tsx`): `showR4DecisionView` = `hasR4WorkspaceCapabilities(role)` **und** kanonisch `in_decision` — nicht nur reine DB-Spalte prüfen.

Login: **`/staff/login`** — R2–R6 inkl. **R4** / **R2R4**; Redirect **`/workspace`**. Test-Accounts und Matrix → **`Dashboard_Core_Layout_Kontext.md` § 4b**.

---

## 3. UI — Layout

- **Gleiche Komposition wie R2-Review:** scrollbare Blockspalte links, **fixe Sidebar** rechts (`w-[330px]`), `WorkspaceDashboardShell` / `WorkspaceR2ToolbarProvider` — **„Zurück zur Liste“** im Workspace-Top-Bar-`leadingSlot`.
- **Kopfzeile:** geteilt mit R2/R1 — **`ApplicationReviewPageHeader`** + **`ApplicationStatusCallout`** (R4-Hinweis in `in_implementation`).
- **Scroll/Inset:** `applicationReviewScrollAreaClass` + `applicationReviewSectionGapClass` (`lib/design-tokens/application-scroll.ts`) — **kein** `max-w-4xl`, volle Panelbreite wie `WorkspaceApplicationReview`.
- **Sidebar «Antragdetails»:** oben Metadaten (`ApplicationDetailsCard`); **kein Bemerkungs-Panel** (`showCommentsSection={false}` in `WorkspaceR4DecisionView`).
- **Statt Kommentar-Chronik:** **`secondarySection="r4_contacts"`** — Kontakt-Cards (`R4ContactsSection` in `application-review-detail-sidebar.tsx`):
  - **Antragstellende Person** (Name, E-Mail).
  - **Kontaktperson Fachstelle** (`consultation.advisor` / `recommendation.releasedBy` / Platzhalter).
- **R4 Lesesicht** (andere Status): `WorkspaceApplicationReview` mit `workspaceViewerRole="R4"` — ebenfalls **ohne** Bemerkungen, nur Kontakte + read-only Callouts (`muted`).

---

## 4. Blöcke — R2-bestätigte Inhalte (ohne Bewilligung durch R4)

Folgende Blöcke sind **nicht** bewillig-/ablehnbar und **ohne** grüne R2-„Bestätigt“-Kodierung:

- Antragstellende Person (Review-Block-Titel; Konstante `REVIEW_WORKSPACE_APPLICANT_BLOCK_TITLE`)  
- Fachärztliches Attest  
- Empfehlungsschreiben der Fachstelle (`RecommendationReleasedAccordion` wie R2)  
- Antragsdefinition  

Darstellung: **`R4FacultyConfirmedBlock`** (`components/domain/r4-decision-review-blocks.tsx`) — neutraler Rahmen (`R4_FACULTY_CONFIRMED_BLOCK_CLASS` = Review-`default`). Footer **`bg-stone-100`**, rechts **«Von Fachstelle bestätigt»** + `CheckCheck` (Figma `5641:23410`).

---

## 5. Blöcke — R4-Entscheid (Schalter-Logik)

Betroffen: **Gültigkeitsdauer**, **Geltungsbereich**, **Massnahmen LV**, **Massnahmen Leistungsnachweise** (gleiche Sichtbarkeitsregeln wie im R2-Review: leere/abschaltbare Blöcke ausblenden).

### Figma-Referenzen (High-Fi — [BA-Prototyp-High-Fi](https://www.figma.com/design/pwLFwfIPnr9ZuYcot9pyyU))

| Node | Inhalt |
|------|--------|
| `5641:23410` | Fachstelle-bestätigte Blöcke (Antragsteller, Attest, Definition, …) |
| `5657:17967` | Entscheid-Block **Ausgang:** Studierenden-Wahl = Schalter **an** → **Bewilligt** (`bewilligt-50` / `bewilligt-500`) |
| `5907:23351` | **Bearbeitung:** Abgelehnt / Vorschlag / **Zurücksetzen** + **Auswahl bestätigen** |
| `5657:18077` | Nach **Auswahl bestätigen:** `border-bewilligt-600`, Footer `bewilligt-200`, **Bearbeiten** + **Auswahl bestätigt** |

**Tokens:** `lib/design-tokens/r4-decision-block.ts` (Zeilen, Footer, Switch-Gruppe **125px** — Schalter linksbündig).

### Regeln pro Zeile (Massnahmen / Geltungsbereich)

- **Studierende Person hat gewählt** und Schalter **an** → Anzeige **bewilligt** (Figma: positive Kodierung).
- **Studierende Person hat gewählt**, R4 setzt Schalter **aus** → **abgelehnt** (negative Kodierung laut Figma).
- **Studierende Person hat nicht gewählt**, Ausgang Schalter **aus**, Text **Vorschlagen** → R4 setzt Schalter **an** → **Vorschlag** (Figma: gelbe Zeile / gelber Switch, nicht Violett).

**Gültigkeitsdauer:** zwei optionale Zeilen (gesamte Studiendauer / ein Semester); logisch **exklusiv** — höchstens eine Zeile kann auf **bewilligt** stehen; Umsetzung im Prototyp als gekoppelte Schalter-Gruppe analog zur Intention „eine Dauer gewählt“.

### Freitext-Vorschläge (Massnahmen-Blöcke)

Nur **`lectureMeasures`** und **`assessmentMeasures`** (`supportsR4CustomProposalInput` in `lib/r4-decision-state.ts`) — **nicht** Gültigkeitsdauer / Geltungsbereich.

| Aspekt | Ist |
|--------|-----|
| **UI** | `R4DecisionProposalInput` unter der Optionenliste (Figma `5907:23378`): Plus-Icon, Platzhalter «Formulieren Sie einen anderen Vorschlag …» |
| **Eingabe** | `AutoGrowTextarea` — mehrzeilig, Höhe wächst mit Inhalt; Checkbox/Plus an **erster Textzeile** ausgerichtet (`h-5` / `leading-5`) |
| **Anlegen** | Text eingeben → **Blur** oder **Strg/Cmd+Enter** → neue Zeile als **Vorschlag** (`studentSelected: false`, `r4Approved: true`, gelbe Kodierung) |
| **Entfernen** | Schalter auf der Vorschlagszeile **aus** → Zeile wird gelöscht (nicht nur abgewählt) |
| **Persistenz-Zwischenstand** | `data.r4DecisionReview.blocks[id].rows` mit Schlüssel-Präfix **`proposal:<timestamp>`**; Merge in `mergeR4DecisionReview` erhält solche Zeilen neben Baseline-Optionen |
| **Zurücksetzen** | «Zurücksetzen» im Block entfernt Vorschläge (nur Studierenden-Baseline) |

### Aktionen im Block

- Nach erster Änderung der Auswahl: Button **„Zurücksetzen“** links unten (stellt die **Arbeitskopie** dieser Zeilen auf den Ausgangszustand aus den Antragsdaten zurück).
- **„Auswahl bestätigen“** rechts (primary pill, `CircleCheckBig`): persistiert den Block; bestätigter Block zeigt Zeilen weiter mit Schaltern (read-only), Footer wie Figma `5657:18077`. **„Bearbeiten“** hebt `confirmed` auf und öffnet die bearbeitbare Ansicht erneut.
- **Switch-Gruppe:** feste Breite **125px**, Schalter **linksbündig** in jeder Zeile (`R4_DECISION_SWITCH_GROUP_CLASS`).
- **„Entscheid abschliessen“** unten rechts: solange **deaktiviert**, bis **alle sichtbaren** R4-Entscheid-Blöcke bestätigt sind; dann aktiv. Setzt **`status = approved`**, merged `r4DecisionReview`, ruft **`materializeApprovedR4DecisionReview`** auf und broadcastet. *(Ablehnung gesamten Antrags: später.)*

---

## 6. Datenhaltung (Prototyp)

### 6.1 `r4DecisionReview` (Arbeits- und Audit-Snapshot)

- Persistenz unter **`data.r4DecisionReview`** (`lib/test-flow-types.ts`), getrennt von **`data.recommendation`** / **`data.consultation`** (R2-Trigger).
- Pro Block (`duration` \| `scope` \| `lectureMeasures` \| `assessmentMeasures`): **Zeilen** (`key`, `title`, `description?`, `studentSelected`, `r4Approved`) + **`confirmed`** nach «Auswahl bestätigen».
- Zwischenstand: debounced Autosave (`WorkspaceR4DecisionView` → `persistR4DecisionWithSupabaseClient`).

### 6.2 Materialisierung bei Bewilligung (`applicationDefinition`)

Nach erfolgreichem Abschluss schreibt **`materializeApprovedR4DecisionReview`** (`lib/r4-decision-state.ts`) die **bestätigten** R4-Entscheide in **`data.applicationDefinition`**, damit bewilligte Anträge in **R2/R4-Lesesicht**, R1-Portal und KPI/Gültigkeit dieselben Massnahmen zeigen wie der Entscheid:

| Block | Materialisierung |
|-------|------------------|
| **duration** | `applicationDefinition.duration` = bewilligte Zeile (`full_study` \| `one_semester`) |
| **scope** | `scopeSelections` = alle Zeilen mit `r4Approved` (Label-Keys; Freitext nur falls historisch als `proposal:` gespeichert) |
| **lectureMeasures** | `lectureMeasures[]`, `lectureOtherLines[]`, `lectureMeasuresKeine`; Freitext-Vorschläge → **Other-Lines** |
| **assessmentMeasures** | analog mit `assessmentMeasures` / `assessmentOtherLines` |

`r4DecisionReview` bleibt **zusätzlich** in `data` erhalten (vollständiger Entscheid-Snapshot inkl. abgelehnter Studierenden-Optionen).

**R2R4-Trigger:** Beim UPDATE `in_implementation` → `approved` darf **R2R4** kurzzeitig auch **`applicationDefinition`** ändern — Migration **`20260526200000_r2r4_trigger_allow_definition_on_approve.sql`** (sonst Exception «R2R4 may not change data except …»). Während laufender Bewilligung (nur `r4DecisionReview`) bleibt die Definition unverändert.

### 6.3 APIs & Persistenz-Pfade

- **APIs (Server, optional / Fallback):**
  - **`POST /api/applications/r4-persist-decision`** — merge `r4DecisionReview` (**R4** oder **R2R4** via `hasR4WorkspaceCapabilities`, nur Status `in_implementation`).
  - **`POST /api/applications/r4-complete-decision`** — prüft alle sichtbaren Entscheid-Blöcke `confirmed`, setzt **`approved`**, ruft Materialisierung auf, Broadcast.
- **Ist-Pfad im UI:** Speichern und Abschliessen primär per Browser-Session (`lib/r4-workspace-supabase-persist.ts`: `persistR4DecisionWithSupabaseClient`, `completeR4DecisionWithSupabaseClient`).

### 6.4 RLS / Supabase (Ist)

- **Additive Policies** (Migration `supabase/migrations/20260513190000_r4_workspace_select_policies.sql`):
  - **`applications_select_r4_workspace`** — R4 darf `applications` in den üblichen Workspace-Status lesen (inkl. `in_decision`, `in_implementation`, `approved`, `rejected`, …).
  - **`users_select_r4_workspace_applicants`** — R4 darf Zeilen in `public.users` lesen für **eigene Profilzeile** (`users.id = auth.uid()`) und für **Antragsteller**, die einen passenden Antrag haben (Embed `users!applications_applicant_id_fkey` in der Listen-Query).
- **UPDATE für R4** (Migration `supabase/migrations/20260514120000_applications_update_r4_decision.sql`): Policy **`applications_update_r4_decision`** — R4 darf `applications` aktualisieren, wenn `status = in_implementation` (`USING`); `WITH CHECK` erlaubt Ziel `in_implementation` **oder** `approved` (Abschluss). Ohne diese Policy schlagen Client-Updates mit dem normalen Supabase-Key fehl, wenn kein Service-Role verwendet wird.
- **Pflicht für alle neuen Policies auf `users`/`applications`:** Rolle des eingeloggten Users **nur** über **`current_user_role()`** ausdrücken (bereits im Projekt als `SECURITY DEFINER` — gleiches Muster wie `applications_select_r2_worklist`). **Nicht** `EXISTS (SELECT 1 FROM public.users …)` innerhalb von RLS auf `users` verwenden → sonst Postgres **„infinite recursion detected in policy for relation users“** (betrifft dann auch R1/R2-Login beim Profil-Select).
- **APIs** `r4-persist-decision` / `r4-complete-decision` können weiterhin optional den **Service-Role-Client** nutzen, wenn Schreib-RLS für R4/R2R4 in einer Umgebung noch fehlt — nach Session-Auth und Rollenprüfung **`hasR4WorkspaceCapabilities`** (R4, R2R4). Produktiv sind dedizierte UPDATE-Policies vorzuziehen.
- **Supabase Free Egress:** Überschreitung drosselt Traffic, **nicht** die genannte Policy-Rekursion (das ist rein Postgres-RLS).

---

## 7. Client-State — Schalter & Server-Reconcile (wichtig)

Ziel: kein „Kreuzschalten“ (ein Klick ändert scheinbar eine andere Zeile) und kein Zurückspringen nach Autosave/Refetch.

- **Toggle:** `R4Switch` ruft `onToggle()` ohne Wert; der neue Zustand entsteht in **`setReview(prev => …)`** durch Invertieren von **`prev.blocks[id].rows`** (`!row.r4Approved`), nicht durch `!checked` aus den React-Props — vermeidet veraltete Prop-Lesungen bei schnellen Klicks.
- **`editingRef`:** spiegelt `editing[id]`, damit die Guard „Block bestätigt, aber nicht im Bearbeitungsmodus“ innerhalb funktionaler Updates aktuell bleibt.
- **Debounced Autosave:** `scheduleR4Autosave` schreibt über **`reviewRef.current`** nach der Debounce-Zeit; Ref wird jedes Render aktualisiert.
- **Einspielen neuer Server-Daten:** `useEffect` auf **`application.id`** + **`data.r4DecisionReview?.updatedAt`** ruft  
  **`mergeR4DecisionReviewRespectingLocalDirty(application.data, prev)`** auf.  
  - **`localR4BlockDiffersFromServerMerge`:** pro Block wird geprüft, ob **`confirmed`** oder irgendein **`r4Approved`** vom Ergebnis von **`mergeR4DecisionReview(serverData)`** abweicht — **nicht** mehr nur „dirty gegenüber Studierenden-Baseline“. Damit bleibt der Schutz aktiv, wenn R4 z. B. eine Studierenden-Zeile wieder auf Bewilligt dreht (Baseline = wieder „clean“), die DB aber noch einen älteren Stand hat.
  - **`application.data` nicht als Effect-Dependency:** sonst würde jede neue Objekt-Referenz vom Parent unnötig remergen und **`setEditing({})`** auslösen.
  - Beim Merge wird **kein** pending Autosave-Timer am Anfang des Effects gekillt (sonst verlorene Saves bei schnellem Toggle).

---

## 8. Code-Anker

| Bereich | Pfad |
|---------|------|
| R4 Vollansicht | `components/domain/workspace-r4-decision-view.tsx` |
| R4 UI-Bausteine | `components/domain/r4-decision-review-blocks.tsx` (`R4Switch`, `R4DecisionOptionRow`, `R4FacultyConfirmedBlock`, Footer) |
| R4 Design-Tokens | `lib/design-tokens/r4-decision-block.ts` |
| Review-Header / Callout | `application-review-page-header.tsx`, `application-status-callout.tsx` |
| Sidebar Kontakte | `application-review-detail-sidebar.tsx` (`secondarySection="r4_contacts"`) |
| Workspace-Einbindung | `components/domain/workspace-test-flow.tsx`, `app/workspace/page.tsx`, `lib/workspace-applications-list.ts`, `app/api/workspace/applications/route.ts` |
| Login / Profil | `components/domain/login-card.tsx` (`getSession()` nach `signInWithPassword`, dann `users.role`) |
| Layout / Avatar | `components/domain/role-dashboard-layout.tsx` (`workspaceAccountInitials`) |
| Status / Labels R4 | `lib/application-status.ts` |
| Typen | `lib/test-flow-types.ts` |
| Merge / Zeilenbau / Sichtbarkeit | `lib/r4-decision-state.ts` (`mergeR4DecisionReview`, `createR4ProposalRow`, `supportsR4CustomProposalInput`, `materializeApprovedR4DecisionReview`, `mergeR4DecisionReviewRespectingLocalDirty`, …) |
| Sichtbarkeit / Edit-Gate | `lib/workspace-application-visibility.ts` (`filterWorkspaceApplicationsForRole`, `canEditR4DecisionApplication`) |
| Browser-Persistenz R4 | `lib/r4-workspace-supabase-persist.ts` |
| Auto-Grow-Freitext | `components/ui/auto-grow-textarea.tsx` (R4-Vorschlag + R1-Sonstige-Massnahmen) |
| Freitext Massnahmen R1 | `components/domain/custom-measure-lines-field.tsx` |
| APIs (optional) | `app/api/applications/r4-persist-decision/route.ts`, `r4-complete-decision/route.ts` |

---

## 9. Abgrenzung / später

- Kein separates Feld-Annotation-Modell (weiterhin F6-Ist: Block-Ebene).
- **Ablehnung gesamten Antrags** oder Aufteilung bewilligt/teilweise abgelehnt auf Antragsebene: aktuell nicht — nur **Entscheid abschliessen → bewilligt** als Prototyp-Endpunkt.
- R3/R5/R6: unverändert; Fachrolle **R4** ist in diesem Flow die genannte Entscheidungsinstanz (Produktsprache; im Gesamtkonzept teils als R3 beschrieben — im Code-Rollenenum **R4**).

---

*Letzte Aktualisierung: Freitext-Vorschläge (nur Massnahmen-Blöcke); Materialisierung bei `approved`; R2R4-Trigger für `applicationDefinition`; `AutoGrowTextarea`; Test-Matrix → `Dashboard_Core_Layout_Kontext.md` § 4b.*
