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

- **Zentral:** `lib/application-status.ts` — `deriveCanonicalApplicationState`, `getApplicationStatusMeta`, Export **`ApplicationStatusMeta`**; Badge-Klassen über **`getHfStatusBadgeClass(state, audience)`** aus `lib/design-tokens/status-badge-colors.ts` (**`StatusAudience`:** `R1` \| `R2` \| `R4`).
- **In Review / Review erforderlich (R1, R2, R4):** `bg-beratung-100 text-beratung-500`. **Beratung & Empfehlung:** `bg-consultation-surface text-consultation-accent` (`#E0F2FE` / `#0EA5E9`).
- **Header-Callouts** in Review/Portal: `components/domain/application-status-callout.tsx` — Container-Farben aus dem Status-Badge (`hfStatusCalloutClasses`); optional **`muted`** für R4-Lesesicht.
- UI-Badges (Sidebar, Listen): `components/domain/application-status-badge.tsx`; R1-Karten können abweichende Pills nutzen (`R1_CARD_STATUS_BADGE_CLASS`).
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
  - `data.recommendation.workspaceReview.postSubmit`: Snapshot beim **Weiterreichen** (`R2PostSubmitReview` — `forwardedAt`, `blocks`). Block-`phase` inkl. **`pending_after_adjustment`** (`lockedRemark`) nach R1-Freigabe einer Korrekturrunde. In dieser Phase nutzt R2 pro Block den Toggle **Aktuell/Verlauf**: Aktuell zeigt R1s überarbeiteten Stand, Verlauf zeigt den Baseline-Snapshot (ursprüngliche Auswahl zur Zeit der Anforderung) plus gesperrtes Remark-Band.
  - `data.recommendation.workspaceReview.forwardedComments`: persistierte Kommentar-Chronik beim Weiterreichen.
- **Legacy-Wurzelfelder** (`reviewComments`, `r2PostSubmitReview`, `r2ReviewDraft` direkt in `data`) werden vor jedem Save mit **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`) entfernt — sonst feuert der Trigger.
- **Forward-Aktion** geht über **`app/api/applications/review-forward/route.ts`** (Session-Client, RLS-konform — kein `SUPABASE_SERVICE_ROLE_KEY` nötig). Rollen: **R2, R3, R2R4** (`hasR2WorkspaceCapabilities` bzw. R3). Payload: `applicationId`, `nextStatus` (`in_implementation` \| `needs_correction`), `workspaceReview` inkl. `postSubmit` + `forwardedComments`. Setzt `applications.status` entsprechend und schreibt `recommendation.workspaceReview` final.  
  **Trigger-Pitfall:** Root-Felder in `data` außerhalb `consultation` / `recommendation` dürfen von R2 **nicht** verändert werden. Insbesondere darf **`r1AdjustmentResolutions`** beim Forward **nicht** aus dem Merge entfernt werden (sonst `R2 may not change data except recommendation/consultation`); Zurücksetzen erfolgt bei R1 über **`r1-release-adjustments`**.  
  **R1-Baseline für R2-Anpassungsmodus:** Beim Forward mit `needs_correction` werden Studierenden-Snapshots pro Block unter **`data.recommendation.r1AdjustmentBlockBaselines`** persistiert (Lesen: `lib/r1-adjustment-baseline.ts` — **nicht** an der JSON-Wurzel, sonst Trigger-Fehler).
- **R4-Bewilligung (separater JSON-Pfad):** **`data.r4DecisionReview`** — Schalter, Block-`confirmed`, Freitextzeilen **Hinzufügen/Hinzugefügt** (`proposal:*` nur Massnahmen-Blöcke). Abschluss: **`materializeApprovedR4DecisionReview`** → `applicationDefinition` (sichtbar in Review-Lesesicht). **R2R4:** Trigger erlaubt `applicationDefinition` nur beim Statuswechsel auf `approved`. Details → `Antrag_Bewilligung_Kontext.md` § 5–6.
- **R1-Freigabe-API:** **`app/api/applications/r1-release-adjustments/route.ts`** — setzt Status `in_review`, merged `buildWorkspaceReviewAfterR1AdjustmentRelease`, leert `r1AdjustmentResolutions`, broadcastet Zeilen-Update. Wichtig: `recommendation.r1AdjustmentBlockBaselines` werden bei der Freigabe explizit erhalten, damit der Re-Review-Verlauf (Toggle) im nächsten R2-Zyklus verfügbar bleibt.
- **RLS-Anker:** `applications_select_r2_worklist` umfasst seit Migration `extend_workspace_select_to_decision_states` auch **`in_implementation` / `approved` / `rejected`**, damit R2 den weitergereichten Antrag nach dem Statuswechsel im Workspace im Modus `readonly_decision` weiter sehen kann (Details siehe `Antragerstellung_Kontext.md` § 10). Parallel: **`applications_select_r4_workspace`** + **`users_select_r4_workspace_applicants`** für **R4** (immer mit **`current_user_role()`**, siehe `Antrag_Bewilligung_Kontext.md` § 6 / `Antragerstellung_Kontext.md` § 10).

---

## 5. Implementierter UI- und Client-Stand

### Auslösung Review-Ansicht

- **`workspace-test-flow.tsx`:** Detail-States `consultation_recommendation` … `approved`/`rejected` → **`WorkspaceApplicationReview`** (View Modes; **R4/R2R4:** `workspaceViewerRole="R4"` wo Lesesicht). Kanonisch **`in_decision`** und **`hasR4WorkspaceCapabilities`** (R4 **oder** R2R4) → **`WorkspaceR4DecisionView`** statt Review. **R2** allein: in `in_decision` nur `readonly_decision`. Detail-Panel bleibt über `useRegisterDashboardDetailPanel` registriert (kein Verschwinden bei Statuswechsel innerhalb Detail). Matrix → **`Dashboard_Core_Layout_Kontext.md` § 4b**.
- Die alte „Empfehlung freigeben“-Karte ist abgelöst durch den `WorkspaceApplicationReview` mit `viewMode="readonly_consultation"` + `RecommendationDraftEditor` als `bottomAction`.

### View Modes (`WorkspaceReviewViewMode`)

Definiert in `components/domain/workspace-application-review.tsx`; abgeleitet im `workspace-test-flow.tsx` aus dem kanonischen Status:

| Mode | Kanon-Status | Verhalten |
|------|--------------|-----------|
| `interactive` | `in_review` | Volle Review: Footer-Aktionen (Bestätigen / Anpassung anfordern / Zurücksetzen), Sidebar-Composer, Forward-Button. Draft-Autosave aktiv. |
| `readonly_consultation` | `consultation_recommendation` | Kompaktes Lesefeld: **nur Blöcke mit Inhalt** werden angezeigt (`compactReadOnlyBlocks`). Keine Footer-Aktionen, leere Kommentarliste mit eigenem Empty-Label. Header: Beratungs-**Callout** + optional **Beratungstermin-Karte** (`6081:24572`, `gap-6`, Live `data.consultation` bei `booked`/`done`). Darunter `RecommendationDraftEditor` als `bottomAction`, solange `releasedHtml` leer ist. |
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
| Review-Hauptansicht | `components/domain/workspace-application-review.tsx` | Blockliste links, View Modes, State, Dialoge, Sidebar-Props, debounced Draft-Persist, Forward-Aufruf; Prop **`workspaceViewerRole`** (`R2` \| `R4`) |
| Seiten-Header | `components/domain/application-review-page-header.tsx` | Geteilt: Titel «Antrag auf Nachteilsausgleich», «Eingereicht am» (`paragraphSmall`), Options-Button |
| Status-Callout | `components/domain/application-status-callout.tsx` | Hinweiszeile unter dem Header (Badge-Farben aus Status-Meta) |
| Beratungstermin-Karte | `components/domain/workspace-consultation-appointment-card.tsx` | Nur «Beratung & Empfehlung» ohne `releasedHtml`: unter Callout, `bg-consultation-surface`, Datum/Ort/Beratende Person aus `resolveWorkspaceConsultationAppointment`; Org-Zeilen fest («Fachstelle Studium und Behinderung», «Universität Zürich»); Pfeil → Terminplaner |
| Review-Block-Tokens | `lib/design-tokens/review-block.ts` | Shell-Klassen, Footer 52px, Composer/Adjustment, Re-Review-History-Toggle, Verlauf-Band |
| Bemerkungen-Tokens | `lib/design-tokens/review-bemerkungen.ts` | R1 pending/done (`5858:22820`), R2 Chronik (`5866:2021`) |
| R1-Block-Footer | `lib/design-tokens/r1-review-block.ts` | R1 Anpassungs-Footer («Anpassung vornehmen», Bearbeiten, Speichern, Zurücksetzen) |
| R1-Baseline | `lib/r1-adjustment-baseline.ts` | `readR1AdjustmentBlockBaselines`, Merge mit `recommendation.r1AdjustmentBlockBaselines` |
| Detail-Sidebar | `components/domain/application-review-detail-sidebar.tsx` | Antragdetails; Chronik **`bemerkungenVariant`** `r1` \| `r2` (Datum **TT.MM.JJ**, z. B. `21.05.26`; R1 heute: «Heute, HH:mm»); **R4:** `secondarySection="r4_contacts"` ohne Bemerkungs-Panel |
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

1. **Antragstellende Person** — Persönliche Angaben ohne Antragsart.
2. **Fachärztliches Attest** — Dateizeilen (Placeholder wenn keine URL).
3. **Empfehlungsschreiben** — **`RecommendationReleasedAccordion`** (HF 5247:5570, einheitlich mit R1), wird ab dem Moment gerendert, in dem `data.recommendation.releasedHtml` existiert — **unabhängig vom View-Mode**, also in `interactive`, `readonly_consultation`, `readonly_adjustment_pending`, `readonly_decision`. Der frühere Legacy-Block über `recommendation.url` (Datei-Kachel mit `ReviewFileRow` + `fileNameFromUrl`) ist vollständig entfernt; vor dem Release wird in dieser Position nichts angezeigt.
4. **Persönliche Situationsbeschreibung** (`definition`) — `situationDescription`.
5. **Gültigkeitsdauer** — Vergleich der beiden Optionen.
6. **Geltungsbereich** — `APPLICATION_SCOPE_OPTIONS`.
7. **Ausgleichsmassnahmen LV / Leistungsnachweise** — wie Antragsformular inkl. Sonstige.

**IDs im Code (`ReviewWorkspaceBlockId` in `lib/review-workspace-blocks.ts`):** `applicant` · `attest` · `definition` · `duration` · `scope` · `lectureMeasures` · `assessmentMeasures`

### Review-Block — visuelle Varianten (`ReviewBlockVariant`)

**Code:** `components/domain/application-review-blocks.tsx`, Tokens `lib/design-tokens/review-block.ts`.  
**Inhalt** der Blöcke kommt aus dem Antragsformular (Beispiel-Felder in Figma sind Platzhalter).

| Variante | Rolle / Phase | Figma | Rahmen | Footer |
|----------|---------------|-------|--------|--------|
| `default` | **R1** read-only, kein Review-Auftrag | `5641:21990` | `border-border`, `rounded-xl`, `p-24` | keiner |
| `pending` | **R2** `pending`, `pending_after_adjustment` (erneut prüfen) | `5641:21952` | `border-border` | geteilte Leiste **52px**: links `adjustment-200` **Anpassung anfordern** (`FilePenLine`), rechts `bewilligt-200` **Bestätigen** (`Check`) |
| `composer` | **R2** Bemerkung schreiben (Pflicht vor Anpassung) | `5641:22599` | `border-adjustment-500` | `stone-50`: Textarea + **Abbrechen** / **Kommentieren** (primary pill) |
| `confirmed` | **R2** Block bestätigt | `5641:22807` | `border-bewilligt-600` | `bewilligt-200`: **Zurücksetzen** + Status `bewilligt-600` «Reviewed & Bestätigt» |
| `adjustment_active` | **R2** Anpassung mit gespeicherter Bemerkung | `5641:22767` | `border-adjustment-500` | `adjustment-100`: Bemerkung `adjustment-700`, **Zurücksetzen** / **Bearbeiten** |
| `adjustment_sent` | **R2** read-only nach Weiterleitung an R1 | `5657:1673` | `border-adjustment-500` | `adjustment-100`: Label «Anpassung», Bemerkung, Status «Anpassung wurde angefordert» |

**Typo (einheitlich):** Titel `hfBlockTitle` (18px medium); Felder `ReviewField` — Label `paragraphSmall` muted, Wert `paragraphMedium`; Grid `ReviewBlockFieldGrid` (2 Spalten, `gap-12`).

### Block-Phasen (lokal, `ReviewBlockPhase`) → Variante

| Phase | `ReviewBlockVariant` | Verhalten |
|--------|----------------------|-----------|
| — (R1 neutral) | `default` | Nur Inhalt, keine Aktionen. |
| `pending` | `pending` | R2 wählt Bestätigen oder Anpassung anfordern. |
| (composer offen) | `composer` | `pendingComposer` für diesen Block; Bemerkung **im Block-Footer**, Sidebar bleibt bei Antragdetails + Chronik. |
| `confirmed` | `confirmed` | R2 kann zurücksetzen → `pending`. |
| `adjustment` | `adjustment_active` (interaktiv) / `adjustment_sent` (read-only) | Bemerkung im Footer; **Bearbeiten** öffnet `composer` mit vorausgefülltem Text. |
| `pending_after_adjustment` | `pending` + Header-Toggle `ReviewBlockAdjustmentHistoryToggle` | R2 kann zwischen **Aktuell** (überarbeiteter R1-Stand) und **Verlauf** (Baseline + gesperrtes `Angeforderte Anpassung`-Band) wechseln; Aktionen bleiben **Anpassung anfordern** / **Bestätigen**. |

- **Bestätigen:** `confirmed`.
- **Anpassung anfordern:** `composer` (leerer Entwurf); **Kommentieren** nur mit nicht-leerer Bemerkung → `adjustment`.
- **Abbrechen** (composer): zurück zu `pending` (zwei Buttons).
- **Zurücksetzen:** `confirmed` → sofort `pending`; `adjustment` → Dialog, dann `pending` + Kommentar aus Liste entfernen.
- **Bearbeiten:** `adjustment` → `composer` mit bestehender Bemerkung.

### Re-Review-Verlauf (R2 Adjustment History Feature)

- **Aktivierung:** nur für Blöcke in `pending_after_adjustment` mit vorhandener Baseline in `recommendation.r1AdjustmentBlockBaselines`.
- **Default-Ansicht:** `current` (SquarePen aktiv) zeigt den aktuellen, von R1 angepassten Stand.
- **Verlaufsansicht:** `history` (History aktiv) zeigt den ursprünglichen Baseline-Inhalt und im Footer das gesperrte Band **„Angeforderte Anpassung“** mit dem ursprünglichen R2-Remark.
- **Interaktionsregel:** Sobald R2 in diesem Block erneut in den Composer geht (neue Anpassung) oder bestätigt, verschwindet die Verlaufssicht für diese Interaktion; nach **Zurücksetzen** ist der Toggle wieder verfügbar.
- **Darstellungsregel bei Auswahloptionen (Duration/Scope/Measures):**
  - Verlauf **gewählt**: `bg-adjustment-100`, Foreground (Text/Icons/Status) `adjustment-700`, gleiches Layout wie normale Read-only-Optionen.
  - Verlauf **nicht gewählt**: unverändert wie Read-only-unselected (`stone-50`, muted).
  - R2-Default (`current`) kennzeichnet neu angepasste Werte mit Label **„Angepasst“**.

### Sidebar «Antragdetails» + Bemerkungen / Kontakte

- **R2 Review:** Antragdetails oben; unten Chronik (`SavedReviewComment`, **`bemerkungenVariant="r2"`**) — kein Vollbild-Composer (`adjustmentComposer={null}`). **Eingabe** für neue Anpassungen im **Block-Footer** (`ReviewBlockComposerFooter`).
- **R1 Anpassung:** Chronik mit **`bemerkungenVariant="r1"`** — pending (`adjustment-50`) vs. done (weiss + «Angepasst»); `detailPanelSignature` enthält `r1AdjustmentResolutions`, damit Sidebar nach Speichern/Zurücksetzen aktualisiert.
- **Chronik — Textlänge:** Bemerkungstext in R1/R2-Items max. **250px** Höhe, danach Ellipsis (`application-review-detail-sidebar.tsx`).
- **R4:** `showCommentsSection={false}` bzw. bei Lesesicht **`workspaceViewerRole="R4"`** ohne Bemerkungs-Panel; stattdessen **`secondarySection="r4_contacts"`** (Kontakt-Cards, **scrollbar** im verbleibenden Sidebar-Platz) — siehe `Antrag_Bewilligung_Kontext.md`.

### Gesamtbutton unter den Blöcken (R2, `interactive` / `in_review`)

- Der CTA erscheint **nur**, wenn **alle sichtbaren** Review-Blöcke bearbeitet sind (`reviewBlocksCompleteVisible`: je sichtbarem Block `confirmed` oder `adjustment` mit Bemerkung). Liegen noch Blöcke auf `pending` (bzw. `pending_after_adjustment` ohne erneute Aktion), wird **kein** Button gerendert (nicht nur `disabled`).
- **„Antrag weiterreichen“** — alle sichtbaren Blöcke `confirmed` → `POST /api/applications/review-forward` mit `nextStatus: "in_implementation"` → kanonisch **In Entscheid**.
- **„Anpassungen weiterleiten“** — mindestens ein Block `adjustment` → dieselbe Route mit `nextStatus: "needs_correction"` (fachlich Anpassung an R1); persistiert `postSubmit` und `forwardedComments`.
- CTA-Styling: Forward-/Weiterleitungs-Button als **pill** (`rounded-full`) in Workspace und R1-Adjustment-Freigabe.
- Nach erfolgreichem Forward: ohne erneutes Laden **kein** Weiterreich-Button mehr (Status ≠ `in_review` bzw. read-only); **kein** erklärender Fließtext unter dem Button (nur noch ggf. technische Fehlermeldungen zu Draft-Speicherung / Forward).

### Workspace-Chrome (Review)

- `userLabel=""` auf Workspace-Page.
- **„Zurück zur Liste“** über `setLeadingSlot` im `WorkspaceTestFlow` bei geöffnetem Antrag; URL-Query `application` wird entfernt (`handleCloseApplication`).
- Kein zweiter Status unter dem Seitentitel (Vermeidung Doppelung zur Sidebar).

---

## 6. Layout (Workspace / Review)

| Bereich | Verhalten |
|---------|-----------|
| Shell | `h-screen overflow-hidden` |
| Mittlere Spalte | nur dort `overflow-y-auto` (Review-Blöcke) |
| Rechte Spalte | volle Höhe; Antragdetails + Kommentar-Chronik (Composer im Block, nicht Vollbild-Sidebar) |
| Kommentarchronik (ohne Entwurf) | scrollbarer Bereich unter „Kommentare“ |

**Äussere Dashboard-Shell** (Sidebar, Top-Bar, weisses Panel): `workspace-dashboard-shell.tsx` — **`Dashboard_Core_Layout_Kontext.md`**.

### Review / Portal-Adjustment — Scroll & Kopfzeile

- **`edgeToEdge`** in `role-dashboard-layout.tsx` für Adjustment und Workspace-Detail (kein zusätzliches Shell-`p-6`).
- Scroll + Inset: **`applicationReviewScrollAreaClass`** (`px-12 pt-12 pb-8`, `applicationReviewSectionGapClass` = `gap-8` zwischen Header-Bereich und Block-Stack) in `lib/design-tokens/application-scroll.ts`.
- Geteilter Kopf: **`ApplicationReviewPageHeader`** + statusabhängige **`ApplicationStatusCallout`**-Zeilen; bei «Beratung & Empfehlung» ohne Release zusätzlich **`WorkspaceConsultationAppointmentCard`** (`gap-6` zum Callout, Figma `6081:24572`). Block-Stack in `gap-6`-Sektionen (wie R2-Review und R1-`PortalApplicationAdjustment`).

### R1 — Block-Zustände in `PortalApplicationAdjustment`

**Tokens:** `lib/design-tokens/r1-review-block.ts`; Shell über **`R1BlockShell`** + `ReviewBlockCard` / `ReviewBlockR1*Footer`.

| Zustand | Figma (HF) | Verhalten |
|---------|------------|-----------|
| Read-only / bestätigt durch Fachstelle | — | `variant="default"` |
| Anpassung angefordert, offen | `5858:22820` pending | Footer «Anpassung vornehmen»; Sidebar-Eintrag pending |
| Bearbeiten | `5858:22821` | R2-Bemerkung + Formular; Footer Speichern / Zurücksetzen |
| Gespeichert (done) | `5858:22820` done | Grüner Rand; Footer «Bearbeiten»; Sidebar «Angepasst» |

**Block `definition` (Bearbeiten):** Freitext «Beschreibung der gesundheitlichen Situation …» als **`AutoGrowTextarea`** (`min-h-[120px]`), Höhe wächst mit Inhalt.

**Layout:** Gleiche Breite/Abstände wie R2-Review (kein `max-w-4xl`); volle Panelbreite mit `applicationReviewScrollAreaClass`.

### Block-Card-Styling (`ReviewBlockCard`)

- **HF Review-Blöcke:** `rounded-xl` (12px), `REVIEW_BLOCK_BODY_CLASS` (`p-6`, Titel↔Inhalt `gap-4`).
- **Footer-Höhe:** einzeilige Aktionsleisten (`REVIEW_BLOCK_ACTION_FOOTER_BAR_CLASS`) **52px**; Composer- und Bemerkungs-Footer (`REVIEW_BLOCK_COMPOSER_*`, `REVIEW_BLOCK_ADJUSTMENT_*`) wachsen mit Inhalt.
- **R1 Portal-Adjustment:** HF-Footer über `ReviewBlockR1*`-Komponenten und `r1-review-block.ts` (siehe oben); neutraler Block = `variant="default"`.
- **Empfehlungs-Accordion** / R4: separates Layout; nicht über `ReviewBlockVariant`.

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

*Letzte Aktualisierung: Review-Bemerkungsdatum TT.MM.JJ; R1-Situationsbeschreibung `AutoGrowTextarea`; R4-Kontakte scrollbar; R2 Adjustment History Feature; Baseline-Persistenz bei `r1-release-adjustments`; Blocktitel «Persönliche Situationsbeschreibung»; Test-Matrix `Dashboard_Core_Layout_Kontext.md` § 4b; Bewilligung → `Antrag_Bewilligung_Kontext.md`.*
