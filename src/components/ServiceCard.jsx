import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

// карточка товара в каталоге
export function ServiceCard({ service }) {
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  // флаг процесса добавления
  const [adding, setAdding] = useState(false);
  // текст уведомления
  const [statusMsg, setStatusMsg] = useState('');

  // добавление товара в корзину
  async function handleAdd(e) {
    e.preventDefault();
    if (!user) {
      setStatusMsg('сначала войдите в систему');
      return;
    }
    setAdding(true);
    setStatusMsg('');
    try {
      await addToCart(service.serviceId, 1);
      setStatusMsg('добавлено в корзину');
    } catch (err) {
      setStatusMsg(err.message || 'ошибка при добавлении');
    } finally {
      setAdding(false);
      setTimeout(() => setStatusMsg(''), 2500);
    }
  }

  return (
    <div className="service-card">
      {/* ссылка на страницу товара */}
      <Link to={`/service/${service.serviceId}`} className="card-image-wrap">
        <img src={service.imageUrl} alt={service.serviceName} loading="lazy" />
        <span className="card-category-badge">{service.categoryName}</span>
      </Link>

      <div className="card-body">
        {/* рейтинг и длительность */}
        <div className="card-meta">
          <span className="card-rating">★ {service.averageRating} ({service.reviewsCount})</span>
          {service.durationMinutes > 0 && (
            <span className="card-duration">⏱ {service.durationMinutes} мин</span>
          )}
        </div>

        {/* заголовок с переходом */}
        <h3 className="card-title">
          <Link to={`/service/${service.serviceId}`}>{service.serviceName}</Link>
        </h3>

        <p className="card-desc">{service.serviceDescription}</p>

        {/* футер карточки с ценой и кнопкой */}
        <div className="card-footer">
          <div className="card-price">{Number(service.servicePrice).toLocaleString('ru-RU')} ₽</div>
          <button 
            onClick={handleAdd} 
            className="btn-primary" 
            disabled={adding}
          >
            {adding ? '...' : 'В корзину'}
          </button>
        </div>

        {statusMsg && <div className="card-status-info">{statusMsg}</div>}
      </div>
    </div>
  );
}