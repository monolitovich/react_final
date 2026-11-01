import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// форма входа в личный кабинет
export function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // поля формы
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // состояния загрузки и ошибки
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // отправка формы авторизации
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('заполните email и пароль');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'ошибка при входе');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container auth-wrapper">
      <div className="auth-card">
        <h2>Вход в аккаунт</h2>
        <p className="auth-sub">Авторизуйтесь для оформления заказов и доступа к корзине</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-group">
            <label>Электронная почта</label>
            <input
              type="email"
              placeholder="example@mail.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-with-link">
              <label>Пароль</label>
              {/* опция сброса пароля для пользователя */}
              <Link to="/forgot-password" className="forgot-link">
                Забыли пароль?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="auth-switch">
          <span>Нет аккаунта?</span> <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}