import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/apiClient';
import { ModalNotification } from '../components/ModalNotification';

// восстановление пароля по одноразовому коду
export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });

  async function handleRequestCode(e) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim()) {
      setErrorMsg('укажите email для отправки кода');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setInfoMsg(data.message || 'код отправлен на вашу почту');
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || 'ошибка при отправке кода');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!code.trim()) {
      setErrorMsg('введите полученный код подтверждения');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 50) {
      setErrorMsg('пароль должен содержать от 6 до 50 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });

      setModal({
        isOpen: true,
        title: 'Пароль успешно изменен!',
        message: 'Теперь вы можете войти в личный кабинет, используя новый пароль.',
      });
    } catch (err) {
      setErrorMsg(err.message || 'ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container auth-wrapper">
      <div className="auth-card">
        <h2>Восстановление доступа</h2>

        {infoMsg && <div className="alert alert-success">{infoMsg}</div>}
        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="standard-form">
            <p className="auth-sub">
              Введите email, указанный при регистрации. Мы вышлем 6-значный одноразовый код для сброса.
            </p>
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
            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код на почту'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="standard-form">
            <p className="auth-sub">
              Код отправлен на <b>{email}</b>. Введите его и задайте новый пароль.
            </p>

            <div className="form-group">
              <label>Код из письма (6 цифр)</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Новый пароль</label>
              <input
                type="password"
                placeholder="Минимум 6 символов"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Повторите новый пароль</label>
              <input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? 'Сохранение...' : 'Установить новый пароль'}
            </button>

            <button
              type="button"
              className="btn-secondary full-width"
              onClick={() => setStep(1)}
              style={{ marginTop: '10px' }}
            >
              Изменить почту
            </button>
          </form>
        )}

        <div className="auth-switch">
          <Link to="/login">Вернуться ко входу</Link>
        </div>
      </div>

      <ModalNotification
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type="success"
        confirmText="Перейти ко входу"
        onClose={() => {
          setModal({ ...modal, isOpen: false });
          navigate('/login');
        }}
      />
    </div>
  );
}