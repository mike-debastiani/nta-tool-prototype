# General Prototype Context — NTA Tool (HSLU Bachelor)

> **Zweck:** Übergeordneter Kontext für neue Chats: Was der Prototyp ist, wie er technisch sitzt, welche Rollen und Bereiche es gibt, und welche Grenzen gelten.  
> **Detail-Tiefe:** Antrag R1, R2-Beratung, Status, RLS → `Antragerstellung_Kontext.md`; **Dashboard-Shell Portal + Workspace** (Sidebar, Top-Bar) → `Dashboard_Core_Layout_Kontext.md`; **R2-Block-Review nach Einreichung**, Korrekturrunden, R1-Freigabe zurück in `in_review` → `Antrag_Review_Kontext.md`; **R4 Bewilligung / Entscheid** → `Antrag_Bewilligung_Kontext.md`; **HF Design (Tokens, Grid, R1-Flow-Shell)** → `High_Fidelity_Design_Kontext.md`. Zielbild vs. Ist: `Prototyp_Funktionen.md`.

---

## 1. Projekt in Kurzform

Funktionaler Web-Prototyp zur **Simulation** des Nachteilsausgleich-Prozesses (NTA) an Schweizer Hochschulen (Bachelor HSLU Digital Ideation). Dient Forschung/Usability-Tests — **kein Production-System**. Fokus: zusammenhängende **Multi-Stakeholder-Simulation** (R1 studierend, Verwaltungsrollen im Workspace).

**Priorität bei Konflikten:** Tiefe der rollenübergreifend nachvollziehbaren Simulation > Breite isolierter Einzelfeatures.

---

## 2. Tech Stack (Ist-Stand Prototyp-Package)

| Schicht | Technologie |
|--------|-------------|
| Framework | **Next.js** (App Router, Turbopack-Build), **React** |
| Sprache | TypeScript |
| Styling | **Tailwind CSS v4** (Design-Tokens über CSS-Variablen) |
| UI | **shadcn**-nahe Komponenten unter `components/ui/` (u. a. **radix-ui** Accordion/Dialog/Select) |
| Rich-Text | **TipTap v3** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-heading`/`-underline`/`-link`/`-text-align`/`-placeholder`, `@tiptap/core` für `mergeAttributes`) — siehe `components/domain/rich-text-editor.tsx` |
| Backend | **Supabase** (Postgres, Auth, Realtime; Storage je nach Feature) |
| Auth | Supabase E-Mail/Passwort; Logins teils als SSO **inszeniert** |
| Paketmanager | npm (im Repo ist ein **npm-Workspace** eingerichtet — Runtime-Abhängigkeiten müssen in `nta-tool-prototype/package.json` deklariert sein, sonst scheitert Turbopack/Vercel beim Build) |

**Hinweise:**

- `Prototyp_Funktionen.md` nennt u. a. Next 15 und Zustand als Zielkonvention — im aktuellen `nta-tool-prototype` bitte **package.json** und bestehende Patterns im Repo als Quelle der Wahrheit nutzen.
- Das Repo ist ein **npm-Workspace** (`workspaces: ["nta-tool-prototype"]`). Build/Dev wird über das Root-Skript `npm run build --workspace=nta-tool-prototype` ausgeführt. **Wichtig:** Alle Runtime-Dependencies (z. B. TipTap-Pakete) gehören in `nta-tool-prototype/package.json`, nicht in das Root-`package.json` — Vercel installiert beim Build nur die Pakete des Workspace-Targets und Turbopack kann sonst Imports nicht auflösen.

---

## 3. Architektur: drei Einstiege / Bereiche

- **`/student`** — öffentlicher Einstieg Studierende (z. B. Login).
- **`/staff`** — öffentlicher Einstieg Verwaltung (z. B. Login).
- **`/portal/...`** — geschützter Bereich **R1** (Antrag, Dashboard).
- **`/workspace/...`** — geschützter Bereich **R2–R6** (Workspace-Simulation).

**Routing nach Login (Zielbild):** R1 → Portal; Verwaltungsrollen → Workspace. Ungeschützter Zugriff → Redirect zum passenden Login.

Eine Codebase, ein Supabase-Backend; Trennung über Routen und Layouts (`RoleDashboardLayout` → `PortalDashboardShell` / `WorkspaceDashboardShell` in `workspace-dashboard-shell.tsx`; R1-Antragsflow **ohne** diese Shell → `r1-application-flow-layout.tsx`), nicht über separate Apps. Mechanik → **`Dashboard_Core_Layout_Kontext.md`**.

---

## 4. Rollen (Überblick)

| Rolle | Typischer Bereich | Kurzbeschreibung |
|-------|-------------------|------------------|
| **R1** | `/portal` | Antrag stellen, Status verfolgen, ggf. später Korrekturen (Review-Flow geplant). |
| **R2** | `/workspace` | Zentrale Fachstelle: Beratung, Empfehlung, im Prototyp begrenzte Schreibzugriffe auf `applications.data`. |
| **R3** | `/workspace` | Workspace-Rolle (Prototyp); fachliche Entscheid-Simulation teils parallel zu **R4** — Umsetzungsgrad siehe Repo. |
| **R4** | `/workspace` | **Entscheidungsinstanz (Bewilligung)** im Code: gleiche Shell wie R2 (`RoleDashboardLayout`), Inbox-Liste, Block-Review read-only ausserhalb `in_implementation`, Bewilligungs-UI in `in_implementation` — siehe `Antrag_Bewilligung_Kontext.md`. |
| **R5 / R6** | `/workspace` | Prüfungsadministration / Modulverantwortliche — reduzierte oder geplante Sichten. |

**Hinweis:** `Prototyp_Funktionen.md` führt die dezentrale Entscheid teils als **R3**; im **Ist-Code** ist die Bewilligungsinstanz **`R4`** mit eigenen APIs/RLS-Policies. Bei Abgleich immer `requireUserProfile`, Routen und Supabase-Policies prüfen.

---

## 5. Funktions-Landkarte (Kurzindex)

Ausführlich mit Akzeptanzideen: **`Prototyp_Funktionen.md`**. Hier nur **Anker**:

| ID | Thema |
|----|--------|
| F1 | Inszenierte Logins (Student/Staff) |
| F2 | Multi-Step Antrag R1 — HF-Shell in `r1-application-flow-layout.tsx`, Logik in `nta-antrag-desktop.tsx` (Details: `Antragerstellung_Kontext.md` § 4–6, HF: `High_Fidelity_Design_Kontext.md` § 7) |
| F3 | Schema-driven Forms (Zielbild; Konfig unter `lib/config/` wo vorhanden) |
| F4 | Beratung asynchron / Empfehlung R2 |
| F5 | Workspace R2–R6 — gemeinsame Dashboard-Shell (`Dashboard_Core_Layout_Kontext.md`) |
| F6 | Annotations / Korrektur-Loop (Vision); **Ist:** Block-Level-Review im Workspace + R1 `PortalApplicationAdjustment` + `r1-release-adjustments` (siehe `Antrag_Review_Kontext.md`) |
| F7 | Realtime zwischen Clients (**Ist:** u. a. Broadcast `application-realtime-sync` + Refetch/Polling wo nötig) |
| F8 | Aktivitäts-Log (`application_events` o. ä.) |
| F9 | File-Uploads (Storage) |
| F10 | Simulierte E-Mail / Inbox |
| F11 | Demo Control Panel (Cmd+K, Feature-Flag) |
| F12 | Test-Accounts |
| F13 | Admin-Simulation `/admin` (visuell, ohne echte Persistenz) |

---

## 6. Was der Prototyp bewusst nicht ist

- Kein echtes institutionelles OAuth (EDU-ID/Microsoft) im Produktionssinn.
- Kein produktiver Mail-Versand (Mocks/Inbox-Simulation).
- Keine produktive Admin-Konfiguration über `/admin`.
- Kein vollständiges Monitoring/Analytics-Produkt.
- **Desktop-First**; Mobile optional.
- UI-Sprache: **Deutsch** (Code-Namen Englisch — siehe Konventionen im Funktionen-Dokument).

---

## 7. Daten & Sicherheit (Kurz)

- Zentrale Entität: **`applications`** mit JSONB **`data`**, Status-Spalte, Timestamps.
- Berechtigungen: **Postgres RLS** und **Trigger** — Frontend ersetzt das nicht. Wichtig:
  - **R2-Trigger** `enforce_r2_application_update_columns` erlaubt R2 nur Schreibzugriff auf `data.consultation` und `data.recommendation`. Konsequenz: **alle** R2-Schreibpfade (Empfehlungs-Drafting via `draftHtml`/`draftText`, Freigabe via `releasedHtml`/`releasedText`/`releasedAt`/`releasedBy`, Post-Submit-Block-Review via `workspaceReview`) liegen unterhalb von `data.recommendation`. Root-Felder wie **`r1AdjustmentResolutions`** dürfen beim R2-Update **nicht** entfallen oder verändert werden — Forward-Route merged daher das volle `data`-Subset; siehe `Antrag_Review_Kontext.md` § 4.
  - **SELECT-Policy** `applications_select_r2_worklist` deckt seit Migration `extend_workspace_select_to_decision_states` zusätzlich `in_implementation`, `approved`, `rejected` ab — Voraussetzung dafür, dass R2 nach „Antrag weiterreichen“ den nun in „In Entscheid“ befindlichen Antrag noch sieht und der `UPDATE` nicht am `RETURNING`-SELECT scheitert.
  - **R4 Workspace-Lesen:** additive Policies `applications_select_r4_workspace` und `users_select_r4_workspace_applicants` (Migration `supabase/migrations/20260513190000_r4_workspace_select_policies.sql`). **R4 Workspace-Schreiben:** Policy **`applications_update_r4_decision`** (Migration `20260514120000_applications_update_r4_decision.sql`) — `USING` nur `in_implementation`, `WITH CHECK` `in_implementation` oder `approved`. **Pflicht:** Bedingung über **`current_user_role()`** (`SECURITY DEFINER`, bereits im Schema) — **niemals** `EXISTS (SELECT … FROM public.users …)` innerhalb von RLS auf `users`/`applications`, sonst Postgres **„infinite recursion detected in policy for relation users“**.
  - **Login:** `components/domain/login-card.tsx` lädt nach `signInWithPassword` zuerst **`getSession()`**, damit der folgende `users`-Select mit JWT/RLS als `authenticated` läuft.
  - **Status-Übergänge** über reguläre Session-Clients: ein dedizierter `SUPABASE_SERVICE_ROLE_KEY` ist im Forward-Pfad nicht nötig (`utils/supabase/service-role.ts` bleibt optional, u. a. für `fetchWorkspaceApplicationsList` wenn R4-Policies in einer Umgebung noch fehlen).
- Details zu Feldern im Antrags-JSON: `Antragerstellung_Kontext.md` und `lib/test-flow-types.ts`; Review-/Empfehlungs-Pfade → `Antrag_Review_Kontext.md` / Migrationen.

---

## 8. Wichtige Code-Orte (navigation)

| Pfad | Inhalt |
|------|--------|
| `app/` | Routen (Portal, Workspace, Logins, API) |
| `app/api/applications/review-forward/route.ts` | RLS-konformer R2-Forward auf `in_implementation` / `needs_correction` |
| `app/api/workspace/applications/route.ts` | `GET` — Session + Rolle R2–R6, gleiche Liste wie Server-Page (`fetchWorkspaceApplicationsList`) |
| `lib/workspace-applications-list.ts` | Server: Antragsliste Workspace; optional Service-Role nur für R4 wenn Key gesetzt |
| `lib/user-initials.ts` | Initialen für Workspace-Avatar aus `display_name` / E-Mail |
| `components/domain/login-card.tsx` | Student/Staff-Login: Supabase Auth + Profil `users.role`, Redirect |
| `app/workspace/page.tsx` | `requireUserProfile` R2–R6, `fetchWorkspaceApplicationsList`, `initialsFromProfile`, `WorkspaceTestFlow` |
| `components/domain/workspace-test-flow.tsx` | Workspace-Inbox, Review, R4-Entscheid; auf `/workspace` ohne `?view=` → R2–R4: `WorkspaceHomeDashboard`, R5/R6: Inbox-Liste |
| `components/domain/workspace-home-dashboard.tsx` | Workspace-Home (Figma `5509:11682`): KPIs/Beratungen Mock; Anträge-Tabelle live (`applications`), Offen/Alle + Suche, Zeilen öffnen Review |
| `components/domain/application-review-blocks.tsx` | Review-Blöcke + `shortApplicationRef` / `workspaceApplicationListNumber` (Listen-Spalte Antragsnummer) |
| `components/domain/dashboard-main-panel-scroll-context.tsx` | Scroll-Root-Registrierung für `edgeToEdge`-Pages → Inset/Tight-Messung in der Shell |
| `app/api/applications/r1-release-adjustments/route.ts` | R1: zurück nach `in_review` inkl. `workspaceReview`-Merge |
| `lib/r1-adjustment-release.ts` | Regeln und Builder für Post-Submit nach R1-Freigabe |
| `lib/workspace-review-hydration-key.ts` | Fingerprint für wiederholtes `in_review` (R2-UI) |
| `lib/application-realtime-sync.ts` | Broadcast-Helfer nach mutierenden Schritten |
| `components/domain/workspace-dashboard-shell.tsx` | **Dashboard Core:** `DashboardShell`, Portal/Workspace-Varianten, Sidebar-Collapse, Top-Bar + Antragdetails-Panel (sofort sichtbar; Morph optional → `Dashboard_Core_Layout_Kontext.md`) |
| `components/domain/role-dashboard-layout.tsx` | Router: R1 → Portal-Shell; R2–R6 → Workspace-Shell; `showTopBar` auf `/portal/antragserstellung` |
| `components/domain/portal-dashboard-toolbar-context.tsx` | Portal-Top-Bar-Slots (Zurück, Trailing) |
| `components/domain/workspace-r2-toolbar-context.tsx` | Workspace-Top-Bar `leadingSlot` (z. B. Zurück zur Liste) |
| `lib/design-tokens/workspace-dashboard.ts` | Sidebar-Breiten, Padding, Nav-Aktiv (`DASHBOARD_NAV_ITEM_*`), Inset/Tight-Ratios, Portal-Rim/Top-Bar |
| `lib/design-tokens/application-block.ts` | `applicationBlockSurfaceClass` — Antragsblöcke: `rounded-lg border-border`, kein Shadow |
| `components/icons/avalis-logo.tsx` | Brand-Logo in Dashboard-Sidebar |
| `components/domain/` | Fachliche UI (Dashboard, Workspace-Flow, Badges, **Block-Review**, **Empfehlungs-Editor & -Accordion**, R1-Anpassungsansicht) |
| `components/domain/rich-text-editor.tsx` | TipTap-Wrapper für das Empfehlungsschreiben |
| `components/domain/recommendation-released-accordion.tsx` | Geteilte Anzeige des freigegebenen Empfehlungsschreibens (R1 + R2) |
| `components/domain/r1-application-flow-layout.tsx` | HF-Shell R1-Antragsflow: Top-Bar, Sidebar, Fortschrittskarte, `R1FlowFormCard`, `R1FlowField*`, Attest-Callout |
| `components/domain/r1-flow-icons.tsx` | Lucide-Icons für R1-Flow (Fortschritt, Kontakt, Autosave-Save) |
| `components/domain/r1-booking-scheduler.tsx` | R1 Step 3 Terminbuchung (HF) |
| `components/domain/r1-booking-confirmation.tsx` | R1 Step 3 Terminbestätigung (HF) |
| `components/domain/r1-application-definition-section.tsx` | R1 Step 4/5 Antragsstellung (HF-Feldabstände) |
| `components/domain/custom-measure-lines-field.tsx` | „Sonstige Massnahmen“-Zeilen (Step 4 + Portal-Anpassung) |
| `components/studiengang-combobox.tsx` | Studiengang-Auswahl Step 1 (HF-Select-Styling) |
| `app/design-tokens/high-fidelity-*.css` | HF Farben, Typo, Grid (CSS-SSOT) |
| `components/domain/portal-application-adjustment.tsx` | R1 Block-Detailansicht (Status-abhängig Read-only / Edit) |
| `components/layout/hf-grid.tsx` | `HfPageGrid`, `HfGridCell`, `HfGridFree` |
| `components/ui/` | Generische UI-Bausteine (u. a. neuer `accordion.tsx`) |
| `lib/design-tokens/r1-form.ts` | HF-Formular: Choice-Karten, eingebettetes Input, Select-Trigger |
| `lib/design-tokens/typography.ts` | `hfTypography.*` für HF-Typo-Bundles |
| `lib/design-tokens/grid.ts` | Grid-Konstanten + `hfGridCellClass()` |
| `lib/application-status.ts` | Zentrale Status-Ableitung für Badges |
| `lib/test-flow-types.ts` | Typisierung `ApplicationData` / Prototyp-JSON (inkl. `recommendation.draftHtml`/`releasedHtml`/`releasedBy`, `r1AdjustmentResolutions`, `workspaceReview`) |
| `lib/r2-review-persist.ts` | Helfer für trigger-konforme R2-Saves |
| `lib/r4-decision-state.ts` | R4 Zeilen-Merge, Sichtbarkeit, `mergeR4DecisionReviewRespectingLocalDirty` / `localR4BlockDiffersFromServerMerge` (Client vs. Server-Reconcile) |
| `lib/r4-workspace-supabase-persist.ts` | R4: persist/complete über Browser-Supabase-Client (Session + RLS) |
| `lib/review-workspace-blocks.ts` | Block-IDs + Anker-Sprung-Hilfen |
| `utils/supabase/` | Server/Client/Middleware Supabase |
| `context/*.md` | Menschliche Kontext-Dokumente für AI und Team |

---

## 9. Checkliste bei neuen Aufgaben

1. **Scope:** Muss-have vs. später (siehe Funktionen + „nicht im Scope“).
2. **Route & Rolle:** Wer darf die Seite sehen? Welches Layout?
3. **Daten:** Welche Tabellen/JSON-Pfade? RLS und R2-Trigger beachten (R2-Schreiben nur unter `data.consultation` / `data.recommendation`).
4. **Realtime:** Muss sich ein anderer Client aktualisieren? Subscriptions möglichst **eng scopen** (z. B. `id=eq.<applicationId>`), damit fremde Updates lokalen UI-State nicht überschreiben. **R4-Bewilligung:** Schalter-State lebt in `data.r4DecisionReview`; nach Persist/Complete Broadcast + Refetch — lokale Reconcile-Logik in `WorkspaceR4DecisionView` verhindert, dass veraltete Snapshots noch nicht persistierte Schalter überschreiben (Details `Antrag_Bewilligung_Kontext.md` § 7).
5. **Status-Übergänge:** Bei `UPDATE` immer prüfen, ob der **neue** Zeilenzustand für den ausführenden Rollen-User per SELECT-Policy noch sichtbar ist (sonst RLS-Violation).
6. **Konsistenz:** Status und Freischaltlogik **datenbasiert** (nicht nur UI-Step) — siehe `Antragerstellung_Kontext.md`.

---

## 10. Verwandte Dateien

| Datei | Nutzen |
|-------|--------|
| `Prototyp_Funktionen.md` | Ausführliche Funktions- und Architektur-Beschreibung |
| `Antragerstellung_Kontext.md` | Antrag R1, R2-Beratung/Empfehlung/Forward, Status, Daten, RLS |
| `Antrag_Review_Kontext.md` | R2-Block-Review nach Einreichung inkl. Persistenz und Forward in „In Entscheid“ |
| `Antrag_Bewilligung_Kontext.md` | R4 Entscheidungsinstanz: Bewilligungs-UI, APIs, Workspace-RLS |
| `Dashboard_Core_Layout_Kontext.md` | Portal- & Workspace-Dashboard-Shell (Sidebar, Top-Bar, Shell vs. R1-Flow) |
| `High_Fidelity_Design_Kontext.md` | HF-Tokens, Grid, Typo, R1-Antragsflow-Shell (Figma) |
