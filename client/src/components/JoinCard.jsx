import { useState } from 'react';
import { formatShortDate, loadNickname } from '../lib/util.js';
import Icon from './Icon.jsx';

export default function JoinCard({ room, onJoin }) {
  const [name, setName] = useState(loadNickname);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('표시할 이름을 입력해주세요.');
    onJoin(trimmed);
  };

  return (
    <section className="card join-card">
      <span className="chip chip--red">초대받은 대화방</span>
      <h2 className="join-card__room">{room.name}</h2>
      <p className="meta-line">
        <Icon name="clock" size={14} /> 개설 {formatShortDate(room.created_at)} · 만료 예정{' '}
        {formatShortDate(room.expires_at)}
      </p>

      <form onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">대화방에서 사용할 이름</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 홍길동 (OO물산)"
            maxLength={20}
            autoFocus
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn--primary btn--block btn--lg">
          입장하기 <Icon name="arrowRight" size={18} />
        </button>
      </form>

      <p className="card__hint">
        <Icon name="shield" size={14} /> 로그인 없이 이름만으로 입장합니다. 대화와 파일은 30일 후 자동 삭제돼요.
      </p>
    </section>
  );
}
