import * as React from "react";

type BrandMarkProps = {
  className?: string;
  /**
   * `wordmark` renders "AbateIQ". `icon` renders a compact "IQ" mark.
   */
  variant?: "wordmark" | "icon";
  /**
   * Use `onDark` when the mark sits on a dark background so "Abate" is light.
   */
  tone?: "onLight" | "onDark";
  /**
   * Optional title for accessibility. If omitted, the SVG is decorative.
   */
  title?: string;
};

export function BrandMark({
  className,
  variant = "wordmark",
  tone = "onLight",
  title,
}: BrandMarkProps) {
  const abateFill = tone === "onDark" ? "#EDEDED" : "#111827"; // gray-900
  const iqFill = "#0B76D1"; // AbateIQ blue

  // Simple, local SVG so we don't depend on an external asset pipeline.
  // Not a perfect font-match to the provided image, but consistent and crisp in all sizes.
  return (
    <svg
      className={className}
      viewBox={variant === "icon" ? "0 0 140 140" : "0 0 640 140"}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {variant === "wordmark" ? (
        <>
          <text
            x="8"
            y="104"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
            fontSize="96"
            fontWeight="700"
            letterSpacing="-1.5"
            fill={abateFill}
          >
            Abate
          </text>
          <text
            x="392"
            y="104"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
            fontSize="96"
            fontWeight="800"
            letterSpacing="-1.5"
            fill={iqFill}
          >
            IQ
          </text>
          {/* Small notch in the Q to hint at the original logo */}
          <path
            d="M563 86 L586 109"
            stroke={iqFill}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <text
            x="14"
            y="100"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
            fontSize="92"
            fontWeight="900"
            letterSpacing="-2"
            fill={iqFill}
          >
            IQ
          </text>
          <path
            d="M92 78 L114 102"
            stroke={iqFill}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

