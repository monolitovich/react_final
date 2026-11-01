import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../api/apiClient';
import { ModalNotification } from '../components/ModalNotification';

// панель администратора
export function AdminPage() {
  const { isAdmin } = useContext(AuthContext);

  const [section, setSection] = useState('products');
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // модалка создания/редактирования
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    categoryId: 1,
    name: '',
    description: '',
    durationMinutes: 0,
    price: '',
    imageUrl: '/images/products/fender-strat.jpg',
    isActive: true,
  });

  // модальное окно подтверждения снятия/возврата товара
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    serviceId: null,
    title: '',
    message: '',
  });

  async function loadData() {
    setLoading(true);
    try {
      const [svc, ord, cat] = await Promise.all([
        apiRequest('/admin/services'),
        apiRequest('/admin/orders'),
        apiRequest('/categories'),
      ]);
      setServices(svc);
      setOrders(ord);
      setCategories(cat);
    } catch (e) {
      setErr(e.message || 'ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      categoryId: categories[0]?.categoryId || 1,
      name: '',
      description: '',
      durationMinutes: 0,
      price: '',
      imageUrl: '/images/products/fender-strat.jpg',
      isActive: true,
    });
    setShowModal(true);
  }

  function openEditModal(svc) {
    setEditingId(svc.serviceId);
    const cat = categories.find((c) => c.slug === svc.categorySlug);
    setForm({
      categoryId: cat ? cat.categoryId : 1,
      name: svc.serviceName,
      description: svc.serviceDescription,
      durationMinutes: svc.durationMinutes,
      price: svc.servicePrice,
      imageUrl: svc.imageUrl,
      isActive: svc.isActive,
    });
    setShowModal(true);
  }

  async function handleSaveService(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      if (editingId) {
        await apiRequest(`/admin/services/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMsg('товар успешно обновлен');
      } else {
        await apiRequest('/admin/services', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setMsg('новый товар добавлен');
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      setErr(e.message || 'ошибка сохранения');
    }
  }

  // открытие красивого окна подтверждения перед снятием
  function promptToggleStatus(svc) {
    if (svc.isActive) {
      setConfirmModal({
        isOpen: true,
        serviceId: svc.serviceId,
        title: 'Снять товар с публикации?',
        message: `Товар «${svc.serviceName}» перестанет отображаться в каталоге для покупателей. Вы сможете вернуть его в любой момент.`,
      });
    } else {
      executeToggleStatus(svc.serviceId);
    }
  }

  async function executeToggleStatus(id) {
    try {
      await apiRequest(`/admin/services/${id}/toggle`, { method: 'PATCH' });
      setMsg('статус публикации обновлен');
      loadData();
    } catch (e) {
      setErr(e.message || 'ошибка изменения статуса');
    } finally {
      setConfirmModal({ isOpen: false, serviceId: null, title: '', message: '' });
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    try {
      await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setMsg(`статус заказа #${orderId} изменен на "${newStatus}"`);
      loadData();
    } catch (e) {
      setErr(e.message || 'ошибка статуса заказа');
    }
  }

  if (!isAdmin) {
    return (
      <div className="container page-content">
        <div className="alert alert-danger">Доступ разрешен только администраторам.</div>
      </div>
    );
  }

  return (
    <div className="container page-content">
      <div className="admin-header">
        <h1>Панель управления магазином</h1>
        <div className="admin-nav-tabs">
          <button
            className={section === 'products' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSection('products')}
          >
            Управление товарами ({services.length})
          </button>
          <button
            className={section === 'orders' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setSection('orders')}
          >
            Все заказы ({orders.length})
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}
      {loading && <div className="loader-block">Загрузка данных...</div>}

      {!loading && section === 'products' && (
        <div>
          <div className="admin-actions-bar">
            <button onClick={openCreateModal} className="btn-primary">
              + Добавить товар или услугу
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Наименование</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Цена</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.serviceId} style={{ opacity: svc.isActive ? 1 : 0.6 }}>
                  <td>
                    <img src={svc.imageUrl} alt={svc.serviceName} className="admin-thumb" />
                  </td>
                  <td><strong>{svc.serviceName}</strong></td>
                  <td>{svc.categoryName}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: svc.isActive ? '#dcfce7' : '#fee2e2',
                        color: svc.isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {svc.isActive ? 'В продаже' : 'Снят'}
                    </span>
                  </td>
                  <td>{Number(svc.servicePrice).toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <div className="actions-cell">
                      <button onClick={() => openEditModal(svc)} className="btn-edit">
                        Изм.
                      </button>
                      <button
                        onClick={() => promptToggleStatus(svc)}
                        className={svc.isActive ? 'btn-del' : 'btn-edit'}
                        style={!svc.isActive ? { background: '#dcfce7', borderColor: '#86efac', color: '#166534' } : {}}
                      >
                        {svc.isActive ? 'Снять' : 'Вернуть'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && section === 'orders' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Контакты</th>
              <th>Адрес и дата доставки</th>
              <th>Сумма</th>
              <th>Текущий статус</th>
              <th>Сменить статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((ord) => (
              <tr key={ord.orderId}>
                <td><strong>#{ord.orderId}</strong></td>
                <td>{ord.customerName}</td>
                <td>
                  <div>{ord.customerEmail}</div>
                  <small>{ord.customerPhone}</small>
                </td>
                <td>
                  <div>{ord.deliveryAddress}</div>
                  <small>Доставка: {ord.deliveryDate}</small>
                </td>
                <td><strong>{Number(ord.totalAmount).toLocaleString('ru-RU')} ₽</strong></td>
                <td>
                  <span className={`status-pill status-${ord.status.toLowerCase()}`}>
                    {ord.status}
                  </span>
                </td>
                <td>
                  <select
                    value={ord.status}
                    onChange={(e) => handleStatusChange(ord.orderId, e.target.value)}
                    className="status-select"
                  >
                    <option value="Новый">Новый</option>
                    <option value="В обработке">В обработке</option>
                    <option value="Доставляется">Доставляется</option>
                    <option value="Выполнен">Выполнен</option>
                    <option value="Отменен">Отменен</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingId ? 'Редактировать товар' : 'Добавить новый товар'}</h3>
            <form onSubmit={handleSaveService} className="standard-form">
              <div className="form-group">
                <label>Категория</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Цена (руб.)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Длительность (мин)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Путь к фото</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  required
                />
              </div>

              <div className="modal-footer-btns">
                <button type="submit" className="btn-primary">
                  Сохранить
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* кастомное модальное окно подтверждения в общем стиле */}
      <ModalNotification
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type="confirm"
        confirmText="Снять"
        cancelText="Отмена"
        onConfirm={() => executeToggleStatus(confirmModal.serviceId)}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}