# Kontext: Antrag Bewilligung (R4 Entscheidungsinstanz) — NTA Prototyp

> **Zweck:** Referenz für den **R4-Bewilligungsflow** nach R2-Weiterreichung an die Entscheidungsinstanz (`in_implementation` / kanonisch **In Entscheid**). Layout und Block-Struktur entsprechen der **R2-Review-Ansicht**, Funktionen und Sidebar-Inhalt weichen ab.  
> **Verwandt:** `Antrag_Review_Kontext.md` (R2 Block-Review, Forward), `Antragerstellung_Kontext.md` (RLS § 10, Login § 2), `General_Prototype_Kontext.md`.

---

## 1. Ausgangslage

- R2 bestätigt alle Review-Blöcke und reicht mit **„Antrag weiterreichen“** an die Entscheidungsinstanz weiter → technischer Status **`in_implementation`**, kanonisch **`in_decision`** („In Entscheid“ für R1/R2).
- **R4** nutzt dieselbe **Workspace-Shell** wie R2 (`RoleDashboardLayout`: Sidebar, **Topbar** mit Suche/Inbox/Avatar-Initialen aus `lib/user-initials.ts` für alle Rollen **R2–R6**, nicht nur R2). Unterschied ist **nur die Berechtigung je Status**:
  - Ausserhalb **`in_implementation`** (technisch: Entscheid ausstehend): R4 sieht dieselbe **Block-Review-Ansicht** wie R2 im jeweiligen Nur-Lese-Modus (`WorkspaceApplicationReview`, `workspaceViewerRole="R4"`, `viewMode` je Kanon-Status; kein Empfehlungs-Editor für R4).
  - In **`in_implementation`**: zusätzliche **Bewilligungs-Ansicht** (`WorkspaceR4DecisionView`) mit Schaltern und Block-Bestätigung gemäss Figma (Standard / nach Anpassungen / bestätigter Block).
- **Inbox-Liste:** dieselben Anträge wie R2 laden (`app/workspace/page.tsx` + `lib/workspace-applications-list.ts`; Client-Refresh in `workspace-test-flow.tsx` per **`GET /api/workspace/applications`**). Detailansicht auch für kanonisch **`approved`** / **`rejected`** im Modus `readonly_decision` (Lesesicht).
- **Wording Status:** R1 und R2 sehen weiterhin die zentrale Meta-Bezeichnung **In Entscheid** (bzw. kanonisch `in_decision` in `lib/application-status.ts`). **R4** sieht für denselben Zustand **„Entscheid ausstehend“** (`StatusAudience` **R4**).

---

## 2. Rechte & Sichtbarkeit

| Rolle | Anträge in `in_implementation` | Andere Status (z. B. `in_review`, `needs_adjustment`, …) |
|--------|--------------------------------|------------------------------------------------------------|
| **R4** | Volle **Bewilligungs-UI** in `in_implementation` | **Lesen** gleiche Ansichtskomposition in anderen Status (wie R2-Review, student-ähnliche Nur-Lese-Hinweise); Empfehlungs-Editor ausgeblendet |
| **R2** | Unverändert: read-only Entscheid-Modus wie bisher | unverändert |

Login: **`/staff/login`** erlaubt weiterhin R2–R6 inkl. R4; Redirect nach erfolgreichem Login **`/workspace`**.

---

## 3. UI — Layout

- **Gleiche dreispaltige Logik** wie `WorkspaceApplicationReview`: scrollbare Blockspalte links, **fixe Sidebar** rechts (`366px`), `RoleDashboardLayout` / Toolbar **„Zurück zur Liste“** wie im Workspace-Flow.
- **Sidebar „Antragdetails“:** oben unverändert Metadaten (Status-Pill, Antragsteller, Daten, Zugewiesen, IDs).
- **Unterhalb** (anstelle der Kommentar-Chronik im R4-Entscheid-Flow): **Kontakt-Cards**
  - **Antragstellende Person** (Name, E-Mail aus Antrag / verknüpftem User).
  - **Kontaktperson Fachstelle** (z. B. aus `consultation.advisor` oder Fallback auf Freigabe-Name `recommendation.releasedBy` / Platzhalter-E-Mail für den Prototyp).
- Zweck: Hinweis, diese Personen bei Rückfragen während der Bewilligung zu konsultieren.

---

## 4. Blöcke — R2-bestätigte Inhalte (ohne Bewilligung durch R4)

Folgende Blöcke sind **nicht** bewillig-/ablehnbar und **ohne** grüne R2-„Bestätigt“-Kodierung:

- Antragsteller  
- Fachärztliches Attest  
- Empfehlungsschreiben der Fachstelle (`RecommendationReleasedAccordion` wie R2)  
- Antragsdefinition  

Darstellung: neutraler **Card**-Rahmen (`footerTone`/`border` wie Standard-Review-Block ohne Teal). Unten **rechts** dezenter Hinweis mit Icon **Doppel-Häkchen** (`CheckCheck`) und Text **„Von der Fachstelle bestätigt“**.

---

## 5. Blöcke — R4-Entscheid (Schalter-Logik)

Betroffen: **Gültigkeitsdauer**, **Geltungsbereich**, **Massnahmen LV**, **Massnahmen Leistungsnachweise** (gleiche Sichtbarkeitsregeln wie im R2-Review: leere/abschaltbare Blöcke ausblenden).

### Figma-Referenzen (Mid-Fi shadcn Kit)

| Node | Inhalt |
|------|--------|
| [3800-7590](https://www.figma.com/design/Zsfu5vNE9nR0QPRNbUzy0K/BA-Prototyp-Mid-Fi--shadcn-Kit-?node-id=3800-7590&m=dev) | Ausgang: vom Studierenden Gewähltes, alle relevanten Schalter **an** → Kennzeichnung **bewilligt** |
| [3800-7722](https://www.figma.com/design/Zsfu5vNE9nR0QPRNbUzy0K/BA-Prototyp-Mid-Fi--shadcn-Kit-?node-id=3800-7722&m=dev) | Bearbeitung: abgelehnt / Vorschlag / Zurücksetzen |
| [3800-7886](https://www.figma.com/design/Zsfu5vNE9nR0QPRNbUzy0K/BA-Prototyp-Mid-Fi--shadcn-Kit-?node-id=3800-7886&m=dev) | Nach **„Auswahl bestätigen“**: bestätigter Block; **Bearbeiten** (Ghost) öffnet wieder die bearbeitbare Ansicht |

### Regeln pro Zeile (Massnahmen / Geltungsbereich)

- **Studierende Person hat gewählt** und Schalter **an** → Anzeige **bewilligt** (Figma: positive Kodierung).
- **Studierende Person hat gewählt**, R4 setzt Schalter **aus** → **abgelehnt** (negative Kodierung laut Figma).
- **Studierende Person hat nicht gewählt**, Ausgang Schalter **aus**, Text **Vorschlagen** → R4 setzt Schalter **an** → **Vorschlag** (Figma: gelbe Zeile / gelber Switch, nicht Violett).

**Gültigkeitsdauer:** zwei optionale Zeilen (gesamte Studiendauer / ein Semester); logisch **exklusiv** — höchstens eine Zeile kann auf **bewilligt** stehen; Umsetzung im Prototyp als gekoppelte Schalter-Gruppe analog zur Intention „eine Dauer gewählt“.

### Aktionen im Block

- Nach erster Änderung der Auswahl: Button **„Zurücksetzen“** links unten (stellt die **Arbeitskopie** dieser Zeilen auf den Ausgangszustand aus den Antragsdaten zurück).
- **„Auswahl bestätigen“** rechts: persistiert den Block, wendet **bestätigtes** Styling an (vgl. Figma 3800-7886); **„Bearbeiten“** (Ghost) hebt die Bestätigung nur UI-seitig auf, bis erneut bestätigt oder persistiert wird.
- **„Entscheid abschliessen“** unten rechts: solange **deaktiviert**, bis **alle sichtbaren** R4-Entscheid-Blöcke bestätigt sind; dann aktiv. *(Prototyp: setzt Status auf `approved` und broadcastet — Ablehnungs-/Teilentzugs-Fälle können später ergänzt werden.)*

---

## 6. Datenhaltung (Prototyp)

- Persistenz unter **`data.r4DecisionReview`** (`ApplicationData` in `lib/test-flow-types.ts`), damit **kein** Konflikt mit dem R2-Trigger-Pfad **`data.recommendation`** / **`data.consultation`** entsteht.
- Struktur: pro Entscheid-Block (`duration` \| `scope` \| `lectureMeasures` \| `assessmentMeasures`) gespeicherte **Zeilen** (`key`, `studentSelected`, `r4Approved`) und Flag **`confirmed`** nach Klick auf „Auswahl bestätigen“.
- **APIs (Server, optional / Fallback):**
  - **`POST /api/applications/r4-persist-decision`** — merge `r4DecisionReview` (nur R4, nur Status `in_implementation`).
  - **`POST /api/applications/r4-complete-decision`** — prüft alle sichtbaren Entscheid-Blöcke `confirmed`, setzt **`approved`**, Broadcast wie bei anderen Antrags-Mutationen.
- **Ist-Pfad im UI:** Speichern und Abschliessen laufen primär **direkt im Browser** über den Session-Supabase-Client (`lib/r4-workspace-supabase-persist.ts`: `persistR4DecisionWithSupabaseClient`, `completeR4DecisionWithSupabaseClient`) — umgeht fehleranfällige Cookie-/SSR-Kombination auf den API-Routen; die Routen bleiben als Referenz/Fallback nutzbar.

**Hinweis RLS / Supabase (Ist):**

- **Additive Policies** (Migration `supabase/migrations/20260513190000_r4_workspace_select_policies.sql`):
  - **`applications_select_r4_workspace`** — R4 darf `applications` in den üblichen Workspace-Status lesen (inkl. `in_decision`, `in_implementation`, `approved`, `rejected`, …).
  - **`users_select_r4_workspace_applicants`** — R4 darf Zeilen in `public.users` lesen für **eigene Profilzeile** (`users.id = auth.uid()`) und für **Antragsteller**, die einen passenden Antrag haben (Embed `users!applications_applicant_id_fkey` in der Listen-Query).
- **UPDATE für R4** (Migration `supabase/migrations/20260514120000_applications_update_r4_decision.sql`): Policy **`applications_update_r4_decision`** — R4 darf `applications` aktualisieren, wenn `status = in_implementation` (`USING`); `WITH CHECK` erlaubt Ziel `in_implementation` **oder** `approved` (Abschluss). Ohne diese Policy schlagen Client-Updates mit dem normalen Supabase-Key fehl, wenn kein Service-Role verwendet wird.
- **Pflicht für alle neuen Policies auf `users`/`applications`:** Rolle des eingeloggten Users **nur** über **`current_user_role()`** ausdrücken (bereits im Projekt als `SECURITY DEFINER` — gleiches Muster wie `applications_select_r2_worklist`). **Nicht** `EXISTS (SELECT 1 FROM public.users …)` innerhalb von RLS auf `users` verwenden → sonst Postgres **„infinite recursion detected in policy for relation users“** (betrifft dann auch R1/R2-Login beim Profil-Select).
- **APIs** `r4-persist-decision` / `r4-complete-decision` können weiterhin optional den **Service-Role-Client** nutzen, wenn Schreib-RLS für R4 in einer Umgebung noch fehlt — **nur** nach Session-Auth und Rollenprüfung **R4**. Produktiv sind dedizierte UPDATE-Policies vorzuziehen.
- **Supabase Free Egress:** Überschreitung drosselt Traffic, **nicht** die genannte Policy-Rekursion (das ist rein Postgres-RLS).

---

## 7. Client-State — Schalter & Server-Reconcile (wichtig)

Ziel: kein „Kreuzschalten“ (ein Klick ändert scheinbar eine andere Zeile) und kein Zurückspringen nach Autosave/Refetch.

- **Toggle:** `R4Switch` ruft `onToggle()` ohne Wert; der neue Zustand entsteht in **`setReview(prev => …)`** durch Invertieren von **`prev.blocks[id].rows`** (`!row.r4Approved`), nicht durch `!checked` aus den React-Props — vermeidet veraltete Prop-Lesungen bei schnellen Klicks.
- **`editingRef`:** spiegelt `editing[id]`, damit die Guard „Block bestätigt, aber nicht im Bearbeitungsmodus“ innerhalb funktionaler Updates aktuell bleibt.
- **Debounced Autosave:** `scheduleR4Autosave` schreibt über **`reviewRef.current`** nach der Debounce-Zeit; Ref wird jedes Render aktualisiert.
- **Einspielen neuer Server-Daten:** `useEffect` auf **`application.id`** + **`data.r4DecisionReview?.updatedAt`** ruft  
  **`mergeR4DecisionReviewRespectingLocalDirty(application.data, prev)`** auf.  
  - **`localR4BlockDiffersFromServerMerge`:** pro Block wird geprüft, ob **`confirmed`** oder irgendein **`r4Approved`** vom Ergebnis von **`mergeR4DecisionReview(serverData)`** abweicht — **nicht** mehr nur „dirty gegenüber Studierenden-Baseline“. Damit bleibt der Schutz aktiv, wenn R4 z. B. eine Studierenden-Zeile wieder auf Bewilligt dreht (Baseline = wieder „clean“), die DB aber noch einen älteren Stand hat.
  - **`application.data` nicht als Effect-Dependency:** sonst würde jede neue Objekt-Referenz vom Parent unnötig remergen und **`setEditing({})`** auslösen.
  - Beim Merge wird **kein** pending Autosave-Timer am Anfang des Effects gekillt (sonst verlorene Saves bei schnellem Toggle).

---

## 8. Code-Anker

| Bereich | Pfad |
|---------|------|
| R4 Vollansicht | `components/domain/workspace-r4-decision-view.tsx` |
| Sidebar Kontakte + Metadaten | `components/domain/application-review-detail-sidebar.tsx` (Erweiterung `contactsSection`) |
| Workspace-Einbindung | `components/domain/workspace-test-flow.tsx`, `app/workspace/page.tsx`, `lib/workspace-applications-list.ts`, `app/api/workspace/applications/route.ts` |
| Login / Profil | `components/domain/login-card.tsx` (`getSession()` nach `signInWithPassword`, dann `users.role`) |
| Layout / Avatar | `components/domain/role-dashboard-layout.tsx` (`workspaceAccountInitials`) |
| Status / Labels R4 | `lib/application-status.ts` |
| Typen | `lib/test-flow-types.ts` |
| Merge / Zeilenbau / Sichtbarkeit | `lib/r4-decision-state.ts` (`mergeR4DecisionReview`, `mergeR4DecisionReviewRespectingLocalDirty`, `localR4BlockDiffersFromServerMerge`, `mergeApplicationDataWithR4Review`, …) |
| Browser-Persistenz R4 | `lib/r4-workspace-supabase-persist.ts` |
| APIs (optional) | `app/api/applications/r4-persist-decision/route.ts`, `r4-complete-decision/route.ts` |

---

## 9. Abgrenzung / später

- Kein separates Feld-Annotation-Modell (weiterhin F6-Ist: Block-Ebene).
- **Ablehnung gesamten Antrags** oder Aufteilung bewilligt/teilweise abgelehnt auf Antragsebene: aktuell nicht — nur **Entscheid abschliessen → bewilligt** als Prototyp-Endpunkt.
- R3/R5/R6: unverändert; Fachrolle **R4** ist in diesem Flow die genannte Entscheidungsinstanz (Produktsprache; im Gesamtkonzept teils als R3 beschrieben — im Code-Rollenenum **R4**).

---

*Letzte Aktualisierung: R4 Client-Persistenz (`r4-workspace-supabase-persist`), UPDATE-RLS `applications_update_r4_decision`, reconcile-Logik `localR4BlockDiffersFromServerMerge` / funktionale Toggle-Updates, Workspace-Shell R2–R6, Inbox/API-Liste.*
