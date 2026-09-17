const PALETTE = [
  { bg: '#FDECEC', fg: '#C8161D' },
  { bg: '#FBF6C9', fg: '#6E6400' },
  { bg: '#F3F4F6', fg: '#404040' },
  { bg: '#E31F26', fg: '#FFFFFF' },
  { bg: '#E1D200', fg: '#1A1A1A' },
];

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

export default function Avatar({ name, size = 36 }) {
  const { bg, fg } = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {[...name.trim()][0] ?? '?'}
    </span>
  );
}
