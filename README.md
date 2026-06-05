# Avalis

**Avalis** ist eine modulare, institutionsübergreifende Weblösung, die den Nachteilsausgleichsprozess (NTA) an Schweizer Hochschulen in einem durchgängigen, rollenübergreifenden Fall abbildet. Der Prozess ist heute fragmentiert: Er läuft über E-Mail, PDFs und parallele Systeme, der Status bleibt für Antragstellende unklar, und die Koordination zwischen Fachstelle, Entscheidungsinstanz und weiteren Stellen ist aufwendig.

Avalis bündelt den Ablauf von der Antragstellung bis zum bewilligten oder abgelehnten Antrag in einem gemeinsamen Fall mit nachvollziehbarem Status und verbindet die beteiligten Rollen in einer durchspielbaren Simulation. Die Lösung entstand als Bachelor-Projekt im Studiengang Digital Ideation an der HSLU und baut auf einem schweizweiten Research zu NTA-Prozessen auf. Sie ist modular angelegt, damit sie sich an unterschiedliche Prozessmodelle der Hochschulen anpassen lässt (im Prototyp abgebildet: zentrale Fachstelle mit dezentraler Entscheidungsinstanz).

**Team:** Mike De Bastiani · Dario Foti · Chiara Tremml

**Prototyp (live):** https://nta-tool-prototype.vercel.app/

> **Hinweis — Prototyp, kein Produktivsystem**
> Dies ist ein forschungs- und testorientierter Webprototyp, kein einsatzfähiges Produkt. Die Logins sind inszeniert (optisch an ein Hochschul-Login angelehnt, technisch E-Mail/Passwort über Supabase Auth). Es gibt keine produktive Datenhaltung, keine geprüfte Sicherheitsinfrastruktur und keine Anbindung an reale Drittsysteme (z. B. Evento, EDU-ID, Prüfungssysteme). Der Prototyp dient als konzeptioneller und technischer Nachweis eines durchspielbaren Multi-Stakeholder-Prozesses.

## So testest du den Prototyp

Dieser Abschnitt richtet sich an Bewertende, die den live deployten Prototyp testen.

### Zugangsdaten

Die Test-Logins befinden sich im Abgabeordner in der Datei `nta-tool-prototype_login-credentials.csv`. Aus Sicherheitsgründen sind sie nicht im Git-Repository enthalten.

### Bereiche

Der Prototyp besteht aus zwei getrennten Bereichen:

| Bereich | Login-Route | Rollen |
|---------|-------------|--------|
| Studierenden-Portal | `/student/login` | R1 (Studierende) |
| Workspace | `/staff/login` | R2–R6 (Verwaltung) |

Studierende bewegen sich im Portal (`/portal/...`), die Verwaltungsrollen im Workspace (`/workspace/...`).

### Regeln für ein zuverlässiges Testing

Der Prototyp arbeitet mit einer echten Datenbank und Echtzeit-Synchronisation. Damit die Simulation zuverlässig läuft, sind ein paar Regeln wichtig:

- **Pro Rolle einen separaten Browser verwenden**, zum Beispiel Firefox für eine studierende Rolle und Chrome für eine Verwaltungsrolle.
- **Niemals zwei Logins im selben Browser** angemeldet haben, egal welche Rollen. Mehrere gleichzeitige Sessions im selben Browser können zu Session-Konflikten und falscher Rollenzuordnung führen.
- **Pro angemeldetem User nur ein Tab** offen halten.
- Für **Studierende (R1)** stehen drei Test-Logins zur Verfügung. Welcher gewählt wird, ist egal, aber nicht mehrere Personen sollten gleichzeitig im selben Studierenden-Login testen.
- Bei den **Verwaltungsrollen (R2–R6)** ist paralleles Testen mit verschiedenen Accounts unkritisch, solange jede Person einen eigenen Browser und einen Tab verwendet.

> **Keine Sorge:** Beim Testen kann nichts dauerhaft kaputtgehen. Die Daten sind Testdaten, und der Prototyp lässt sich jederzeit neu durchspielen. Probier dich also gern frei aus.

> **Bei Problemen oder Fragen** stehe ich (Mike De Bastiani) gerne persönlich zur Verfügung.

### Testablauf und Hinweis zur Simulation

Der NTA-Prozess verbindet mehrere Rollen, die zu unterschiedlichen Zeitpunkten am selben Fall arbeiten. Für eine **durchgängige Simulation muss daher jeweils auch die Gegenseite mitgespielt werden**: Reicht zum Beispiel eine studierende Person (R1) einen Antrag ein, geschieht der nächste Schritt erst, wenn die Fachstelle (R2) im Workspace darauf reagiert, und umgekehrt erscheint deren Rückmeldung in Echtzeit wieder im Portal der studierenden Person. Am besten öffnest du beide Seiten parallel (in getrennten Browsern) und wechselst zwischen ihnen hin und her.

Ein vollständiger Durchlauf sieht zum Beispiel so aus:

1. **R1 (Portal):** Antrag starten, Beratungstermin buchen, auf die Empfehlung warten, Antrag ausfüllen und einreichen.
2. **R2 (Workspace):** Beratung und Empfehlung freigeben, nach der Einreichung das blockweise Review durchführen, den Antrag weiterreichen oder zur Anpassung an R1 zurücksenden.
3. **R1 (Portal):** Falls eine Anpassung angefordert wurde, diese vornehmen und erneut einreichen.
4. **R4 (Workspace):** Entscheid fällen (Bewilligung oder Ablehnung) und die Verfügung generieren.
5. **R1 (Portal):** Status und die ausgestellte Verfügung im Portal prüfen.

## System-Architektur

### Eine Codebase, zwei Bereiche

Portal und Workspace entstehen aus derselben Codebase und sind nur über Routen und Layouts getrennt (`PortalDashboardShell` und `WorkspaceDashboardShell` über `RoleDashboardLayout`). Der eigentliche Anwendungscode liegt im Ordner `nta-tool-prototype/`.

### Ein Fall, viele Perspektiven

Im Zentrum steht die Entität `applications` in Postgres: ein Antrag als gemeinsamer Fall mit einem Status und strukturierten Daten in einer JSONB-Spalte (`data`). Alle Rollen arbeiten an demselben Datensatz, jeweils aus ihrer eigenen Sicht und mit unterschiedlichen Berechtigungen. Eine Statusänderung ist damit kein isoliertes Ereignis auf einem Screen, sondern verändert den geteilten Zustand für alle Beteiligten.

### Echtzeit-Synchronisation

Änderungen einer Rolle werden für die anderen Rollen zeitnah sichtbar. Dafür kommen mehrere Mechanismen zum Einsatz:

- **Supabase Realtime Broadcast** auf Kanälen wie `application-row:<applicationId>`, nach Mutationen wie Review-Weiterleitung, R1-Freigabe oder R4-Entscheid.
- **`postgres_changes`-Subscriptions** auf der Tabelle `applications`, etwa im Antragsflow und im Workspace.
- **Polling** an einzelnen Stellen, zum Beispiel im R1-Dashboard für aktuelle Status-Anzeigen.

### Sicherheit und Berechtigungen

Rollenbasierte Lese- und Schreibrechte werden serverseitig über Postgres Row Level Security (RLS) und Trigger durchgesetzt, nicht allein im Frontend. So darf die Fachstelle (R2) zum Beispiel nur definierte Pfade in `data` ändern (etwa `consultation` und `recommendation`), während die Entscheidungsinstanz (R4) nur in der Entscheidphase schreiben darf.

## Tech-Stack

| Schicht | Technologien |
|---------|--------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling & UI | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons |
| Rich-Text | TipTap v3 (Empfehlungsschreiben, Review) |
| Backend | Supabase: Postgres, Auth, Realtime |
| Supabase-Client | `@supabase/supabase-js`, `@supabase/ssr` (Session in Next.js Middleware) |
| Deployment | Vercel (Hosting), Quellcode auf GitHub |
| Paketmanager | npm (npm-Workspace: Root `nta-tool` → Package `nta-tool-prototype`) |

## Weitere Dokumentation

Ausführlicher Projektkontext, Rollen, Flows und Datenmodell finden sich in den Kontext-Dateien im Repository:

- `nta-tool-prototype/context/General_Prototype_Kontext.md`
- `nta-tool-prototype/context/Toolbeschreibung_Organisation_Kontext.md`
- `nta-tool-prototype/context/Prototyp_Funktionen.md`
