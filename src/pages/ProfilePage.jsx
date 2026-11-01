import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../api/apiClient';

// личный кабинет покупателя
export function ProfilePage() {
  const { user, updateUserState } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // форма с раздельным фио и адресом
  const [infoForm, setInfoForm] = useState({
    lastName: user?.lastName || '',
    firstName: user?.firstName || '',
    patronymic: user?.patronymic || '',
    phone: user?.phone || '',
    defaultAddress: user?.defaultAddress || '',
  });

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    currentPassword: '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // регулярные выражения
  const REGEX_NAME = /^[А-Яа-яЁё]{2,30}([- ][А-Яа-яЁё]{2,30})?$/;
  const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const REGEX_PHONE = /^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
  const REGEX_ADDRESS = /^[А-Яа-яЁё0-9\s.,\/-]{12,250}$/;

  // загрузка заказов
  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await apiRequest('/orders/my');
        setOrders(data);
      } catch (e) {
        console.error(e.message);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, []);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setMsg('');
    setErr('');
  }

  // фильтрация ввода имени и фамилии
  function handleNameChange(e) {
    const { name, value } = e.target;
    let clean = value.replace(/[^А-Яа-яЁё\- ]/g, '').replace(/\s{2,}/g, ' ').replace(/-{2,}/g, '-').replace(/^[\s-]/, '');
    const separatorsCount = (clean.match(/[\s-]/g) || []).length;
    if (separatorsCount > 1) return;

    setInfoForm((prev) => ({
      ...prev,
      [name]: clean,
    }));
  }

  // фильтрация ввода адреса доставки
  function handleAddressChange(e) {
    const clean = e.target.value.replace(/[^А-Яа-яЁё0-9\s.,\/-]/g, '');
    setInfoForm((prev) => ({
      ...prev,
      defaultAddress: clean,
    }));
  }

  // форматирование телефона
  function handlePhoneChange(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('7') || val.startsWith('8')) val = val.substring(1);
    val = val.substring(0, 10);

    let formatted = '+7';
    if (val.length > 0) formatted += ' (' + val.substring(0, 3);
    if (val.length >= 4) formatted += ') ' + val.substring(3, 6);
    if (val.length >= 7) formatted += '-' + val.substring(6, 8);
    if (val.length >= 9) formatted += '-' + val.substring(8, 10);

    setInfoForm((prev) => ({ ...prev, phone: formatted }));
  }

  // сохранение профиля с полной валидацией адреса
  async function handleSaveInfo(e) {
    e.preventDefault();
    setMsg('');
    setErr('');

    const trimmedLast = infoForm.lastName.trim();
    const trimmedFirst = infoForm.firstName.trim();
    const trimmedPatr = infoForm.patronymic.trim();
    const trimmedPhone = infoForm.phone.trim();
    const trimmedAddress = infoForm.defaultAddress.trim();

    if (!REGEX_NAME.test(trimmedLast)) {
      setErr('фамилия: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }
    if (!REGEX_NAME.test(trimmedFirst)) {
      setErr('имя: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }
    if (trimmedPatr && !REGEX_NAME.test(trimmedPatr)) {
      setErr('отчество: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }
    if (!REGEX_PHONE.test(trimmedPhone)) {
      setErr('введите корректный номер телефона: +7 (XXX) XXX-XX-XX');
      return;
    }

    // валидация адреса доставки по умолчанию
    if (trimmedAddress) {
      if (!REGEX_ADDRESS.test(trimmedAddress)) {
        setErr('адрес доставки должен содержать от 12 до 250 символов (город, улица, дом на русском)');
        return;
      }
      if (!/\d+/.test(trimmedAddress)) {
        setErr('в адресе обязательно должен быть указан номер дома или строения');
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiRequest('/profile/info', {
        method: 'PUT',
        body: JSON.stringify({
          lastName: trimmedLast,
          firstName: trimmedFirst,
          patronymic: trimmedPatr,
          phone: trimmedPhone,
          defaultAddress: trimmedAddress,
        }),
      });
      updateUserState({
        lastName: trimmedLast,
        firstName: trimmedFirst,
        patronymic: trimmedPatr,
        phone: trimmedPhone,
        defaultAddress: trimmedAddress,
        fullName: `${trimmedLast} ${trimmedFirst} ${trimmedPatr}`.trim(),
      });
      setMsg('данные успешно сохранены');
    } catch (e) {
      setErr(e.message || 'ошибка при сохранении данных');
    } finally {
      setSubmitting(false);
    }
  }

  // смена email
  async function handleChangeEmail(e) {
    e.preventDefault();
    setMsg('');
    setErr('');

    const trimmedEmail = emailForm.newEmail.trim().toLowerCase();

    if (!REGEX_EMAIL.test(trimmedEmail)) {
      setErr('некорректный формат email');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/profile/email', {
        method: 'PUT',
        body: JSON.stringify({
          newEmail: trimmedEmail,
          currentPassword: emailForm.currentPassword,
        }),
      });
      updateUserState({ email: trimmedEmail });
      setEmailForm({ newEmail: '', currentPassword: '' });
      setMsg('электронная почта успешно изменена');
    } catch (e) {
      setErr(e.message || 'ошибка при смене email');
    } finally {
      setSubmitting(false);
    }
  }

  // смена пароля
  async function handleChangePassword(e) {
    e.preventDefault();
    setMsg('');
    setErr('');

    if (passForm.newPassword.length < 6 || passForm.newPassword.length > 50) {
      setErr('пароль должен быть от 6 до 50 символов');
      return;
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      setErr('введенные пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword,
        }),
      });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMsg('пароль успешно обновлен');
    } catch (e) {
      setErr(e.message || 'ошибка при смене пароля');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page-content">
      <h1 className="page-title">Личный кабинет</h1>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="user-badge-card">
            <div className="avatar-circle">👤</div>
            <h3>{user?.fullName}</h3>
            <span className="user-role-tag">{user?.role === 'admin' ? 'Администратор' : 'Покупатель'}</span>
            <small>{user?.email}</small>
          </div>

          <div className="profile-tabs-nav">
            <button
              className={activeTab === 'orders' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => handleTabChange('orders')}
            >
              📦 Мои заказы ({orders.length})
            </button>
            <button
              className={activeTab === 'profile' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => handleTabChange('profile')}
            >
              ⚙ Личные данные
            </button>
            <button
              className={activeTab === 'email' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => handleTabChange('email')}
            >
              ✉ Изменить почту
            </button>
            <button
              className={activeTab === 'password' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => handleTabChange('password')}
            >
              🔒 Безопасность и пароль
            </button>
          </div>
        </aside>

        <main className="profile-main">
          {msg && <div className="alert alert-success">{msg}</div>}
          {err && <div className="alert alert-danger">{err}</div>}

          {/* история заказов */}
          {activeTab === 'orders' && (
            <div className="profile-section">
              <h3>История покупок</h3>

              {loadingOrders && <div className="loader-block">Загрузка списка заказов...</div>}

              {!loadingOrders && orders.length === 0 && (
                <div className="empty-state">
                  <p>Вы пока не совершали заказов в нашем магазине.</p>
                </div>
              )}

              {!loadingOrders && orders.map((order) => (
                <div key={order.orderId} className="order-history-card">
                  <div className="order-header-line">
                    <div>
                      <strong>Заказ #{order.orderId}</strong>
                      <span className="order-date"> от {order.orderDate}</span>
                    </div>
                    <span className={`status-pill status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="order-meta-info">
                    <p><b>Адрес доставки:</b> {order.deliveryAddress}</p>
                    <p><b>Дата доставки:</b> {order.deliveryDate}</p>
                  </div>

                  <div className="order-items-mini-list">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="order-item-mini">
                        <img src={it.imageUrl} alt={it.serviceName} />
                        <div className="item-mini-desc">
                          <span>{it.serviceName}</span>
                          <small>{it.categoryName}</small>
                        </div>
                        <div className="item-mini-price">
                          {it.quantity} × {Number(it.unitPrice).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-total-line">
                    <span>Сумма заказа:</span>
                    <strong>{Number(order.totalAmount).toLocaleString('ru-RU')} ₽</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* изменение фио, телефона, адреса */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h3>Личные сведения</h3>
              <form onSubmit={handleSaveInfo} className="standard-form">
                <div className="form-group">
                  <label>Фамилия *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={infoForm.lastName}
                    onChange={handleNameChange}
                    required
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Имя *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={infoForm.firstName}
                      onChange={handleNameChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Отчество</label>
                    <input
                      type="text"
                      name="patronymic"
                      value={infoForm.patronymic}
                      onChange={handleNameChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Телефон *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={infoForm.phone}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Адрес доставки по умолчанию</label>
                  <textarea
                    rows="3"
                    placeholder="г. Москва, ул. Ленина, д. 10, кв. 25"
                    value={infoForm.defaultAddress}
                    onChange={handleAddressChange}
                  />
                  <small className="field-hint">
                    Укажите город, улицу, номер дома и квартиру (на русском языке).
                  </small>
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </form>
            </div>
          )}

          {/* смена email */}
          {activeTab === 'email' && (
            <div className="profile-section">
              <h3>Смена адреса электронной почты</h3>
              <p className="section-note">
                Для смены email необходимо ввести текущий пароль от аккаунта.
              </p>
              <form onSubmit={handleChangeEmail} className="standard-form">
                <div className="form-group">
                  <label>Новый Email</label>
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                    placeholder="new-email@mail.ru"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Текущий пароль</label>
                  <input
                    type="password"
                    value={emailForm.currentPassword}
                    onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                    placeholder="Введите текущий пароль"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Обновление...' : 'Изменить Email'}
                </button>
              </form>
            </div>
          )}

          {/* смена пароля */}
          {activeTab === 'password' && (
            <div className="profile-section">
              <h3>Смена пароля</h3>
              <form onSubmit={handleChangePassword} className="standard-form">
                <div className="form-group">
                  <label>Текущий пароль</label>
                  <input
                    type="password"
                    value={passForm.currentPassword}
                    onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                    placeholder="Введите старый пароль"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Новый пароль</label>
                  <input
                    type="password"
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                    placeholder="Минимум 6 символов"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Повторите новый пароль</label>
                  <input
                    type="password"
                    value={passForm.confirmPassword}
                    onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                    placeholder="Повторите новый пароль"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Обновление...' : 'Обновить пароль'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}