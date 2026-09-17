// SASE 프라이머리 로고 (빨간 타원 + 흰 워드마크 + 노란 스우시)
export default function Logo({ height = 40, className }) {
  return (
    <svg viewBox="0 0 240 130" height={height} className={className} role="img" aria-label="SASE">
      <defs>
        <radialGradient id="sase-logo-fill" cx="42%" cy="30%" r="80%">
          <stop offset="0" stopColor="#F23A40" />
          <stop offset="1" stopColor="#C4121A" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="65" rx="117" ry="62" fill="url(#sase-logo-fill)" />
      <ellipse cx="120" cy="65" rx="109" ry="55" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="2" />
      <text
        x="120"
        y="80"
        textAnchor="middle"
        fontFamily="'Pretendard Variable', Pretendard, Arial, sans-serif"
        fontWeight="900"
        fontSize="60"
        letterSpacing="-1.5"
        fill="#fff"
      >
        SASE
      </text>
      <path d="M50 93 Q120 118 192 88 Q122 106 50 93Z" fill="#E1D200" />
    </svg>
  );
}
