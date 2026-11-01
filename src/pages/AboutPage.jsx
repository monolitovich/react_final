import React from 'react';
import { Link } from 'react-router-dom';

// страница информации о магазине
export function AboutPage() {
  return (
    <div className="container page-content">
      <div className="about-hero">
        <h1>О магазине музыкальных инструментов SoundWave</h1>
        <p>Мы объединяем музыкантов и качественное звучание с 2018 года.</p>
      </div>

      <div className="about-grid">
        <div className="about-feature">
          <h3>🎸 Экспертный подбор</h3>
          <p>Все инструменты проходят предпродажную проверку, отстройку высоты струн и проверку электроники.</p>
        </div>
        <div className="about-feature">
          <h3>🔧 Собственная мастерская</h3>
          <p>Наши сертифицированные мастера оказывают полный спектр услуг: от мензурирования до тонкой настройки клавишных инструментов.</p>
        </div>
        <div className="about-feature">
          <h3>🚚 Надежная доставка</h3>
          <p>Бережная доставка инструментов в жестких кейсах и заводской упаковке точно в согласованный день.</p>
        </div>
      </div>

      <div className="about-cta">
        <h3>Готовы найти свой идеальный звук?</h3>
        <Link to="/" className="btn-primary btn-large">Перейти в каталог товаров</Link>
      </div>
    </div>
  );
}