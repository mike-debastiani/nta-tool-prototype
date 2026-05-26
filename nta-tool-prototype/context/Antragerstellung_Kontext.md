# Kontext: Antragserstellung (R1) & R2-Beratung — Prototyp NTA

> **Zweck:** Operative Referenz für Chats zu **Anpassungen und Integrationen** rund um den **Antragsflow R1** bis zur finalen Einreichung, die **Status-/Badge-Logik**, den **Workspace-Test R2** (Beratung/Empfehlung) sowie **RLS/Trigger**.  
> **Review-/Korrektur-Loop** nach Einreichung (R2 Block-Review, R1-Anpassungen, erneuter Review-Zyklus) → **`Antrag_Review_Kontext.md`**. **R4 Bewilligung** → **`Antrag_Bewilligung_Kontext.md`**. **Dashboard-Shell** (Portal-Liste, Adjustment, Workspace) → **`Dashboard_Core_Layout_Kontext.md`**. Gesamtprototyp → `General_Prototype_Kontext.md`. Zielbild-Funktionen → `Prototyp_Funktionen.md`.

---

## 1. Produktscope (aktueller Stand)

- R1 **Antragserstellung** end-to-end bis zum **finalen Submit**; danach fachlich **„In Review“**.
- R2 kann **Beratung + Empfehlung** und im Anschluss den **Block-Review** im **Workspace** bearbeiten und mit **„Antrag weiterreichen“** in **`in_implementation`** bzw. **`needs_correction`** überführen (Schreibzugriff nur auf definierte `data`-Teile).
- **Empfehlungsschreiben** wird nicht mehr als Datei-Upload, sondern als **Rich-Text** (TipTap) direkt im Antrag verfasst. R2 nutzt dafür in der Phase „Beratung & Empfehlung“ den `RecommendationDraftEditor` (Entwurf speichern / freigeben); R1 sieht den freigegebenen Text identisch gestylt über den geteilten `RecommendationReleasedAccordion` in Step 3 und Step 5.
- R1 **Dashboard** (`/portal/home`): **HF-Home** in der **Portal-Dashboard-Shell** — Begrüssung, Cards/Table-Toggle, statuskodierte Antragkarten mit Progress-Stepper oder Tabellenansicht, Utility-Spalte «Neuer Antrag» + «Informationen»; **Live-Daten** (Polling). **Klick** Karte/Zeile → `/portal/antragserstellung?applicationId=<uuid>`. **Neuer Antrag** über **`?new`** / **`?new=1`** → Step-Flow **ohne** Dashboard-Shell.
- **Zwei R1-Layouts (nicht mischen):** (1) **Dashboard-Shell** — Liste + Block-Detail `PortalApplicationAdjustment`; (2) **Antragsflow-Shell** — `NtaAntragDesktop` + `r1-application-flow-layout.tsx` für Entwurf, Beratung & Empfehlung, `?new`. Details → **`Dashboard_Core_Layout_Kontext.md`** § 1.
- **Statusdarstellung** für Badges ist **zentral** in `lib/application-status.ts` (R1/R2 konsistent; Wording z. B. bei „Anpassung“ rollenabhängig).
- Portal- und Workspace-Dashboard teilen **`workspace-dashboard-shell.tsx`** über **`RoleDashboardLayout`** (einklappbare Sidebar 240/68px, rollenspezifische Nav).

---

## 2. Routen

### R1

| Zweck | Route |
|-------|--------|
| Login | `/student/login` |
| Antragserstellung | `/portal/antragserstellung` |
| Leerer Neustart | `/portal/antragserstellung?new` (oder `?new=1` / beliebiger Wert) |
| Bestimmten Antrag fortsetzen | `/portal/antragserstellung?applicationId=<uuid>` |
| Dashboard | `/portal/home` |
| Legacy | `/portal/antrag` → Redirect auf `/portal/antragserstellung` |

Hinweise:

- `app/portal/antragserstellung/page.tsx` interpretiert **jeden** Wert von `?new` als „leerer Neustart“ (`params.new !== undefined`).
- Ohne `?new` und ohne `?applicationId` wird der **letzte** Antrag des Users **nur dann** automatisch geladen, wenn sein kanonischer Status **`draft`**, **`consultation_recommendation`** oder **`needs_adjustment`** ist. Bereits eingereichte Anträge (`in_review` / `in_decision` / `approved` / `rejected`) führen zu einem **leeren** Formular, damit R1 problemlos einen zweiten Antrag starten kann.
- **Mit `?applicationId=<uuid>`:** Kanonischer Status **`draft`** oder **`consultation_recommendation`** → weiterhin **Step-Flow** (`NtaAntragDesktop`, **keine** Dashboard-Shell). Alle **anderen** Status → **`PortalApplicationAdjustment`** in der **Portal-Dashboard-Shell** (Top-Bar mit **Zurück** → `/portal/home`; Nav **«Meine Anträge»** bleibt aktiv). Bearbeitung nur bei `needs_adjustment` (`allowAdjustments`); sonst read-only. Realtime/Polling wie oben.
- **Ohne `applicationId`**, Auto-Resume: lädt den letzten Antrag nur bei `draft`, `consultation_recommendation` oder `needs_adjustment` — dann **Step-Flow** (auch `needs_adjustment` ohne explizite `applicationId` landet im Flow, nicht in der Adjustment-Ansicht).
- `/portal` kann noch auf die Antragserstellung zeigen — mit `app/` abgleichen.

### R2

| Zweck | Route |
|-------|--------|
| Login | `/staff/login` |
| Workspace (R2–R6) | `/workspace` |

### Login (Student & Staff)

- **`components/domain/login-card.tsx`:** `signInWithPassword`, danach **`auth.getSession()`** (JWT muss für den nächsten PostgREST-Aufruf stehen), erst dann **`from("users").select("role")`** für erlaubte Rollen. Bei DB-Fehlern: Meldung **„Profil konnte nicht geladen werden: …“**; bei falscher Rolle: **„Dieser Account hat keinen Zugriff auf diesen Login.“**
- **RLS-Falle:** Policies auf `public.users` dürfen die **eigene** Tabelle nicht in `EXISTS (SELECT … FROM users …)` aus RLS heraus erneut lesen — nutze **`current_user_role()`** (siehe § 10). Rekursion äussert sich als **„infinite recursion detected in policy for relation users“** (auch beim R1-Login sichtbar).

## 3. Kerndateien (Implementierung)

| Datei | Rolle |
|-------|--------|
| `components/nta-antrag-desktop.tsx` | R1 Flow Step 1–6: Validierung, Fortschritts-/Freischaltlogik, Autosave, Realtime, Delete → Portal |
| `components/domain/r1-application-flow-layout.tsx` | HF-Layout: `h-screen`, Top-Bar (Titel, Autosave-Hinweis, Schliessen), Sidebar, scrollbarer Form-Bereich |
| `components/domain/r1-flow-icons.tsx` | Lucide-Icons + Fortschritts-Statuspunkt (Gradient complete/incomplete) |
| `components/domain/r1-booking-scheduler.tsx` | Step 3 `step3_booking`: Kalender + Slots + Termindetails (Figma `5307:7575`) |
| `components/domain/r1-booking-confirmation.tsx` | Step 3 `step3_booked`: Terminbestätigung, Karte, Footer (Figma `5307:7907` / `5307:8254`) |
| `components/domain/r1-application-definition-section.tsx` | Step 4 + Step 5: **Antragsstellung** (HF-Feldabstände, `spacing="definition"`) |
| `components/domain/custom-measure-lines-field.tsx` | Sonstige-Massnahmen-Zeilen (Step 4 + `PortalApplicationAdjustment`) — `AutoGrowTextarea`, Checkbox an erster Zeile |
| `components/ui/auto-grow-textarea.tsx` | Gemeinsame mitwachsende Textarea (R1 + R4, siehe `Antrag_Bewilligung_Kontext.md`) |
| `components/studiengang-combobox.tsx` | Studiengang Step 1 (HF-Select-Trigger aus `r1-form.ts`) |
| `lib/design-tokens/r1-form.ts` | Feld-Gaps + Choice-Karten + Select-Trigger (SSOT für `R1FlowField*`) |
| `app/portal/antragserstellung/page.tsx` | Steuert Initial-Load: `?new` ⇒ leer; `?applicationId` ⇒ `PortalApplicationAdjustment`; sonst nur **resumable** Anträge auto-laden |
| `components/domain/portal-application-adjustment.tsx` | R1 Block-Detail (HF wie R2: `ApplicationReviewPageHeader`, `applicationReviewScrollAreaClass`, `R1BlockShell` / `r1-review-block.ts`). Edit nur bei `needs_adjustment`; Sidebar `bemerkungenVariant="r1"`; Freigabe → `r1-release-adjustments` |
| `components/domain/student-dashboard.tsx` | R1 Dashboard (Liste; Klick → `?applicationId=<uuid>`); **Polling** der Anträge des eingeloggten Antragstellers für aktuelle `status`/Badges |
| `app/portal/home/page.tsx` | Serverpage R1 Dashboard; `RoleDashboardLayout` mit **`edgeToEdge`** (kein doppeltes Shell-`p-6`) |
| `components/domain/application-review-page-header.tsx` | Geteilter Review-Seitenkopf (Portal-Adjustment + Workspace) |
| `components/domain/application-status-callout.tsx` | Status-Callout unter Review-Header |
| `lib/design-tokens/review-block.ts` | HF Review-Block-Layouts (R2 + R1 read-only default) |
| `lib/design-tokens/r1-review-block.ts` | R1 Anpassungs-Block-Footer |
| `lib/design-tokens/review-bemerkungen.ts` | R1/R2 Sidebar-Bemerkungen |
| `lib/r1-adjustment-baseline.ts` | Baselines unter `data.recommendation.r1AdjustmentBlockBaselines` |
| `components/domain/workspace-test-flow.tsx` | Workspace: Liste, View-Mode-Ableitung, R4-Entscheid-View in `in_implementation`, Refresh-Liste per **`GET /api/workspace/applications`**, `RecommendationDraftEditor` als `bottomAction` in `consultation_recommendation` |
| `components/domain/workspace-application-review.tsx` | R2/R4 Block-Review inkl. Persistenz, Forward, View Modes (`interactive` / `readonly_consultation` / `readonly_adjustment_pending` / `readonly_decision`), Prop **`workspaceViewerRole`** |
| `components/domain/workspace-r4-decision-view.tsx` | R4 Bewilligungs-UI (`in_implementation`) |
| `app/workspace/page.tsx` | Server: `requireUserProfile` R2–R6, `fetchWorkspaceApplicationsList`, `RoleDashboardLayout` + `workspaceAccountInitials`, `WorkspaceTestFlow` |
| `app/api/workspace/applications/route.ts` | `GET` Antragsliste für Workspace-Rollen (Refresh / konsistent mit Server-Page) |
| `lib/workspace-applications-list.ts` | Gemeinsame Select-Logik (optional Service-Role für R4 wenn gesetzt) |
| `lib/user-initials.ts` | Initialen für Workspace-Avatar |
| `components/domain/login-card.tsx` | Student/Staff-Login inkl. `getSession()` nach Sign-In |
| `components/domain/workspace-dashboard-shell.tsx` | Dashboard Core: Sidebar, Brand, Portal/Workspace-Nav, Top-Bars |
| `components/domain/role-dashboard-layout.tsx` | Einstieg: Portal- vs. Workspace-Shell; Portal `showTopBar` auf `/portal/antragserstellung` |
| `components/domain/portal-dashboard-toolbar-context.tsx` | Portal-Top-Bar-Slots |
| `lib/design-tokens/workspace-dashboard.ts` | Sidebar-/Top-Bar-Tokens (240/68px, Rim `h-3`, Top-Bar `h-14`) |
| `components/domain/rich-text-editor.tsx` | TipTap-Wrapper (StarterKit + Underline/Link/TextAlign/Placeholder/Custom-Heading) mit shadcn-styled, reaktiver Toolbar (`useEditorState`) |
| `components/domain/recommendation-released-accordion.tsx` | `releasedHtml`: `card` (R2-Review), `plain` (Legacy), **`r1`** (R1 Step 3/5, Figma `5247:5570`) — Meta «Freigegeben am … durch» + Avatar |
| `components/ui/accordion.tsx` | shadcn-Wrapper um `radix-ui` Accordion (ohne Hover-Underline) |
| `app/api/applications/review-forward/route.ts` | R2 Forward: `in_implementation` / `needs_correction` (RLS-konform); merged `data` muss **`r1AdjustmentResolutions`** nicht streichen (Trigger) |
| `app/api/applications/r4-persist-decision/route.ts` | Optional: R4 merge `r4DecisionReview` (primär Browser-Client, siehe `r4-workspace-supabase-persist`) |
| `app/api/applications/r4-complete-decision/route.ts` | Optional: R4 Abschluss → `approved` |
| `app/api/applications/r1-release-adjustments/route.ts` | R1: `needs_correction` \| `needs_adjustment` → `in_review`, merged `workspaceReview`, geleerte Resolutions, Broadcast |
| `lib/r1-adjustment-release.ts` | Bedingungen und Build von `postSubmit` nach R1-Freigabe (`pending_after_adjustment`, Filter `forwardedComments`) |
| `lib/workspace-review-hydration-key.ts` | Fingerabdruck `postSubmit` für stabile R2-Remounts bei wiederholtem `in_review` |
| `lib/application-realtime-sync.ts` | Broadcast-Kanal pro `applicationId` nach mutierenden Updates |
| `lib/test-flow-types.ts` | `ApplicationData` / `applications.data` (inkl. `recommendation.draftHtml`/`releasedHtml`/`releasedBy`, `recommendation.workspaceReview`, `r1AdjustmentResolutions`, `r4DecisionReview`) |
| `lib/application-status.ts` | Zentrale fachliche States + rollenabhängige Labels/Farben |
| `lib/r2-review-persist.ts` | Helfer `dataWithoutLegacyReviewRoots` für trigger-konforme R2-Saves |
| `lib/r4-decision-state.ts` | R4: Zeilen-Merge, Sichtbarkeit, Server/Client-Reconcile (`mergeR4DecisionReviewRespectingLocalDirty`, …) |
| `lib/r4-workspace-supabase-persist.ts` | R4: persist/complete über Browser-Supabase-Client (Session + RLS) |
| `lib/review-workspace-blocks.ts` | Block-IDs + `reviewWorkspaceAnchorId` (Anker-Sprung in R1/R2-Sidebar-Kommentaren) |
| `components/domain/application-status-badge.tsx` | Badge-UI aus Status-Ableitung |
| `utils/supabase/service-role.ts` | Optionaler Service-Role-Client (Forward **nicht** nötig; optional für R4-Listen-Fallback wenn RLS noch nicht ausgerollt) |

---

## 4. R1 Flow (fachlich)

### Step 1 — Persönliche Angaben

- Pflichtfelder inkl. Matrikel **`XX-XXX-XXX`**; Feldweise Fehler-States.

**Sperre:** Sobald `consultation.status` **`booked`** oder **`done`** ist, sind Step-1-Inhalte (inkl. Studium, Antragsart) **read-only** in **Übersicht (Step 5)** und bei **erneutem Öffnen von Step 1** über die Sidebar.

### Step 2 — Fachärztliches Attest

- Multi-Upload (Drag & Drop / Dateiauswahl); Löschen pro Datei; **mind. eine Datei** Pflicht.
- **HF-Layout:** Root `scroll-mt-4 space-y-3`; Titel + ICF-Hinweis; **`R1FlowAttestCallout`** mit `mb-10` (Figma `5077:14809`); Upload-Bereich `space-y-2`; Hinweiszeile `text-hf-paragraph-small` + `mb-5`; Dateiliste `space-y-2`.

### Step 3 — Beratung & Empfehlung

UI-Substeps in `nta-antrag-desktop.tsx` (ein Sidebar-Step „Beratung und Empfehlung“):

| UI-Step | Komponente | Figma (HF) |
|---------|------------|------------|
| `step3_booking` | `R1FlowBookingScheduler` | `5307:7575` |
| `step3_booked` | `R1FlowBookingConfirmation` | `5307:7907` (Karte/Footer `5307:8254`) |
| `step3_recommendation` | `RecommendationReleasedAccordion` **`variant="r1"`** + optional Checkbox | `5247:5570` |

- **Buchung:** Kalender + Slots; ausgewählter Tag → Marker **weiss** auf schwarzem Kreis. Footer „Termin buchen“ in `R1FlowFormFooter`.
- **Nach Buchung:** Terminbestätigung ohne inneren Rahmen um die Karte; **statische** Kartengrafik `public/images/r1-booking/map-example.png` + Link «In Maps öffnen»; Footer-Buttons gemäss Figma (kein `flex-1` auf Primary).
- **Empfehlung freigegeben (R2):** nur wenn `data.recommendation.releasedHtml` gesetzt (`isRecommendationReleasedToR1`) — **nicht** durch Navigieren zu `step3_recommendation`.
- **Kenntnisnahme:** Checkbox nur in `step3_recommendation` als `children` des Accordions; Pflicht für **Erst-Freischaltung** Step 4; Persistenz `data.r1RecommendationAcknowledged`; deaktiviert bis `releasedHtml`.
- **Sticky Unlock:** Step 4/5 bleiben klickbar; abgewählte Kenntnisnahme → Step 3 in Sidebar **incomplete** (rot).
- Legacy `recommendation.url` wird nicht gerendert.

### Step 4 — Antrag stellen (Antragsstellung)

- Implementierung: **`R1ApplicationDefinitionSection`** (geteilt mit Step 5).
- `R1FlowSectionTitle spacingBelow="compact"` + `R1FlowFieldStack spacing="definition"` (**40px** zwischen den fünf Blöcken).
- Pro Block: `R1FlowField described` (12px Beschreibung→Control), volle Breite Choice-Karten (`R1FlowFieldOptions` / `gap-2`).
- Pflicht: Freitext, Dauer, Geltungsbereich, Lehrveranstaltungs- und Leistungsnachweis-Massnahmen (inkl. «Keine» / Sonstige-Zeilen).

**Sonstige Massnahmen (Freitext-Zeilen):**

| Aspekt | Ist |
|--------|-----|
| **Komponente** | `CustomMeasureLinesField` — eine Karte pro Zeile (`r1FlowChoiceCardClassName`, `items-start`) |
| **Eingabe** | `AutoGrowTextarea` statt einzeiligem `Input`; mehrzeiliger Text bricht um, Feld wächst mit (`field-sizing-content` + `scrollHeight`) |
| **Ausrichtung** | Checkbox in `h-5 flex items-center` — bündig mit **erster Textzeile** (`leading-5`, `py-0` am Textarea) |
| **Persistenz** | `lectureOtherLines` / `assessmentOtherLines` (kompakt, ohne leere Slots) — `lib/measure-custom-lines.ts` |
| **Wiederverwendung** | Gleiche Komponente in **`portal-application-adjustment.tsx`** (Status `needs_adjustment`) |
| **Nach R4-Bewilligung** | Genehmigte Freitext-Vorschläge der Entscheidung landen in denselben `*OtherLines`-Feldern — `materializeApprovedR4DecisionReview` |

### Step 5 — Übersicht

- **Layout:** Alle Abschnitte als **direkte Kinder** von `R1FlowFormCard` (Fragment, **kein** `space-y-8`) → **40px** (`gap-10`) wie zwischen Step-1-Sektionen in Step 1.
- **Step 1:** Persönliche Angaben, Studium, Antragsart — read-only (Lock-Icons); nach Beratungsbuchung identisch zur gesperrten Step-1-Ansicht (`scroll-mt-4` auf Persönliche Angaben).
- **Step 2:** gleiche DOM-Struktur wie Step 2 (Attest inkl. Callout, Upload, Dateiliste); weiterhin editierbar.
- **Step 3:** `RecommendationReleasedAccordion` **`variant="r1"`** **ohne** Kenntnisnahme-Checkbox.
- **Step 4:** dieselbe `R1ApplicationDefinitionSection` wie Step 4; Overview-Validierung über `errors`-Prop (`overviewSituationInvalid`, …).
- Live-Validierung: fehlende Pflichtinhalte **rot**; Sidebar **incomplete** (`step*InvalidInOverview`).
- Nutzungsbedingungen-Block am Ende der Karte; **Finales Senden** → `submittedAt`, `finalSubmitted`, `applicationDefinition`; `recommendation` per Spread erhalten, `ready: true`.

### Step 6 — Erfolg

- Success-Screen, z. B. **„Zum Dashboard“** → `/portal/home`.
- **Realtime** darf nach finalem Submit **nicht** wieder auf frühere Steps (z. B. nur Empfehlung) springen — **Lock über Submit-Marker** (`finalSubmitted` / `submittedAt`).
- **Realtime-Scope:** Subscription in `nta-antrag-desktop.tsx` filtert auf **`id=eq.${activeApplicationId}`** (nicht auf `applicant_id`). Ohne aktive `application.id` wird **keine** Subscription geöffnet. Damit kann ein bereits eingereichter Altantrag den Step-State eines neu gestarteten Drafts nicht mehr auf `step6_submitted` zurückwerfen.

---

## 5. HF-Shell & Layout (R1-Antragsflow)

**Figma:** Screen `5180:7021`, Fortschritt `5180:7025`, States `5180:8333`, Form `5180:7082`, Top-Bar `5180:7106`, Kontakt `5213:1456`, Verwerfen `5180:7111`.  
**Code:** `components/domain/r1-application-flow-layout.tsx` + `HfPageGrid`.

| Bereich | Verhalten |
|---------|-----------|
| Seite | `h-screen overflow-hidden` — nur der **rechte Form-Bereich** scrollt (`R1FlowMainContent`); Seitenrand **24px** (`.hf-page-grid--r1-flow`, nicht 48px Dashboard-Grid) |
| Top-Bar | Titel links; **Autosave-Hinweis** rechts (Save-Icon, `bewilligt-500`) wenn aktiv; optional **Schliessen** → Draft speichern + `/portal/home` |
| Sidebar | Fortschrittskarte + Kontakt; unten **Antrag verwerfen** (`pb-6`) |
| Hauptpanel | Weiss, `rounded-t-xl`, Shadow `APPLICATION_CONTENT_PANEL_SHADOW_CLASS`, rechter Rand **24px** wie Dashboard (`px-6` / Grid-Margin, kein `-mr` mehr) |
| Formular | Karte `border-stone-250`, Footer **Weiter** innerhalb der Karte |
| Korrektur-Modus | Optional dritte Spalte: Review-Sidebar; Formular `hf-col-span-6` |

**Icons:** Lucide via `R1FlowIcon` / `r1-flow-icons.tsx` (Referenz-SVGs unter `public/icons/r1-flow/` optional; Runtime = Lucide).

**Formular-Feldabstände:** `R1FlowField*`-Primitives + `lib/design-tokens/r1-form.ts` — Details `High_Fidelity_Design_Kontext.md` § 7.

**Autosave:** LocalStorage-Debouncing in `nta-antrag-desktop.tsx`; Hinweis in Top-Bar (nicht über dem Formular). Ausgeblendet bei `step3_booked` und `step6_submitted`.

**Antrag verwerfen:** Dialog bestätigen → Zeile in Supabase löschen (falls `application.id`), lokaler State + LocalStorage leeren → **`router.replace("/portal/home")`**.

---

## 6. Prozessfortschritt (Sidebar) — Ist-Stand

**Komponenten:** `R1FlowProgressCard`, `R1FlowProgressStep` in `r1-application-flow-layout.tsx`; Logik in `nta-antrag-desktop.tsx` (`resolveR1ProgressVisualState`, `canOpenR1ProgressStep`, `highestUnlockedStepIndex`).

### Kopfzeile & Balken

- Text: **`{n} von 5 Abgeschlossen`** — zählt abgeschlossene Schritte (nicht aktueller Step-Index).
- Fortschrittsbalken: Breite = `completedStepCount / 5` (Gradient `bewilligt-100` → `bewilligt-300`).

**Zähl-Regel (`r1CompletedStepCount`):** Step 1 vollständig, Step 2 ≥1 Attest, Step 3 = `releasedHtml` **und** Kenntnisnahme-Checkbox, Step 4 `isStepFourComplete`, Step 5 nach finalem Submit.

### Visuelle Zustände pro Zeile (Figma `5180:8333`)

| Zustand | Wann | Text/Icon | Hintergrund Zeile | Status rechts |
|---------|------|-----------|-----------------|---------------|
| **available** | Freigeschaltet, offen | `text-primary` | keiner; bei Hover/Auswahl `bg-stone-100` | leerer Kreis (primary) |
| **complete** | Schritt erfüllt | `text-bewilligt-500` | wie oben bei Hover/Aktiv | Gradient-Punkt `bewilligt-100→300` |
| **incomplete** | Offen, aber späterer Step schon freigeschaltet, oder Übersicht-Fehler | `text-abgelehnt-600` | wie oben | Gradient-Punkt `abgelehnt-100→400` (vertical) |
| **locked-pre** | Vor Divider, noch nicht erreichbar (z. B. Step 2 ohne Step 1) | `text-stone-400` | — | Kreis `stone-400` |
| **locked-post** | Step 4/5 vor R2-Freigabe (`!recommendationReleased`) | `text-stone-250` | — | Kreis `stone-250` |

Step 5 nach R2-Freigabe aber vor Step-4-Abschluss: **locked-pre** (`stone-400`), nicht post.

### Freischaltung (klickbar)

**Erst-Freischaltung** (`canOpenR1ProgressStep`, ohne Sticky):

| Step | Bedingung |
|------|-----------|
| 1 | immer |
| 2 | Step 1 complete |
| 3 | Step 1 + 2 complete |
| 4 | Step 1 + 2 + `releasedHtml` + **Checkbox Kenntnisnahme** |
| 5 | Step 1 + 2 + `releasedHtml` + Step 4 complete |

**Sticky Unlock:** `highestUnlockedStepIndex` = max(bisher besuchter Index, `data.r1PortalFlowStep`, Navigation). Wenn `index >= stepIndex`, bleibt der Step **klickbar**, auch wenn Voraussetzungen später wieder fehlen (z. B. Attest gelöscht, aber User war schon auf Step 4).

Ausnahme Step 4/5 ohne Kenntnisnahme: Erst-Freischaltung blockiert; nach Sticky bleibt Step 4 offen, Step 3 wird rot.

**Navigation clamp:** `clampFlowStepToData` verhindert direktes Öffnen von Step 4/5 ohne `releasedHtml`. Step-3-Klick ohne Freigabe → `step3_booking` / `step3_booked`.

### Trennlinie

- `R1FlowProgressDivider` nach Step 3, solange `!recommendationReleased` (vor R2-Freigabe).

### Übersicht (Step 5)

- Auf Step 5: fehlende Steps 1/2/4 in Sidebar **incomplete** (`step*InvalidInOverview`).

---


## 7. R1 Dashboard — Sollverhalten

- **Shell:** `/portal/home` und Adjustment-Ansicht nutzen **`PortalDashboardShell`** (Sidebar, 12px-Rand oben, Top-Bar + Antragdetails beim geöffneten Antrag **ohne** Öffnungs-Animation) — **`Dashboard_Core_Layout_Kontext.md`** § 5b.
- **Home-UI (`StudentDashboard`):** Figma `5792:22019` (Cards), `5826:3088` (Table), Karten-States `5856:21926`.
  - **Header:** Begrüssung mit `studentDisplayName`, aktuelles Datum.
  - **Ansichten:** Toggle **Cards** / **Table** (Persistenz `localStorage` `r1-applications-view`).
  - **Cards:** Grid 2 Spalten, ab Viewport **1600px** 3 Spalten; jede Karte statuskodiert (`r1-application-card-visual.ts`), 3-Schritt-Progress (`In Review → In Entscheid → Verfügung`), Status-Pill via `R1_CARD_STATUS_BADGE_CLASS`; **ganze Karte** ist Link.
  - **Table:** Spalten **Antrags ID** (`r1ApplicationListNumber` / `NTA-YYYY-XXXX`), Einreichedatum, Gültigkeitsdauer, Gültig bis, Status; nur Header-Unterrand + Zeilen-Unterränder (letzte Zeile ohne); **ganze Zeile** klickbar.
  - **Utility-Spalte** (`R1DashboardUtilityColumn`, Figma `5792:22057`): «Neuer Antrag erstellen» + «Informationen» (Links `size="sm"`) am Ende des Grids.
  - **Daten:** Server-Liste + Client-Polling (2s); Meta via `r1-application-list-meta.ts`.
- **Neuen Antrag erstellen** → **`?new=1`** → **Antragsflow** ohne Dashboard-Shell.
- **Klick auf einen Eintrag** → `?applicationId=<uuid>`:
  - **`draft` / `consultation_recommendation`:** Step-Flow (`NtaAntragDesktop`).
  - **Sonst:** `PortalApplicationAdjustment` in der Dashboard-Shell; **Zurück** in der Portal-Top-Bar (nicht mehr als `absolute`-Button im Content).
  - **`needs_adjustment`:** Block-Edit, Autosave, `r1AdjustmentResolutions`; andere Status read-only; **Löschen** / **Antrag zurückziehen** in der Adjustment-UI.
- Direktaufruf `/portal/antragserstellung` ohne Parameter: Auto-Resume nur für resumable Status (s. § 2); eingereichte Anträge ohne Resume → leeres Formular im Flow.

---

## 8. Datenmodell `applications.data` (relevant)

- `title`, `summary`
- `personalData`
- `attestFiles`
- `consultation`: `status` **`booked` | `done`**, date, slot, location, advisor
- `r1PortalFlowStep` — letzter persistierter UI-Step (Draft-Exit); fließt in `highestUnlockedStepIndex` ein.
- `r1RecommendationAcknowledged` — Kenntnisnahme-Checkbox Step 3.
- `r1DraftBookingUi` — Kalender/Slot-Entwurf vor finaler Buchung.
- `recommendation`:
  - `ready: boolean` — u. a. bei finalem Submit; **Freischaltung Step 4/5 nur über `releasedHtml`** (siehe `isRecommendationReleasedToR1`).
  - `draftHtml` / `draftText` — TipTap-Entwurf R2 (Beratungsphase, „Entwurf speichern“ im `RecommendationDraftEditor`).
  - `releasedHtml` / `releasedText` / `releasedAt` / `releasedBy` — finaler, freigegebener Inhalt nach „Empfehlungsschreiben freigeben“; treibt den `RecommendationReleasedAccordion` (R1 + R2).
  - `url` — Legacy-Datei-Pfad; bleibt aus Datenkompatibilität erhalten, wird **nicht mehr gerendert**.
  - `workspaceReview` — R2-Block-Review (Draft / postSubmit / forwardedComments); Block-Phasen inkl. **`pending_after_adjustment`** nach R1-Freigabe — siehe `Antrag_Review_Kontext.md`.
- `applicationDefinition`
- `finalSubmitted` (boolean, Final-Submit-Marker)
- `submittedAt`
- `r1AdjustmentResolutions` — pro Block `R1AdjustmentResolution { resolvedAt }`; gesetzt von `PortalApplicationAdjustment` bei „Anpassung speichern“; wird bei **„Anpassungen für Review freigeben“** (`r1-release-adjustments`) auf `{}` zurückgesetzt (nicht von R2 beim Forward entfernt — Trigger).

Typen: **`lib/test-flow-types.ts`**.

---

## 9. Statusmodell (kanonisch, R1/R2)

Verbindlich (Figma-State-Canvas + Produktregel):

| Fachlicher State | Bedeutung / Sichtbarkeit |
|------------------|---------------------------|
| **Entwurf** | Antrag nicht final eingereicht. R1: relevant; R2: irrelevant. |
| **Beratung & Empfehlung** | Termin gebucht bis Empfehlung von R2 freigegeben. R1 + R2 relevant. |
| **In Review** | Final von R1 eingereicht. R1 und R2 gleich. |
| **Anpassung erforderlich** / **Anpassung ausstehend** | Gleicher fachlicher State (`needs_correction` / `needs_adjustment`); **R1** vs. **R2** Wording. |
| **In Entscheid** | R2 hat „Antrag weiterreichen“ ausgelöst; technisch **`in_implementation`**. |
| **Bewilligt** / **Abgelehnt** | Abschluss nach Entscheid (`approved` / `rejected`). |

**Technisch umgesetzt:** Entwurf, Beratung & Empfehlung, In Review; R2-Forward **`in_review` → `in_implementation`** (In Entscheid) bzw. **`in_review` → `needs_correction`** (R1-Anpassungspfad, kanonisch „Anpassung erforderlich“) über `review-forward/route.ts`. **Rückkehr `needs_correction` \| `needs_adjustment` → `in_review`** nach erledigten Anpassungen über **`r1-release-adjustments/route.ts`**. **`approved` / `rejected`** (R3-Entscheid) im Modell vorgesehen; Umsetzung im Workspace nach Bedarf.

### Ableitungslogik (verbindlich)

Zentral in **`lib/application-status.ts`** — nicht in UI duplizieren:

- `approved` → Bewilligt  
- `rejected` → Abgelehnt  
- `in_decision` / `in_implementation` → In Entscheid  
- `needs_adjustment` / `needs_correction` → Anpassung erforderlich (R1) / ausstehend (R2)  
- Submit-Marker (`finalSubmitted`, `submittedAt`, `applicationDefinition`) bzw. finaler Review-Hinweis → **In Review**  
- Sonst, wenn Beratung gestartet (`consultation.status` oder `recommendation.ready`) → **Beratung & Empfehlung**  
- Sonst → **Entwurf**

### Badge-Styling

State-Badges orientieren sich an **Figma-Farbkodierung** (kompakt, ohne Border) — reines Styling, Logik bleibt in `application-status.ts`.

---

## 10. R2 Workspace-Test — Leitplanken

- Detailansicht **read-only** (außer definierte Aktionen). Im `WorkspaceApplicationReview` über `viewMode` gesteuert:
  - `interactive` (in_review) — voller Review-Modus.
  - `readonly_consultation` (consultation_recommendation) — Beratungsphase: zeigt nur Blöcke mit Inhalt; der **`RecommendationDraftEditor`** wird als `bottomAction` eingeblendet, solange `releasedHtml` leer ist.
  - `readonly_adjustment_pending` (needs_adjustment) — R2 wartet auf R1-Korrektur.
  - `readonly_decision` (in_decision / approved / rejected) — Snapshot.
- Dokumente in **neuen Tabs** öffnen, wo vorgesehen.
- **Empfehlungsschreiben erstellen (Beratungsphase):**
  - Verfasst im **`RichTextEditor`** (TipTap + shadcn-Styling).
  - „Entwurf speichern“ (links) → `data.recommendation.draftHtml` / `draftText`.
  - „Empfehlungsschreiben freigeben“ (rechts) → `data.recommendation.releasedHtml` / `releasedText` / `releasedAt` / `releasedBy` + `ready: true`. Nach dem Release verschwindet der Editor; statt dessen erscheint der `RecommendationReleasedAccordion`.
- Aktion **„Beratung durchgeführt + Empfehlung freigeben“** (Legacy) und die o. g. Rich-Text-Releaseschreiben in `applications.data` ausschließlich unter:
  - `consultation`
  - `recommendation`
- **Block-Review nach `in_review`:** Persistenz unter **`data.recommendation.workspaceReview`** (innerhalb des Trigger-erlaubten `recommendation`-Pfads). Details: `Antrag_Review_Kontext.md` § 4.
- **„Antrag weiterreichen“ / „Anpassungen weiterleiten“** (nur sichtbar, wenn alle angezeigten Blöcke `confirmed` oder `adjustment` sind): **`POST /api/applications/review-forward`** mit Session-Client, Body u. a. `nextStatus`, `workspaceReview`:
  - Alle sichtbaren Blöcke `confirmed` ⇒ `nextStatus: "in_implementation"` (kanonisch „In Entscheid“).
  - Mind. ein Block `adjustment` ⇒ `nextStatus: "needs_correction"` (kanonisch R1 „Anpassung erforderlich“ / R2 „Anpassung ausstehend“).
  - Schreibt `recommendation.workspaceReview.postSubmit` und `forwardedComments`. **`r1AdjustmentResolutions`** bleibt im JSON erhalten (Trigger); Leeren nur via R1-Release-API.
- Diese Aktionen ändern den technischen **`applications.status`** **nicht** in einer Weise, die R1-**Finalsubmit** blockiert (RLS-konform).
- Andere `data`-Felder für R2: **trigger-/policy-seitig gesperrt**.

---

## 11. DB / RLS / Trigger — nicht verletzen

- Workspace-Policies: Zugriff für Rollen **R2, R3, R5, R6** (bestehende `applications_select_r2_worklist`). **R4** erhält dieselbe Lesesicht auf die Inbox über die additive Migration **`20260513190000_r4_workspace_select_policies.sql`** (`applications_select_r4_workspace` sowie `users_select_r4_workspace_applicants` für Embed). **R4-Schreiben:** Migration **`20260514120000_applications_update_r4_decision.sql`** — Policy **`applications_update_r4_decision`** (`USING` `in_implementation`, `WITH CHECK` `in_implementation` oder `approved`). **Wichtig:** beide Policy-Familien nutzen **`current_user_role()`** (wie die übrigen Workspace-Policies) — **kein** `EXISTS (SELECT … FROM public.users …)` innerhalb von RLS auf `users`/`applications`, sonst Endlos-Rekursion Postgres (**Symptom u. a.:** Login kann Profil nicht laden). Die **SELECT**-Policy `applications_select_r2_worklist` umfasst seit Migration **`extend_workspace_select_to_decision_states`** auch **`in_implementation`**, **`approved`** und **`rejected`** — sonst scheitert der `UPDATE` von `in_review → in_implementation` am implizit folgenden `RETURNING`-SELECT (Postgres-RLS-Mechanik). **`SUPABASE_SERVICE_ROLE_KEY` ist für den Forward-Pfad nicht erforderlich.**
- **UPDATE**-Policy `applications_update_r2_worklist` deckt den Übergang aus `in_review` heraus (`USING`); `WITH CHECK` erlaubt die Ziel-Status `in_implementation` / `needs_correction`.
- R1 darf eigenen Antrag nur in **erlaubten Status** updaten (`applications_update_r1_own_limited`).
- **Konsequenz:** Beratungsphase darf technisch **nicht** in einem Status landen, der den **späteren Final-Submit** durch R1 blockiert. Umgesetzter Pfad: Beratung im Workspace u. a. bei **`submitted`**, finaler Submit R1 → **`in_review`** → R2-Forward → **`in_implementation`** / **`needs_correction`**.
- Trigger **`enforce_r2_application_update_columns`:** R2 darf in `applications.data` nur **`consultation`** / **`recommendation`** ändern — nicht `summary`, `applicationDefinition`, `personalData`, `r1AdjustmentResolutions` (Root) **entfernen oder inhaltlich ändern**. Vor R2-Saves **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`); Forward-Route merged volles `base` aus `row.data` ohne Streichen von `r1AdjustmentResolutions`.

---

## 12. Arbeitsregeln bei Änderungen

1. Keine Regression in bereits umgesetzten Screens ohne Produktentscheid.
2. Status- und Freischaltlogik **datenbasiert** halten — Step 4/5 nur über `releasedHtml` (`isRecommendationReleasedToR1`), nie über `currentStep === step3_recommendation`.
3. R2-**Trigger-Grenzen** strikt einhalten (nur `consultation` / `recommendation`); R2-Review-Daten gehören unter `recommendation.workspaceReview`.
4. **Realtime-Subscriptions** im R1-Flow immer auf die **aktive `application.id`** scopen, nicht auf `applicant_id` — sonst können Updates eines anderen Antrags den lokalen Step-State überschreiben.
5. RLS-Anpassungen: bei **Status-Übergängen** prüfen, ob die Ziel-Zeile nach dem Update via SELECT-Policy weiterhin sichtbar ist (sonst `new row violates row-level security policy`).
6. Neue Screens nach Möglichkeit **screen-by-screen** aus Figma.
7. Neue Pflichtfelder: klare **Error-UI** und Konsistenz mit Übersicht/Sidebar.
8. Status-Erweiterungen in **`application-status.ts`** zentralisieren.

---

## 13. Verwandte Dokumente

| Datei | Nutzen |
|-------|--------|
| `General_Prototype_Kontext.md` | Tech, Rollen, Architektur, Scope |
| `Antrag_Review_Kontext.md` | R2-Block-Review, Forward, R1-Freigabe-Loop, Persistenz, UI-Details |
| `Antrag_Bewilligung_Kontext.md` | R4 Bewilligung, Workspace-RLS, APIs |
| `Dashboard_Core_Layout_Kontext.md` | Portal-/Workspace-Dashboard-Shell vs. R1-Flow |
| `High_Fidelity_Design_Kontext.md` | HF-Tokens, Grid, R1-Flow-Shell Figma-Referenzen |
| `Prototyp_Funktionen.md` | Langfristige Funktionsvision |
