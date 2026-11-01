import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

// корзина покупателя
export function CartPage() {
  const { items, totalAmount, loading, updateQuantity, removeFromCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // проверка неавторизованного входа
  if (!user) {
    return (
      <div className="container page-content">
        <div className="auth-prompt-box">
          <h2>Корзина доступна после авторизации</h2>
          <p>Войдите в аккаунт, чтобы сохранять выбранные товары и оформить заказ.</p>
          <Link to="/login" className="btn-primary">Войти в аккаунт</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container page-content">
        <div className="loader-block">Загрузка корзины...</div>
      </div>
    );
  }

  // пустая корзина
  if (items.length === 0) {
    return (
      <div className="container page-content">
        <div className="empty-state">
          <h2>Ваша корзина пуста</h2>
          <p>В каталоге представлен широкий выбор музыкальных инструментов и услуг по настройке.</p>
          <Link to="/" className="btn-primary">Перейти в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-content">
      <h1 className="page-title">Корзина товаров</h1>

      <div className="cart-grid">
        {/* список позиций */}
        <div className="cart-items-col">
          {items.map((item) => (
            <div key={item.cartItemId} className="cart-item-card">
              <img src={item.imageUrl} alt={item.serviceName} className="cart-thumb" />

              <div className="cart-details">
                <span className="badge-tag">{item.categoryName}</span>
                <h4>{item.serviceName}</h4>
                <div className="cart-unit-price">
                  {Number(item.unitPrice).toLocaleString('ru-RU')} ₽ за шт.
                </div>
              </div>

              {/* управление количеством */}
              <div className="cart-qty-ctrl">
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="qty-btn"
                >
                  −
                </button>
                <span className="qty-val">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                  className="qty-btn"
                >
                  +
                </button>
              </div>

              {/* сумма по позиции */}
              <div className="cart-total-col">
                <strong>{Number(item.itemTotal).toLocaleString('ru-RU')} ₽</strong>
              </div>

              {/* удаление строки */}
              <button
                onClick={() => removeFromCart(item.cartItemId)}
                className="cart-del-btn"
                title="Удалить позицию"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* итоговый блок заказа */}
        <div className="cart-summary-col">
          <div className="summary-card">
            <h3>Итог заказа</h3>
            <div className="summary-row">
              <span>Выбрано позиций:</span>
              <span>{items.length}</span>
            </div>
            <div className="summary-row total">
              <span>Сумма к оплате:</span>
              <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary full-width btn-large"
            >
              Оформить заказ
            </button>
            <Link to="/" className="continue-link">
              ← Продолжить покупки
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}