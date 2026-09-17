export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// 로컬 메모리 저장소는 "/api/files/..." 같은 상대 경로를 돌려주므로 백엔드 주소를 붙인다
export const assetUrl = (url) => (url?.startsWith('/') ? API_BASE + url : url);

export const downloadUrl = (url, name) =>
  `${assetUrl(url)}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name || 'file')}`;

async function request(path, options) {
  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.error || '요청을 처리하지 못했습니다.'), { status: res.status });
  }
  return body;
}

export const createRoom = (name) =>
  request('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const getRoom = (slug) => request(`/api/rooms/${encodeURIComponent(slug)}`);

export const getOlderMessages = (slug, beforeId) =>
  request(`/api/rooms/${encodeURIComponent(slug)}/messages?before=${beforeId}`);

// 진행률 표시를 위해 fetch 대신 XHR 사용
export function uploadAttachment({ slug, file, content, socketId, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/rooms/${encodeURIComponent(slug)}/attachments`);
    xhr.setRequestHeader('x-socket-id', socketId);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* 응답 본문 없음 */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || '파일을 올리지 못했습니다.'));
    };
    xhr.onerror = () => reject(new Error('네트워크 오류로 파일을 올리지 못했습니다.'));

    const form = new FormData();
    if (content) form.append('content', content);
    form.append('file', file);
    xhr.send(form);
  });
}
