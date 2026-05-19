# NTA-Prototyp — Cursor-Kontext

> Briefing für Cursor. Beschreibt was der Prototyp tut, wie er aufgebaut ist, und welche Constraints gelten. Bei jeder neuen Aufgabe konsultieren.

---

## 1. Projekt in 3 Sätzen

Funktionaler Webapp-Prototyp zur Simulation des Nachteilsausgleich-Prozesses (NTA) an Schweizer Hochschulen. Bachelor-Projekt HSLU Digital Ideation, Forschungsinstrument für Usability-Tests, kein Production-System. Initialer Fokus: Prozessmodell Typ A (zentrale Fachstelle + dezentraler Entscheid).

## 2. Bewertungs-Kriterium (entscheidet Prioritäten)

> *"Der Gesamtprozess ist als zusammenhängende Simulation durchspielbar. Jede Rolle kann in einem Testing-Setting ihren Flow durchlaufen. Aktionen einer Rolle wirken sich nachvollziehbar auf andere Rollen aus."*

**Bei Unsicherheit gilt: Tiefe der Multi-Stakeholder-Simulation > Breite des Feature-Sets.**

---

## 3. Tech Stack (fix)

| Schicht | Technologie |
|---|---|
| Framework | Next.js (App Router) — **Ist-Repo:** `nta-tool-prototype/package.json` (z. B. Next 16) als Quelle der Wahrheit |
| Sprache | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-Variablen für Tokens) |
| Komponenten | shadcn/ui (in `/components/ui/`) |
| Client-State | React `useState` / `useRef` im Prototyp; Zustand nur wo explizit genutzt |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) |
| Auth | Supabase E-Mail/Passwort (UI als SSO inszeniert) |
| Package Manager | **Ist-Repo:** npm (Workspace `nta-tool-prototype`); Vision/Doku kann pnpm nennen — Build immer gegen `package.json` prüfen |
| Deployment | Vercel + GitHub |

**Nicht erlaubt ohne Rücksprache:**
- Andere UI-Libraries (MUI, Chakra, Mantine etc.)
- Form-Libraries (Formik, react-hook-form, etc.) — wir bauen einen DynamicFormRenderer selbst
- ORMs (Drizzle, Prisma) — `supabase-js` direkt
- Headless CMS (Sanity, Contentful, Strapi)
- State-Libraries neben Zustand

---

## 4. Architektur — drei UI-Bereiche

```
/app
  /student          → Studierenden-Einstieg (öffentlich)
    /login          → EDU-ID + Microsoft Buttons (simuliert)
  /staff            → Verwaltungs-Einstieg (öffentlich)
    /login          → Microsoft Button (simuliert)
  /admin            → Konfigurations-Simulation (öffentlich, rein visuell)
  /(applicant)      → geschützt für R1
    /portal/...
  /(workspace)      → geschützt für R2-R6
    /workspace/...
```

**Routing-Logik nach Login:**
- R1 → `/portal`
- R2-R6 → `/workspace`
- Direktzugriff auf geschützte Routes ohne passende Rolle → Redirect zum jeweiligen Login

**Drei Bereiche, eine Codebase, ein Backend.** Trennung erfolgt über Layout-Hüllen und Route Groups, nicht über separate Apps. **Dashboard-Shell** (Portal R1-Liste/Adjustment, Workspace R2–R6) vs. **R1-Antragsflow-Shell** (Steps 1–6) sind bewusst getrennt → **`Dashboard_Core_Layout_Kontext.md`**.

---

## 5. Rollen

| Rolle | Bereich | Was sie tut |
|---|---|---|
| R1 — Studierende:r | `/portal` | Antrag stellen, nach R2-Feedback **Block-Anpassungen** (`PortalApplicationAdjustment`), Freigabe zurück an Fachstelle, bewilligten NTA einsehen |
| R2 — Zentrale Fachstelle | `/workspace` | Beraten, Empfehlung verfassen, **Block-Review** nach Einreichung, Antrag an Entscheid / zur Korrektur weiterleiten |
| R3 — Workspace-Rolle | `/workspace` | Im Prototyp weiterhin im Policy-Set mit R2 gruppiert; fachliche „dezentrale Entscheid“-Simulation siehe auch **R4** |
| **R4 — Entscheidungsinstanz (Ist-Code)** | `/workspace` | Bewilligungsflow nach R2-Forward: gleiche Workspace-Shell wie R2, eigene UI in `in_implementation`, RLS-Policies — **`Antrag_Bewilligung_Kontext.md`** |
| R5 — Prüfungsadministration | `/workspace` | Massnahmen-Listen pro Prüfung, Umsetzung organisieren |
| R6 — Modulverantwortliche | `/workspace` | Massnahmen für eigene Module einsehen (ohne medizinische Details) |

**Hinweis:** Ältere Vision in diesem Dokument nannte die Entscheidinstanz als **R3**. Der **aktuelle Code** verwendet **`R4`** für den Bewilligungs-Workspace inkl. APIs und Supabase-Policies; Abgleich immer mit `General_Prototype_Kontext.md` und dem Repo.

---

## 6. Funktionen

### F1 — Inszenierte Logins

- Zwei Login-Routes: `/student/login` (R1), `/staff/login` (R2–R6 inkl. R4) — E-Mail/Passwort, optisch wie SSO inszeniert
- Technisch: Supabase `signInWithPassword()`, danach **`getSession()`** bevor `public.users` für **`role`** abgefragt wird (sonst leeres Profil / RLS ohne JWT)
- Nach Login: Rolle aus `users`-Tabelle lesen, entsprechend redirecten (`R1` → Portal, sonst → Workspace)
- Kein echtes OAuth, keine 1:1-Klone der Microsoft/EDU-ID-Branding (markenrechtlich heikel)

### F2 — Multi-Step Antrag-Erstellung (R1)

**Zielbild:** linearer Step-Flow mit Stepper.  
**Ist:** **sechs** Schritte inkl. Übersicht und Erfolg — Logik in `nta-antrag-desktop.tsx`, **HF-Shell** in `r1-application-flow-layout.tsx` (Persönliche Angaben → Attest → Beratung & Empfehlung → Antrag stellen → Übersicht → Erfolg). Step 3 hat UI-Substeps (`step3_booking` / `step3_booked` / `step3_recommendation`). Step 4/5 teilen `R1ApplicationDefinitionSection`. HF-Feldabstände: `R1FlowField*` + `r1-form.ts`. Details → `Antragerstellung_Kontext.md` § 4–6, HF-Flow → `High_Fidelity_Design_Kontext.md` § 7; Dashboard-Shell → `Dashboard_Core_Layout_Kontext.md`.

| Step (Zielbild-Kürzel) | Inhalt |
|---|---|
| 1 | Persönliche Angaben (vorausgefüllt aus Auth, editierbar), Antragsart, Studienangaben |
| 2 | Fachärztliches Attest (ICF), `R1FlowAttestCallout`, Multi-Upload |
| 3 | Buchung (`r1-booking-scheduler`), Terminbestätigung (`r1-booking-confirmation`), Empfehlung (`RecommendationReleasedAccordion` `variant="r1"`) |
| 4 | Antragsstellung (`r1-application-definition-section`): Situation, Dauer, Geltungsbereich, Massnahmen |
| Overview | Zusammengesetzte Ansicht aller Steps mit gleichen Abständen (`R1FlowFormCard` `gap-10`); Step 1 read-only; final einreichen |

**Verhalten (Ist-Stand Prototyp):**
- Auto-Save (LocalStorage-Debouncing); Hinweis in **Top-Bar**, nicht im Formular
- Navigation zwischen freigeschalteten Steps; **Sticky Unlock** (`highestUnlockedStepIndex` + `r1PortalFlowStep`) — einmal erreichte Steps bleiben klickbar
- Wiedereinstieg: letzter Draft-Step in `data.r1PortalFlowStep`
- **Antrag verwerfen** → Löschen (falls DB-Zeile) + Redirect `/portal/home`
- Step 4/5: Freischaltung nur bei `recommendation.releasedHtml` (R2-Freigabe) **und** Kenntnisnahme-Checkbox für Erst-Zugang zu Step 4; `releasedHtml` darf **nicht** von `currentStep` abgeleitet werden
- Fortschritts-Sidebar: HF-Zustände (primary / bewilligt / abgelehnt / stone locked) — siehe `Antragerstellung_Kontext.md` § 6

### F3 — Schema-driven Form-Rendering

- Antragsformular wird aus TypeScript-Schema in `/lib/config/application-form.ts` gerendert
- Konfigurierbar: Felder, Sections, Reihenfolge, Validierung, Conditional Logic
- Conditional Logic via `showIf`-Property (Beispiel: "Studienangaben nur wenn Antragsart = Studium")
- Generischer `<DynamicFormRenderer>` rendert das Schema mit shadcn-Komponenten
- Zweck: schnelle Iteration während Testing-Phase ohne Code-Refactoring
- Massnahmen-Katalog analog in `/lib/config/measures-catalog.ts`

### F4 — Beratungs-Step (asynchron, Step 3)

- R1 bucht Termin via Buchungs-Mock (kein echter Kalender)
- System eröffnet Case in R2-Inbox, mit aktuellem Antrag-Stand
- R1 sieht Wartezustand-State im Step 3: "Termin gebucht für [Datum]"
- R2 verfasst nach Gespräch eine Empfehlung im Case (Richtext-Input mit Formatierung, optional Vorlagen)
- R2 gibt Empfehlung frei → R1 wird benachrichtigt (E-Mail-Mock + Banner)
- R1 sieht Empfehlung in Step 3 (PDF-Download oder Preview-Overlay)
- Erst nach Empfehlungs-Erhalt freischalten von Step 4

### F5 — Workspace pro Verwaltungsrolle (R2-R6)

- Eine `/workspace`-Hülle (`WorkspaceDashboardShell` via `RoleDashboardLayout`): einklappbare Sidebar (240/68px), Top-Bar mit Suche/Inbox/Account, weisses Inhalts-Panel `rounded-t-xl` — **`Dashboard_Core_Layout_Kontext.md`**
- Rollenspezifische Sichten innerhalb (`WorkspaceTestFlow`, R4-Entscheid-View, …)
- R2 sieht Beratungs-/Review-Inbox, Empfehlungen, Block-Review, Weiterleitung an Entscheid
- **R4 (Ist-Code):** Entscheidungs-Inbox wie R2 lesbar; in `in_implementation` Bewilligungs-UI (`WorkspaceR4DecisionView`); Zwischenstand **debounced** nach `data.r4DecisionReview`, Abschluss → `approved`; Client-Reconcile gegen Server-Snapshots siehe `Antrag_Bewilligung_Kontext.md` § 7 — Details → `Antrag_Bewilligung_Kontext.md`
- R3/R5/R6: reduzierte oder geplante Sichten; RLS gruppiert R2/R3/R5/R6 in Worklist-Policies, R4 separat (siehe Kontext DB)
- Berechtigungen via RLS-Policies durchgesetzt, nicht im Frontend

### F6 — Annotations-System (R2/R3 → R1 Korrektur-Loop)

**Ist im Prototyp (Abweichung von Feld-Annotationen):** Statt einzelner Feld-Marker ein **Block-Review** im Workspace (`WorkspaceApplicationReview`): sieben inhaltliche Blöcke, je **Bestätigen** oder **Anpassung mit Bemerkung**; Persistenz unter `data.recommendation.workspaceReview`; Weiterleitung an R1 über `review-forward`; R1 bearbeitet in `PortalApplicationAdjustment`; Rückkehr in den R2-Review-Loop über **`r1-release-adjustments`** inkl. Phase **`pending_after_adjustment`** (gesperrte Fachstellen-Bemerkung). Vollständiger Ablauf → **`Antrag_Review_Kontext.md`**.

**Vision / Zielbild (Feld-Ebene):**

**Markieren (R2/R3):**
- Jedes Feld im Antrag hat im Review-Modus einen "Markieren"-Button
- Klick öffnet Annotation-Dialog mit Bemerkungstext
- Annotation gespeichert, Feld erhält visuellen Indikator (orange Rand + Comment-Bubble)

**Korrektur (R1):**
- R1 sieht Antrag mit allen Markierungen via Realtime
- Markierte Felder editierbar, andere read-only (pro Review-Runde)
- Sidebar rechts: alle Annotations als Margin-Comments (Pattern wie Google Docs)
- Section-Navigation links: zeigt Sections mit Änderungs-Anforderungen markiert (Pattern wie Notion)
- Pro Annotation: Bemerkung lesen, Feld anpassen, "Done"-Button (Pattern wie Adobe Acrobat)
- Re-Submit nur möglich wenn alle Annotations als Done markiert
- Threaded Comments: einseitige Antwort möglich (R1 antwortet auf R2-Annotation)

**Review-Runden:**
- Annotations gehören zu einer nummerierten Review-Runde
- Nach Re-Submit ist Runde geschlossen
- In neuer Runde können nur die in dieser Runde markierten Felder editiert werden
- Frühere Annotations bleiben sichtbar als Historie, nicht mehr editierbar

### F7 — Realtime-Sync zwischen Geräten

- Aktionen einer Rolle in <1 Sekunde bei anderen Rollen sichtbar
- **Ist:** u. a. **Supabase Realtime Broadcast** auf Kanal `application-row:<applicationId>` (`lib/application-realtime-sync.ts`) nach R2-Forward und R1-Freigabe; Listener im Portal-Adjustment mit Refetch / `router.refresh`. **Student-Dashboard:** Polling der Antragsliste für frische Status-Badges. R1-Antragsflow: weiterhin **Subscription** auf `applications` mit `id=eq.<applicationId>` wo implementiert (`Antragerstellung_Kontext.md`).
- **Vision:** zusätzlich Subscriptions auf `applications`/`postgres_changes` überall dort, wo Broadcast nicht reicht; Activity-Log (`application_events`) bleibt Zielbild (F8).
- Source of Truth: Supabase. Lokaler UI-State nur transient.
- Beispiele (Zielbild):
  - R1 reicht ein → R2-Inbox aktualisiert
  - R2 markiert Feld → R1-Sidebar aktualisiert
  - R3 bewilligt → R1-Status aktualisiert

### F8 — Aktivitäten-Verlauf pro Antrag

- Jede Rolle-Aktion (Submit, Comment, Annotation, Approval, Rejection, Forward) wird als Event in `application_events` geloggt
- Events sind unveränderlich (kein Update, kein Delete)
- Sichtbar als Timeline für alle berechtigten Rollen
- Macht rollenübergreifende Wirkung sichtbar — zentrales Demo-Element

### F9 — File-Uploads (echt, via Supabase Storage)

- Echte Uploads in Supabase Storage Bucket
- Mehrere PDFs pro Antrag möglich (Arztzeugnisse, Empfehlungsschreiben, Verfügungen)
- File-Verweise in `documents`-Tabelle, Files in Storage
- Berechtigungen via Storage-Policies (R6 sieht z.B. nie medizinische Dokumente)
- Bis zur finalen Einreichung des Antrags durch R1 austauschbar

### F10 — Simulierte E-Mail-Touchpoints

- Keine echte Mail-Versendung (kein Resend, SendGrid o.ä.)
- Pro User-Account eine simulierte Inbox-View
- Touchpoints: Antrag eingereicht, Reminder bei Verzögerung, Korrektur-Anforderung, Bewilligung
- Erscheinen in Inbox via Realtime, wenn relevant
- Banner-Notifications zusätzlich, wenn User aktuell online ist

### F11 — Demo Control Panel (Cmd+K)

- Verstecktes Overlay via `Cmd+K` / `Ctrl+K`, basiert auf shadcn `<Command>` (cmdk)
- Funktionen: Rollenwechsel ohne Logout, Sprung zu vordefiniertem Prozess-State, Reset des Daten-Stands, Demo-Daten generieren
- Hinter Feature-Flag `NEXT_PUBLIC_DEMO_MODE`
- In Production-Build deaktiviert
- Zweck: Testings und Demos durchführen, ohne mehrere Geräte/Tabs zu jonglieren

### F12 — Test-Account-System

Vorab angelegte Accounts, ~9 pro Test-Setting:

| Rolle | Anzahl | Differenzierung |
|---|---|---|
| R1 | 3 | Verschiedene Datenstände: kein Antrag / aktiver Antrag / abgeschlossen |
| R2 | 1-2 | Eine Hauptperson, eine zweite für Parallel-Tests |
| R3 | 1 | |
| R5 | 1 | |
| R6 | 2 | Verschiedene Modul-Zuweisungen |

Mit "Persönlichkeit" angereichert (z.B. "Anna Müller, BSc 3. Semester"). Test-Credentials werden Testpersonen vorab kommuniziert.

### F13 — Admin-Simulation (`/admin`)

- Visuelle Demonstration einer Konfigurations-Ebene, **ohne Wirkung**
- Form-Builder-Mock: Felder anzeigen, Drag-Indikatoren, "Bearbeiten"-Buttons (alles visuell)
- Massnahmen-Katalog-Editor: Liste mit Edit-Knöpfen
- Tool-Texte editieren: visuell
- Klicks ändern visuell etwas (z.B. Modal öffnet sich), aber keine Persistierung
- Zweck: in Bachelor-Verteidigung zeigen "Konfigurations-Ebene wurde architektonisch mitgedacht"

---

## 7. Was der Prototyp NICHT tut

Klare Scope-Boundaries, um Scope-Creep zu vermeiden:

- Kein echtes EDU-ID/Microsoft-OAuth — nur visuelle Inszenierung
- Keine echte E-Mail-Versendung — nur Inbox-Mock
- Keine produktive Admin-Konfiguration — `/admin` ist rein visuell
- Keine Phase-6-Funktionen (Monitoring, Umfragen, Auswertungen)
- Kein Status-Tracking ohne Login
- Keine Mehrsprachigkeit — Deutsch only (UI-Texte)
- Keine Mobile-spezifische Optimierung — Desktop-First, responsive nice-to-have
- Keine Production-Ready-Features (Error-Tracking, Analytics, Monitoring)
- Kein echter Drag-and-Drop-Form-Builder
- Keine Integration in Hochschul-Systeme (Evento, Moodle etc.)
- Kein Rekurs-Workflow (im Flowchart erwähnt, aber nicht im Scope)

---

## 8. Datenmodell

Hauptentitäten (Postgres in Supabase):

| Tabelle | Zweck |
|---|---|
| `users` | Auth-User mit Rolle (R1-R6) und institution_type |
| `applications` | Anträge mit Status, Phase, JSONB-Daten |
| `application_events` | Unveränderliches Activity-Log |
| `application_annotations` | Feld-Markierungen mit Bemerkung, Review-Runde, Status (open/done/dismissed) |
| `annotation_replies` | Threaded Comments (R1 antwortet auf R2/R3-Annotation) |
| `documents` | Verweise auf Files in Storage, Type (medical/supporting/decision) |
| `modules` | Module für R5/R6-Sicht |
| `application_module_assignments` | Verknüpfung Antrag ↔ Modul mit Massnahmen |

Berechtigungen via Postgres RLS-Policies. Deklarativ in DB, nicht im Frontend.

---

## 9. Code-Konventionen

**Server vs. Client Components:**
- Server Components als Default
- Client Components nur bei Interaktivität (`useState`, `useEffect`, Event-Handler)
- Marker `"use client"` oben in der Datei
- Datenbank-Queries bevorzugt in Server Components

**Datei-Struktur:**
- `/app/...` — Routes
- `/components/ui/` — shadcn-Komponenten (nicht manuell anpassen, via CLI updaten)
- `/components/domain/` — NTA-spezifische Komponenten (`AntragCard`, `AnnotationSidebar` etc.)
- `/components/demo/` — Control Panel, Demo-Tools
- `/utils/supabase/` — Supabase-Clients (server, client, middleware)
- `/lib/store/` — Zustand-Stores
- `/lib/config/` — Statische Konfiguration (form-schema, measures-catalog)
- `/lib/types/` — TypeScript-Schemas und generierte Supabase-Types

**Sprache:**
- Variablen-, Funktions-, Datei-Namen: Englisch
- UI-Texte (sichtbar für Nutzer): Deutsch
- Code-Kommentare: Englisch (sparsam, nur wo nicht selbsterklärend)

**Sonstiges:**
- TypeScript strict mode, keine `any`-Types
- Keine inline-styles, immer Tailwind-Klassen
- Keine eigenen Form-Validierungs-Libraries — entweder native HTML5 oder Schema-getrieben
- Bei Datenbank-Queries: immer RLS-Policies mitdenken

---

## 10. Bei jeder neuen Aufgabe

Cursor sollte vor Code-Änderungen kurz prüfen:

1. **Scope:** Ist das Must-have, Should-have oder Won't-have laut Funktionen-Liste oben?
2. **Bereich:** Ist das `/student`, `/staff` oder `/admin`? Geschützt oder öffentlich?
3. **Rolle:** Welche Rolle interagiert hier? Welche darf was sehen?
4. **Datenmodell:** Welche Tabelle(n) sind betroffen? Gibt es schon eine RLS-Policy dafür? Neue Policies auf **`public.users`:** Rolle über **`current_user_role()`** ausdrücken — **nicht** `EXISTS (SELECT … FROM users …)` in derselben Tabelle (Postgres-Rekursion).
5. **Realtime:** Soll diese Aktion via Realtime an andere Clients propagiert werden?
6. **Komponenten:** Gibt es eine passende shadcn-Komponente?
7. **State:** Lebt das in Supabase (persistent) oder Zustand (transient)?

Bei Unsicherheit: lieber nachfragen als raten.
