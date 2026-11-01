import React, { createContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/apiClient';

// контекст авторизации
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // состояние пользователя
  const [user, setUser] = useState(null);
  // флаг загрузки сессии
  const [loading, setLoading] = useState(true);

  // проверка токена при старте
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await apiRequest('/auth/me');
        setUser(profile);
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // вход в аккаунт
  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  }

  // регистрация
  async function register(userData) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  }

  // выход из аккаунта
  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  // обновление данных пользователя в стейте
  function updateUserState(updatedFields) {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}