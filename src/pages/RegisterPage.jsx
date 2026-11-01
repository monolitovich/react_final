import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// форма регистрации нового пользователя
export function RegisterPage() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // поля формы
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    patronymic: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // кириллица, разрешено до 2 слов через одиночный дефис или пробел
  const REGEX_NAME = /^[А-Яа-яЁё]{2,30}([- ][А-Яа-яЁё]{2,30})?$/;
  const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const REGEX_PHONE = /^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;

  // фильтрация ввода: только кириллица, дефис и одиночный пробел
  function handleNameChange(e) {
    const { name, value } = e.target;
    // убираем все кроме русских букв, дефиса и пробела
    let clean = value.replace(/[^А-Яа-яЁё\- ]/g, '');
    // запрет двойных пробелов, двойных дефисов и пробелов в самом начале
    clean = clean.replace(/\s{2,}/g, ' ').replace(/-{2,}/g, '-').replace(/^[\s-]/, '');
    
    // максимум 2 слова (не больше 1 пробела или 1 дефиса)
    const separatorsCount = (clean.match(/[\s-]/g) || []).length;
    if (separatorsCount > 1) return;

    setFormData((prev) => ({
      ...prev,
      [name]: clean,
    }));
  }

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  // автоформатирование номера телефона
  function handlePhoneChange(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('7') || val.startsWith('8')) val = val.substring(1);
    val = val.substring(0, 10);

    let formatted = '+7';
    if (val.length > 0) formatted += ' (' + val.substring(0, 3);
    if (val.length >= 4) formatted += ') ' + val.substring(3, 6);
    if (val.length >= 7) formatted += '-' + val.substring(6, 8);
    if (val.length >= 9) formatted += '-' + val.substring(8, 10);

    setFormData((prev) => ({ ...prev, phone: formatted }));
  }

  // валидация и отправка формы
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedLast = formData.lastName.trim();
    const trimmedFirst = formData.firstName.trim();
    const trimmedPatr = formData.patronymic.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedLast || !trimmedFirst || !trimmedEmail || !trimmedPhone || !formData.password) {
      setError('заполните все обязательные поля');
      return;
    }

    if (!REGEX_NAME.test(trimmedLast)) {
      setError('фамилия: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }

    if (!REGEX_NAME.test(trimmedFirst)) {
      setError('имя: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }

    if (trimmedPatr && !REGEX_NAME.test(trimmedPatr)) {
      setError('отчество: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }

    if (!REGEX_EMAIL.test(trimmedEmail)) {
      setError('введен некорректный формат email');
      return;
    }

    if (!REGEX_PHONE.test(trimmedPhone)) {
      setError('введите номер телефона полностью: +7 (XXX) XXX-XX-XX');
      return;
    }

    if (formData.password.length < 6 || formData.password.length > 50) {
      setError('пароль должен быть от 6 до 50 символов');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('введенные пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await register({
        lastName: trimmedLast,
        firstName: trimmedFirst,
        patronymic: trimmedPatr,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: formData.password,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container auth-wrapper">
      <div className="auth-card">
        <h2>Регистрация</h2>
        <p className="auth-sub">Создайте личный кабинет покупателя</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-group">
            <label>Фамилия *</label>
            <input
              type="text"
              name="lastName"
              placeholder="Буденков"
              value={formData.lastName}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Имя *</label>
            <input
              type="text"
              name="firstName"
              placeholder="Станислав"
              value={formData.firstName}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Отчество (при наличии)</label>
            <input
              type="text"
              name="patronymic"
              placeholder="Батькович"
              value={formData.patronymic}
              onChange={handleNameChange}
            />
          </div>

          <div className="form-group">
            <label>Электронная почта *</label>
            <input
              type="email"
              name="email"
              placeholder="ivanov@mail.ru"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Номер телефона *</label>
            <input
              type="tel"
              name="phone"
              placeholder="+7 (999) 000-00-00"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль *</label>
            <input
              type="password"
              name="password"
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Подтверждение пароля *</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Создание профиля...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-switch">
          <span>Уже есть аккаунт?</span> <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}