# Kontext: Antrag Review (nach finaler Einreichung, R2) — NTA Prototyp

> **Zweck:** Zentrale Referenz für Chats zur **Review-Ansicht nach finalem R1-Submit**, **UI**, **Client-State**, **Sidebar-Kommentare** und **Code-Ankern**.  
> **Backend:** R2-Review-Persistenz und Forward-Aktion (`in_implementation` / `needs_correction`) sind RLS-konform umgesetzt — siehe Abschnitt [Daten & Backend](#4-daten--backend).  
> **Verwandt:** `Antragerstellung_Kontext.md` · `General_Prototype_Kontext.md` · `Prototyp_Funktionen.md` (F6 Korrektur-Loop)

---

## 1. Ausgangslage (fachlich)

- Nach **finalem Submit** durch R1 ist der Antrag fachlich **„In Review“** (Submit-Marker und Ableitung in `lib/application-status.ts`; Details `Antragerstellung_Kontext.md`).
- **Review nach Einreichung** wird in dieser Phase **nur von R2** im Workspace bearbeitet (kein paralleler R3-Review hier).
- **Workspace-Einstieg:** **`/workspace`** (Route **`/workspace/test`** entfernt; alles unter `/workspace`).

---

## 2. Rollen, Status, Korrektur-Loop (Zielbild)

### R2

- Antrag mit kanonischem Status **„In Review“** öffnen → **Review-Ansicht** (`WorkspaceApplicationReview`).
- Pro **Block:** **Bestätigen** oder **Anpassung anfordern** (mit **Pflichtbemerkung** über die Sidebar; siehe unten).
- **Umgesetzt:** Block-Footer, Sidebar-Kommentar-Composer, Chronik, Zurücksetzen mit Bestätigung bei Anpassung; **Persistenz** des Entwurfs in `data.recommendation.workspaceReview.draft` (debounced) und **Weiterreichen** über `/api/applications/review-forward` mit Statuswechsel auf `in_implementation` (alles bestätigt) bzw. `needs_correction` (mind. eine Anpassung).
- **Read-only nach Forward:** Sobald `applications.status` ∈ {`in_implementation`, `approved`, `rejected`} ist, rendert `WorkspaceApplicationReview` im Modus **`readonly_decision`**: keine Footer-Aktionen, kein Composer, Chronik aus `recommendation.workspaceReview.forwardedComments`. Voraussetzung dafür ist die erweiterte SELECT-Policy `applications_select_r2_worklist` (siehe § 4).
- **Noch Zielbild:** Wechsel `needs_correction → in_review` nach erneuter R1-Freigabe sowie der globale Entscheidungs-Übergang (R3/R4) hängen am `application-status.ts`-Pfad und der RPC-Erweiterung.

### R1

- **„In Review“** ohne offene Anpassungen: Antrag **read-only** (Dashboard).
- Nach **Anpassungsanforderung:** R1 **„Anpassung erforderlich“**, R2-Label **„Anpassung ausstehend“** (`needs_adjustment`; Labels `getStatusLabelForAudience`).
- **Noch:** Nur betroffene Blöcke editierbar; erneute Freigabe zur Review → wieder **„In Review“**.

### Loop & Entscheid

- Wiederholung bis **alle relevanten Blöcke von R2 bestätigt** → **Weiterleitung Entscheid** (Produktsprache vs. Repo: R3/R4 — beim Implementieren abstimmen).

---

## 3. Status & Badges

- **Zentral:** `lib/application-status.ts` — `deriveCanonicalApplicationState`, `getApplicationStatusMeta`, Export **`ApplicationStatusMeta`**.
- UI-Badges: `components/domain/application-status-badge.tsx`.
- **Keine** zweite Statuslogik in Screens duplizieren.

---

## 4. Daten & Backend

- **Kern:** `applications` + JSONB **`data`**, Spalte **`status`**.
- **Trigger** `enforce_r2_application_update_columns`: R2 darf `applications.data` ausschließlich unter **`consultation`** / **`recommendation`** schreiben — alles andere wirft `R2 may not change data except recommendation/consultation`.
- **Persistenz Block-Review (Prototyp, jetzt):** Phasen, Bemerkungen und Chronik liegen unter **`data.recommendation.workspaceReview`** (innerhalb des erlaubten Trigger-Pfads). Schemas in `lib/test-flow-types.ts`:
  - `data.recommendation.workspaceReview.draft`: laufender R2-Entwurf (`R2ReviewDraft` — `updatedAt`, `blocks`, `reviewComments`); wird debounced gespeichert (`persistReviewDraft` in `workspace-application-review.tsx`, ~500 ms).
  - `data.recommendation.workspaceReview.postSubmit`: Snapshot beim **Weiterreichen** (`R2PostSubmitReview` — `forwardedAt`, `blocks`).
  - `data.recommendation.workspaceReview.forwardedComments`: persistierte Kommentar-Chronik beim Weiterreichen.
- **Legacy-Wurzelfelder** (`reviewComments`, `r2PostSubmitReview`, `r2ReviewDraft` direkt in `data`) werden vor jedem Save mit **`dataWithoutLegacyReviewRoots`** (`lib/r2-review-persist.ts`) entfernt — sonst feuert der Trigger.
- **Forward-Aktion** geht über die API-Route **`app/api/applications/review-forward/route.ts`** (Session-Client, RLS-konform — kein `SUPABASE_SERVICE_ROLE_KEY` nötig). Setzt `applications.status` auf `in_implementation` (alle Blöcke bestätigt) bzw. `needs_correction` (mind. eine Anpassung) und schreibt `recommendation.workspaceReview` final.
- **RLS-Anker:** `applications_select_r2_worklist` umfasst seit Migration `extend_workspace_select_to_decision_states` auch **`in_implementation` / `approved` / `rejected`**, damit R2 den weitergereichten Antrag nach dem Statuswechsel im Workspace im Modus `readonly_decision` weiter sehen kann (Details siehe `Antragerstellung_Kontext.md` § 10).

---

## 5. Implementierter UI- und Client-Stand

### Auslösung Review-Ansicht

- **`workspace-test-flow.tsx`:** Ausgewählter Antrag mit `deriveCanonicalApplicationState === "in_review"` → **`WorkspaceApplicationReview`** statt Karten-Detail „Empfehlung freigeben“.
- Sonst: Liste bzw. Legacy-Karten-Detail.

### Hauptkomponenten (Code-Anker)

| Komponente | Pfad | Rolle |
|------------|------|--------|
| Review-Hauptansicht | `components/domain/workspace-application-review.tsx` | Blockliste links, State, Dialoge, Sidebar-Props, debounced Draft-Persist, Forward-Aufruf |
| Detail-Sidebar | `components/domain/application-review-detail-sidebar.tsx` | Antragdetails, Kommentar-Composer (Vollspalte), Chronik |
| Persistenz-Helfer | `lib/r2-review-persist.ts` | `dataWithoutLegacyReviewRoots`, Pfade unter `recommendation.workspaceReview` |
| Forward-API | `app/api/applications/review-forward/route.ts` | Session-Client-Update auf `in_implementation` / `needs_correction`, schreibt finale Review-Snapshots |
| Review-Block-Definition | `lib/review-workspace-blocks.ts` | Geteilte Block-IDs, Default-Phasen, Hilfsstrukturen |
| Labels / Konstanten | `lib/application-review-labels.ts` | Scope, Massnahmen, Hilfsfunktionen |
| Status | `lib/application-status.ts` | Ableitung, Meta für Sidebar-Badge |
| Toolbar | `components/domain/workspace-r2-toolbar-context.tsx` | Topbar-Slot („Zurück zur Liste“) |
| Workspace-Flow | `components/domain/workspace-test-flow.tsx` | Liste, Routing Review vs. Detail (inkl. `readonly_decision`) |
| Layout | `components/domain/role-dashboard-layout.tsx` | R2-Shell |

### Review-Blöcke (Reihenfolge)

1. **Antragsteller** — Persönliche Angaben ohne Antragsart.
2. **Fachärztliches Attest** — Dateizeilen (Placeholder wenn keine URL).
3. **Empfehlungsschreiben der Fachstelle** — gleiche Dateikachel; **ohne** Review-Footer (nur Lesen).
4. **Antragsdefinition** — `situationDescription`.
5. **Gültigkeitsdauer** — Vergleich der beiden Optionen.
6. **Geltungsbereich** — `APPLICATION_SCOPE_OPTIONS`.
7. **Ausgleichsmassnahmen LV / Leistungsnachweise** — wie Antragsformular inkl. Sonstige.

**IDs im Code (`ReviewBlockId`):** `applicant` · `attest` · `definition` · `duration` · `scope` · `lectureMeasures` · `assessmentMeasures`

### Block-Phasen (lokal, `ReviewBlockPhase`)

| Phase | Darstellung |
|--------|-------------|
| `pending` | Standard-Karte (`ReviewBlockCard`), Footer: **Anpassung anfordern** + **Bestätigen**. |
| `confirmed` | Außenrahmen teal (`footerTone="confirmed"`), Footer-Balken teal, **Zurücksetzen** + „Reviewed & Bestätigt“. |
| `adjustment` | Außenrahmen amber, Footer amber, Bemerkung im Inhalt, **Zurücksetzen** + „Anpassung angefordert“. |

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
- Unten: **Kommentare** — Hinweis oder **Chronik** gespeicherter Block-Kommentare (`SavedReviewComment`: `id`, `blockId`, `blockTitle`, `body`, `createdAt`).

**Aktiver Kommentarentwurf (`adjustmentComposer` gesetzt):**

- Die **gesamte rechte Spalte** zeigt nur die Kommentar-Ansicht (Antragdetails temporär ausgeblendet).
- Kopfzeile: **X** + Titel **„Kommentare“** — **X** = `onCancel()` (wie **Abbrechen**).
- Karte: amber Rahmen, Block-Titel, Textarea (Placeholder: *Erläutern Sie was konkret angepasst werden muss*), **Abbrechen** / **Speichern**.
- **Speichern:** nur bei nicht-leerem Text; sonst Fehlertext unter dem Feld. Nach erfolgreichem Speichern schließt die Ansicht automatisch (`pendingComposer` → `null` im Parent), Block wechselt zu **`adjustment`** mit Remark; Chronik erhält einen Eintrag.

**Figma-Referenz Sidebar-Kommentar:** Node `3550:7067` (Kit „Prototyp shadcn“).

### Gesamtbutton unter den Blöcken

- **„Antrag weiterreichen“** (alle Blöcke `confirmed`): grün, ruft `POST /api/applications/review-forward` mit `forwardKind="confirm_all"` → `applications.status = in_implementation`. Anschließend rendert die Ansicht `readonly_decision` (siehe oben).
- **„Anpassungen anfordern“** (mind. ein Block `adjustment`, Rest `confirmed`): amber, ruft dieselbe Route mit `forwardKind="request_adjustments"` → `applications.status = needs_correction` und persistiert die Kommentar-Chronik. Rückkehr zu `in_review` durch R1-Korrektur ist Zielbild.
- Solange noch Blöcke `pending` sind, bleibt der Button disabled (Vermeidung halber Forwards).

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

Details Sidebar-Einklapp-Logik / Z-Index: `role-dashboard-layout.tsx` und frühere Review-Notizen im Chat — bei Layout-Bugs dort nachziehen.

---

## 7. Server / Page

- **`app/workspace/page.tsx`:** `WorkspaceR2ToolbarProvider`, `RoleDashboardLayout role="R2"`, `WorkspaceTestFlow` mit `reviewerDisplayName` (Anzeige „Zugewiesen an“ / Kommentar-Karte).
- Review-Vollansicht ohne äußeren `px-6`-Listen-Wrapper (volle Fläche); Liste nutzt weiter `px-6 py-6` im Flow.

---

## 8. Offene Punkte / nächste Umsetzungen

| Thema | Hinweis |
|--------|---------|
| **`needs_correction → in_review`** | Rückkehr nach R1-Korrektur: Pfad in `application-status.ts`, RPC und Policies (analog zu `applications_update_r1_own_limited`) finalisieren |
| **Entscheid-Übergang** | `in_implementation → approved/rejected` (Rolle R3 vs. Produktbegriff R4); aktuell sind die Status nur lesend für R2 freigegeben |
| **Dateien** | echte Storage-URLs Attest/Empfehlung |
| **Realtime / F6** | Abgleich mit `Prototyp_Funktionen.md`, `application_events` / Annotationen |

---

*Letzte Aktualisierung: R2-Review-Persistenz unter `recommendation.workspaceReview`, Forward-Route `app/api/applications/review-forward/route.ts`, RLS-Erweiterung `extend_workspace_select_to_decision_states` und `readonly_decision`-Modus dokumentiert.*
