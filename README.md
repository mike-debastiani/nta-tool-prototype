# Avalis

Modulare, institutionsübergreifende Weblösung zur Simulation des Nachteilsausgleichsprozesses (NTA) an Schweizer Hochschulen — entstanden als Bachelor-Projekt im Studiengang **Digital Ideation** an der **HSLU**.

**Prototyp (live):** [https://nta-tool-prototype.vercel.app/](https://nta-tool-prototype.vercel.app/)

---

> **Hinweis — Prototyp, kein Produktivsystem**
>
> Dies ist ein **forschungs- und testorientierter Webprototyp**, kein einsatzfähiges Produkt. Die Logins sind **inszeniert** (optisch an Hochschul-SSO angelehnt, technisch E-Mail/Passwort über Supabase Auth). Es gibt **keine produktive Datenhaltung** im Sinne eines institutionellen Betriebs, **keine geprüfte Sicherheitsinfrastruktur** und **keine Anbindung** an reale Drittsysteme (z. B. Evento, EDU-ID, Prüfungssysteme). Der Prototyp dient als **konzeptioneller und technischer Nachweis** eines durchspielbaren Multi-Stakeholder-Prozesses.

---

## So testest du den Prototyp

Dieser Abschnitt ist für Bewertende gedacht, die den **live deployten** Prototyp testen — nicht für lokale Entwicklung.

### Zugangsdaten

Die Test-Logins befinden sich im **Abgabeordner** in der Datei:

`nta-tool-prototype_login-credentials.csv`

*(Die Datei ist nicht im Git-Repository enthalten.)*

### Einstieg

1. Öffne [https://nta-tool-prototype.vercel.app/](https://nta-tool-prototype.vercel.app/)
2. Wähle **Studierenden Portal** oder **Workspace** und melde dich mit den Zugangsdaten aus der CSV an.

| Bereich | Login-Route | Rollen |
|--------|-------------|--------|
| Studierenden Portal | `/student/login` | R1 (Studierende) |
| Workspace | `/staff/login` | R2–R6 (Verwaltung) |

### Wichtige Regeln (bitte beachten)

> **Pro Rolle einen separaten Browser verwenden**
>
> z. B. Firefox für eine studierende Rolle, Chrome für eine Verwaltungsrolle.

> **Niemals zwei Logins im selben Browser**
>
> Egal welche Rollen — mehrere gleichzeitige Sessions im selben Browser können zu **fehlerhaftem Verhalten** führen (Session-Konflikte, falsche Rollenzuordnung).

> **Pro angemeldetem User nur ein Tab**
>
> Öffne nicht mehrere Tabs mit demselben eingeloggten Account.

**Studierende (R1):** Es stehen **drei Test-Logins** zur Verfügung. Welcher Account gewählt wird, ist egal — aber **nicht mehrere Personen gleichzeitig** im selben Studierenden-Login testen.

**Verwaltungsrollen (R2–R6):** Mehrere Tester mit verschiedenen Verwaltungs-Accounts sind **unkritisch**, solange jede Person ihren **eigenen Browser** und **einen Tab** verwendet.

### Empfohlener Testablauf (kurz)

1. **R1:** Antrag starten → Beratungstermin buchen → auf Empfehlung warten → Antrag ausfüllen und einreichen.
2. **R2:** Im Workspace Beratung/Empfehlung freigeben → nach Einreichung Block-Review → Antrag weiterreichen oder zur Anpassung senden.
3. **R4:** Entscheid fällen (Bewilligung/Ablehnung) und Verfügung einsehen.
4. **R1:** Status und ggf. Anpassungen bzw. ausgestellte Verfügung im Portal prüfen.

---

## Die zwei Bereiche und Rollen

Der Prototyp besteht aus **zwei getrennten Frontend-Bereichen** in **einer Codebase** (getrennt über Routen und Layouts):

### Portal — `/portal/...` (Studierende, R1)

- Antrag erstellen und schrittweise ausfüllen
- Beratungstermin buchen, Empfehlung der Fachstelle einsehen
- Antrag einreichen, **Anpassungen** auf Anforderung der Fachstelle vornehmen
- Status und ausgestellte **Verfügung** verfolgen

### Workspace — `/workspace/...` (Verwaltung, R2–R6)

- **R2 — Zentrale Fachstelle:** Beratung, Empfehlungsschreiben, Block-Review, Weiterleitung an Entscheid oder Korrektur an Studierende
- **R4 — Entscheidungsinstanz:** Bewilligung/Ablehnung pro Block, Verfügung generieren
- **R3, R5, R6:** im Prototyp angelegt; Sichten teils reduziert (z. B. Prüfungsadministration, Modulverantwortliche)
- Zusätzlich: Inbox/Home, Meine Aufgaben, Beratungen planen, Auswerten (Mock-Statistiken)

---

## Projektvorhaben / Kontext

Der Nachteilsausgleichsprozess an Schweizer Hochschulen ist in der Praxis oft **fragmentiert**: Er läuft über E-Mail, PDFs und parallele Systeme, der **Status bleibt für Antragstellende unklar**, und die Koordination zwischen Fachstelle, Entscheidungsinstanz und weiteren Stellen ist aufwendig.

**Avalis** bündelt den Prozess von der Antragstellung bis zum bewilligten oder abgelehnten Antrag in einem **gemeinsamen Fall** mit nachvollziehbarem Status und verbindet die beteiligten Rollen in einer durchgängigen Simulation. Die Lösung ist **modular** angelegt, damit sie sich an unterschiedliche Prozessmodelle der Hochschulen anpassen lässt (im Prototyp: zentrale Fachstelle + dezentrale Entscheidungsinstanz).

---

## Tech-Stack

Verifiziert anhand von `nta-tool-prototype/package.json` und der Codebase (Stand Repository):

| Schicht | Technologien |
|--------|----------------|
| **Frontend** | [Next.js](https://nextjs.org/) 16 (App Router), [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/) 5 |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/) (Style: radix-vega), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/) Icons |
| **Rich-Text** | [TipTap](https://tiptap.dev/) v3 (Empfehlungsschreiben) |
| **Backend** | [Supabase](https://supabase.com/): Postgres, Auth, Realtime |
| **Supabase-Client** | `@supabase/supabase-js`, `@supabase/ssr` (Session in Next.js Middleware) |
| **Deployment** | [Vercel](https://vercel.com/) (Hosting); Quellcode in [GitHub](https://github.com/) *(Repository-URL nicht im Code hinterlegt — bitte aus der Abgabe entnehmen)* |
| **Paketmanager** | npm (npm-Workspace: Root `nta-tool` → Package `nta-tool-prototype`) |

**Nicht verwendet** (laut Projektvorgaben): separate UI-Frameworks (MUI etc.), ORMs (Prisma/Drizzle), Headless CMS.

**Hinweis:** Supabase **Storage** ist im Zielbild für Datei-Uploads vorgesehen; im Prototyp werden Atteste teils als lokale Vorschau/`blob:`-URLs gehalten — nicht als vollständig produktive Storage-Integration.

---

## Architektur und Funktionsweise

### Eine Codebase, zwei Bereiche

- **Portal** und **Workspace** sind getrennte Routen und Layouts (`PortalDashboardShell`, `WorkspaceDashboardShell` über `RoleDashboardLayout`).
- Der eigentliche Anwendungscode liegt im Ordner `nta-tool-prototype/`.

### Ein Fall, viele Perspektiven

Im Zentrum steht die Entität **`applications`** in Postgres: ein Antrag als **gemeinsamer Fall** mit Status und strukturierten Daten in einer **JSONB-Spalte** (`data`). Alle Rollen arbeiten an **demselben Datensatz** — aus ihrer jeweiligen Sicht (Portal vs. Workspace, unterschiedliche Berechtigungen).

### Echtzeit-Synchronisation

Änderungen einer Rolle sollen für andere Rollen **zeitnah sichtbar** werden. Im Code kommen mehrere Mechanismen zum Einsatz:

- **Supabase Realtime Broadcast** auf Kanälen wie `application-row:<applicationId>` (nach Mutationen z. B. Review-Forward, R1-Freigabe, R4-Entscheid)
- **`postgres_changes`-Subscriptions** auf `applications` (z. B. im Antragsflow und Workspace)
- **Polling** an einzelnen Stellen (z. B. R1-Dashboard für aktuelle Status-Badges)

### Sicherheit und Berechtigungen

Rollenbasierte **Lese- und Schreibrechte** werden **serverseitig** über Postgres **Row Level Security (RLS)** und **Trigger** durchgesetzt — nicht allein im Frontend. Beispiel: Die Fachstelle (R2) darf nur definierte Pfade in `data` ändern (z. B. `consultation`, `recommendation`).

### Weitere Dokumentation

Ausführlicher Projektkontext, Rollen, Flows und Datenmodell:

- `nta-tool-prototype/context/General_Prototype_Kontext.md`
- `nta-tool-prototype/context/Toolbeschreibung_Organisation_Kontext.md`
- `nta-tool-prototype/context/Prototyp_Funktionen.md`

*Eine separate Architektur-Grafikdatei liegt im Repository derzeit nicht vor; System- und Datenfluss-Diagramme können der Bachelor-Dokumentation entnommen werden.*

---

## Team

- Mike De Bastiani
- Dario Foti
- Chiara Tremml

---

## Repository-Struktur (kurz)

```
nta-tool/                          ← Repository-Root (dieses README)
├── package.json                   ← npm-Workspace
└── nta-tool-prototype/            ← Next.js-Anwendung (Avalis)
    ├── app/                       ← Routen (Portal, Workspace, Logins)
    ├── components/                ← UI (domain/, ui/)
    ├── lib/                       ← Fachlogik, Design-Tokens, Config
    ├── supabase/migrations/       ← Postgres-Schema, RLS, Seed-Daten
    ├── context/                   ← Projektdokumentation für Kontext
    └── utils/supabase/            ← Supabase-Clients (Server, Client, Middleware)
```
