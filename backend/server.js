const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'music_shop_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  console.log('Подключение к PostgreSQL успешно установлено');
});

// отправка email сообщений
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmailNotification(to, subject, htmlContent) {
  try {
    if (!process.env.SMTP_USER || (process.env.SMTP_PASS && process.env.SMTP_PASS.includes('dev_password'))) {
      console.log(`[SMTP-DEBUG] Письмо для ${to}: ${subject}`);
      return false;
    }
    await transporter.sendMail({
      from: `"SoundWave Music Store" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Ошибка отправки email:', error.message);
    return false;
  }
}

// валидация
const REGEX_NAME = /^[А-Яа-яЁё]{2,30}([- ][А-Яа-яЁё]{2,30})?$/;
const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const REGEX_PHONE = /^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
const REGEX_ADDRESS = /^[А-Яа-яЁё0-9\s.,\/-]{12,250}$/;

// фильтр нецензурной лексики
const OBSCENE_PATTERNS = [
  /ху[йиеёяюи]/i,
  /п[иеё]зд/i,
  /еб[аеёиу]/i,
  /ёб/i,
  /бл[яяа]/i,
  /сук[аиое]/i,
  /муд[аое]/i,
  /г[ао]вн/i,
  /дерьм/i,
  /шлюх/i,
  /чм[оы]/i,
  /залуп/i,
  /дроч/i,
  /пид[аое]р/i,
  /гандон/i,
  /гондон/i
];

function hasProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = text
    .toLowerCase()
    .replace(/[@aа]/g, 'а')
    .replace(/[bб6]/g, 'б')
    .replace(/[vв]/g, 'в')
    .replace(/[gг]/g, 'г')
    .replace(/[dд]/g, 'д')
    .replace(/[eеё]/g, 'е')
    .replace(/[zhж]/g, 'ж')
    .replace(/[zз3]/g, 'з')
    .replace(/[iи1!|]/g, 'и')
    .replace(/[kк]/g, 'к')
    .replace(/[lл]/g, 'л')
    .replace(/[mм]/g, 'м')
    .replace(/[nн]/g, 'н')
    .replace(/[oо0]/g, 'о')
    .replace(/[pп]/g, 'п')
    .replace(/[rр]/g, 'р')
    .replace(/[sс$]/g, 'с')
    .replace(/[tт]/g, 'т')
    .replace(/[uуy]/g, 'у')
    .replace(/[fф]/g, 'ф')
    .replace(/[hх]/g, 'х')
    .replace(/[cц]/g, 'ц')
    .replace(/[chч]/g, 'ч')
    .replace(/[shш]/g, 'ш')
    .replace(/[yaя]/g, 'я');

  return OBSCENE_PATTERNS.some((pat) => pat.test(normalized));
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'требуется авторизация' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'недействительный или истекший токен' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'доступ только для администратора' });
  }
  next();
}

// регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { lastName, firstName, patronymic = '', email, password, phone } = req.body;

    const trimmedLast = (lastName || '').trim();
    const trimmedFirst = (firstName || '').trim();
    const trimmedPatr = (patronymic || '').trim();
    const trimmedEmail = (email || '').toLowerCase().trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedLast || !trimmedFirst || !trimmedEmail || !password || !trimmedPhone) {
      return res.status(400).json({ error: 'заполните все обязательные поля' });
    }

    if (hasProfanity(trimmedLast) || hasProfanity(trimmedFirst) || hasProfanity(trimmedPatr)) {
      return res.status(400).json({ error: 'недопустимые слова или выражения в ФИО' });
    }

    if (!REGEX_NAME.test(trimmedLast) || !REGEX_NAME.test(trimmedFirst)) {
      return res.status(400).json({ error: 'ФИО: только кириллица, максимум 2 слова (дефис/пробел)' });
    }
    if (trimmedPatr && !REGEX_NAME.test(trimmedPatr)) {
      return res.status(400).json({ error: 'отчество: только кириллица, максимум 2 слова' });
    }

    if (!REGEX_EMAIL.test(trimmedEmail)) return res.status(400).json({ error: 'некорректный email' });
    if (!REGEX_PHONE.test(trimmedPhone)) return res.status(400).json({ error: 'некорректный телефон' });
    if (password.length < 6 || password.length > 50) return res.status(400).json({ error: 'пароль от 6 до 50 символов' });

    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [trimmedEmail]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'пользователь с таким email уже существует' });

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const userRole = parseInt(countResult.rows[0].count) === 0 ? 1 : 2;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (role_id, last_name, first_name, patronymic, email, password_hash, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, last_name, first_name, patronymic, email, phone, role_id`,
      [userRole, trimmedLast, trimmedFirst, trimmedPatr, trimmedEmail, passwordHash, trimmedPhone]
    );

    const newUser = result.rows[0];
    const roleName = newUser.role_id === 1 ? 'admin' : 'user';

    const token = jwt.sign(
      { userId: newUser.user_id, role: roleName, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'регистрация успешно завершена',
      token,
      user: {
        id: newUser.user_id,
        lastName: newUser.last_name,
        firstName: newUser.first_name,
        patronymic: newUser.patronymic,
        fullName: `${newUser.last_name} ${newUser.first_name} ${newUser.patronymic}`.trim(),
        email: newUser.email,
        phone: newUser.phone,
        role: roleName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка сервера при регистрации' });
  }
});

// вход
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = (email || '').toLowerCase().trim();

    if (!trimmedEmail || !password) return res.status(400).json({ error: 'введите email и пароль' });

    const result = await pool.query(
      `SELECT u.user_id, u.last_name, u.first_name, u.patronymic, u.email, u.password_hash, u.phone, u.default_address, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = $1`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'неверный логин или пароль' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'неверный логин или пароль' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role_name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'успешный вход',
      token,
      user: {
        id: user.user_id,
        lastName: user.last_name,
        firstName: user.first_name,
        patronymic: user.patronymic,
        fullName: `${user.last_name} ${user.first_name} ${user.patronymic}`.trim(),
        email: user.email,
        phone: user.phone,
        defaultAddress: user.default_address,
        role: user.role_name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка сервера при входе' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.last_name, u.first_name, u.patronymic, u.email, u.phone, u.default_address, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'пользователь не найден' });
    const user = result.rows[0];

    res.json({
      id: user.user_id,
      lastName: user.last_name,
      firstName: user.first_name,
      patronymic: user.patronymic,
      fullName: `${user.last_name} ${user.first_name} ${user.patronymic}`.trim(),
      email: user.email,
      phone: user.phone,
      defaultAddress: user.default_address,
      role: user.role_name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка получения профиля' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = (email || '').toLowerCase().trim();

    if (!trimmedEmail || !REGEX_EMAIL.test(trimmedEmail)) return res.status(400).json({ error: 'укажите корректный email' });

    const userResult = await pool.query('SELECT user_id, first_name FROM users WHERE email = $1', [trimmedEmail]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'пользователь не найден' });

    const user = userResult.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.user_id]);
    await pool.query(
      'INSERT INTO password_resets (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, resetCode, expiresAt]
    );

    console.log(`[СБРОС ПАРОЛЯ] Код для ${trimmedEmail}: ${resetCode}`);

    const emailSent = await sendEmailNotification(
      trimmedEmail,
      'Код восстановления пароля - SoundWave',
      `<h3>Здравствуйте, ${user.first_name}!</h3>
       <p>Ваш код подтверждения: <b style="font-size: 22px; color: #d90429;">${resetCode}</b></p>
       <p>Код действителен 15 минут.</p>`
    );

    res.json({ message: 'одноразовый код отправлен на почту', debugCode: emailSent ? undefined : resetCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка отправки кода' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const trimmedEmail = (email || '').toLowerCase().trim();
    const trimmedCode = (code || '').trim();

    if (!trimmedEmail || !trimmedCode || !newPassword) return res.status(400).json({ error: 'заполните все поля' });
    if (!/^\d{6}$/.test(trimmedCode)) return res.status(400).json({ error: 'код должен состоять из 6 цифр' });
    if (newPassword.length < 6 || newPassword.length > 50) return res.status(400).json({ error: 'пароль от 6 до 50 символов' });

    const checkResult = await pool.query(
      `SELECT pr.reset_id, pr.expires_at, u.user_id
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.user_id
       WHERE u.email = $1 AND pr.code = $2`,
      [trimmedEmail, trimmedCode]
    );

    if (checkResult.rows.length === 0) return res.status(400).json({ error: 'неверный код подтверждения' });
    if (new Date() > new Date(checkResult.rows[0].expires_at)) return res.status(400).json({ error: 'срок действия кода истек' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, checkResult.rows[0].user_id]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [checkResult.rows[0].user_id]);

    res.json({ message: 'пароль успешно изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка смены пароля' });
  }
});

// каталог
app.get('/api/services', async (req, res) => {
  try {
    const { category, sort } = req.query;
    let queryText = `
      SELECT 
        s.service_id AS "serviceId",
        s.name AS "serviceName",
        s.description AS "serviceDescription",
        s.duration_minutes AS "durationMinutes",
        s.price AS "servicePrice",
        s.image_url AS "imageUrl",
        s.is_active AS "isActive",
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS "averageRating",
        COUNT(r.review_id) AS "reviewsCount"
      FROM services s
      JOIN categories c ON s.category_id = c.category_id
      LEFT JOIN reviews r ON s.service_id = r.service_id
      WHERE s.is_active = TRUE
    `;

    const queryParams = [];
    if (category && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND c.slug = $${queryParams.length}`;
    }

    queryText += ` GROUP BY s.service_id, c.name, c.slug`;
    if (sort === 'price_asc') queryText += ` ORDER BY s.price ASC`;
    else if (sort === 'price_desc') queryText += ` ORDER BY s.price DESC`;
    else queryText += ` ORDER BY s.service_id ASC`;

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка загрузки каталога' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id AS "categoryId", name, slug FROM categories ORDER BY category_id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка получения категорий' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        s.service_id AS "serviceId",
        s.name AS "serviceName",
        s.description AS "serviceDescription",
        s.duration_minutes AS "durationMinutes",
        s.price AS "servicePrice",
        s.image_url AS "imageUrl",
        s.is_active AS "isActive",
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS "averageRating",
        COUNT(r.review_id) AS "reviewsCount"
      FROM services s
      JOIN categories c ON s.category_id = c.category_id
      LEFT JOIN reviews r ON s.service_id = r.service_id
      WHERE s.service_id = $1
      GROUP BY s.service_id, c.name, c.slug`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'товар не найден' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка загрузки товара' });
  }
});

// корзина
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ci.cart_item_id AS "cartItemId",
        ci.quantity AS "quantity",
        s.service_id AS "serviceId",
        s.name AS "serviceName",
        s.price AS "unitPrice",
        s.image_url AS "imageUrl",
        s.duration_minutes AS "durationMinutes",
        c.name AS "categoryName",
        (ci.quantity * s.price) AS "itemTotal"
      FROM cart_items ci
      JOIN services s ON ci.service_id = s.service_id
      JOIN categories c ON s.category_id = c.category_id
      WHERE ci.user_id = $1
      ORDER BY ci.cart_item_id ASC`,
      [req.user.userId]
    );

    const items = result.rows;
    const totalAmount = items.reduce((acc, item) => acc + Number(item.itemTotal), 0);
    const totalItems = items.reduce((acc, item) => acc + Number(item.quantity), 0);

    res.json({ items, totalAmount: Number(totalAmount.toFixed(2)), totalItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка получения корзины' });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { serviceId, quantity = 1 } = req.body;
    const numQty = parseInt(quantity);

    if (!serviceId || isNaN(numQty) || numQty <= 0 || numQty > 99) return res.status(400).json({ error: 'количество от 1 до 99' });

    const checkService = await pool.query('SELECT service_id FROM services WHERE service_id = $1 AND is_active = TRUE', [serviceId]);
    if (checkService.rows.length === 0) return res.status(404).json({ error: 'товар не найден или не активен' });

    await pool.query(
      `INSERT INTO cart_items (user_id, service_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, service_id)
       DO UPDATE SET quantity = cart_items.quantity + $3`,
      [req.user.userId, serviceId, numQty]
    );

    res.json({ message: 'товар добавлен в корзину' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка при добавлении в корзину' });
  }
});

app.patch('/api/cart/:cartItemId', authenticateToken, async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const numQty = parseInt(quantity);

    if (isNaN(numQty) || numQty <= 0 || numQty > 99) return res.status(400).json({ error: 'количество от 1 до 99' });

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE cart_item_id = $2 AND user_id = $3 RETURNING cart_item_id',
      [numQty, cartItemId, req.user.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'позиция не найдена' });
    res.json({ message: 'количество обновлено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка обновления количества' });
  }
});

app.delete('/api/cart/:cartItemId', authenticateToken, async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const result = await pool.query(
      'DELETE FROM cart_items WHERE cart_item_id = $1 AND user_id = $2 RETURNING cart_item_id',
      [cartItemId, req.user.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'позиция не найдена' });
    res.json({ message: 'товар удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка удаления из корзины' });
  }
});

// заказы
app.post('/api/orders', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { deliveryAddress, deliveryDate } = req.body;
    const trimmedAddress = (deliveryAddress || '').trim();

    if (!trimmedAddress || !REGEX_ADDRESS.test(trimmedAddress)) {
      return res.status(400).json({ error: 'укажите корректный адрес доставки на русском языке' });
    }
    if (!/\d+/.test(trimmedAddress)) {
      return res.status(400).json({ error: 'в адресе обязательно укажите номер дома или строения' });
    }
    if (hasProfanity(trimmedAddress)) {
      return res.status(400).json({ error: 'недопустимые выражения в адресе доставки' });
    }

    if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      return res.status(400).json({ error: 'некорректный формат даты доставки' });
    }

    const selectedDate = new Date(deliveryDate);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime()) || selectedDate < currentDate) {
      return res.status(400).json({ error: 'дата доставки не может быть меньше текущей даты' });
    }

    await client.query('BEGIN');

    const cartResult = await client.query(
      `SELECT ci.service_id, ci.quantity, s.name, s.price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       WHERE ci.user_id = $1`,
      [req.user.userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ваша корзина пуста' });
    }

    const totalAmount = cartResult.rows.reduce(
      (sum, row) => sum + Number(row.price) * Number(row.quantity),
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, delivery_address, delivery_date, total_amount, status)
       VALUES ($1, $2, $3, $4, 'Новый')
       RETURNING order_id, delivery_address, delivery_date, total_amount, status, created_at`,
      [req.user.userId, trimmedAddress, deliveryDate, totalAmount]
    );

    const createdOrder = orderResult.rows[0];

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, service_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [createdOrder.order_id, item.service_id, item.quantity, item.price]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.userId]);

    const userResult = await client.query('SELECT first_name, email FROM users WHERE user_id = $1', [req.user.userId]);
    const customer = userResult.rows[0];

    await client.query('COMMIT');

    const itemsHtml = cartResult.rows
      .map(
        (it) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${it.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${it.quantity} шт.</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(Number(it.price) * it.quantity).toLocaleString('ru-RU')} ₽</td>
        </tr>`
      )
      .join('');

    sendEmailNotification(
      customer.email,
      `Заказ #${createdOrder.order_id} успешно оформлен! — SoundWave`,
      `<div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2b2d42; margin-top: 0;">Спасибо за ваш заказ! 🎸</h2>
        <p>Здравствуйте, <b>${customer.first_name}</b>!</p>
        <p>Ваш заказ <b>#${createdOrder.order_id}</b> передан на комплектацию.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 8px; text-align: left;">Наименование</th>
              <th style="padding: 8px; text-align: center;">Кол-во</th>
              <th style="padding: 8px; text-align: right;">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><b>Сумма к оплате:</b> <span style="font-size: 18px; color: #d90429;">${Number(totalAmount).toLocaleString('ru-RU')} ₽</span></p>
          <p style="margin: 5px 0;"><b>Адрес доставки:</b> ${createdOrder.delivery_address}</p>
          <p style="margin: 5px 0;"><b>Дата доставки:</b> ${new Date(createdOrder.delivery_date).toLocaleDateString('ru-RU')}</p>
          <p style="margin: 5px 0;"><b>Статус:</b> Новый</p>
        </div>
      </div>`
    );

    res.status(201).json({
      message: 'заказ успешно оформлен',
      order: {
        orderId: createdOrder.order_id,
        deliveryAddress: createdOrder.delivery_address,
        deliveryDate: createdOrder.delivery_date,
        totalAmount: Number(createdOrder.total_amount),
        status: createdOrder.status,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'ошибка сервера при оформлении заказа' });
  } finally {
    client.release();
  }
});

app.get('/api/orders/my', authenticateToken, async (req, res) => {
  try {
    const ordersResult = await pool.query(
      `SELECT 
        o.order_id AS "orderId",
        o.delivery_address AS "deliveryAddress",
        TO_CHAR(o.delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
        o.total_amount AS "totalAmount",
        o.status AS "status",
        TO_CHAR(o.created_at, 'DD.MM.YYYY HH24:MI') AS "orderDate"
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.order_id DESC`,
      [req.user.userId]
    );

    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await pool.query(
        `SELECT 
          oi.quantity AS "quantity",
          oi.unit_price AS "unitPrice",
          s.name AS "serviceName",
          s.image_url AS "imageUrl",
          c.name AS "categoryName"
        FROM order_items oi
        JOIN services s ON oi.service_id = s.service_id
        JOIN categories c ON s.category_id = c.category_id
        WHERE oi.order_id = $1`,
        [order.orderId]
      );

      orders.push({ ...order, items: itemsResult.rows });
    }

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка загрузки заказов' });
  }
});

// получение отзывов
app.get('/api/reviews/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const result = await pool.query(
      `SELECT 
        r.review_id AS "reviewId",
        r.user_id AS "userId",
        r.rating AS "rating",
        r.comment AS "comment",
        r.is_edited AS "isEdited",
        TO_CHAR(r.created_at, 'DD.MM.YYYY') AS "createdDate",
        CONCAT(u.first_name, ' ', SUBSTRING(u.last_name FROM 1 FOR 1), '.') AS "authorName"
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.service_id = $1
      ORDER BY r.review_id DESC`,
      [serviceId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка загрузки отзывов' });
  }
});

// добавление отзыва
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;
    const trimmedComment = (comment || '').trim();
    const numRating = parseInt(rating);

    if (!serviceId || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'оценка должна быть от 1 до 5' });
    }
    if (!trimmedComment || trimmedComment.length < 5 || trimmedComment.length > 500) {
      return res.status(400).json({ error: 'отзыв должен содержать от 5 до 500 символов' });
    }
    if (hasProfanity(trimmedComment)) {
      return res.status(400).json({ error: 'отзыв содержит недопустимые слова или оскорбления' });
    }

    await pool.query(
      `INSERT INTO reviews (service_id, user_id, rating, comment, is_edited)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [serviceId, req.user.userId, numRating, trimmedComment]
    );

    res.status(201).json({ message: 'отзыв опубликован' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка добавления отзыва' });
  }
});

// редактирование отзыва (ТОЛЬКО ДЛЯ АВТОРА ОТЗЫВА, админ менять чужой отзыв НЕ может)
app.put('/api/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const trimmedComment = (comment || '').trim();
    const numRating = parseInt(rating);

    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'оценка должна быть от 1 до 5' });
    }
    if (!trimmedComment || trimmedComment.length < 5 || trimmedComment.length > 500) {
      return res.status(400).json({ error: 'отзыв должен содержать от 5 до 500 символов' });
    }
    if (hasProfanity(trimmedComment)) {
      return res.status(400).json({ error: 'отзыв содержит недопустимые слова или оскорбления' });
    }

    const check = await pool.query('SELECT user_id FROM reviews WHERE review_id = $1', [reviewId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'отзыв не найден' });

    // строгое правило: только автор может менять текст отзыва
    if (Number(check.rows[0].user_id) !== Number(req.user.userId)) {
      return res.status(403).json({ error: 'редактировать отзыв может только его автор' });
    }

    await pool.query(
      `UPDATE reviews 
       SET rating = $1, comment = $2, is_edited = TRUE 
       WHERE review_id = $3`,
      [numRating, trimmedComment, reviewId]
    );

    res.json({ message: 'отзыв успешно изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка обновления отзыва' });
  }
});

// удаление отзыва 
app.delete('/api/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;

    const check = await pool.query('SELECT user_id FROM reviews WHERE review_id = $1', [reviewId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'отзыв не найден' });

    if (Number(check.rows[0].user_id) !== Number(req.user.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'нет прав на удаление чужого отзыва' });
    }

    await pool.query('DELETE FROM reviews WHERE review_id = $1', [reviewId]);
    res.json({ message: 'отзыв успешно удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка удаления отзыва' });
  }
});

// профиль
app.put('/api/profile/info', authenticateToken, async (req, res) => {
  try {
    const { lastName, firstName, patronymic = '', phone, defaultAddress = '' } = req.body;

    const trimmedLast = (lastName || '').trim();
    const trimmedFirst = (firstName || '').trim();
    const trimmedPatr = (patronymic || '').trim();
    const trimmedPhone = (phone || '').trim();
    const trimmedAddress = (defaultAddress || '').trim();

    if (!trimmedLast || !trimmedFirst || !trimmedPhone) {
      return res.status(400).json({ error: 'фамилия, имя и телефон обязательны' });
    }

    if (hasProfanity(trimmedLast) || hasProfanity(trimmedFirst) || hasProfanity(trimmedPatr) || hasProfanity(trimmedAddress)) {
      return res.status(400).json({ error: 'недопустимые слова или выражения в профиле' });
    }

    if (!REGEX_NAME.test(trimmedLast) || !REGEX_NAME.test(trimmedFirst)) {
      return res.status(400).json({ error: 'ФИО: только кириллица, максимум 2 слова' });
    }
    if (trimmedPatr && !REGEX_NAME.test(trimmedPatr)) {
      return res.status(400).json({ error: 'отчество: только кириллица, максимум 2 слова' });
    }
    if (!REGEX_PHONE.test(trimmedPhone)) {
      return res.status(400).json({ error: 'некорректный формат телефона' });
    }

    if (trimmedAddress) {
      if (!REGEX_ADDRESS.test(trimmedAddress)) {
        return res.status(400).json({ error: 'адрес должен содержать от 12 до 250 символов' });
      }
      if (!/\d+/.test(trimmedAddress)) {
        return res.status(400).json({ error: 'в адресе обязательно укажите номер дома или строения' });
      }
    }

    await pool.query(
      `UPDATE users 
       SET last_name = $1, first_name = $2, patronymic = $3, phone = $4, default_address = $5 
       WHERE user_id = $6`,
      [trimmedLast, trimmedFirst, trimmedPatr, trimmedPhone, trimmedAddress, req.user.userId]
    );

    res.json({ message: 'данные профиля обновлены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка обновления профиля' });
  }
});

app.put('/api/profile/email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const trimmedEmail = (newEmail || '').toLowerCase().trim();

    if (!trimmedEmail || !currentPassword) return res.status(400).json({ error: 'укажите новый email и пароль' });
    if (!REGEX_EMAIL.test(trimmedEmail)) return res.status(400).json({ error: 'некорректный формат email' });

    const userResult = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.userId]);
    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'неверный текущий пароль' });

    const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [trimmedEmail, req.user.userId]);
    if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'этот email уже зарегистрирован' });

    await pool.query('UPDATE users SET email = $1 WHERE user_id = $2', [trimmedEmail, req.user.userId]);
    res.json({ message: 'email успешно изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка смены email' });
  }
});

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'заполните старый и новый пароли' });
    if (newPassword.length < 6 || newPassword.length > 50) return res.status(400).json({ error: 'новый пароль от 6 до 50 символов' });

    const userResult = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.userId]);
    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'текущий пароль введен неверно' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, req.user.userId]);
    res.json({ message: 'пароль успешно изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка смены пароля' });
  }
});

// обратная связь
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').toLowerCase().trim();
    const trimmedSubject = (subject || '').trim();
    const trimmedMessage = (message || '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return res.status(400).json({ error: 'заполните все поля' });
    }

    if (hasProfanity(trimmedName) || hasProfanity(trimmedSubject) || hasProfanity(trimmedMessage)) {
      return res.status(400).json({ error: 'сообщение содержит недопустимые выражения или оскорбления' });
    }

    if (!REGEX_NAME.test(trimmedName)) return res.status(400).json({ error: 'имя: только кириллица, максимум 2 слова' });
    if (!REGEX_EMAIL.test(trimmedEmail)) return res.status(400).json({ error: 'некорректный email' });
    if (trimmedSubject.length < 3 || trimmedSubject.length > 150) return res.status(400).json({ error: 'тема от 3 до 150 символов' });
    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) return res.status(400).json({ error: 'сообщение от 10 до 2000 символов' });

    await pool.query(
      `INSERT INTO feedback_messages (user_name, user_email, subject, message)
       VALUES ($1, $2, $3, $4)`,
      [trimmedName, trimmedEmail, trimmedSubject, trimmedMessage]
    );

    await sendEmailNotification(
      process.env.ADMIN_NOTIFICATION_EMAIL || 'isip_a.d.bocharnikov@mpt.ru',
      `[Обращение с сайта] ${trimmedSubject}`,
      `<h3>Новое обращение</h3>
       <p><b>Имя:</b> ${trimmedName}</p>
       <p><b>Email:</b> ${trimmedEmail}</p>
       <p><b>Тема:</b> ${trimmedSubject}</p>
       <p><b>Сообщение:</b> ${trimmedMessage}</p>`
    );

    res.json({ message: 'обращение отправлено администрации' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка отправки обращения' });
  }
});

// админка
app.get('/api/admin/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.service_id AS "serviceId",
        s.name AS "serviceName",
        s.description AS "serviceDescription",
        s.duration_minutes AS "durationMinutes",
        s.price AS "servicePrice",
        s.image_url AS "imageUrl",
        s.is_active AS "isActive",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM services s
      JOIN categories c ON s.category_id = c.category_id
      ORDER BY s.service_id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка получения всех товаров' });
  }
});

app.post('/api/admin/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, durationMinutes = 0, price, imageUrl } = req.body;
    const trimmedName = (name || '').trim();
    const trimmedDesc = (description || '').trim();
    const numPrice = parseFloat(price);
    const numDur = parseInt(durationMinutes);

    if (!categoryId || !trimmedName || !trimmedDesc || isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'корректно заполните название, категорию, описание и цену' });
    }

    if (hasProfanity(trimmedName) || hasProfanity(trimmedDesc)) {
      return res.status(400).json({ error: 'недопустимые слова в названии или описании' });
    }

    const result = await pool.query(
      `INSERT INTO services (category_id, name, description, duration_minutes, price, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING service_id`,
      [categoryId, trimmedName, trimmedDesc, isNaN(numDur) ? 0 : numDur, numPrice, (imageUrl || '').trim() || '/images/products/fender-strat.jpg']
    );

    res.status(201).json({ message: 'товар добавлен', serviceId: result.rows[0].service_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка добавления товара' });
  }
});

app.put('/api/admin/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, durationMinutes = 0, price, imageUrl, isActive } = req.body;
    const trimmedName = (name || '').trim();
    const trimmedDesc = (description || '').trim();
    const numPrice = parseFloat(price);
    const numDur = parseInt(durationMinutes);

    if (!categoryId || !trimmedName || !trimmedDesc || isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'заполните поля корректно' });
    }

    if (hasProfanity(trimmedName) || hasProfanity(trimmedDesc)) {
      return res.status(400).json({ error: 'недопустимые слова в названии или описании' });
    }

    await pool.query(
      `UPDATE services 
       SET category_id = $1, name = $2, description = $3, duration_minutes = $4, price = $5, image_url = $6, is_active = $7
       WHERE service_id = $8`,
      [categoryId, trimmedName, trimmedDesc, isNaN(numDur) ? 0 : numDur, numPrice, (imageUrl || '').trim(), isActive, id]
    );

    res.json({ message: 'товар обновлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка обновления товара' });
  }
});

app.patch('/api/admin/services/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE services SET is_active = NOT is_active WHERE service_id = $1', [id]);
    res.json({ message: 'статус активности товара изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка переключения статуса товара' });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE services SET is_active = FALSE WHERE service_id = $1', [id]);
    res.json({ message: 'товар снят с публикации' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка удаления товара' });
  }
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.order_id AS "orderId",
        CONCAT(u.last_name, ' ', u.first_name, ' ', u.patronymic) AS "customerName",
        u.email AS "customerEmail",
        u.phone AS "customerPhone",
        o.delivery_address AS "deliveryAddress",
        TO_CHAR(o.delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
        o.total_amount AS "totalAmount",
        o.status AS "status",
        TO_CHAR(o.created_at, 'DD.MM.YYYY HH24:MI') AS "orderDate"
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.order_id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка получения всех заказов' });
  }
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'укажите новый статус' });

    await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
    res.json({ message: 'статус обновлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ошибка смены статуса' });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'сервер soundwave активен' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});