# High Fidelity Design — Kontext & Übersetzungsregeln

> **Zweck:** Sammelort für Prinzipien, Figma-Referenzen und Learnings beim Schritt **Mid-Fi → High-Fi** im NTA-Webprototyp.  
> **Technik:** Tailwind CSS v4, CSS-Variablen unter `app/design-tokens/`, shadcn/Obra-Komponenten.  
> **Figma-Quelle (HF):** [BA-Prototyp-High-Fi](https://www.figma.com/design/pwLFwfIPnr9ZuYcot9pyyU/%E2%AD%90-BA-Prototyp-High-Fi)

---

## 1. Arbeitsweise

1. **Figma ist führend** — Hex-Werte und Layout aus den verlinkten Nodes; bei Widerspruch zwischen Swatch-Text und Variable/Fill gilt die **Variable-Bindung** (Fill).
2. **Schrittweise pro Flow** — nicht alles auf einmal umstellen; nach jedem Screen Kurznotiz unter „Erfahrungen“.
3. **Tokens vor Hardcoding** — Farben über `bg-entwurf-100`, `text-stone-900`, `var(--hf-border)` etc.; keine losen `#…` in Komponenten.
4. **Mid-Fi-Kontext bleibt gültig** für Logik/RLS/Flows (`Antragerstellung_Kontext.md`, `Antrag_Review_Kontext.md`, `Dashboard_Core_Layout_Kontext.md`, …); dieses Dokument betrifft **visuelle** HF-Übersetzung.

---

## 2. Farbsystem (angelegt)

| Figma-Spalte | CSS-Präfix (Tailwind) | Kanonischer Status |
|--------------|----------------------|-------------------|
| Graustufen | `stone-*` | Neutral / UI-Chrome (inkl. HF-only **`stone-150`** `#EEECEB`, **`stone-250`** `#DEDBD9` = Border) |
| Entwurf | `entwurf-*` | `draft` |
| Beratung & Empfehlung | `beratung-*` | `consultation_recommendation` |
| In Review/Anpassung angefordert | `in-review-*` | `in_review` |
| Review/Anpassung erforderlich | `adjustment-*` | `needs_adjustment` |
| In Entscheidung | `in-decision-*` | `in_decision` |
| Positiv/Bewilligt | `bewilligt-*` | `approved` |
| Destructiv/Abgelehnt | `abgelehnt-*` | `rejected` |

**Code:**

| Datei | Inhalt |
|-------|--------|
| `app/design-tokens/high-fidelity-colors.css` | Alle `--hf-*` Variablen + `@theme inline` für Tailwind |
| `app/globals.css` | Import der Token-Datei; shadcn-Semantik auf HF-General gemappt |
| `lib/design-tokens/status-badge-colors.ts` | Badge-Klassen pro `CanonicalApplicationState` |

**Figma-Referenz Farben:** Node `534:32434` — „Colors / Raw Colors“, Based on Tailwind v4 (Obra shadcn/ui Community).

### General / shadcn-Semantik (Light)

| Token | Hex | Figma-Variable |
|-------|-----|----------------|
| Foreground | `#1c1917` | `general/foreground` |
| Foreground alt | `#404040` | `unofficial/foreground alt` |
| Muted foreground | `#78716c` | `general/muted foreground` |
| Border | `#dedbd9` (`stone-250`) | `general/border` → `--hf-border` |
| Accent | `#f5f5f5` | `general/accent` |
| Body background | `#ffffff` | `unofficial/body background` |

### Bekannte Figma-Lücken

- **In Entscheidung 600–950:** In der HF-Datei sind die Swatches 600–950 visuell alle auf `#985cf6` (500) gesetzt; Textlabels sind Platzhalter (Stone). Im Code sind nur **50–500** hinterlegt. Vor Nutzung dunklerer Violett-Töne bitte in Figma nachziehen oder hier Hex ergänzen.

- **Anpassung erforderlich 800:** Figma hat `#b44f09` (gleich wie 700) — 1:1 übernommen.

---

## 3. Status-Badges (HF)

Zentral in `lib/design-tokens/status-badge-colors.ts`, konsumiert von `lib/application-status.ts`:

| Status | Klassen (Beispiel) |
|--------|-------------------|
| Entwurf | `bg-entwurf-100 text-entwurf-500` |
| Beratung & Empfehlung | `bg-consultation-surface` / `text-consultation-accent` (`#E0F2FE` / `#0EA5E9`) |
| In Review / Review erforderlich (R1, R2, R4) | `bg-beratung-100 text-beratung-500` |
| Anpassung | `bg-adjustment-100 text-adjustment-500` |
| In Entscheid | `bg-in-decision-100 text-in-decision-500` |
| Bewilligt | `bg-bewilligt-100 text-bewilligt-700` |
| Abgelehnt | `bg-abgelehnt-200 text-abgelehnt-700` |
| R2 „Empfehlung verfasst“ | `bg-stone-100 text-stone-500` |

---

## 4. Typografie (angelegt)

**Figma-Referenz:** Node `310:257309` — „Typography“.

| Stil | Grösse | Zeilenhöhe | Gewicht |
|------|--------|------------|---------|
| heading 1 | 48px | 48px | 600 |
| heading 2 | 30px | 30px | 600 |
| heading 3 | 24px | 28.8px | 600 |
| heading 4 | 20px | 24px | 600 |
| paragraph large | 18px | 27px | 400 / 500 / 600 |
| paragraph regular | 16px | 24px | 400 / 500 / 600 |
| paragraph small | 14px | 20px | 400 / 500 / 600 |
| paragraph mini | 12px | 16px | 400 / 500 / 600 |
| monospaced | 16px | 24px | 400 |
| caption | 14px | 21px | 400, `letter-spacing: 1.5px`, uppercase |

**Code:**

| Datei | Inhalt |
|-------|--------|
| `app/layout.tsx` | `next/font` **DM Sans** (400, 500, 600) — ersetzt Inter/Geist |
| `app/design-tokens/high-fidelity-typography.css` | CSS-Variablen, `@theme` (`text-heading-*`, `text-paragraph-*`), Utilities `text-hf-*` |
| `lib/design-tokens/typography.ts` | Vorgefertigte Klassen-Bundles (`hfTypography`, `hfBlockTitle`, `hfBody`) |

**Font-Familie im Prototyp:** durchgängig **DM Sans** (`--font-dm-sans` → `font-sans`, `font-heading`, `font-mono`, TipTap). Figma definiert `monospaced` mit Geist Mono; bewusst einheitlich DM Sans (deine Vorgabe).

**Nutzung bei Screen-Migration:**

```tsx
import { hfTypography, hfBlockTitle } from "@/lib/design-tokens/typography";

<h1 className={hfTypography.h1}>…</h1>
<p className={hfTypography.paragraphRegular}>…</p>
```

Bestehende `text-lg font-medium leading-[27px]` entsprechen oft schon **paragraph large medium** — bei HF-Touches auf `text-hf-paragraph-large-medium` umstellen.

---

## 5. Layout-Grid (angelegt)

**Figma-Referenz:** Node `3017:288` — Desktop laptop.

| Token | Wert (≥1000px) |
|-------|----------------|
| Columns | 12 fluid |
| Margins | 48px links/rechts |
| Gutter | 24px |
| Breakpoint | `min-width: 1000px` |
| Mindestbreite Shell | `min-width: 1000px` (`--hf-grid-min-width`) |

**Responsive (Fallback, nicht in Figma spezifiziert):**

| Viewport | Margin | Gutter |
|----------|--------|--------|
| &lt;768px | 16px | 12px |
| 768–999px | 24px | 16px |
| ≥1000px | 48px | 24px |

**Code:**

| Datei | Inhalt |
|-------|--------|
| `app/design-tokens/high-fidelity-grid.css` | CSS-Variablen, `.hf-page-grid`, `.hf-grid`, Spans/Starts, Utilities |
| `lib/design-tokens/grid.ts` | Konstanten + `hfGridCellClass()` |
| `components/layout/hf-grid.tsx` | `HfPageGrid`, `HfGridCell`, `HfGridFree` |

**Nutzung:**

```tsx
import { HfPageGrid, HfGridCell, HfGridFree } from "@/components/layout/hf-grid";

<HfPageGrid>
  <HfGridCell span={8} start={3} collapseBelowDesktop>
    …inhalt…
  </HfGridCell>
</HfPageGrid>
```

**Ausnahmen (`HfGridFree`):** Review-/Korrektur-Ansichten mit fester rechter Sidebar (`edgeToEdge` im Layout) bleiben bewusst **ohne** Page-Grid — nutzen intern eigenes Layout; horizontale Abstände dort schrittweise auf `hf-px-page` / `--hf-grid-gutter` umstellen.

**Bereits angebunden:** **Dashboard Core** (`workspace-dashboard-shell.tsx`, Figma Sidebar `5354:9951` / `5354:10586`), **`portal/home`** (R1 HF Home: Cards `5792:22019`, Table `5826:3088`, Card-States `5856:21926`), Workspace-Home `5509:11682` (KPI `5483:11126`), Workspace-Inbox-Liste, **R1-Antragsflow-Shell** (`r1-application-flow-layout.tsx` — **separates** Layout, nicht die Dashboard-Shell). Details → **`Dashboard_Core_Layout_Kontext.md`**.

Utility-Klassen: `hf-px-page` (Toolbar-Padding), `hf-gap-grid` (Gap = Gutter).

---

## 6. Dashboard Core (Portal + Workspace, HF umgesetzt)

**Nicht** der R1-Step-Flow — gemeinsame Hülle für Antragsliste, Workspace-Inbox und R1-Adjustment.

| Node | Inhalt |
|------|--------|
| `5354:9951` | Sidebar nav_max (240px) |
| `5354:10586` | Sidebar nav_mini (68px) |
| `5354:10007` | Workspace-Top-Bar (Suche, Inbox, Account) |
| `5509:11682` | Workspace Home + Nav-Aktiv (Primary-Hintergrund, `primary-foreground`-Label) |
| `5483:11126` | Workspace KPI «Offene Antragsverfahren» (R2/R3) |
| `5948:27359` | Workspace Home R4 — «Alle Anträge» + «Zugewiesene Aufgaben» |
| `5948:27466` / `5948:27470` | Anträge-Panel Toolbar (Suche, Offen/Alle, Filter, Download) |
| `5955:21930` | Anträge-Tabelle maximiert (Minimize) |
| `5792:22019` | R1 Home — Cards-Ansicht «Meine Anträge» |
| `5826:3088` | R1 Home — Table-Ansicht |
| `5856:21926` | R1 Antragkarte — Status-Varianten |
| `5792:22057` | R1 Utility-Spalte (Neuer Antrag + Informationen) |

**Code:** `workspace-dashboard-shell.tsx`, `workspace-home-dashboard.tsx`, `workspace-my-tasks-view.tsx`, `workspace-applications-table.tsx`, `workspace-applications-table-toolbar.tsx`, `use-workspace-applications-table-state.ts`, `student-dashboard.tsx`, Tokens `workspace-dashboard.ts` (inkl. `WORKSPACE_HOME_TABLE_*`), `application-block.ts`, Brand `avalis-logo.tsx`.

**Anträge-Toolbar (Figma `5948:27470`):** Suche/Filter/Download — `bg-transparent`, Rand `border-border`; Toggle aktiv `bg-primary` / `text-primary-foreground` / `rounded-full`; inaktiv `text-muted-foreground` / `rounded-[10px]`. Kein weisser Fill auf Panel-`stone-50`.

**Status-Badge:** `status-badge-colors.ts` — Beratung & Empfehlung vs. In Review/Review erforderlich (alle Rollen gleich); Callouts via `hfStatusCalloutClasses`. KPI «Offene Antragsverfahren»: Balkenfarben unverändert (`beratung-100` für In-Review-Segment); Total nur In Review + Anpassung + In Entscheid.

**Nav aktiv:** `bg-primary` / `text-primary-foreground`, `rounded-[7px]` — Tokens `DASHBOARD_NAV_ITEM_ACTIVE_*` (Label ohne `hfTypography`-`foreground-alt`).

**Portal-Besonderheiten:** 16px-Rand (`h-4` / `PORTAL_DASHBOARD_RIM_HEIGHT_CLASS`) auf `/portal/home`; Top-Bar auf `/portal/antragserstellung` (Adjustment), Ist ohne Höhen-Morph.

**Inhalts-Panel:** **Inset** (`rounded-xl`, `pb-6`) oder **Tight** (`rounded-t-xl`, `pb-0`) je nach Füllhöhe (Hysterese 90 % / 82 %); `edgeToEdge` für Review/Adjustment/Home ohne Shell-`p-6`.

**Scroll-Inset Dashboard-Home:** `dashboardMainPanelScrollAreaClass` — **`pt-12`** (48px) über der Begrüssung/Headings; Review-Detail **`applicationReviewScrollAreaClass`** — `px-12 pt-12`.

### Review- & R4-Blöcke (HF umgesetzt)

| Node | Inhalt |
|------|--------|
| `5641:21990` … `5641:22807` | R2 Review-Block-Varianten (`ReviewBlockVariant`, `review-block.ts`) |
| `5858:22820` … | R1 Anpassung Sidebar + Block-Footer (`review-bemerkungen.ts`, `r1-review-block.ts`) |
| `5641:23410` | R4 Fachstelle-bestätigt |
| `5657:17967` / `5907:23351` / `5657:18077` | R4 Entscheid-Schalter; `5907:23378` Freitext-Vorschlag (nur Massnahmen; `AutoGrowTextarea`) |

Vollständige Mechanik → **`Antrag_Review_Kontext.md`**, R4 → **`Antrag_Bewilligung_Kontext.md`**, Shell → **`Dashboard_Core_Layout_Kontext.md`**.

---

## 7. R1 Antragsflow (HF umgesetzt)

**Figma (Datei [BA-Prototyp-High-Fi](https://www.figma.com/design/pwLFwfIPnr9ZuYcot9pyyU)):**

| Node | Inhalt |
|------|--------|
| `5180:7021` | Gesamtscreen |
| `5180:7106` | Top-Bar (Titel, Autosave, Schliessen) |
| `5180:7025` / `5180:7233` | Fortschrittskarte |
| `5180:8333` | Fortschritts-Zeilen-States (available / complete / incomplete / locked) |
| `5180:7082` | Formular-Karte + Footer |
| `5213:1456` | Kontakt-Karte |
| `5180:7111` | Antrag verwerfen |

**Layout (`r1-application-flow-layout.tsx`):**

- Seite: `h-screen overflow-hidden`; nur **`R1FlowMainContent`** scrollt vertikal.
- Grid: Sidebar Spalten **1–3**, Hauptpanel **4–12** (bei Korrektur-Review optional Spalte 13+ für R2-Sidebar, Form **4–6**).
- Seitenrand Flow: **24px** via `.hf-page-grid--r1-flow` (`HF_R1_FLOW_GRID`); Dashboard/Liste behalten **48px** Desktop-Margin.
- Hauptpanel: weiss, `rounded-t-xl`, Shadow `application-content-panel.ts`, rechter Rand 24px (wie Dashboard).
- **Autosave** in der Top-Bar (`headerAutosave`), Lucide **Save**, `text-bewilligt-500` — nicht mehr über dem Formular.

**Icons:** Lucide über `components/domain/r1-flow-icons.tsx` (`R1FlowIcon`, `R1FlowProgressTrailingIcon`). Keine Raster-Assets unter `public/icons/r1-flow/` mehr.

**Fortschritt:** Visuelle States und Freischaltlogik → `Antragerstellung_Kontext.md` **§ 6** (nicht mehr Grün/Schwarz/Grau aus Mid-Fi).

**Formular-Styling & Feldabstände (R1):**

| Abstand | Tailwind | Verwendung |
|---------|----------|------------|
| 4px | `gap-1` | Label → Control; Titel ↔ Beschreibung im Feld (`R1FlowField`, `R1FlowFieldLabelGroup`) |
| 8px | `gap-2` | Optionen in `R1FlowFieldOptions` (Radio-/Checkbox-Karten) |
| 12px | `gap-3` | Beschreibungsblock → Control (`R1FlowField described`); Sektionstitel `spacingBelow="compact"` → `mb-3` |
| 20px | `gap-5` | Zeilen in `R1FlowFieldStack` / `R1FlowFieldRow` |
| 40px | `gap-10` | Zwischen **Hauptabschnitten** in `R1FlowFormCard`; zwischen Blöcken in **Antragsstellung** (`R1FlowFieldStack spacing="definition"`) |

**Primitives:** `R1FlowSectionTitle`, `R1FlowField`, `R1FlowFieldLabelGroup`, `R1FlowFieldControl`, `R1FlowFieldStack`, `R1FlowFieldRow`, `R1FlowFieldOptions`, `R1FlowAttestCallout` — alle in `r1-application-flow-layout.tsx`; Klassen-SSOT in `lib/design-tokens/r1-form.ts`.

| Datei | Nutzen |
|-------|--------|
| `lib/design-tokens/r1-form.ts` | Feld-Gaps, Choice-Karten, Select-Trigger |
| `lib/design-tokens/typography.ts` | `hfTypography`, `hfBlockTitle` in Form-Karten |
| `components/domain/r1-application-definition-section.tsx` | Step 4 **Antragsstellung** + identischer Block in Step 5 Übersicht |
| `components/domain/r1-booking-scheduler.tsx` | Step 3 Buchung (Figma `5307:7575`) |
| `components/domain/r1-booking-confirmation.tsx` | Step 3 Terminbestätigung (Figma `5307:7907`, Footer `5307:8254`) |
| `components/domain/recommendation-released-accordion.tsx` | `variant="r1"` für Step 3/5 (Figma `5247:5570`) |
| `public/images/r1-booking/map-example.png` | Statische Karten-Vorschau in Terminbestätigung |

**Step 5 Übersicht:** Kein zusätzlicher `space-y-*`-Wrapper — Inhalte als **Geschwister** in `R1FlowFormCard` (wie Step 1), damit überall **40px** zwischen den gleichen Abschnitten wie in den Einzelsteps. Step 2 = `scroll-mt-4 space-y-3` + Callout `mb-10`; Step 4 = `R1ApplicationDefinitionSection`.

**Pitfall:** `tailwind-merge` streicht sonst `text-hf-*` bei gleichzeitigem `text-stone-*` — in `lib/utils.ts` ist `extendTailwindMerge` mit `text-hf` als eigener Gruppe ergänzt.

**Assets:** Unter `public/icons/r1-flow/` können Referenz-SVGs liegen; der **laufende R1-Flow** nutzt **Lucide** über `r1-flow-icons.tsx` (keine gestreckten Raster-Icons).

---

## 8. Noch offen (HF-Roadmap)

- [x] R1 Formular-Feldabstände (4 / 12 / 20 / 40px) — `r1-form.ts` + `R1FlowField*`
- [ ] Spacing / Radius-Tokens global aus HF-Datei (ausserhalb R1-Formular)
- [ ] Komponenten-States (Button, Input, Card) aus Obra HF-Kit
- [x] R1 Antragsflow-Shell + Fortschrittskarte (Figma `5180:7021` ff.)
- [x] R1 Steps 2–5 HF-Screens (Attest-Callout, Buchung, Terminbestätigung, Empfehlung `r1`, Antragsstellung, Übersicht)
- [x] Dashboard Core Sidebar + Workspace-Top-Bar (Figma `5354:9951` / `5354:10586` / `5354:10007`)
- [ ] Weitere HF-Details (Profil/Einstellungen-Views, feinere Top-Bar-States) pro Schritt Figma-Node + Checkliste

---

## 9. Erfahrungen & Entscheidungen (laufend)

| Datum | Thema | Notiz |
|-------|--------|-------|
| 2026-05-18 | Farbsystem | Aus Figma Node `534:32434` importiert; Graustufen = Tailwind Stone; Prozess-Paletten als eigene Skalen |
| 2026-05-18 | Typografie | DM Sans via `next/font`; Tokens aus Node `310:257309`; Mono = DM Sans (nicht Geist) |
| 2026-05-18 | Layout-Grid | 12/48/24 aus Node `3017:288`; `HfPageGrid` + responsive Margins unter 1000px |
| 2026-05-18 | Grid-Mindestbreite | Desktop-Grid ab **1000px** (statt 1280); `--hf-grid-min-width` auf `.hf-page-grid` |
| 2026-05-18 | R1 Antragsstellung Shell | Figma `5180:7021`: `bg-stone-100`, Top-Bar mit Autosave, Fortschritt `5180:8333`, Lucide-Icons; Layout `r1-application-flow-layout.tsx` (Cols 1–3 / 4–12); Logik/Freischaltung in `nta-antrag-desktop.tsx` → `Antragerstellung_Kontext.md` § 5–6 |
| 2026-05-19 | R1 Formular-Spacing | `R1FlowField*` + `r1-form.ts`: 4px Label/Control, 12px Beschreibung→Control, 20px Feldzeilen, 40px Sektionen / Antragsdefinition |
| 2026-05-19 | R1 Step 3 Buchung | `r1-booking-scheduler.tsx` (`5307:7575`); Kalender: ausgewählter Tag → weisser Marker auf schwarzem Kreis |
| 2026-05-19 | R1 Step 3 bestätigt | `r1-booking-confirmation.tsx` (`5307:7907`, Footer `5307:8254`); statische Karte `public/images/r1-booking/map-example.png` |
| 2026-05-19 | Empfehlung R1 | `RecommendationReleasedAccordion` `variant="r1"` (`5247:5570`); `pt-4` Trigger→Content; Step 5 ohne Checkbox |
| 2026-05-19 | Step 5 Übersicht | Abschnitte als `R1FlowFormCard`-Geschwister (`gap-10`); `R1ApplicationDefinitionSection` geteilt mit Step 4 |
| 2026-05-19 | Dashboard Core | Sidebar `5354:9951`/`5354:10586`, Workspace-Top-Bar `5354:10007`; `workspace-dashboard-shell.tsx`; Top-Bar + Antragdetails-Panel (Ist: sofort; Morph-Spec → `Dashboard_Core_Layout_Kontext.md` § 4, § 6) |
| 2026-05-19 | R1 Flow Grid-Margin | `.hf-page-grid--r1-flow`: Seitenrand **24px** (Desktop); Dashboard/Liste weiter **48px** |
| 2026-05-20 | Dashboard HF Polish | Nav-Aktiv Primary + Workspace Home `5509:11682`; Inset/Tight-Panel + Hysterese; `application-block.ts` für Antragskarten |
| 2026-05-20 | Workspace Home table | Anträge-Tabelle: Live-`applications`, Zeilenklick, ein Divider pro Zeile; `workspaceApplicationListNumber` |
| 2026-05-27 | Workspace applications table layout | `workspace-applications-table.tsx` + `WORKSPACE_APPLICATIONS_TABLE_*`: `table-auto`, Studiengang wrap, Name wrap &gt;24 chars, compact cols nowrap, scroll ≤1150px (`74.125rem`), tighter actions padding |

---

## 10. Verwandte Dateien

| Datei | Nutzen |
|-------|--------|
| `General_Prototype_Kontext.md` | Gesamtprototyp, Tech, Rollen |
| `lib/application-status.ts` | Status-Logik (unverändert fachlich) |
| `app/design-tokens/high-fidelity-colors.css` | Farb-SSOT |
| `app/design-tokens/high-fidelity-typography.css` | Typo-SSOT |
| `lib/design-tokens/typography.ts` | HF-Typo-Klassen für Komponenten |
| `app/design-tokens/high-fidelity-grid.css` | Grid-SSOT |
| `components/layout/hf-grid.tsx` | Grid-Komponenten |
| `components/domain/r1-application-flow-layout.tsx` | R1 HF-Shell + `R1FlowField*` |
| `components/domain/r1-application-definition-section.tsx` | Antragsstellung Step 4/5 |
| `components/domain/r1-booking-scheduler.tsx` | Step 3 Buchungs-UI |
| `components/domain/r1-booking-confirmation.tsx` | Step 3 Terminbestätigung |
| `lib/design-tokens/r1-form.ts` | R1-Formular-Klassen |
| `Dashboard_Core_Layout_Kontext.md` | Portal-/Workspace-Dashboard-Shell (Sidebar, Top-Bar) |
| `Antragerstellung_Kontext.md` | R1-Flow, Fortschritt, Daten-Gating |
| `components/domain/workspace-dashboard-shell.tsx` | Dashboard Core Implementierung |
| `lib/design-tokens/workspace-dashboard.ts` | Sidebar-/Top-Bar-Tokens |
