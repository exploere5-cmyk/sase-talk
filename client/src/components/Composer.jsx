import { useLayoutEffect, useRef, useState } from 'react';
import { ACCEPT_ATTR, extensionOf, formatSize } from '../lib/files.js';
import FileBadge from './FileBadge.jsx';
import Icon from './Icon.jsx';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export default function Composer({ disabled, file, progress, onPickFile, onClearFile, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileInput = useRef(null);
  const textarea = useRef(null);

  useLayoutEffect(() => {
    const el = textarea.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const canSend = !disabled && !sending && (text.trim() || file);

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend(text.trim());
    setSending(false);
    if (ok) setText('');
    textarea.current?.focus();
  };

  const onKeyDown = (e) => {
    // 한글 조합 중 Enter는 무시 (마지막 글자 중복 전송 방지)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onPaste = (e) => {
    const pasted = [...e.clipboardData.files][0];
    if (pasted) {
      e.preventDefault();
      onPickFile(pasted);
    }
  };

  const ext = file ? extensionOf(file.name) : '';

  return (
    <div className="composer">
      {file && (
        <div className="composer__file">
          <FileBadge type={IMAGE_EXT.includes(ext) ? 'image' : ext} size={34} />
          <span className="composer__file-meta">
            <strong>{file.name}</strong>
            <small>{progress == null ? formatSize(file.size) : `업로드 중 ${Math.round(progress * 100)}%`}</small>
          </span>
          {progress == null && (
            <button type="button" className="icon-btn icon-btn--sm" onClick={onClearFile} aria-label="첨부 취소">
              <Icon name="x" size={16} />
            </button>
          )}
          {progress != null && (
            <span className="progress" aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </span>
          )}
        </div>
      )}

      <div className="composer__row">
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileInput.current.click()}
          disabled={disabled || sending}
          aria-label="파일 첨부"
          title="파일 첨부 (최대 10MB)"
        >
          <Icon name="clip" size={20} />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => {
            onPickFile(e.target.files[0]);
            e.target.value = '';
          }}
        />

        <textarea
          ref={textarea}
          className="composer__input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={disabled ? '연결을 기다리는 중…' : '메시지를 입력하세요'}
          maxLength={4000}
          title="Enter 전송 · Shift+Enter 줄바꿈"
          disabled={disabled}
        />

        <button type="button" className="send-btn" onClick={submit} disabled={!canSend} aria-label="보내기">
          <Icon name="send" size={20} />
        </button>
      </div>
    </div>
  );
}
