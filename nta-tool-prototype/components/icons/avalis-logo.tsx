import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/** Ein Quadrat mit nur abgerundeter linker oberer Ecke (avalis-Markenzeichen). */
function roundedTopLeftSquarePath(x: number, y: number, size: number, radius: number) {
  return [
    `M ${x + radius} ${y}`,
    `H ${x + size}`,
    `V ${y + size}`,
    `H ${x}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

/** Grafik 32×32, skaliert & in viewBox 40×40 zentriert (~7px Innenabstand). */
const LOGO_GRAPHIC_BBOX = 32;
const LOGO_GRAPHIC_SCALE = 0.7;

const SHAPES = [
  {
    d: roundedTopLeftSquarePath(0, 0, 22, 6),
    gradientId: "avalis-logo-blue",
    stops: [
      { offset: "0%", color: "#7EB6FF" },
      { offset: "100%", color: "#3B79FF" },
    ],
  },
  {
    d: roundedTopLeftSquarePath(5, 5, 22, 6),
    gradientId: "avalis-logo-purple",
    stops: [
      { offset: "0%", color: "#E5D9FF" },
      { offset: "100%", color: "#C8B3FF" },
    ],
  },
  {
    d: roundedTopLeftSquarePath(10, 10, 22, 6),
    gradientId: "avalis-logo-green",
    stops: [
      { offset: "0%", color: "#BCFFD9" },
      { offset: "100%", color: "#89F2B8" },
    ],
  },
] as const;

export type AvalisLogoProps = SVGProps<SVGSVGElement>;

export function AvalisLogo({ className, ...props }: AvalisLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="avalis"
      className={cn("size-10 shrink-0", className)}
      {...props}
    >
      <rect width="40" height="40" rx="6" className="fill-primary" />
      <defs>
        {SHAPES.map((shape) => (
          <linearGradient
            key={shape.gradientId}
            id={shape.gradientId}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            {shape.stops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        ))}
      </defs>
      <g
        transform={`translate(20 20) scale(${LOGO_GRAPHIC_SCALE}) translate(${-LOGO_GRAPHIC_BBOX / 2} ${-LOGO_GRAPHIC_BBOX / 2})`}
      >
        {SHAPES.map((shape) => (
          <path key={shape.gradientId} d={shape.d} fill={`url(#${shape.gradientId})`} />
        ))}
      </g>
    </svg>
  );
}
