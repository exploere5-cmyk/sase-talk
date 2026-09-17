import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE, getOlderMessages, uploadAttachment } from '../lib/api.js';
import { validateFile } from '../lib/files.js';
import { copyText, dayKey, daysUntil, formatDay, formatShortDate, inviteLink } from '../lib/util.js';
import Avatar from './Avatar.jsx';
import Composer from './Composer.jsx';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import MessageItem from './MessageItem.jsx';

const GROUP_GAP_MS = 5 * 60 * 1000;

const byId = (a, b) => a.id - b.id;

export default function ChatRoom({ room, nickname, onChangeName }) {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | online | offline
  const [myName, setMyName] = useState(nickname);
  const [messages, setMessages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [online, setOnline] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [dragging, setDragging] = useState(false);

  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const prependAnchor = useRef(null);
  const joinedOnce = useRef(false);

  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort(byId);
    });
  }, []);

  const showToast = useCallback((text) => {
    setToast(text);
    setTimeout(() => setToast((cur) => (cur === text ? '' : cur)), 3500);
  }, []);

  // Phase 2 — 소켓 연결 및 방 입장 (재연결 시 자동 재입장)
  useEffect(() => {
    const s = io(API_BASE || undefined, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => {
      s.emit('room:join', { slug: room.slug, name: nickname }, (res) => {
        if (!res?.ok) {
          setStatus('offline');
          showToast(res?.error || '입장하지 못했습니다.');
          return;
        }
        setMyName(res.name);
        setStatus('online');
        mergeMessages(res.messages);
        if (!joinedOnce.current) {
          joinedOnce.current = true;
          setHasMore(res.hasMore);
          stickToBottom.current = true;
        }
      });
    });
    s.on('disconnect', () => setStatus('offline'));
    s.on('connect_error', () => setStatus('offline'));
    s.on('message:new', (m) => mergeMessages([m]));
    s.on('presence:update', ({ online }) => setOnline(online));
    s.on('system:notice', (n) => {
      setNotices((prev) => [...prev.slice(-30), { ...n, key: `${n.at}-${n.kind}-${n.name}` }]);
    });

    return () => {
      s.disconnect();
    };
  }, [room.slug, nickname, mergeMessages, showToast]);

  const timeline = useMemo(() => {
    const items = [
      ...messages.map((m) => ({ kind: 'message', at: m.created_at, key: `m${m.id}`, message: m })),
      ...notices.map((n) => ({ kind: 'notice', at: n.at, key: `n${n.key}`, notice: n })),
    ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

    let prevDay = null;
    let prevMsg = null;
    const out = [];
    for (const item of items) {
      const day = dayKey(item.at);
      if (day !== prevDay) {
        out.push({ kind: 'day', key: `d${day}`, label: formatDay(item.at) });
        prevDay = day;
        prevMsg = null;
      }
      if (item.kind === 'message') {
        const m = item.message;
        item.continued =
          prevMsg?.sender_name === m.sender_name &&
          new Date(m.created_at) - new Date(prevMsg.created_at) < GROUP_GAP_MS;
        prevMsg = m;
      } else {
        prevMsg = null;
      }
      out.push(item);
    }
    return out;
  }, [messages, notices]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prependAnchor.current != null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
    } else {
      scrollToBottom();
    }
  }, [timeline, scrollToBottom]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !messages.length) return;
    setLoadingOlder(true);
    try {
      const res = await getOlderMessages(room.slug, messages[0].id);
      const el = listRef.current;
      prependAnchor.current = el.scrollHeight - el.scrollTop;
      mergeMessages(res.messages);
      setHasMore(res.hasMore);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, room.slug, mergeMessages, showToast]);

  const onScroll = () => {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80) loadOlder();
  };

  const attach = (candidate) => {
    if (!candidate) return;
    const problem = validateFile(candidate);
    if (problem) return showToast(problem);
    setFile(candidate);
  };

  // 전송 성공 시 true — Composer가 입력창을 비운다
  const send = async (text) => {
    if (!socket || status !== 'online') return false;
    stickToBottom.current = true;

    if (file) {
      setProgress(0);
      try {
        const { message } = await uploadAttachment({
          slug: room.slug,
          file,
          content: text,
          socketId: socket.id,
          onProgress: setProgress,
        });
        mergeMessages([message]);
        setFile(null);
        return true;
      } catch (err) {
        showToast(err.message);
        return false;
      } finally {
        setProgress(null);
      }
    }

    return new Promise((resolve) => {
      socket.timeout(10000).emit('message:send', { content: text }, (err, res) => {
        if (err || !res?.ok) {
          showToast(err ? '전송 시간이 초과되었습니다. 다시 시도해주세요.' : res.error);
          resolve(false);
        } else {
          mergeMessages([res.message]);
          resolve(true);
        }
      });
    });
  };

  const copyLink = async () => {
    if (await copyText(inviteLink(room.slug))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dragProps = {
    onDragOver: (e) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      attach(e.dataTransfer.files?.[0]);
    },
  };

  const statusLabel = { connecting: '연결 중', online: '연결됨', offline: '연결 끊김 · 재연결 중' }[status];

  return (
    <div className="chat" {...dragProps}>
      <header className="chat-header">
        <Link to="/" className="chat-header__logo" aria-label="SASE Talk 홈">
          <Logo height={34} />
        </Link>
        <div className="chat-header__info">
          <h1 className="chat-header__name">{room.name}</h1>
          <p className="chat-header__meta">
            <span className={`status-dot status-dot--${status}`} />
            {statusLabel}
            <span className="sep">·</span>
            만료 {formatShortDate(room.expires_at)} (D-{daysUntil(room.expires_at)})
          </p>
        </div>

        <div className="chat-header__actions">
          <div className="members">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setShowMembers((v) => !v)}
              aria-expanded={showMembers}
            >
              <Icon name="users" size={16} />
              <span>{online.length}</span>
            </button>
            {showMembers && (
              <div className="members__panel" role="dialog" aria-label="접속 중인 사람">
                <p className="members__title">지금 접속 중 {online.length}명</p>
                <ul>
                  {online.map((n, i) => (
                    <li key={`${n}-${i}`}>
                      <Avatar name={n} size={26} />
                      <span>{n}</span>
                      {n === myName && <span className="chip chip--yellow">나</span>}
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn--outline btn--sm btn--block" onClick={onChangeName}>
                  <Icon name="user" size={16} /> 이름 바꾸기
                </button>
              </div>
            )}
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={copyLink}>
            <Icon name={copied ? 'check' : 'link'} size={16} />
            <span className="hide-sm">{copied ? '복사됨' : '초대 링크'}</span>
          </button>
        </div>
      </header>

      <div className="retention-bar">
        <Icon name="clock" size={14} />
        대화와 첨부파일은 작성 후 30일이 지나면 자동으로 삭제됩니다.
      </div>

      <div className="messages" ref={listRef} onScroll={onScroll}>
        <div className="messages__top">
          {loadingOlder ? (
            <span className="spinner spinner--sm" />
          ) : hasMore ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={loadOlder}>
              이전 메시지 더 보기
            </button>
          ) : messages.length > 0 ? (
            <span className="messages__begin">대화의 시작입니다</span>
          ) : null}
        </div>

        {status !== 'connecting' && messages.length === 0 && (
          <div className="empty">
            <span className="icon-circle icon-circle--solid">
              <Icon name="chat" size={26} />
            </span>
            <strong>첫 메시지를 남겨보세요</strong>
            <p>초대 링크를 공유하면 협력사도 바로 들어올 수 있어요.</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={copyLink}>
              <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? '복사됨' : '초대 링크 복사'}
            </button>
          </div>
        )}

        {timeline.map((item) => {
          if (item.kind === 'day') {
            return (
              <div key={item.key} className="day-divider">
                <span>{item.label}</span>
              </div>
            );
          }
          if (item.kind === 'notice') {
            const { name, kind } = item.notice;
            return (
              <div key={item.key} className="notice">
                {name}님이 {kind === 'join' ? '들어왔습니다' : '나갔습니다'}
              </div>
            );
          }
          return (
            <MessageItem
              key={item.key}
              message={item.message}
              mine={item.message.sender_name === myName}
              continued={item.continued}
              onMediaLoad={scrollToBottom}
            />
          );
        })}
      </div>

      {toast && (
        <div className="toast" role="alert">
          {toast}
        </div>
      )}

      <Composer
        disabled={status !== 'online'}
        file={file}
        progress={progress}
        onPickFile={attach}
        onClearFile={() => setFile(null)}
        onSend={send}
      />

      {dragging && (
        <div className="dropzone">
          <div>
            <Icon name="clip" size={32} />
            <strong>여기에 파일을 놓아 첨부하세요</strong>
            <small>이미지 · PDF · XLSX · PPTX · DOCX · TXT/CSV (최대 10MB)</small>
          </div>
        </div>
      )}
    </div>
  );
}
