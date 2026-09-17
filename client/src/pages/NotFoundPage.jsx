import { Link } from 'react-router-dom';
import BrandBar from '../components/BrandBar.jsx';
import Icon from '../components/Icon.jsx';

export default function NotFoundPage({
  title = '페이지를 찾을 수 없어요',
  message = '주소가 올바른지 확인해주세요.',
}) {
  return (
    <div className="page">
      <BrandBar />
      <main className="center">
        <section className="card status-card">
          <span className="icon-circle">
            <Icon name="chat" size={24} />
          </span>
          <h2 className="card__title">{title}</h2>
          <p className="card__desc">{message}</p>
          <Link to="/" className="btn btn--primary">
            <Icon name="home" size={18} /> 새 방 만들기
          </Link>
        </section>
      </main>
    </div>
  );
}
