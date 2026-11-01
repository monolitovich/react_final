import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// страницы приложения
import { CatalogPage } from './pages/CatalogPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { HelpPage } from './pages/HelpPage';
import { AboutPage } from './pages/AboutPage';

import './App.css';

// защищенный маршрут для авторизованных пользователей
function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loader-block">Проверка сессии...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

// защищенный маршрут для администратора
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loader-block">Проверка прав...</div>;
  }

  return user && isAdmin ? children : <Navigate to="/" replace />;
}

// главное приложение
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="app-layout">
            {/* верхняя панель навигации */}
            <Header />

            {/* основное содержимое страниц */}
            <main className="main-viewport">
              <Routes>
                {/* публичные маршруты */}
                <Route path="/" element={<CatalogPage />} />
                <Route path="/service/:id" element={<ServiceDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* защищенные маршруты покупателя */}
                <Route
                  path="/checkout"
                  element={
                    <PrivateRoute>
                      <CheckoutPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />

                {/* панель администратора */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPage />
                    </AdminRoute>
                  }
                />

                {/* обработка несуществующих страниц */}
                <Route
                  path="*"
                  element={
                    <div className="container page-content">
                      <div className="empty-state">
                        <h2>404 — Страница не найдена</h2>
                        <p>Запрашиваемый адрес отсутствует или был перемещен.</p>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </main>

            {/* подвал сайта */}
            <Footer />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}