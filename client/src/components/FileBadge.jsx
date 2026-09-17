import { badgeFor } from '../lib/files.js';

export default function FileBadge({ type, size = 40 }) {
  const { label, color } = badgeFor(type);
  return (
    <span className="file-badge" style={{ width: size, height: size, background: color }} aria-hidden="true">
      {label}
    </span>
  );
}
