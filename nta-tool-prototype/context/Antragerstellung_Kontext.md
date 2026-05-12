# Kontext: Antragserstellung (R1) & R2-Beratung — Prototyp NTA

> **Zweck:** Operative Referenz für Chats zu **Anpassungen und Integrationen** rund um den **Antragsflow R1** bis zur finalen Einreichung, die **Status-/Badge-Logik**, den **Workspace-Test R2** (Beratung/Empfehlung) sowie **RLS/Trigger**.  
> **Review-/Korrektur-Loop** nach Einreichung (R2 Block-Review, R1-Anpassungen, erneuter Review-Zyklus) → **`Antrag_Review_Kontext.md`**. Gesamtprototyp → `General_Prototype_Kontext.md`. Zielbild-Funktionen → `Prototyp_Funktionen.md`.

---

## 1. Produktscope (aktueller Stand)

- R1 **Antragserstellung** end-to-end bis zum **finalen Submit**; danach fachlich **„In Review“**.
- R2 kann **Beratung + Empfehlung** und im Anschluss den **Block-Review** im **Workspace** bearbeiten und mit **„Antrag weiterreichen“** in **`in_implementation`** bzw. **`needs_correction`** überführen (Schreibzugriff nur auf definierte `data`-Teile).
- **Empfehlungsschreiben** wird nicht mehr als Datei-Upload, sondern als **Rich-Text** (TipTap) direkt im Antrag verfasst. R2 nutzt dafür in der Phase „Beratung & Empfehlung“ den `RecommendationDraftEditor` (Entwurf speichern / freigeben); R1 sieht den freigegebenen Text identisch gestylt über den geteilten `RecommendationReleasedAccordion` in Step 3 und Step 5.
- R1 **Dashboard:** Liste eigener Anträge; **Klick auf einen Antrag** öffnet stets die Block-Detailansicht `PortalApplicationAdjustment` (Layout wie R2-Review, Editieren nur im Status `needs_adjustment`). **Neuer Antrag** weiterhin über **`?new`** / **`?new=1`** mit leerem Stand.
- **Statusdarstellung** für Badges ist **zentral** in `lib/application-status.ts` (R1/R2 konsistent; Wording z. B. bei „Anpassung“ rollenabhängig).
- R1- und R2-Dashboard nutzen ein gemeinsames **`RoleDashboardLayout`** (einklappbare Sidebar, rollenspezifische Nav-Items).

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
- **Mit `?applicationId=<uuid>`** rendert die Page nicht mehr den Step-Flow, sondern die Block-Detailansicht `PortalApplicationAdjustment` — Layout analog zur R2-Review. Bearbeitung ist nur aktiv, wenn `deriveCanonicalApplicationState === "needs_adjustment"` (im Portal z. B. `canEditBlocks`); sonst Lese-Modus mit „Zurück zum Dashboard“ und **Antrag zurückziehen**. Nach Aktionen von R2/R1 kann sich der Status per **Broadcast** (`application-realtime-sync`) bzw. **Router-Refresh** aktualisieren; das **Student-Dashboard** pollt zusätzlich die eigene Antragsliste (sichtbare Status-Badges).
- `/portal` kann noch auf die Antragserstellung zeigen — mit `app/` abgleichen.

### R2

| Zweck | Route |
|-------|--------|
| Login | `/staff/login` |
| Workspace (R2–R6) | `/workspace` |

---

## 3. Kerndateien (Implementierung)

| Datei | Rolle |
|-------|--------|
| `components/nta-antrag-desktop.tsx` | R1 Flow Step 1–6: Validierung, Autosave, Realtime (per **`application.id`** gescoped), Sidebar, Delete |
| `app/portal/antragserstellung/page.tsx` | Steuert Initial-Load: `?new` ⇒ leer; `?applicationId` ⇒ `PortalApplicationAdjustment`; sonst nur **resumable** Anträge auto-laden |
| `components/domain/portal-application-adjustment.tsx` | R1 Block-Detailansicht (Layout wie R2-Review). Edit nur bei kanonisch `needs_adjustment`; per-Block Autosave; Freigabe **„Anpassungen für Review freigeben“** → `POST /api/applications/r1-release-adjustments`; Realtime-Broadcast-Listener + Refetch |
| `components/domain/student-dashboard.tsx` | R1 Dashboard (Liste; Klick → `?applicationId=<uuid>`); **Polling** der Anträge des eingeloggten Antragstellers für aktuelle `status`/Badges |
| `app/portal/home/page.tsx` | Serverpage R1 Dashboard |
| `components/domain/workspace-test-flow.tsx` | Workspace: Liste, View-Mode-Ableitung, `RecommendationDraftEditor` als `bottomAction` in `consultation_recommendation` |
| `components/domain/workspace-application-review.tsx` | R2 Block-Review inkl. Persistenz, Forward, View Modes (`interactive` / `readonly_consultation` / `readonly_adjustment_pending` / `readonly_decision`) |
| `components/domain/rich-text-editor.tsx` | TipTap-Wrapper (StarterKit + Underline/Link/TextAlign/Placeholder/Custom-Heading) mit shadcn-styled, reaktiver Toolbar (`useEditorState`) |
| `components/domain/recommendation-released-accordion.tsx` | Geteilte Anzeige für `recommendation.releasedHtml` (Variant `card` für R2-Review, `plain` für R1-Antragsflow); Header inline mit Avatar + Freigegeben-Pill |
| `components/ui/accordion.tsx` | shadcn-Wrapper um `radix-ui` Accordion (ohne Hover-Underline) |
| `app/api/applications/review-forward/route.ts` | R2 Forward: `in_implementation` / `needs_correction` (RLS-konform); merged `data` muss **`r1AdjustmentResolutions`** nicht streichen (Trigger) |
| `app/api/applications/r1-release-adjustments/route.ts` | R1: `needs_correction` \| `needs_adjustment` → `in_review`, merged `workspaceReview`, geleerte Resolutions, Broadcast |
| `lib/r1-adjustment-release.ts` | Bedingungen und Build von `postSubmit` nach R1-Freigabe (`pending_after_adjustment`, Filter `forwardedComments`) |
| `lib/workspace-review-hydration-key.ts` | Fingerabdruck `postSubmit` für stabile R2-Remounts bei wiederholtem `in_review` |
| `lib/application-realtime-sync.ts` | Broadcast-Kanal pro `applicationId` nach mutierenden Updates |
| `components/domain/role-dashboard-layout.tsx` | Gemeinsames R1/R2 Dashboard-Layout (collapsible Sidebar, Workspace-Topbar R2) |
| `lib/test-flow-types.ts` | `ApplicationData` / `applications.data` (inkl. `recommendation.draftHtml`/`releasedHtml`/`releasedBy`, `recommendation.workspaceReview`, `r1AdjustmentResolutions`) |
| `lib/application-status.ts` | Zentrale fachliche States + rollenabhängige Labels/Farben |
| `lib/r2-review-persist.ts` | Helfer `dataWithoutLegacyReviewRoots` für trigger-konforme R2-Saves |
| `lib/review-workspace-blocks.ts` | Block-IDs + `reviewWorkspaceAnchorId` (Anker-Sprung in R1/R2-Sidebar-Kommentaren) |
| `components/domain/application-status-badge.tsx` | Badge-UI aus Status-Ableitung |
| `utils/supabase/service-role.ts` | Optionaler Service-Role-Client (aktuell **nicht** im Forward-Pfad benötigt) |

---

## 4. R1 Flow (fachlich)

### Step 1 — Persönliche Angaben

- Pflichtfelder inkl. Matrikel **`XX-XXX-XXX`**; Feldweise Fehler-States.

**Sperre:** Sobald `consultation.status` **`booked`** oder **`done`** ist, sind Step-1-Inhalte (inkl. Studium, Antragsart) **read-only** in **Übersicht (Step 5)** und bei **erneutem Öffnen von Step 1** über die Sidebar.

### Step 2 — Fachärztliches Attest

- Multi-Upload (Drag & Drop / Dateiauswahl); Löschen pro Datei; **mind. eine Datei** Pflicht.

### Step 3 — Beratung & Empfehlung

- Terminwahl (Kalender + Slot); nach Buchung Waiting-Screen.
- **Empfehlung:** Realtime, sobald R2 freigibt (`data.recommendation.releasedHtml` + `ready: true`); **Kenntnisnahme-Checkbox** Pflicht.
- Anzeige des freigegebenen Schreibens über den geteilten **`RecommendationReleasedAccordion`** (Variant `plain`) — gleicher visueller Block wie auf R2-Seite. Der frühere Datei-Tile (`recommendation.url`, Hilfsfunktion `fileNameFromUrl`) ist vollständig entfernt; existierende `url`-Werte bleiben im JSON erhalten, werden aber nicht mehr gerendert.
- Solange `releasedHtml` noch leer ist, zeigt der Step nur einen kurzen Hinweis („Die Fachstelle hat noch kein Empfehlungsschreiben freigegeben.“) — kein Datei-Fallback mehr.

### Step 4 — Antrag stellen (Definition)

- Blöcke gemäß Figma/Produkt; Pflicht: Freitext, Dauer, pro Auswahlblock mind. eine Option; „Sonstige“ mit Zusatztext wo vorgesehen.

### Step 5 — Übersicht

- Gesamter Antrag als Review; Step-1 **locked**; Rest **editierbar**.
- Live-Validierung: fehlende Pflichtinhalte **rot**; zugehöriger **Prozessschritt** in der Sidebar bei Fehler **rot**.
- Empfehlungsschreiben-Block nutzt denselben `RecommendationReleasedAccordion` wie Step 3 (Variant `plain`); Fallback-Text identisch.
- **Finales Senden** schreibt u. a. **`submittedAt`**, **`finalSubmitted`**, **`applicationDefinition`** in `applications.data` und führt fachlich in **„In Review“**. Das `recommendation`-Objekt wird per Spread erhalten (`...application.data.recommendation`) und `ready: true` gesetzt — vorhandene `draftHtml`/`releasedHtml`/`releasedBy`/Legacy-`url` bleiben unangetastet.

### Step 6 — Erfolg

- Success-Screen, z. B. **„Zum Dashboard“** → `/portal/home`.
- **Realtime** darf nach finalem Submit **nicht** wieder auf frühere Steps (z. B. nur Empfehlung) springen — **Lock über Submit-Marker** (`finalSubmitted` / `submittedAt`).
- **Realtime-Scope:** Subscription in `nta-antrag-desktop.tsx` filtert auf **`id=eq.${activeApplicationId}`** (nicht auf `applicant_id`). Ohne aktive `application.id` wird **keine** Subscription geöffnet. Damit kann ein bereits eingereichter Altantrag den Step-State eines neu gestarteten Drafts nicht mehr auf `step6_submitted` zurückwerfen.

---

## 5. Prozessfortschritt (Sidebar) — Sollverhalten

- Steps nur klickbar, wenn **freigeschaltet**; Freischaltung **datenbasiert** (nicht nur `currentStep`).
- Farben: **Grün** abgeschlossen; **Schwarz** aktiv oder nächster offener Step; **Grau** gesperrt; **Rot** ungültig in Übersicht.
- **Trennlinie** nach „Beratung und Empfehlung“: vor Empfehlung sichtbar; nach freigegebener Empfehlung **dauerhaft ausgeblendet**.

---

## 6. R1 Dashboard — Sollverhalten

- Liste aller eigenen Anträge.
- **Neuen Antrag erstellen** → komplett leer über **`?new=1`** (auch `?new` ohne Wert genügt).
- **Klick auf einen Eintrag** → `?applicationId=<uuid>` rendert immer die Block-Detailansicht `PortalApplicationAdjustment` (kein Inline-Detail im Dashboard mehr).
  - Im Status **`needs_adjustment`**: pro Block „Anpassung vornehmen“ (Edit-Mode) + „Anpassung speichern“; per-Block Autosave; bestätigte Blöcke grün, ausstehende amber mit Original-Bemerkung der Fachstelle; Sidebar-Kommentare springen per Klick zum passenden Block (`reviewWorkspaceAnchorId`); abgeschlossene Anpassungen landen in `data.r1AdjustmentResolutions` (`R1AdjustmentResolution.resolvedAt`).
  - In allen anderen Status: reine Lese-Ansicht (gleiches Layout, keine Edit-Buttons).
  - **Persistenter „Zurück zum Dashboard“**-Button oben links (`absolute`) und **Löschen-Aktion** sind in jedem Status verfügbar.
- Direktaufruf von `/portal/antragserstellung` ohne Parameter: lädt nur **resumable** Anträge automatisch; bei bereits eingereichten Anträgen erscheint ein leeres Formular (kein Re-Display des Erfolgs-Screens).
- Sidebar wie im Layout: **collapsible** (expanded / icon-only).

---

## 7. Datenmodell `applications.data` (relevant)

- `title`, `summary`
- `personalData`
- `attestFiles`
- `consultation`: `status` **`booked` | `done`**, date, slot, location, advisor
- `recommendation`:
  - `ready: boolean` — Step-Gating R1 (Step 3 erreichbar).
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

## 8. Statusmodell (kanonisch, R1/R2)

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

## 9. R2 Workspace-Test — Leitplanken

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

## 10. DB / RLS / Trigger — nicht verletzen

- Workspace-Policies: Zugriff für Rollen **R2, R3, R5, R6**. Die **SELECT**-Policy `applications_select_r2_worklist` umfasst seit Migration **`extend_workspace_select_to_decision_states`** auch **`in_implementation`**, **`approved`** und **`rejected`** — sonst scheitert der `UPDATE` von `in_review → in_implementation` am implizit folgenden `RETURNING`-SELECT (Postgres-RLS-Mechanik). **`SUPABASE_SERVICE_ROLE_KEY` ist für den Forward-Pfad nicht erforderlich.**
- **UPDATE**-Policy `applications_update_r2_worklist` deckt den Übergang aus `in_review` heraus (`USING`); `WITH CHECK` erlaubt die Ziel-Status `in_implementation` / `needs_correction`.
- R1 darf eigenen Antrag nur in **erlaubten Status** updaten (`applications_update_r1_own_limited`).
- **Konsequenz:** Beratungsphase darf technisch **nicht** in einem Status landen, der den **späteren Final-Submit** durch R1 blockiert. Umgesetzter Pfad: Beratung im Workspace u. a. bei **`submitted`**, finaler Submit R1 → **`in_review`** → R2-Forward → **`in_implementation`** / **`needs_correction`**.
- Trigger **`enforce_r2_application_update_columns`:** R2 darf in `applications.data` nur **`consultation`** / **`recommendation`** ändern — nicht `summary`, `applicationDefinition`, `personalData`, `r1AdjustmentResolutions` (Root) **entfernen oder inhaltlich ändern**. Vor R2-Saves **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`); Forward-Route merged volles `base` aus `row.data` ohne Streichen von `r1AdjustmentResolutions`.

---

## 11. Arbeitsregeln bei Änderungen

1. Keine Regression in bereits umgesetzten Screens ohne Produktentscheid.
2. Status- und Freischaltlogik **datenbasiert** halten.
3. R2-**Trigger-Grenzen** strikt einhalten (nur `consultation` / `recommendation`); R2-Review-Daten gehören unter `recommendation.workspaceReview`.
4. **Realtime-Subscriptions** im R1-Flow immer auf die **aktive `application.id`** scopen, nicht auf `applicant_id` — sonst können Updates eines anderen Antrags den lokalen Step-State überschreiben.
5. RLS-Anpassungen: bei **Status-Übergängen** prüfen, ob die Ziel-Zeile nach dem Update via SELECT-Policy weiterhin sichtbar ist (sonst `new row violates row-level security policy`).
6. Neue Screens nach Möglichkeit **screen-by-screen** aus Figma.
7. Neue Pflichtfelder: klare **Error-UI** und Konsistenz mit Übersicht/Sidebar.
8. Status-Erweiterungen in **`application-status.ts`** zentralisieren.

---

## 12. Verwandte Dokumente

| Datei | Nutzen |
|-------|--------|
| `General_Prototype_Kontext.md` | Tech, Rollen, Architektur, Scope |
| `Antrag_Review_Kontext.md` | R2-Block-Review, Forward, R1-Freigabe-Loop, Persistenz, UI-Details |
| `Prototyp_Funktionen.md` | Langfristige Funktionsvision |
