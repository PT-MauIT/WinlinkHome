/** Ambient dark backdrop with layered mountain ridges and a faint pine texture. */
export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0f1115]">
      {/* vertical ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c222b] via-[#141821] to-[#0c0e13]" />
      {/* soft green glow, top-center */}
      <div className="absolute -top-1/4 left-1/2 h-[65vh] w-[85vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(95,211,154,0.07),transparent_65%)]" />

      <svg
        className="absolute bottom-0 left-0 h-[70%] w-full"
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="pines" width="58" height="50" patternUnits="userSpaceOnUse">
            <polygon points="29,6 52,44 6,44" fill="rgba(255,255,255,0.018)" />
          </pattern>
        </defs>

        {/* far ridge */}
        <path
          d="M0,300 L120,244 L240,292 L360,224 L480,284 L600,214 L720,272 L840,218 L960,288 L1080,228 L1200,278 L1320,232 L1440,286 L1440,520 L0,520 Z"
          fill="rgba(125,145,158,0.07)"
        />
        {/* mid ridge */}
        <path
          d="M0,362 L160,302 L320,352 L480,292 L640,348 L800,296 L960,352 L1120,300 L1280,356 L1440,306 L1440,520 L0,520 Z"
          fill="rgba(70,86,98,0.16)"
        />
        {/* faint pine texture over the slopes */}
        <rect x="0" y="150" width="1440" height="370" fill="url(#pines)" />
        {/* near ridge (darkest, closest) */}
        <path
          d="M0,436 L200,372 L360,424 L560,360 L760,418 L960,366 L1160,418 L1360,376 L1440,412 L1440,520 L0,520 Z"
          fill="rgba(10,13,18,0.92)"
        />
      </svg>

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.4))]" />
    </div>
  )
}
