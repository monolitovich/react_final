import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../api/apiClient';
import { containsProfanity } from '../utils/profanityFilter';

// страница оформления заказа
export function CheckoutPage() {
  const { items, totalAmount, clearCartState } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // поля формы
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // состояния процесса и ошибок
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // состояние успешного модального окна для покупателя
  const [createdOrderData, setCreatedOrderData] = useState(null);

  // минимальная дата доставки - сегодня
  const today = new Date().toISOString().split('T')[0];

  // регулярка для валидации адреса (город, улица, дом)
  const REGEX_ADDRESS = /^[А-Яа-яЁё0-9\s.,\/-]{12,250}$/;

  // автозаполнение адреса из профиля
  useEffect(() => {
    if (user?.defaultAddress) {
      setDeliveryAddress(user.defaultAddress);
    }
  }, [user]);

  // редирект если корзина пустая и заказ еще не подтвержден
  useEffect(() => {
    if (items.length === 0 && !createdOrderData) {
      navigate('/cart');
    }
  }, [items, createdOrderData, navigate]);

  // фильтрация ввода адреса
  function handleAddressChange(e) {
    // разрешаем кириллицу, цифры, дефис, точку, запятую, слэш и пробел
    const clean = e.target.value.replace(/[^А-Яа-яЁё0-9\s.,\/-]/g, '');
    setDeliveryAddress(clean);
  }

  // отправка заказа
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    const trimmedAddress = deliveryAddress.trim();

    if (!trimmedAddress) {
      setErrorMsg('пожалуйста, укажите адрес доставки');
      return;
    }

    if (!REGEX_ADDRESS.test(trimmedAddress)) {
      setErrorMsg('адрес должен содержать не менее 12 символов (город, улица, дом)');
      return;
    }

    if (!/\d+/.test(trimmedAddress)) {
      setErrorMsg('в адресе обязательно должен быть указан номер дома или строения');
      return;
    }

    if (!deliveryDate) {
      setErrorMsg('пожалуйста, выберите дату доставки');
      return;
    }

    if (deliveryDate < today) {
      setErrorMsg('дата доставки не может быть раньше сегодняшнего дня');
      return;
    }

    if (containsProfanity(trimmedAddress)) {
  setErrorMsg('адрес доставки содержит недопустимые слова или выражения');
  return;
}

    setLoading(true);
    try {
      const response = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          deliveryAddress: trimmedAddress,
          deliveryDate,
        }),
      });

      // очищаем корзину в стейте
      clearCartState();
      // открываем человеческое модальное окно с деталями заказа
      setCreatedOrderData(response.order);
    } catch (err) {
      setErrorMsg(err.message || 'не удалось оформить заказ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page-content">
      <h1 className="page-title">Оформление заказа</h1>

      <div className="checkout-grid">
        {/* форма ввода параметров доставки */}
        <div className="checkout-form-box">
          {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="standard-form">
            <div className="form-group">
              <label>Получатель</label>
              <input type="text" value={user?.fullName || ''} disabled />
            </div>

            <div className="form-group">
              <label>Контактный телефон</label>
              <input type="text" value={user?.phone || ''} disabled />
            </div>

            <div className="form-group">
              <label>Адрес доставки *</label>
              <textarea
                rows="3"
                placeholder="г. Москва, ул. Арбат, д. 25, кв. 14"
                value={deliveryAddress}
                onChange={handleAddressChange}
                required
              />
              <small className="field-hint">
                Укажите город, улицу, номер дома и квартиру (только на русском языке).
              </small>
            </div>

            <div className="form-group">
              <label>Желаемая дата доставки *</label>
              <input
                type="date"
                min={today}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
              <small className="field-hint">Доставка курьером возможна с сегодняшнего дня.</small>
            </div>

            <button type="submit" className="btn-primary btn-large full-width" disabled={loading}>
              {loading ? 'Оформление покупки...' : `Подтвердить заказ на ${totalAmount.toLocaleString('ru-RU')} ₽`}
            </button>
          </form>
        </div>

        {/* сводка заказа */}
        <div className="checkout-summary-box">
          <div className="summary-card">
            <h3>Состав заказа</h3>
            <div className="checkout-items-list">
              {items.map((i) => (
                <div key={i.cartItemId} className="checkout-item-row">
                  <span>{i.serviceName} × {i.quantity}</span>
                  <strong>{Number(i.itemTotal).toLocaleString('ru-RU')} ₽</strong>
                </div>
              ))}
            </div>
            <div className="summary-row total">
              <span>Итого к оплате:</span>
              <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
            <Link to="/cart" className="continue-link">
              ← Изменить состав корзины
            </Link>
          </div>
        </div>
      </div>

      {/* окно успешного оформления заказа для клиента */}
      {createdOrderData && (
        <div className="modal-backdrop">
          <div className="modal-card success-order-card">
            <div className="success-icon-badge">🎉</div>
            <h2>Заказ успешно оформлен!</h2>
            <p className="success-order-text">
              Спасибо за покупку в магазине SoundWave! Мы уже начали бережно готовить и упаковывать ваш заказ.
            </p>

            <div className="order-details-card">
              <div className="order-details-line">
                <span>Номер вашего заказа:</span>
                <strong>#{createdOrderData.orderId}</strong>
              </div>
              <div className="order-details-line">
                <span>Дата получения:</span>
                <strong>{new Date(createdOrderData.deliveryDate).toLocaleDateString('ru-RU')}</strong>
              </div>
              <div className="order-details-line">
                <span>Адрес доставки:</span>
                <span>{createdOrderData.deliveryAddress}</span>
              </div>
              <div className="order-details-line total">
                <span>Сумма к оплате:</span>
                <strong>{Number(createdOrderData.totalAmount).toLocaleString('ru-RU')} ₽</strong>
              </div>
            </div>

            <p className="order-notice-text">
              Подробная квитанция со списком товаров отправлена вам на электронную почту.
            </p>

            <div className="modal-footer-btns center-btns">
              <button 
                onClick={() => navigate('/profile')} 
                className="btn-primary btn-large full-width"
              >
                Перейти в личный кабинет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}