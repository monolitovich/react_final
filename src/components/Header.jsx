import React, { useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

// шапка сайта и навигация
export function Header() {
  const { user, isAdmin, logout } = useContext(AuthContext);
  const { totalCount } = useContext(CartContext);
  const navigate = useNavigate();

  // обработчик выхода из системы
  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="site-header">
      <div className="container header-container">
        {/* логотип магазина */}
        <Link to="/" className="logo">
          Sound<span>Wave</span>
        </Link>

        {/* ссылки основного меню */}
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Каталог
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
            О нас
          </NavLink>
          <NavLink to="/help" className={({ isActive }) => (isActive ? 'active' : '')}>
            Помощь
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'admin-link active' : 'admin-link')}>
              Управление
            </NavLink>
          )}
        </nav>

        {/* блок пользователя и корзины */}
        <div className="header-actions">
          <Link to="/cart" className="cart-badge-btn" title="Корзина">
            Корзина
            {totalCount > 0 && <span className="badge">{totalCount}</span>}
          </Link>

          {user ? (
            <div className="user-menu">
              <Link to="/profile" className="profile-btn">
                👤 {user.fullName || user.email}
              </Link>
              <button onClick={handleLogout} className="logout-btn">
                Выйти
              </button>
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="btn-secondary">
                Вход
              </Link>
              <Link to="/register" className="btn-primary">
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}