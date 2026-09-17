export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xlsx', 'pptx', 'docx', 'txt', 'csv'];

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export const extensionOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

export function validateFile(file) {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return '이미지, PDF, 엑셀(xlsx), 파워포인트(pptx), 워드(docx), 텍스트/CSV 파일만 보낼 수 있습니다.';
  }
  if (file.size > MAX_FILE_SIZE) return '파일은 10MB 이하만 보낼 수 있습니다.';
  return null;
}

const BADGES = {
  image: { label: 'IMG', color: '#6B7280' },
  pdf: { label: 'PDF', color: '#E31F26' },
  xlsx: { label: 'XLS', color: '#1E7B45' },
  pptx: { label: 'PPT', color: '#D2531F' },
  docx: { label: 'DOC', color: '#2B5797' },
  csv: { label: 'CSV', color: '#1E7B45' },
  txt: { label: 'TXT', color: '#404040' },
};

export const badgeFor = (type) => BADGES[type] ?? { label: 'FILE', color: '#6B7280' };

export function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
