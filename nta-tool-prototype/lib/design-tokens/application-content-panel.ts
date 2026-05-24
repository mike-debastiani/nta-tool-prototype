/**
 * Weisser Inhalts-Container — Dashboard-Hauptpanel, R1-Antragsflow, Portal/Workspace.
 *
 * Shadow-Werte: `app/design-tokens/high-fidelity-content-panel.css`
 * (zentriertes `shadow-md`; global über `--hf-content-panel-shadow*` anpassbar).
 */
export const APPLICATION_CONTENT_PANEL_SHADOW_CLASS = "hf-content-panel-shadow";

/** Volle Fläche (Dashboard/R1-Hauptpanel) — Radius separat am Layout. */
export const APPLICATION_CONTENT_PANEL_SURFACE_CLASS = `bg-background ${APPLICATION_CONTENT_PANEL_SHADOW_CLASS}`;

/** Karte auf grauem Grund — Figma `5652:18411`, R1-Fortschritt/Kontakt. */
export const APPLICATION_CONTENT_PANEL_CARD_CLASS = "hf-content-panel-card";
