import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/apiClient';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { ModalNotification } from '../components/ModalNotification';
import { containsProfanity } from '../utils/profanityFilter';

// детальная страница услуги/товара с отзывами
export function ServiceDetailPage() {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  // состояние редактирования
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [cartMsg, setCartMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // окна
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, reviewId: null });

  async function loadData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const serviceData = await apiRequest(`/services/${id}`);
      const reviewsData = await apiRequest(`/reviews/${id}`);
      setService(serviceData);
      setReviews(reviewsData);
    } catch (err) {
      setErrorMsg(err.message || 'товар не найден');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleAddToCart() {
    if (!user) {
      setCartMsg('войдите для добавления в корзину');
      return;
    }
    try {
      await addToCart(service.serviceId, 1);
      setCartMsg('товар добавлен в корзину');
    } catch (err) {
      setCartMsg(err.message || 'ошибка при добавлении');
    } finally {
      setTimeout(() => setCartMsg(''), 2500);
    }
  }

  // публикация отзыва
  async function handleAddReview(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (containsProfanity(newComment)) {
      setModal({
        isOpen: true,
        title: 'Недопустимые выражения',
        message: 'Пожалуйста, пишите отзыв уважительно. Использование нецензурной лексики и грубых выражений запрещено правилами сервиса.',
        type: 'danger',
      });
      return;
    }

    setReviewSubmitting(true);
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: id,
          rating: newRating,
          comment: newComment.trim(),
        }),
      });
      setNewComment('');
      await loadData();
      setModal({
        isOpen: true,
        title: 'Спасибо за отзыв!',
        message: 'Ваш отзыв успешно опубликован.',
        type: 'success',
      });
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Ошибка',
        message: err.message || 'Не удалось опубликовать отзыв.',
        type: 'danger',
      });
    } finally {
      setReviewSubmitting(false);
    }
  }

  // открытие формы редактирования
  function startEditReview(rev) {
    setEditingReviewId(rev.reviewId);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  }

  // сохранение изменений в отзыве
  async function handleSaveEditReview(e) {
    e.preventDefault();
    if (!editComment.trim()) return;

    if (containsProfanity(editComment)) {
      setModal({
        isOpen: true,
        title: 'Недопустимые выражения',
        message: 'Текст отзыва содержит грубые или нецензурные слова. Пожалуйста, исправьте текст перед сохранением.',
        type: 'danger',
      });
      return;
    }

    try {
      await apiRequest(`/reviews/${editingReviewId}`, {
        method: 'PUT',
        body: JSON.stringify({
          rating: editRating,
          comment: editComment.trim(),
        }),
      });
      setEditingReviewId(null);
      await loadData();
      setModal({
        isOpen: true,
        title: 'Отзыв изменен',
        message: 'Ваш отзыв успешно обновлен.',
        type: 'success',
      });
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Ошибка',
        message: err.message || 'Не удалось изменить отзыв.',
        type: 'danger',
      });
    }
  }

  // удаление отзыва
  async function confirmDeleteReview() {
    try {
      await apiRequest(`/reviews/${deleteModal.reviewId}`, { method: 'DELETE' });
      setDeleteModal({ isOpen: false, reviewId: null });
      await loadData();
      setModal({
        isOpen: true,
        title: 'Отзыв удален',
        message: 'Отзыв был успешно удален.',
        type: 'info',
      });
    } catch (err) {
      setDeleteModal({ isOpen: false, reviewId: null });
      setModal({
        isOpen: true,
        title: 'Ошибка',
        message: err.message || 'Не удалось удалить отзыв.',
        type: 'danger',
      });
    }
  }

  if (loading) return <div className="container page-content"><div className="loader-block">Загрузка информации...</div></div>;
  if (errorMsg || !service) return <div className="container page-content"><div className="alert alert-danger">{errorMsg}</div></div>;

  return (
    <div className="container page-content">
      <div className="breadcrumbs">
        <Link to="/">Каталог</Link> <span>/</span> <span>{service.categoryName}</span> <span>/</span> <span>{service.serviceName}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-image-box">
          <img src={service.imageUrl} alt={service.serviceName} />
        </div>

        <div className="detail-info-box">
          <span className="badge-tag">{service.categoryName}</span>
          <h1>{service.serviceName}</h1>

          <div className="detail-rating-row">
            <span className="stars">★ {service.averageRating}</span>
            <span className="count">({service.reviewsCount} отзывов)</span>
            {service.durationMinutes > 0 && (
              <span className="duration">Длительность: {service.durationMinutes} мин</span>
            )}
          </div>

          <div className="detail-price-box">
            <div className="price">{Number(service.servicePrice).toLocaleString('ru-RU')} ₽</div>
            <button onClick={handleAddToCart} className="btn-primary btn-large">
              Добавить в корзину
            </button>
          </div>

          {cartMsg && <div className="alert alert-success">{cartMsg}</div>}

          <div className="detail-description">
            <h3>Описание</h3>
            <p>{service.serviceDescription}</p>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Отзывы покупателей ({reviews.length})</h2>

        {user ? (
          <form onSubmit={handleAddReview} className="review-form">
            <h4>Оставить отзыв о товаре</h4>
            <div className="form-row-inline">
              <label>Ваша оценка:</label>
              <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))}>
                <option value={5}>5 — Отлично</option>
                <option value={4}>4 — Хорошо</option>
                <option value={3}>3 — Нормально</option>
                <option value={2}>2 — Плохо</option>
                <option value={1}>1 — Ужасно</option>
              </select>
            </div>
            <textarea
              rows="3"
              placeholder="Расскажите о звуке, сборке и впечатлениях..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
            />
            <button type="submit" className="btn-secondary" disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Публикация...' : 'Опубликовать отзыв'}
            </button>
          </form>
        ) : (
          <div className="auth-prompt-box">
            <p>Оставлять отзывы могут только авторизованные клиенты.</p>
            <Link to="/login" className="btn-secondary">Войти в аккаунт</Link>
          </div>
        )}

        <div className="reviews-list">
          {reviews.length > 0 ? (
            reviews.map((rev) => {
              // только автор может редактировать
              const isAuthor = Boolean(user && Number(user.id) === Number(rev.userId));
              // удалять может и автор, и админ
              const canDelete = Boolean(user && (Number(user.id) === Number(rev.userId) || user.role === 'admin'));

              return (
                <div key={rev.reviewId} className="review-item">
                  {editingReviewId === rev.reviewId ? (
                    <form onSubmit={handleSaveEditReview} className="review-edit-box">
                      <div className="form-row-inline">
                        <label>Оценка:</label>
                        <select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>
                          <option value={5}>5 — Отлично</option>
                          <option value={4}>4 — Хорошо</option>
                          <option value={3}>3 — Нормально</option>
                          <option value={2}>2 — Плохо</option>
                          <option value={1}>1 — Ужасно</option>
                        </select>
                      </div>
                      <textarea
                        rows="3"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        required
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '6px 14px' }}>
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 14px' }}
                          onClick={() => setEditingReviewId(null)}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="review-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{rev.authorName}</strong>
                          {rev.isEdited && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                              (изменено)
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="review-date">{rev.createdDate}</span>
                          {(isAuthor || canDelete) && (
                            <div className="review-actions-group">
                              {/* кнопку "Ред." видит ТОЛЬКО автор отзыва */}
                              {isAuthor && (
                                <button
                                  type="button"
                                  onClick={() => startEditReview(rev)}
                                  className="review-btn-edit"
                                >
                                  Ред.
                                </button>
                              )}

                              {/* кнопку "Удалить" видит автор и видит админ */}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteModal({ isOpen: true, reviewId: rev.reviewId })}
                                  className="review-btn-delete"
                                >
                                  Удалить
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="review-stars">{'★'.repeat(rev.rating)}</div>
                      <p className="review-text">{rev.comment}</p>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <p className="no-reviews">Отзывов пока нет. Будьте первым, кто поделится мнением!</p>
          )}
        </div>
      </div>

      <ModalNotification
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={() => setModal({ ...modal, isOpen: false })}
      />

      <ModalNotification
        isOpen={deleteModal.isOpen}
        title="Удалить отзыв?"
        message="Вы уверены, что хотите удалить этот отзыв? Это действие нельзя будет отменить."
        type="confirm"
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDeleteReview}
        onClose={() => setDeleteModal({ isOpen: false, reviewId: null })}
      />
    </div>
  );
}