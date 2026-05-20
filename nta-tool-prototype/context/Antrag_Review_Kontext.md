# Kontext: Antrag Review (nach finaler Einreichung, R2) — NTA Prototyp

> **Zweck:** Zentrale Referenz für Chats zur **Review-Ansicht nach finalem R1-Submit**, **UI**, **Client-State**, **Sidebar-Kommentare**, **Code-Ankern** sowie dem **Empfehlungsschreiben-Drafting / -Release** (Rich-Text) zwischen R2 und R1.  
> **Backend:** R2-Review-Persistenz, Forward-Aktion (`in_implementation` / `needs_correction`), R1-Freigabe zurück in den Review-Loop (`in_review`), Empfehlungs-Inhalte unter `data.recommendation.*` — RLS-/Trigger-konform; **R4**-Lesepolicies ergänzend zu R2 (`Antrag_Bewilligung_Kontext.md`). Siehe [Daten & Backend](#4-daten--backend).  
> **Verwandt:** `Antragerstellung_Kontext.md` · `Dashboard_Core_Layout_Kontext.md` (Shell, Top-Bar, Zurück) · `General_Prototype_Kontext.md` · `Antrag_Bewilligung_Kontext.md` (R4) · `Prototyp_Funktionen.md` (F6/F7 vs. Ist-Block-Review)

---

## 1. Ausgangslage (fachlich)

- Nach **finalem Submit** durch R1 ist der Antrag fachlich **„In Review“** (Submit-Marker und Ableitung in `lib/application-status.ts`; Details `Antragerstellung_Kontext.md`).
- **Review nach Einreichung** wird in dieser Phase primär von **R2** im Workspace bearbeitet; **R4** kann dieselben Anträge je Status lesen bzw. in `in_implementation` bewilligen (`Antrag_Bewilligung_Kontext.md`).
- **Workspace-Einstieg:** **`/workspace`** (Route **`/workspace/test`** entfernt; alles unter `/workspace`).

---

## 2. Rollen, Status, Korrektur-Loop (Zielbild)

### R2

- Antrag mit kanonischem Status **„In Review“** öffnen → **Review-Ansicht** (`WorkspaceApplicationReview`).
- Pro **Block:** **Bestätigen** oder **Anpassung anfordern** (mit **Pflichtbemerkung** über die Sidebar; siehe unten).
- **Umgesetzt:** Block-Footer, Sidebar-Kommentar-Composer, Chronik, Zurücksetzen mit Bestätigung bei Anpassung; **Persistenz** des Entwurfs in `data.recommendation.workspaceReview.draft` (debounced) und **Weiterreichen** über `/api/applications/review-forward` mit Statuswechsel auf `in_implementation` (alles bestätigt) bzw. `needs_correction` (mind. eine Anpassung).
- **Read-only nach Forward:** Sobald `applications.status` ∈ {`in_implementation`, `approved`, `rejected`} ist, rendert `WorkspaceApplicationReview` im Modus **`readonly_decision`**: kein **Weiterreich**-CTA, kein Composer, Chronik aus `recommendation.workspaceReview.forwardedComments`. (Weitere read-only Modi: `readonly_adjustment_pending`, `readonly_consultation` — siehe View-Modes.) Voraussetzung für Lesen nach Entscheid ist die SELECT-Policy `applications_select_r2_worklist` (siehe § 4).
- **Rückkehr in den Review-Loop:** R1 kann nach erledigten Anpassungen den Antrag mit **`POST /api/applications/r1-release-adjustments`** (nur Antragsteller, Status `needs_correction` / `needs_adjustment`) wieder auf **`in_review`** setzen; `workspaceReview.postSubmit` wird aus den gespeicherten R1-Anpassungen neu aufgebaut (`lib/r1-adjustment-release.ts`: u. a. `adjustment` → `pending_after_adjustment` mit `lockedRemark`, `draft` entfernt, `r1AdjustmentResolutions` geleert). Anschließend **Broadcast** (`lib/application-realtime-sync.ts`) + Refetch im Portal.
- **Hydration / mehrere Review-Zyklen:** Solange `status` wiederholt `in_review` ist, reicht ein React-Key aus `id + status` nicht — es wird **`workspaceReviewPostSubmitHydrationKey`** (`lib/workspace-review-hydration-key.ts`) in `workspace-test-flow.tsx` an den Key von `WorkspaceApplicationReview` gehängt; zusätzlich synchronisiert die Review-Komponente lokalen State per `useEffect`, wenn sich dieser Fingerabdruck ändert (fehlertolerante Hydration unbekannter Snapshot-Phasen in `hydrateBlockPhasesFromApplication`).
- **Noch offen (Produkt/Backend):** globaler Entscheidungs-Übergang R3 (`approved` / `rejected`) und weitergehende Automatisierung jenseits des aktuellen Block-Reviews.

### R1

- **„In Review“** ohne offene Anpassungen: Antrag **read-only** in Block-Detailansicht.
- Nach **Anpassungsanforderung:** R1 **„Anpassung erforderlich“**, R2-Label **„Anpassung ausstehend“** (`needs_adjustment`; Labels `getStatusLabelForAudience`).
- **Umgesetzt:** Klick auf einen Antrag im R1-Dashboard öffnet **immer** die Block-Detailansicht **`PortalApplicationAdjustment`** (`components/domain/portal-application-adjustment.tsx`) unter `/portal/antragserstellung?applicationId=<uuid>` — identisches Layout wie die R2-Review (Block-Liste links, Antrag-Sidebar rechts). Bearbeitung ist **nur** aktiv, wenn `deriveCanonicalApplicationState === "needs_adjustment"` (im Code u. a. `canEditBlocks`); in allen anderen Status ist die Ansicht read-only. Per Sidebar-Kommentar / „Anpassung vornehmen“ springt R1 zur passenden Stelle (`reviewWorkspaceAnchorId`); bestätigte Blöcke grün, angeforderte Anpassungen amber mit R2-Bemerkung.
- **Autosave:** Pro betroffenem Block schreibt R1 debounced in `data.applicationDefinition` / `data.personalData` / `data.attestFiles`; abgeschlossene Anpassungen sind in `data.r1AdjustmentResolutions` (Typ `R1AdjustmentResolution` mit `resolvedAt`) markiert, damit die UI „Anpassung erfolgt“ anzeigt, ohne die Original-Bemerkung von R2 zu verlieren.
- **Zurück zum Dashboard** über die **Portal-Dashboard-Top-Bar** (`usePortalDashboardToolbar` / Default-Link → `/portal/home`); **Löschen-Aktion** in der Adjustment-UI. Kein schwebender `absolute`-Zurück-Button mehr im Content.
- **Umgesetzt:** Wenn alle von R2 angeforderten Anpassungs-Blöcke mindestens einmal gespeichert sind (`r1AllRequestedAdjustmentsSaved` in `lib/r1-adjustment-release.ts`), kann R1 **„Anpassungen für Review freigeben“** auslösen → API oben → `in_review`. UI: schwarzer Button, rechts in einer Zeile mit **„Antrag zurückziehen“** (keine umgebenden Erklärungstexte mehr in diesem Bereich).

### Loop & Entscheid

- Wiederholung bis **alle relevanten Blöcke von R2 bestätigt** → **Weiterleitung Entscheid** (Produktsprache: Entscheidungsinstanz im Code als **R4**; siehe `Antrag_Bewilligung_Kontext.md`).

---

## 3. Status & Badges

- **Zentral:** `lib/application-status.ts` — `deriveCanonicalApplicationState`, `getApplicationStatusMeta`, Export **`ApplicationStatusMeta`**.
- UI-Badges: `components/domain/application-status-badge.tsx`.
- **Keine** zweite Statuslogik in Screens duplizieren.

---

## 4. Daten & Backend

- **Kern:** `applications` + JSONB **`data`**, Spalte **`status`**.
- **Trigger** `enforce_r2_application_update_columns`: R2 darf `applications.data` ausschließlich unter **`consultation`** / **`recommendation`** schreiben — alles andere wirft `R2 may not change data except recommendation/consultation`.
- **`data.recommendation` — vollständiges Schema (`lib/test-flow-types.ts`):**
  - `ready: boolean` — Step-Gating R1 (Empfehlungs-Step erreichbar).
  - `draftHtml` / `draftText` — TipTap-Entwurf des Empfehlungsschreibens (R2, Beratungsphase). Wird über „Entwurf speichern“ im `RecommendationDraftEditor` geschrieben.
  - `releasedHtml` / `releasedText` / `releasedAt` / `releasedBy` — finaler, freigegebener Inhalt nach Klick auf „Empfehlungsschreiben freigeben“ (R2). Treibt die Anzeige des `RecommendationReleasedAccordion` in R1 (Step 3 / Step 5) und in der R2-Review.
  - `url` — Legacy-Pfad für Datei-Empfehlung; **wird nicht mehr gerendert** (`fileNameFromUrl`-Helper entfernt), existierende Werte bleiben aus Datenkompatibilität erhalten und werden beim R1-Submit per Spread mitgeschleppt.
  - `workspaceReview` — siehe nächster Unterpunkt.
- **Persistenz Block-Review (Prototyp, jetzt):** Phasen, Bemerkungen und Chronik liegen unter **`data.recommendation.workspaceReview`** (innerhalb des erlaubten Trigger-Pfads). Schemas in `lib/test-flow-types.ts`:
  - `data.recommendation.workspaceReview.draft`: laufender R2-Entwurf (`R2ReviewDraft` — `updatedAt`, `blocks`, `reviewComments`); wird debounced gespeichert (`persistReviewDraft` in `workspace-application-review.tsx`, ~500 ms).
  - `data.recommendation.workspaceReview.postSubmit`: Snapshot beim **Weiterreichen** (`R2PostSubmitReview` — `forwardedAt`, `blocks`). Block-`phase` inkl. **`pending_after_adjustment`** (`lockedRemark`) nach R1-Freigabe einer Korrekturrunde — R2 sieht die Fachstellen-Bemerkung gesperrt, bis er erneut „Anpassung anfordert“ (dann neuer Kommentar / neues `adjustment`).
  - `data.recommendation.workspaceReview.forwardedComments`: persistierte Kommentar-Chronik beim Weiterreichen.
- **Legacy-Wurzelfelder** (`reviewComments`, `r2PostSubmitReview`, `r2ReviewDraft` direkt in `data`) werden vor jedem Save mit **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`) entfernt — sonst feuert der Trigger.
- **Forward-Aktion** geht über **`app/api/applications/review-forward/route.ts`** (Session-Client, RLS-konform — kein `SUPABASE_SERVICE_ROLE_KEY` nötig). Payload: `applicationId`, `nextStatus` (`in_implementation` \| `needs_correction`), `workspaceReview` inkl. `postSubmit` + `forwardedComments`. Setzt `applications.status` entsprechend und schreibt `recommendation.workspaceReview` final.  
  **Trigger-Pitfall:** Root-Felder in `data` außerhalb `consultation` / `recommendation` dürfen von R2 **nicht** verändert werden. Insbesondere darf **`r1AdjustmentResolutions`** beim Forward **nicht** aus dem Merge entfernt werden (sonst `R2 may not change data except recommendation/consultation`); Zurücksetzen erfolgt bei R1 über **`r1-release-adjustments`**.
- **R4-Bewilligung (separater JSON-Pfad):** Entscheidungs-Schalter und Block-Bestätigungen liegen unter **`data.r4DecisionReview`** (nicht unter `recommendation`, damit kein Konflikt mit dem R2-Trigger). Typen und Merge-Helfer: `lib/test-flow-types.ts`, `lib/r4-decision-state.ts`; UI-Flow `Antrag_Bewilligung_Kontext.md`.
- **R1-Freigabe-API:** **`app/api/applications/r1-release-adjustments/route.ts`** — setzt Status `in_review`, merged `buildWorkspaceReviewAfterR1AdjustmentRelease`, leert `r1AdjustmentResolutions`, broadcastet Zeilen-Update.
- **RLS-Anker:** `applications_select_r2_worklist` umfasst seit Migration `extend_workspace_select_to_decision_states` auch **`in_implementation` / `approved` / `rejected`**, damit R2 den weitergereichten Antrag nach dem Statuswechsel im Workspace im Modus `readonly_decision` weiter sehen kann (Details siehe `Antragerstellung_Kontext.md` § 10). Parallel: **`applications_select_r4_workspace`** + **`users_select_r4_workspace_applicants`** für **R4** (immer mit **`current_user_role()`**, siehe `Antrag_Bewilligung_Kontext.md` § 6 / `Antragerstellung_Kontext.md` § 10).

---

## 5. Implementierter UI- und Client-Stand

### Auslösung Review-Ansicht

- **`workspace-test-flow.tsx`:** Ausgewählter Antrag mit `deriveCanonicalApplicationState ∈ { consultation_recommendation, in_review, in_decision, needs_adjustment, approved, rejected }` → **`WorkspaceApplicationReview`** (unterschiedliche View Modes; **R4:** `workspaceViewerRole="R4"`, eingeschränkte Interaktion). In **`in_implementation`** zusätzlich für **R4** → **`WorkspaceR4DecisionView`**. Toolbar **„Zurück zur Liste“** für alle genannten Detail-States inkl. `approved`/`rejected`. Reine Listen-States ohne Detail (`draft`, …) bleiben auf der Karte.
- Die alte „Empfehlung freigeben“-Karte ist abgelöst durch den `WorkspaceApplicationReview` mit `viewMode="readonly_consultation"` + `RecommendationDraftEditor` als `bottomAction`.

### View Modes (`WorkspaceReviewViewMode`)

Definiert in `components/domain/workspace-application-review.tsx`; abgeleitet im `workspace-test-flow.tsx` aus dem kanonischen Status:

| Mode | Kanon-Status | Verhalten |
|------|--------------|-----------|
| `interactive` | `in_review` | Volle Review: Footer-Aktionen (Bestätigen / Anpassung anfordern / Zurücksetzen), Sidebar-Composer, Forward-Button. Draft-Autosave aktiv. |
| `readonly_consultation` | `consultation_recommendation` | Kompaktes Lesefeld: **nur Blöcke mit Inhalt** werden angezeigt (`compactReadOnlyBlocks`). Keine Footer-Aktionen, leere Kommentarliste mit eigenem Empty-Label. Darunter `RecommendationDraftEditor` als `bottomAction`, solange `releasedHtml` leer ist. |
| `readonly_adjustment_pending` | `needs_adjustment` | Read-only auf R2-Seite, während R1 die angeforderten Anpassungen vornimmt. Statuszeile statt Buttons. |
| `readonly_decision` | `in_decision` (Quell-Status u. a. **`in_implementation`**, **`in_decision`**) sowie kanonisch **`approved`** / **`rejected`** | Snapshot / Abschluss: keine Editier-Aktionen; für **`approved`**/**`rejected`** weiterhin Vollansicht mit Toolbar-Zurück. |

### Empfehlungsschreiben — Drafting & Release (R2)

- **Editor:** `components/domain/rich-text-editor.tsx` — TipTap (StarterKit, Underline, Link, TextAlign, Placeholder, eigene Heading-Extension mit `mergeAttributes`-Tailwind-Klassen, damit die Preflight-Resets nicht greifen). Toolbar reaktiv über `useEditorState` (TipTap v3 rerendert ohne diesen Hook nicht pro Transaction). Geteilte Read-Render-Klasse `.tiptap-content` in `app/globals.css` für gleiche Absatz-/Listen-Abstände auf statischem HTML.
- **Container:** `RecommendationDraftEditor` in `components/domain/workspace-test-flow.tsx`. Wird **nur** gerendert, solange `selectedCanonicalState === "consultation_recommendation"` **und** `data.recommendation.releasedHtml` leer ist.
  - „Entwurf speichern“ (links) → `saveRecommendationDraft` schreibt `data.recommendation.draftHtml` / `draftText` (RLS-erlaubter Pfad). Statustext sitzt rechts neben dem Button.
  - „Empfehlungsschreiben freigeben“ (rechts) → `releaseRecommendation` schreibt `releasedHtml` / `releasedText` / `releasedAt` / `releasedBy` (Anzeige-Name aus `reviewerDisplayName`) und setzt `ready: true`.
- **Sichtbar nach Release:** Der Editor verschwindet (kein `bottomAction` mehr). Statt dessen taucht der freigegebene Inhalt als regulärer Block (`RecommendationReleasedAccordion`, HF wie R1) in der Blockliste auf — identische Darstellung in R1 (`step3_recommendation` / `step5_overview`), R2-Review und R4 (Details: `Antragerstellung_Kontext.md` § 4).
- **Accordion-Layout:** Trigger-Zeile zeigt links den Titel „Empfehlungsschreiben der Fachstelle“, rechts inline **„Erstellt durch:“ + Avatar (Initialen aus `releasedBy`)** und die **„Freigegeben · DD.MM.YYYY“-Pill** (Datum-only, ohne Icon). Content ist `dangerouslySetInnerHTML` aus `releasedHtml`, defaultmäßig aufgeklappt. Eigenes Layout — keine Bottom-Author-Sektion / kein Inner-Divider mehr.

### Hauptkomponenten (Code-Anker)

| Komponente | Pfad | Rolle |
|------------|------|--------|
| Review-Hauptansicht | `components/domain/workspace-application-review.tsx` | Blockliste links, View Modes, State, Dialoge, Sidebar-Props, debounced Draft-Persist, Forward-Aufruf |
| Detail-Sidebar | `components/domain/application-review-detail-sidebar.tsx` | Antragdetails, Kommentar-Composer (Vollspalte), Chronik |
| Persistenz-Helfer | `lib/r2-review-persist.ts` | `dataWithoutLegacyReviewRoots`, Pfade unter `recommendation.workspaceReview` |
| Forward-API | `app/api/applications/review-forward/route.ts` | Session-Client-Update auf `in_implementation` / `needs_correction`, schreibt finale Review-Snapshots |
| R1-Release API | `app/api/applications/r1-release-adjustments/route.ts` | Antragsteller: `needs_correction` \| `needs_adjustment` → `in_review`, merged `workspaceReview`, Broadcast |
| Release-Logik | `lib/r1-adjustment-release.ts` | `r1AllRequestedAdjustmentsSaved`, `buildWorkspaceReviewAfterR1AdjustmentRelease` (inkl. Legacy nur `r2PostSubmitReview`) |
| Hydration-Key | `lib/workspace-review-hydration-key.ts` | Stabiler Fingerprint von `postSubmit` für Remount / Re-Hydration bei wiederholtem `in_review` |
| Zeilen-Sync | `lib/application-realtime-sync.ts` | Broadcast-Kanal `application-row:<id>` nach mutierenden API-Aufrufen (R2-Forward, R1-Release, **R4 persist/complete** im Workspace) |
| Review-Block-Definition | `lib/review-workspace-blocks.ts` | Geteilte Block-IDs, Default-Phasen, Anker-Hilfen (`reviewWorkspaceAnchorId`) |
| Labels / Konstanten | `lib/application-review-labels.ts` | Scope, Massnahmen, Hilfsfunktionen |
| Status | `lib/application-status.ts` | Ableitung, Meta für Sidebar-Badge |
| Toolbar | `components/domain/workspace-r2-toolbar-context.tsx` | Topbar-Slot („Zurück zur Liste“) |
| Workspace-Flow | `components/domain/workspace-test-flow.tsx` | Liste, View-Mode-Ableitung, `RecommendationDraftEditor` (Bottom-Slot in `consultation_recommendation`) |
| Rich-Text-Editor | `components/domain/rich-text-editor.tsx` | TipTap-Wrapper mit shadcn-styled Toolbar, `useEditorState`, Custom-Heading-Extension |
| Released-Accordion | `components/domain/recommendation-released-accordion.tsx` | Geteilter Read-Only-Block (HF 5247:5570, R1/R2/R4/Portal) für `releasedHtml`/`releasedAt`/`releasedBy` |
| Accordion-Primitive | `components/ui/accordion.tsx` | shadcn-Wrapper um `radix-ui` Accordion (ohne Hover-Underline) |
| R1-Anpassungsansicht | `components/domain/portal-application-adjustment.tsx` | Block-Detail R1 unter `/portal/antragserstellung?applicationId=…`; identisches Layout, Edit nur bei `needs_adjustment` (`allowAdjustments`) |
| Dashboard-Shell | `components/domain/workspace-dashboard-shell.tsx` | Sidebar 240/68px, Portal Top-Bar + rechtes Antragdetails-Panel (sofort); Workspace-Top-Bar; Figma `5354:9951` / `5354:10586` → `Dashboard_Core_Layout_Kontext.md` |
| Layout-Router | `components/domain/role-dashboard-layout.tsx` | R1 → `PortalDashboardShell`; R2–R6 → `WorkspaceDashboardShell` |
| Portal-Toolbar | `components/domain/portal-dashboard-toolbar-context.tsx` | Zurück-Slot in Portal-Top-Bar |

### Review-Blöcke (Reihenfolge)

1. **Antragsteller** — Persönliche Angaben ohne Antragsart.
2. **Fachärztliches Attest** — Dateizeilen (Placeholder wenn keine URL).
3. **Empfehlungsschreiben** — **`RecommendationReleasedAccordion`** (HF 5247:5570, einheitlich mit R1), wird ab dem Moment gerendert, in dem `data.recommendation.releasedHtml` existiert — **unabhängig vom View-Mode**, also in `interactive`, `readonly_consultation`, `readonly_adjustment_pending`, `readonly_decision`. Der frühere Legacy-Block über `recommendation.url` (Datei-Kachel mit `ReviewFileRow` + `fileNameFromUrl`) ist vollständig entfernt; vor dem Release wird in dieser Position nichts angezeigt.
4. **Antragsdefinition** — `situationDescription`.
5. **Gültigkeitsdauer** — Vergleich der beiden Optionen.
6. **Geltungsbereich** — `APPLICATION_SCOPE_OPTIONS`.
7. **Ausgleichsmassnahmen LV / Leistungsnachweise** — wie Antragsformular inkl. Sonstige.

**IDs im Code (`ReviewWorkspaceBlockId` in `lib/review-workspace-blocks.ts`):** `applicant` · `attest` · `definition` · `duration` · `scope` · `lectureMeasures` · `assessmentMeasures`

### Block-Phasen (lokal, `ReviewBlockPhase`)

| Phase | Darstellung |
|--------|-------------|
| `pending` | Standard-Karte (`ReviewBlockCard`), Footer: **Anpassung anfordern** + **Bestätigen**. |
| `confirmed` | Außenrahmen teal (`footerTone="confirmed"`), Footer-Balken teal, **Zurücksetzen** + „Reviewed & Bestätigt“. |
| `adjustment` | Außenrahmen amber, Footer amber, Bemerkung im Inhalt, **Zurücksetzen** + „Anpassung angefordert“. |
| `pending_after_adjustment` | Nach R1-Freigabe: erneut wie offenes Review; Fachstellen-Bemerkung als **gesperrte** Hinweiszeile (`lockedRemark` / `displayRemark`), bis R2 erneut eine Anpassung fordert. |

- **Bestätigen:** setzt Block auf `confirmed`.
- **Anpassung anfordern:** öffnet **nicht** mehr einen Modal-Dialog; setzt Sidebar in den **Kommentar-Composer** (siehe unten).
- **Zurücksetzen:** Bei **`confirmed`** sofort zurück auf `pending`. Bei **`adjustment`** zuerst **Bestätigungsdialog** („Anpassung zurückziehen?“); bei Ja: Block `pending`, Einträge in **`savedReviewComments`** mit gleichem **`blockId`** entfernt, ggf. offener Entwurf für diesen Block geschlossen.

### Footer-Aktionen (pending)

- **Anpassung anfordern:** `bg-amber-400`, weiße Schrift, Icon **`MessageSquarePlus`** (Figma-Kit, z. B. Node `3542:10053`).
- **Bestätigen:** teal (`bg-teal-600`), Icon **`Check`**.
- Footer-Zeilenhöhe über alle States vereinheitlicht (`h-9`, gemeinsames `py-3`).

### Sidebar „Antragdetails“ + „Kommentare“

**Normale Ansicht (kein aktiver Entwurf):**

- Oben: **Antragdetails** (Status-Pill, Antragsteller inkl. ID-Kopie, Eingereicht, Aktualisiert, Zugewiesen an, Antrags-ID).
- Unten: **Kommentare** — Hinweis oder **Chronik** gespeicherter Block-Kommentare (`SavedReviewComment`: `id`, `blockId`, `blockTitle`, `body`, `createdAt`, optional **`authorDisplayName`** — persistiert im Draft und bei Weiterreichung in `forwardedComments` / `ReviewCommentPersisted`).

**Aktiver Kommentarentwurf (`adjustmentComposer` gesetzt):**

- Die **gesamte rechte Spalte** zeigt nur die Kommentar-Ansicht (Antragdetails temporär ausgeblendet).
- Kopfzeile: **X** + Titel **„Kommentare“** — **X** = `onCancel()` (wie **Abbrechen**).
- Karte: amber Rahmen, Block-Titel, Textarea (Placeholder: *Erläutern Sie was konkret angepasst werden muss*), **Abbrechen** / **Speichern**.
- **Speichern:** nur bei nicht-leerem Text; sonst Fehlertext unter dem Feld. Nach erfolgreichem Speichern schließt die Ansicht automatisch (`pendingComposer` → `null` im Parent), Block wechselt zu **`adjustment`** mit Remark; Chronik erhält einen Eintrag.

**Figma-Referenz Sidebar-Kommentar:** Node `3550:7067` (Kit „Prototyp shadcn“).

### Gesamtbutton unter den Blöcken (R2, `interactive` / `in_review`)

- Der CTA erscheint **nur**, wenn **alle sichtbaren** Review-Blöcke bearbeitet sind (`reviewBlocksCompleteVisible`: je sichtbarem Block `confirmed` oder `adjustment` mit Bemerkung). Liegen noch Blöcke auf `pending` (bzw. `pending_after_adjustment` ohne erneute Aktion), wird **kein** Button gerendert (nicht nur `disabled`).
- **„Antrag weiterreichen“** — alle sichtbaren Blöcke `confirmed` → `POST /api/applications/review-forward` mit `nextStatus: "in_implementation"` → kanonisch **In Entscheid**.
- **„Anpassungen weiterleiten“** — mindestens ein Block `adjustment` → dieselbe Route mit `nextStatus: "needs_correction"` (fachlich Anpassung an R1); persistiert `postSubmit` und `forwardedComments`.
- Nach erfolgreichem Forward: ohne erneutes Laden **kein** Weiterreich-Button mehr (Status ≠ `in_review` bzw. read-only); **kein** erklärender Fließtext unter dem Button (nur noch ggf. technische Fehlermeldungen zu Draft-Speicherung / Forward).

### Workspace-Chrome (Review)

- `userLabel=""` auf Workspace-Page.
- **„Zurück zur Liste“** über `setLeadingSlot` im `WorkspaceTestFlow` bei `in_review`.
- Kein zweiter Status unter dem Seitentitel (Vermeidung Doppelung zur Sidebar).

---

## 6. Layout (Workspace / Review)

| Bereich | Verhalten |
|---------|-----------|
| Shell | `h-screen overflow-hidden` |
| Mittlere Spalte | nur dort `overflow-y-auto` (Review-Blöcke) |
| Rechte Spalte | volle Höhe; bei **Kommentarentwurf** nimmt die Kommentar-Ansicht die **komplette** Sidebar ein |
| Kommentarchronik (ohne Entwurf) | scrollbarer Bereich unter „Kommentare“ |

**Äussere Dashboard-Shell** (Sidebar, Top-Bar, weisses Panel): `workspace-dashboard-shell.tsx` — **`Dashboard_Core_Layout_Kontext.md`**. Review-Innenlayout (3 Spalten, Scroll) bleibt in `WorkspaceApplicationReview` / `PortalApplicationAdjustment`.

### Block-Card-Styling (`ReviewBlockCard`)

- **Surface:** `applicationBlockSurfaceClass` aus `lib/design-tokens/application-block.ts` — `rounded-lg border border-border bg-card`, **kein** Shadow (gleiches Muster in Portal-Adjustment, R4, R1-`R1FlowFormCard`, Empfehlungs-Accordion).
- **Keine Header-Trennlinie mehr** zwischen Block-Titel und Inhalt (`border-b border-border` entfernt). Titel und Inhalt liegen in einem gemeinsamen Container `px-6 pt-5 pb-5` mit `space-y-4` — der Abstand Heading ↔ Content ist damit ~16 px statt vorher ~40 px.
- Footer-Tonalitäten (`default` / `confirmed` teal / `adjustment` amber) unverändert; `RecommendationReleasedAccordion` und `RecommendationDraftEditor` orientieren sich am gleichen Header-Padding (kein eigenständiger Border-Divider mehr).

---

## 7. Server / Page

- **`app/workspace/page.tsx`:** `WorkspaceR2ToolbarProvider`, `RoleDashboardLayout` mit **`role={profile.role}`** (R2–R6), `workspaceAccountInitials` aus `initialsFromProfile`, **`fetchWorkspaceApplicationsList`** für die initiale Liste, `WorkspaceTestFlow` mit **`workspaceRole={profile.role}`** und `reviewerDisplayName`.
- Review-Vollansicht ohne äußeren `px-6`-Listen-Wrapper (volle Fläche); Liste nutzt weiter `px-6 py-6` im Flow.

---

## 8. Offene Punkte / nächste Umsetzungen

| Thema | Hinweis |
|--------|---------|
| **Entscheid-Übergang** | `in_implementation → approved/rejected` (R3); aktuell Endzustand für R2 read-only |
| **Dateien** | echte Storage-URLs für Attest (Empfehlungsschreiben über Rich-Text) |
| **Realtime / F6** | Ist: Broadcast + gezielter Refetch / Dashboard-Polling; Vision: `application_events`, Feld-Annotationen siehe `Prototyp_Funktionen.md` |

---

*Letzte Aktualisierung: Broadcast auch nach R4 persist/complete; Verweis auf R4-Reconcile (`Antrag_Bewilligung_Kontext.md` § 7).*
