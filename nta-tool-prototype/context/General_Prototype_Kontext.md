# General Prototype Context — NTA Tool (HSLU Bachelor)

> **Zweck:** Übergeordneter Kontext für neue Chats: Was der Prototyp ist, wie er technisch sitzt, welche Rollen und Bereiche es gibt, und welche Grenzen gelten.  
> **Detail-Tiefe:** Antrag R1, R2-Beratung, Status, RLS → `Antragerstellung_Kontext.md`; **R2-Block-Review nach Einreichung**, Korrekturrunden, R1-Freigabe zurück in `in_review` → `Antrag_Review_Kontext.md`. Zielbild vs. Ist: `Prototyp_Funktionen.md`.

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

Eine Codebase, ein Supabase-Backend; Trennung über Routen und Layouts (`RoleDashboardLayout` u. a.), nicht über separate Apps.

---

## 4. Rollen (Überblick)

| Rolle | Typischer Bereich | Kurzbeschreibung |
|-------|-------------------|------------------|
| **R1** | `/portal` | Antrag stellen, Status verfolgen, ggf. später Korrekturen (Review-Flow geplant). |
| **R2** | `/workspace` | Zentrale Fachstelle: Beratung, Empfehlung, im Prototyp begrenzte Schreibzugriffe auf `applications.data`. |
| **R3** | `/workspace` | Dezentrale Entscheid (Bewilligung/Ablehnung, Anpassungen) — im Gesamtkonzept; Umsetzungsgrad siehe Repo. |
| **R5 / R6** | `/workspace` | Prüfungsadministration / Modulverantwortliche — reduzierte oder geplante Sichten. |

**Hinweis:** In älterer Doku wurde R4 erwähnt; im Funktionen-Dokument ist die **dezentrale Entscheidinstanz als R3** geführt. Bei Abgleich mit Code/RLS immer aktuelle Policies und `requireUserProfile`-Rollen prüfen.

---

## 5. Funktions-Landkarte (Kurzindex)

Ausführlich mit Akzeptanzideen: **`Prototyp_Funktionen.md`**. Hier nur **Anker**:

| ID | Thema |
|----|--------|
| F1 | Inszenierte Logins (Student/Staff) |
| F2 | Multi-Step Antrag R1 (im Prototyp stark in `nta-antrag-desktop.tsx` verdichtet) |
| F3 | Schema-driven Forms (Zielbild; Konfig unter `lib/config/` wo vorhanden) |
| F4 | Beratung asynchron / Empfehlung R2 |
| F5 | Workspace R2–R6 |
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
  - **Status-Übergänge** über reguläre Session-Clients: ein dedizierter `SUPABASE_SERVICE_ROLE_KEY` ist im Forward-Pfad nicht nötig (`utils/supabase/service-role.ts` bleibt nur als optionaler Helper bestehen).
- Details zu Feldern im Antrags-JSON: `Antragerstellung_Kontext.md` und `lib/test-flow-types.ts`; Review-/Empfehlungs-Pfade → `Antrag_Review_Kontext.md` / Migrationen.

---

## 8. Wichtige Code-Orte (navigation)

| Pfad | Inhalt |
|------|--------|
| `app/` | Routen (Portal, Workspace, Logins, API) |
| `app/api/applications/review-forward/route.ts` | RLS-konformer R2-Forward auf `in_implementation` / `needs_correction` |
| `app/api/applications/r1-release-adjustments/route.ts` | R1: zurück nach `in_review` inkl. `workspaceReview`-Merge |
| `lib/r1-adjustment-release.ts` | Regeln und Builder für Post-Submit nach R1-Freigabe |
| `lib/workspace-review-hydration-key.ts` | Fingerprint für wiederholtes `in_review` (R2-UI) |
| `lib/application-realtime-sync.ts` | Broadcast-Helfer nach mutierenden Schritten |
| `components/domain/` | Fachliche UI (Dashboard, Workspace-Flow, Layouts, Badges, **Block-Review**, **Empfehlungs-Editor & -Accordion**, R1-Anpassungsansicht) |
| `components/domain/rich-text-editor.tsx` | TipTap-Wrapper für das Empfehlungsschreiben |
| `components/domain/recommendation-released-accordion.tsx` | Geteilte Anzeige des freigegebenen Empfehlungsschreibens (R1 + R2) |
| `components/domain/portal-application-adjustment.tsx` | R1 Block-Detailansicht (Status-abhängig Read-only / Edit) |
| `components/ui/` | Generische UI-Bausteine (u. a. neuer `accordion.tsx`) |
| `lib/application-status.ts` | Zentrale Status-Ableitung für Badges |
| `lib/test-flow-types.ts` | Typisierung `ApplicationData` / Prototyp-JSON (inkl. `recommendation.draftHtml`/`releasedHtml`/`releasedBy`, `r1AdjustmentResolutions`, `workspaceReview`) |
| `lib/r2-review-persist.ts` | Helfer für trigger-konforme R2-Saves |
| `lib/review-workspace-blocks.ts` | Block-IDs + Anker-Sprung-Hilfen |
| `utils/supabase/` | Server/Client/Middleware Supabase |
| `context/*.md` | Menschliche Kontext-Dokumente für AI und Team |

---

## 9. Checkliste bei neuen Aufgaben

1. **Scope:** Muss-have vs. später (siehe Funktionen + „nicht im Scope“).
2. **Route & Rolle:** Wer darf die Seite sehen? Welches Layout?
3. **Daten:** Welche Tabellen/JSON-Pfade? RLS und R2-Trigger beachten (R2-Schreiben nur unter `data.consultation` / `data.recommendation`).
4. **Realtime:** Muss sich ein anderer Client aktualisieren? Subscriptions möglichst **eng scopen** (z. B. `id=eq.<applicationId>`), damit fremde Updates lokalen UI-State nicht überschreiben.
5. **Status-Übergänge:** Bei `UPDATE` immer prüfen, ob der **neue** Zeilenzustand für den ausführenden Rollen-User per SELECT-Policy noch sichtbar ist (sonst RLS-Violation).
6. **Konsistenz:** Status und Freischaltlogik **datenbasiert** (nicht nur UI-Step) — siehe `Antragerstellung_Kontext.md`.

---

## 10. Verwandte Dateien

| Datei | Nutzen |
|-------|--------|
| `Prototyp_Funktionen.md` | Ausführliche Funktions- und Architektur-Beschreibung |
| `Antragerstellung_Kontext.md` | Antrag R1, R2-Beratung/Empfehlung/Forward, Status, Daten, RLS |
| `Antrag_Review_Kontext.md` | R2-Block-Review nach Einreichung inkl. Persistenz und Forward in „In Entscheid“ |
