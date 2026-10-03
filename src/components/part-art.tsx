import type { Example } from "@/lib/data";

export function PartArt({ variant }: { variant: Example["illustration"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 260 174" className="part-art" role="img">
      <defs>
        <linearGradient id={`metal-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#545960" />
          <stop offset=".45" stopColor="#b2b8ba" />
          <stop offset="1" stopColor="#3a4146" />
        </linearGradient>
      </defs>
      <ellipse cx="130" cy="141" rx="94" ry="13" fill="#080a0c" opacity=".38" />
      {variant === "ring" && (
        <g {...common} transform="translate(130 79) rotate(-23)" stroke={`url(#metal-${variant})`} strokeWidth="11">
          <ellipse rx="84" ry="48" />
          <ellipse rx="61" ry="30" strokeWidth="3" />
          <path d="M-80 8C-18 55 53 53 83 8" strokeWidth="3" stroke="#dadecf" opacity=".6" />
        </g>
      )}
      {variant === "knob" && (
        <g {...common} transform="translate(130 87)">
          <path d="M-24 19  -28 47 Q0 63 28 47 L24 19" fill="#525a5e" stroke="#a7aba5" />
          <path d="M-28 40 Q0 52 28 40" stroke="#d5d7c9" />
          <ellipse cy="-12" rx="55" ry="48" fill={`url(#metal-${variant})`} stroke="#bbc2bc" />
          <ellipse cy="-20" rx="43" ry="34" fill="#596166" stroke="#d0d3c7" />
          <path d="M-15 -22 0 -35 15 -22 15 -7 0 5 -15 -7Z" stroke="#ecede0" strokeWidth="2" />
          <path d="M-43 -21C-35-53 25-58 43-21" stroke="#f5f4db" opacity=".5" />
        </g>
      )}
      {variant === "bracket" && (
        <g {...common} transform="translate(130 88) rotate(-15)" stroke="#aeb8b6" strokeWidth="3">
          <path d="M-70 20 -53-31 -15-44 52-33 70-14 70 23 33 37 -40 37Z" fill={`url(#metal-${variant})`} />
          <path d="M-53-31 -39 0 40 0 52-33M-39 0 -40 37M40 0 33 37" />
          <circle cx="-44" cy="18" r="8" fill="#161a1c" />
          <circle cx="45" cy="18" r="8" fill="#161a1c" />
          <path d="M-13 -27H14" stroke="#eef2df" opacity=".8" />
        </g>
      )}
      {variant === "bolt" && (
        <g {...common} transform="translate(130 83) rotate(-26)" stroke="#bdc5be">
          <path d="M-47-28 -27-45 27-45 47-28 47-8 27 8 -27 8 -47-8Z" fill={`url(#metal-${variant})`} strokeWidth="2" />
          <path d="M-47-8 -47 11 -27 29 27 29 47 11 47-8" fill="#677079" strokeWidth="2" />
          <path d="M-27 29 -27 51 27 51 27 29" fill="#8b9496" strokeWidth="2" />
          <path d="M-20 51 -20 64M-10 51 -10 64M0 51V64M10 51V64M20 51V64" strokeWidth="3" />
          <ellipse rx="14" ry="9" cy="-18" fill="#2c3437" stroke="#e0e5db" />
        </g>
      )}
      <path d="M12 159H248" stroke="#5f6b66" strokeDasharray="2 7" opacity=".4" />
    </svg>
  );
}
