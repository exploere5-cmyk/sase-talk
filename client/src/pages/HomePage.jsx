import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandBar from '../components/BrandBar.jsx';
import Icon from '../components/Icon.jsx';
import { createRoom } from '../lib/api.js';
import { copyText, formatShortDate, inviteLink } from '../lib/util.js';

const FEATURES = [
  { icon: 'link', title: '링크 하나로 입장', text: '회원가입 없이 이름만 입력하면 바로 대화에 참여합니다.' },
  { icon: 'folder', title: '파일도 간편하게', text: '이미지·PDF·엑셀·PPT·워드 파일을 10MB까지 공유합니다.' },
  { icon: 'clock', title: '30일 자동 정리', text: '대화와 첨부파일은 30일이 지나면 자동으로 삭제됩니다.' },
];

export default function HomePage() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('방 이름을 입력해주세요.');
    setPending(true);
    setError('');
    try {
      const { room } = await createRoom(trimmed);
      setRoom(room);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (await copyText(inviteLink(room.slug))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setRoom(null);
    setName('');
    setCopied(false);
  };

  return (
    <div className="page">
      <BrandBar />

      <main className="home">
        <section className="home__intro">
          <p className="eyebrow">GOOD TALK, BRIGHTER TOMORROW</p>
          <h1 className="home__title">
            사내와 협력사가
            <br />
            <span>한 곳에서</span> 가볍게 소통해요
          </h1>
          <p className="home__lead">
            방을 만들고 초대 링크만 보내세요. 앱 설치도, 로그인도 필요 없습니다.
          </p>

          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title} className="feature">
                <span className="icon-circle">
                  <Icon name={f.icon} size={22} />
                </span>
                <span>
                  <strong>{f.title}</strong>
                  <small>{f.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card create-card">
          {!room ? (
            <form onSubmit={submit} noValidate>
              <span className="icon-circle icon-circle--solid">
                <Icon name="chat" size={24} />
              </span>
              <h2 className="card__title">새 대화방 만들기</h2>
              <p className="card__desc">프로젝트나 협력사 이름으로 방을 만들어보세요.</p>

              <label className="field">
                <span className="field__label">방 이름</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 2026 가을 신제품 패키지 협의"
                  maxLength={50}
                  autoFocus
                />
              </label>
              {error && <p className="form-error">{error}</p>}

              <button className="btn btn--primary btn--block btn--lg" disabled={pending}>
                {pending ? '만드는 중…' : '방 만들기'}
                {!pending && <Icon name="arrowRight" size={18} />}
              </button>
              <p className="card__hint">
                <Icon name="shield" size={14} /> 링크를 아는 사람은 누구나 입장할 수 있어요. 링크 공유에 유의해주세요.
              </p>
            </form>
          ) : (
            <div className="created">
              <span className="icon-circle icon-circle--solid">
                <Icon name="check" size={24} strokeWidth={2.5} />
              </span>
              <h2 className="card__title">방이 만들어졌어요</h2>
              <p className="card__desc">
                <strong>{room.name}</strong>
                <br />
                아래 링크를 카카오톡·메일 등으로 공유하세요.
              </p>

              <div className="link-box">
                <span className="link-box__url">{inviteLink(room.slug)}</span>
                <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={16} />
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
              <p className="meta-line">
                <Icon name="clock" size={14} /> 만료 예정일 {formatShortDate(room.expires_at)}
              </p>

              <div className="btn-row">
                <button type="button" className="btn btn--outline" onClick={reset}>
                  <Icon name="plus" size={18} /> 다른 방 만들기
                </button>
                <Link to={`/room/${room.slug}`} className="btn btn--primary">
                  방으로 입장 <Icon name="arrowRight" size={18} />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">© SASE · Good Food, Brighter Tomorrow</footer>
    </div>
  );
}
