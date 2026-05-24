import { ArrowUpRight } from "lucide-react";

import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

const R1_INFORMATION_LINKS = [
  {
    label: "Fachstelle Studium mit Behinderung",
    href: "https://www.unisg.ch/de/universitaet/studium/studium-mit-behinderung/",
  },
  {
    label: "Attest-Checkliste im ICF Format",
    href: "#",
  },
  {
    label: "Vorgaben Ärztliches Attest",
    href: "#",
  },
] as const;

type R1InformationPanelProps = {
  className?: string;
};

/** Figma «Informationen» — Links mit Pfeil. */
export function R1InformationPanel({ className }: R1InformationPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl bg-stone-50 p-6",
        className,
      )}
    >
      <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
        Informationen
      </h2>
      <ul className="flex flex-col">
        {R1_INFORMATION_LINKS.map((link, index) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-2 px-2 py-3",
                index < R1_INFORMATION_LINKS.length - 1 && "border-b border-border",
              )}
            >
              <span
                className={cn(
                  hfTypography.paragraphSmallMedium,
                  "min-w-0 flex-1 text-foreground",
                )}
              >
                {link.label}
              </span>
              <ArrowUpRight
                className="size-6 shrink-0 text-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
