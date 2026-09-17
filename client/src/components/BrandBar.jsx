import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function BrandBar() {
  return (
    <header className="brandbar">
      <Link to="/" className="brandbar__home" aria-label="SASE Talk 홈">
        <Logo height={44} />
        <span className="brandbar__divider" />
        <span className="brandbar__title">
          <strong>SASE Talk</strong>
          <small>사내·협력사 소통방</small>
        </span>
      </Link>
      <p className="brandbar__slogan">
        GOOD FOOD
        <br />
        BRIGHTER TOMORROW
      </p>
    </header>
  );
}
