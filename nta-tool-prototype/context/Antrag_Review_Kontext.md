# Kontext: Antrag Review (nach finaler Einreichung, R2) — NTA Prototyp

> **Zweck:** Zentrale Referenz für Chats zur **Review-Ansicht nach finalem R1-Submit**, **UI**, **Client-State**, **Sidebar-Kommentare** und **Code-Ankern**.  
> **Backend:** Persistenz/RLS noch nicht angebunden — siehe Abschnitt [Daten & Backend](#4-daten--backend).  
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
- **Umgesetzt (Prototyp, nur UI/Client-State):** Block-Footer, Sidebar-Kommentar-Composer, Chronik, Zurücksetzen mit Bestätigung bei Anpassung.
- **Noch Zielbild / nicht umgesetzt:** Sobald **`needs_adjustment`** und Korrekturphase aktiv → **R2 read-only** bis zur nächsten Runde nach R1-Freigabe; globaler Statuswechsel über `applications.status` / `data`.

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
- **Trigger** `enforce_r2_application_update_columns` (laut Doku): R2 darf `applications.data` aktuell nur **`consultation`** / **`recommendation`** ändern. **Block-Review** (Phasen, Bemerkungen, Chronik) braucht für echte Persistenz **Erweiterung** (JSON-Pfade und/oder Tabellen, Policies) — vor Deploy **Policies/Migrationen im Repo** prüfen.
- **Prototyp jetzt:** Review-Blockzustand und Kommentare nur **React-State** in `workspace-application-review.tsx` (kein Supabase-Write für Review).

---

## 5. Implementierter UI- und Client-Stand

### Auslösung Review-Ansicht

- **`workspace-test-flow.tsx`:** Ausgewählter Antrag mit `deriveCanonicalApplicationState === "in_review"` → **`WorkspaceApplicationReview`** statt Karten-Detail „Empfehlung freigeben“.
- Sonst: Liste bzw. Legacy-Karten-Detail.

### Hauptkomponenten (Code-Anker)

| Komponente | Pfad | Rolle |
|------------|------|--------|
| Review-Hauptansicht | `components/domain/workspace-application-review.tsx` | Blockliste links, State, Dialoge, Sidebar-Props |
| Detail-Sidebar | `components/domain/application-review-detail-sidebar.tsx` | Antragdetails, Kommentar-Composer (Vollspalte), Chronik |
| Labels / Konstanten | `lib/application-review-labels.ts` | Scope, Massnahmen, Hilfsfunktionen |
| Status | `lib/application-status.ts` | Ableitung, Meta für Sidebar-Badge |
| Toolbar | `components/domain/workspace-r2-toolbar-context.tsx` | Topbar-Slot („Zurück zur Liste“) |
| Workspace-Flow | `components/domain/workspace-test-flow.tsx` | Liste, Routing Review vs. Detail |
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

- **„Anpassungen anfordern“** (global): weiterhin **disabled**, Platzhalter für spätere Gesamtlogik.

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
| **Persistenz** | Blockphasen, Bemerkungen, Chronik → `applications.data` oder Tabellen; **RLS** + Trigger-Erweiterung |
| **`applications.status`** | Wechsel zu `needs_adjustment` / Rückkehr `in_review` nach R1-Korrektur — mit `application-status.ts` und Policies abstimmen |
| **Gesamt „Anpassungen anfordern“** | Logik + Aktivierung wenn alle relevanten Blöcke bearbeitet |
| **Entscheid-Übergang** | Rolle R3 vs. Produktbegriff |
| **Dateien** | echte Storage-URLs Attest/Empfehlung |
| **Realtime / F6** | Abgleich mit `Prototyp_Funktionen.md`, `application_events` / Annotationen |

---

*Letzte Aktualisierung: Block-Review UI (Phasen, Sidebar-Composer Vollspalte, Reset-Dialog, Kommentarchronik), Client-State-Anker und offene Backend-Schritte dokumentiert.*
