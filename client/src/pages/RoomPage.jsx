import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BrandBar from '../components/BrandBar.jsx';
import ChatRoom from '../components/ChatRoom.jsx';
import JoinCard from '../components/JoinCard.jsx';
import { getRoom } from '../lib/api.js';
import { saveNickname } from '../lib/util.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function RoomPage() {
  const { slug } = useParams();
  const [room, setRoom] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | notfound | error | join | chat
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    getRoom(slug)
      .then(({ room }) => {
        if (cancelled) return;
        setRoom(room);
        setPhase('join');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setPhase(err.status === 404 ? 'notfound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (room) document.title = `${room.name} · SASE Talk`;
  }, [room]);

  if (phase === 'notfound') {
    return <NotFoundPage title="방을 찾을 수 없어요" message="링크가 잘못되었거나 이미 삭제된 방입니다." />;
  }
  if (phase === 'error') {
    return <NotFoundPage title="방 정보를 불러오지 못했어요" message={error} />;
  }
  if (phase === 'chat') {
    return <ChatRoom room={room} nickname={nickname} onChangeName={() => setPhase('join')} />;
  }

  return (
    <div className="page">
      <BrandBar />
      <main className="center">
        {phase === 'loading' ? (
          <div className="spinner" role="status" aria-label="불러오는 중" />
        ) : (
          <JoinCard
            room={room}
            onJoin={(name) => {
              saveNickname(name);
              setNickname(name);
              setPhase('chat');
            }}
          />
        )}
      </main>
    </div>
  );
}
