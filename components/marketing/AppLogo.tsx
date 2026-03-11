interface AppLogoProps {
  size?: number
}

/**
 * Inline SVG reproduction of the املاک‌بین logo.
 * Matches the real asset: double-ring teal eye, dark buildings on teal fill, transparent bg.
 */
export function AppLogo({ size = 40 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* ── Outer eye shape — full teal fill ──────────────────────────── */}
      <path
        d="M8 50C8 50 28 21 50 21C72 21 92 50 92 50C92 50 72 79 50 79C28 79 8 50 8 50Z"
        fill="#14B8A6"
      />

      {/* ── Dark concentric ring — creates the double-eye border ──────── */}
      <path
        d="M15 50C15 50 32 27 50 27C68 27 85 50 85 50C85 50 68 73 50 73C32 73 15 50 15 50Z"
        fill="#0F1923"
      />

      {/* ── Inner teal iris ───────────────────────────────────────────── */}
      <path
        d="M22 50C22 50 36 33 50 33C64 33 78 50 78 50C78 50 64 67 50 67C36 67 22 50 22 50Z"
        fill="#14B8A6"
      />

      {/* ── Buildings (dark on teal) ───────────────────────────────────── */}
      {/* Left — tallest, parallelogram (top angled left-high) */}
      <polygon points="37,65 44,65 46,37 39,37" fill="#0F1923" />
      {/* Center — medium parallelogram */}
      <polygon points="47,65 54,65 56,43 49,43" fill="#0F1923" />
      {/* Right — shorter, with diagonal cut on upper-right corner */}
      <polygon points="56,65 64,65 64,52 60,48 56,48" fill="#0F1923" />
    </svg>
  )
}
