import React, { useState } from 'react';
import { apiRequest } from '../api/apiClient';
import { ModalNotification } from '../components/ModalNotification';
import { containsProfanity } from '../utils/profanityFilter';

// страница помощи и связи с администрацией
export function HelpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });

  const REGEX_NAME = /^[А-Яа-яЁё]{2,30}([- ][А-Яа-яЁё]{2,30})?$/;
  const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  function handleNameChange(e) {
    let clean = e.target.value.replace(/[^А-Яа-яЁё\- ]/g, '').replace(/\s{2,}/g, ' ').replace(/-{2,}/g, '-').replace(/^[\s-]/, '');
    const separatorsCount = (clean.match(/[\s-]/g) || []).length;
    if (separatorsCount > 1) return;

    setFormData((prev) => ({
      ...prev,
      name: clean,
    }));
  }

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedSubject = formData.subject.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setErrorMessage('заполните все обязательные поля');
      return;
    }

    if (!REGEX_NAME.test(trimmedName)) {
      setErrorMessage('имя: только кириллица, максимум 2 слова (через дефис или пробел)');
      return;
    }

    if (!REGEX_EMAIL.test(trimmedEmail)) {
      setErrorMessage('введен некорректный формат email');
      return;
    }

    if (trimmedSubject.length < 3 || trimmedSubject.length > 150) {
      setErrorMessage('тема обращения должна содержать от 3 до 150 символов');
      return;
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      setErrorMessage('текст сообщения должен содержать от 10 до 2000 символов');
      return;
    }

    if (containsProfanity(trimmedName) || containsProfanity(trimmedSubject) || containsProfanity(trimmedMessage)) {
  setErrorMessage('сообщение содержит недопустимые слова или оскорбления');
  return;
}

    setLoading(true);
    try {
      await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
      setModal({
        isOpen: true,
        title: 'Обращение успешно отправлено!',
        message: 'Мы получили ваше сообщение и ответим на указанную электронную почту в ближайшее время.',
      });
    } catch (err) {
      setErrorMessage(err.message || 'не удалось отправить обращение');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page-content">
      <div className="help-layout">
        <div className="help-info-card">
          <h2>Служба заботы SoundWave</h2>
          <p>
            Нужна консультация по выбору инструмента, статусу заказа или сервисному обслуживанию?
            Напишите нам, и мы ответим на указанную почту в течение нескольких часов.
          </p>

          <div className="info-block">
            <strong>График работы поддержки:</strong>
            <p>Ежедневно с 10:00 до 21:00 (МСК)</p>
          </div>

          <div className="info-block">
            <strong>Прямой контакт:</strong>
            <p>isip_a.d.bocharnikov@mpt.ru</p>
          </div>
        </div>

        <div className="help-form-card">
          <h3>Отправить обращение</h3>

          {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

          <form onSubmit={handleSubmit} className="standard-form">
            <div className="form-group">
              <label>Ваше имя *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Буден Стасенков"
                required
              />
            </div>

            <div className="form-group">
              <label>Контактный Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="stasyan@mail.ru"
                required
              />
            </div>

            <div className="form-group">
              <label>Тема обращения *</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Вопрос по заказу или доставке"
                required
              />
            </div>

            <div className="form-group">
              <label>Текст сообщения *</label>
              <textarea
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                placeholder="Опишите подробно ваш вопрос (минимум 10 символов)..."
                required
              />
            </div>

            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить обращение'}
            </button>
          </form>
        </div>
      </div>

      <ModalNotification
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type="success"
        onClose={() => setModal({ ...modal, isOpen: false })}
      />
    </div>
  );
}