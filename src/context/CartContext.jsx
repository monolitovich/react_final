import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '../api/apiClient';
import { AuthContext } from './AuthContext';

// контекст корзины
export const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  // список позиций в корзине
  const [items, setItems] = useState([]);
  // общая сумма
  const [totalAmount, setTotalAmount] = useState(0);
  // общее число единиц
  const [totalCount, setTotalCount] = useState(0);
  // флаг загрузки данных корзины
  const [loading, setLoading] = useState(false);

  // получение корзины с бэкенда
  async function fetchCart() {
    if (!user) {
      setItems([]);
      setTotalAmount(0);
      setTotalCount(0);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/cart');
      setItems(data.items || []);
      setTotalAmount(data.totalAmount || 0);
      setTotalCount(data.totalItems || 0);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // обновление при изменении статуса пользователя
  useEffect(() => {
    fetchCart();
  }, [user]);

  // добавление товара в корзину
  async function addToCart(serviceId, quantity = 1) {
    if (!user) {
      throw new Error('для добавления в корзину необходимо войти');
    }
    await apiRequest('/cart', {
      method: 'POST',
      body: JSON.stringify({ serviceId, quantity }),
    });
    await fetchCart();
  }

  // изменение количества
  async function updateQuantity(cartItemId, quantity) {
    if (quantity <= 0) return;
    await apiRequest(`/cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    await fetchCart();
  }

  // удаление позиции
  async function removeFromCart(cartItemId) {
    await apiRequest(`/cart/${cartItemId}`, {
      method: 'DELETE',
    });
    await fetchCart();
  }

  // локальный сброс корзины после заказа
  function clearCartState() {
    setItems([]);
    setTotalAmount(0);
    setTotalCount(0);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalCount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCartState,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}