/** Keep the companion visible while WebGL loads, or when it is unavailable. */
export default function JoyPlaceholder() {
  return (
    <svg className="joy-placeholder" viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="226" rx="76" ry="11" fill="#f4c6a6" opacity="0.16" />
      <ellipse cx="100" cy="225" rx="65" ry="8" fill="#a89bd4" opacity="0.18" />
      <g fill="#a89bd4">
        <rect x="77" y="184" width="16" height="34" rx="8" />
        <rect x="107" y="184" width="16" height="34" rx="8" />
        <path d="M74 128 Q65 133 63 172 M126 128 Q135 133 137 172" fill="none" stroke="#a89bd4" strokeWidth="14" strokeLinecap="round" />
        <path d="M87 112 Q70 121 70 151 Q62 176 76 187 Q100 200 124 187 Q138 176 130 151 Q130 121 113 112Z" />
        <ellipse cx="100" cy="76" rx="47" ry="45" />
      </g>
      <path d="M84 118 Q100 125 116 118" fill="none" stroke="#fffaf5" strokeWidth="5" strokeLinecap="round" />
      <g>
        <ellipse cx="86" cy="138" rx="9" ry="6" fill="#f4c6a6" />
        <circle cx="86" cy="138" r="2.8" fill="#8fb39b" />
      </g>
      <g fill="#8fb39b">
        <rect x="98.5" y="25" width="3" height="10" rx="1.5" />
        <ellipse cx="94" cy="28" rx="5" ry="12" transform="rotate(-35 94 28)" />
        <ellipse cx="106" cy="26" rx="5" ry="13" transform="rotate(35 106 26)" />
      </g>
      <g fill="#f4c6a6">
        <ellipse cx="62" cy="177" rx="9" ry="10" />
        <ellipse cx="138" cy="177" rx="9" ry="10" />
        <ellipse cx="85" cy="219" rx="14" ry="8" />
        <ellipse cx="115" cy="219" rx="14" ry="8" />
        <ellipse cx="73" cy="86" rx="8" ry="4" opacity="0.6" />
        <ellipse cx="127" cy="86" rx="8" ry="4" opacity="0.6" />
      </g>
      <g fill="#3a3550">
        <ellipse cx="85" cy="77" rx="5.5" ry="9" />
        <ellipse cx="115" cy="77" rx="5.5" ry="9" />
      </g>
      <g fill="#fffaf5">
        <circle cx="83" cy="74" r="2" />
        <circle cx="113" cy="74" r="2" />
        <circle cx="87" cy="80" r="1" opacity="0.85" />
        <circle cx="117" cy="80" r="1" opacity="0.85" />
      </g>
      <path d="M79 62 Q85 58 91 62 M109 62 Q115 58 121 62" fill="none" stroke="#8fb39b" strokeWidth="3" strokeLinecap="round" />
      <path d="M93 94 Q100 101 107 94" fill="none" stroke="#3a3550" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
