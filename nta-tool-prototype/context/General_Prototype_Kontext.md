# General Prototype Context — NTA Tool (HSLU Bachelor)

> **Zweck:** Übergeordneter Kontext für neue Chats: Was der Prototyp ist, wie er technisch sitzt, welche Rollen und Bereiche es gibt, und welche Grenzen gelten.  
> **Detail-Tiefe:** Antrag R1, R2-Beratung, Status, RLS → `Antragerstellung_Kontext.md`; Review nach Einreichung (geplant) → `Antrag_Review_Kontext.md`. Ausführliche Funktions-Landkarte: `Prototyp_Funktionen.md`.

---

## 1. Projekt in Kurzform

Funktionaler Web-Prototyp zur **Simulation** des Nachteilsausgleich-Prozesses (NTA) an Schweizer Hochschulen (Bachelor HSLU Digital Ideation). Dient Forschung/Usability-Tests — **kein Production-System**. Fokus: zusammenhängende **Multi-Stakeholder-Simulation** (R1 studierend, Verwaltungsrollen im Workspace).

**Priorität bei Konflikten:** Tiefe der rollenübergreifend nachvollziehbaren Simulation > Breite isolierter Einzelfeatures.

---

## 2. Tech Stack (Ist-Stand Prototyp-Package)

| Schicht | Technologie |
|--------|-------------|
| Framework | **Next.js** (App Router), **React** |
| Sprache | TypeScript |
| Styling | **Tailwind CSS v4** (Design-Tokens über CSS-Variablen) |
| UI | **shadcn**-nahe Komponenten unter `components/ui/` (u. a. **radix-ui**) |
| Backend | **Supabase** (Postgres, Auth, Realtime; Storage je nach Feature) |
| Auth | Supabase E-Mail/Passwort; Logins teils als SSO **inszeniert** |
| Paketmanager | pnpm |

**Hinweis:** `Prototyp_Funktionen.md` nennt u. a. Next 15 und Zustand als Zielkonvention — im aktuellen `nta-tool-prototype` bitte **package.json** und bestehende Patterns im Repo als Quelle der Wahrheit nutzen.

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
| F6 | Annotations / Korrektur-Loop (geplant/teilweise) |
| F7 | Realtime zwischen Clients |
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
- Berechtigungen: **Postgres RLS** und ggf. **Trigger** (z. B. eingeschränkte Spalten-Updates für R2) — Frontend ersetzt das nicht.
- Details zu Feldern im Antrags-JSON: `Antragerstellung_Kontext.md` und `lib/test-flow-types.ts`; Review-Marker wenn umgesetzt → `Antrag_Review_Kontext.md` / Migrationen.

---

## 8. Wichtige Code-Orte (navigation)

| Pfad | Inhalt |
|------|--------|
| `app/` | Routen (Portal, Workspace, Logins) |
| `components/domain/` | Fachliche UI (Dashboard, Workspace-Flow, Layouts, Badges) |
| `components/ui/` | Generische UI-Bausteine |
| `lib/application-status.ts` | Zentrale Status-Ableitung für Badges |
| `lib/test-flow-types.ts` | Typisierung `ApplicationData` / Prototyp-JSON |
| `utils/supabase/` | Server/Client/Middleware Supabase |
| `context/*.md` | Menschliche Kontext-Dokumente für AI und Team |

---

## 9. Checkliste bei neuen Aufgaben

1. **Scope:** Muss-have vs. später (siehe Funktionen + „nicht im Scope“).
2. **Route & Rolle:** Wer darf die Seite sehen? Welches Layout?
3. **Daten:** Welche Tabellen/JSON-Pfade? RLS beachten.
4. **Realtime:** Muss sich ein anderer Client aktualisieren?
5. **Konsistenz:** Status und Freischaltlogik **datenbasiert** (nicht nur UI-Step) — siehe `Antragerstellung_Kontext.md`.

---

## 10. Verwandte Dateien

| Datei | Nutzen |
|-------|--------|
| `Prototyp_Funktionen.md` | Ausführliche Funktions- und Architektur-Beschreibung |
| `Antragerstellung_Kontext.md` | Antrag R1, R2-Beratung/Empfehlung, Status, Daten, RLS |
| `Antrag_Review_Kontext.md` | Platzhalter für Review nach Einreichung |
