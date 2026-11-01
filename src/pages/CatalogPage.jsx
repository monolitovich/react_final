import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/apiClient';
import { ServiceCard } from '../components/ServiceCard';

// каталог товаров и услуг
export function CatalogPage() {
  // список товаров
  const [services, setServices] = useState([]);
  // список категорий
  const [categories, setCategories] = useState([]);
  // активная категория
  const [selectedCategory, setSelectedCategory] = useState('all');
  // тип сортировки
  const [sortBy, setSortBy] = useState('default');
  // поисковый запрос
  const [searchTerm, setSearchTerm] = useState('');
  // состояния загрузки и ошибки
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // загрузка категорий
  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await apiRequest('/categories');
        setCategories(data);
      } catch (err) {
        console.error(err.message);
      }
    }
    fetchCategories();
  }, []);

  // загрузка товаров с бэкенда
  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams();
        if (selectedCategory !== 'all') query.append('category', selectedCategory);
        if (sortBy !== 'default') query.append('sort', sortBy);

        const data = await apiRequest(`/services?${query.toString()}`);
        setServices(data);
      } catch (err) {
        setError(err.message || 'не удалось загрузить каталог');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, [selectedCategory, sortBy]);

  // клиентская фильтрация по строке поиска
  const filteredServices = services.filter((item) =>
    item.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container page-content">
      {/* промо-баннер */}
      <div className="catalog-hero">
        <h1>Профессиональные музыкальные инструменты и сервис</h1>
        <p>Качественные гитары, клавиши, ударные и мастерская точной настройки строя</p>
      </div>

      {/* панель управления каталогом */}
      <div className="catalog-toolbar">
        {/* поиск */}
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* сортировка по цене */}
        <div className="sort-wrap">
          <label>Сортировка:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="default">По умолчанию</option>
            <option value="price_asc">Сначала недорогие</option>
            <option value="price_desc">Сначала премиальные</option>
          </select>
        </div>
      </div>

      {/* фильтр категорий */}
      <div className="categories-chips">
        <button
          className={selectedCategory === 'all' ? 'chip active' : 'chip'}
          onClick={() => setSelectedCategory('all')}
        >
          Все разделы
        </button>
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            className={selectedCategory === cat.slug ? 'chip active' : 'chip'}
            onClick={() => setSelectedCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* отображение состояния загрузки */}
      {loading && <div className="loader-block">Загрузка каталога...</div>}

      {/* обработка ошибок */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* сетка карточек */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="services-grid">
          {filteredServices.map((service) => (
            <ServiceCard key={service.serviceId} service={service} />
          ))}
        </div>
      )}

      {/* пустое состояние */}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="empty-state">
          <h3>Товаров по данному запросу не найдено</h3>
          <p>Попробуйте сбросить фильтры или изменить поисковую фразу</p>
          <button 
            className="btn-secondary" 
            onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}