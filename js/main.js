(() => {
  // ---------- Настройки кофейни: меняйте под клиента ----------
  const TIMEZONE = 'Europe/Moscow';
  const HOURS = { weekday: [8, 22], weekend: [9, 23] }; // [открытие, закрытие], часы
  const ROAST_WEEKDAY = 4; // четверг: 0 — вс, 1 — пн … 6 — сб

  // Текущее время в часовом поясе кофейни, чтобы статус был верным из любого города
  const nowLocal = () => new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));

  // ---------- Шапка ----------
  const header = document.querySelector('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Меню на телефоне ----------
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const setNav = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  // ---------- Открыто или закрыто ----------
  const status = document.getElementById('open-status');
  const hoursFor = (d) => (d.getDay() === 0 || d.getDay() === 6 ? HOURS.weekend : HOURS.weekday);
  const updateStatus = () => {
    const now = nowLocal();
    const [open, close] = hoursFor(now);
    const h = now.getHours() + now.getMinutes() / 60;
    if (h >= open && h < close) {
      status.textContent = `Открыто до ${close}:00`;
      status.classList.add('is-open');
    } else {
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      status.textContent = h < open
        ? `Откроемся в ${open}:00`
        : `Откроемся завтра в ${hoursFor(tomorrow)[0]}:00`;
      status.classList.remove('is-open');
    }
    status.hidden = false;
  };
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  // ---------- Дата последней обжарки на этикетке ----------
  const roastDate = document.getElementById('roast-date');
  const lastRoast = nowLocal();
  lastRoast.setDate(lastRoast.getDate() - ((lastRoast.getDay() - ROAST_WEEKDAY + 7) % 7));
  roastDate.textContent = lastRoast.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  // ---------- Вкладки меню (стрелками тоже переключаются) ----------
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  // ---------- Форма бронирования ----------
  const form = document.getElementById('booking-form');
  const done = document.getElementById('form-done');
  const dateInput = form.elements.date;
  const today = nowLocal();
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  dateInput.min = isoDate(today);
  dateInput.value = isoDate(today);

  // Маска телефона: +7 900 000-00-00
  const phoneInput = form.elements.phone;
  const phoneDigits = () => {
    let d = phoneInput.value.replace(/\D/g, '');
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    return d.slice(0, 10);
  };
  phoneInput.addEventListener('input', () => {
    const d = phoneDigits();
    if (!d) { phoneInput.value = ''; return; }
    const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
    phoneInput.value = '+7 ' + parts[0]
      + (parts[1] ? ' ' + parts[1] : '')
      + (parts[2] ? '-' + parts[2] : '')
      + (parts[3] ? '-' + parts[3] : '');
  });

  const checks = {
    name: () => form.elements.name.value.trim() ? '' : 'Укажите имя, чтобы мы знали, как к вам обращаться.',
    phone: () => phoneDigits().length === 10 ? '' : 'Укажите телефон: 10 цифр после +7.',
    date: () => {
      if (!dateInput.value) return 'Выберите дату.';
      return dateInput.value < dateInput.min ? 'Эта дата уже прошла, выберите сегодня или позже.' : '';
    },
    time: () => {
      const t = form.elements.time.value;
      if (!t) return 'Выберите время.';
      const [open, close] = hoursFor((dateInput.value ? new Date(dateInput.value + 'T12:00') : today));
      const h = Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60;
      return h >= open && h <= close - 0.5 ? '' : `В этот день мы работаем с ${open}:00 до ${close}:00. Бронь — не позже ${close - 1}:30.`;
    },
    consent: () => form.elements.consent.checked ? '' : 'Отметьте согласие, без него мы не сможем перезвонить.',
  };

  const showError = (name, message) => {
    const input = form.elements[name];
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    const err = document.getElementById(`f-${name}-err`);
    err.textContent = message;
    if (message) input.setAttribute('aria-describedby', err.id);
  };

  Object.keys(checks).forEach((name) => {
    const input = form.elements[name];
    // Ошибку показываем после ухода из поля, а убираем сразу, как только поле исправлено
    input.addEventListener('blur', () => { if (input.value) showError(name, checks[name]()); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showError(name, checks[name]()); });
    input.addEventListener('change', () => { if (input.getAttribute('aria-invalid') === 'true') showError(name, checks[name]()); });
  });

  // Заглушка отправки. Для настоящего сайта: Телеграм-бот, почта или CRM клиента.
  const sendBooking = (data) => new Promise((resolve) => setTimeout(() => resolve(data), 700));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let firstInvalid = null;
    Object.entries(checks).forEach(([name, check]) => {
      const message = check();
      showError(name, message);
      if (message && !firstInvalid) firstInvalid = form.elements[name];
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Бронируем…';

    const data = Object.fromEntries(new FormData(form));
    await sendBooking(data);

    const day = new Date(data.date + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    done.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = `Столик забронирован на ${day}, ${data.time}`;
    const text = document.createElement('span');
    text.textContent = `Позвоним на ${data.phone} в течение 15 минут, чтобы подтвердить. Гостей: ${data.guests}.`;
    done.append(title, text);
    done.focus();

    form.reset();
    dateInput.value = isoDate(today);
    button.disabled = false;
    button.textContent = 'Забронировать столик';
  });

  // ---------- События: ближайшая дата и запись через форму брони ----------
  document.querySelectorAll('.event__date[data-weekday]').forEach((el) => {
    const weekday = Number(el.dataset.weekday);
    const [hh, mm] = el.dataset.time.split(':').map(Number);
    const now = nowLocal();
    const next = new Date(now);
    next.setDate(now.getDate() + ((weekday - now.getDay() + 7) % 7));
    next.setHours(hh, mm, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 7); // сегодняшнее уже началось — берём следующую неделю
    const day = next.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
    el.textContent = `Ближайший: ${day}, ${el.dataset.time}`;
    el.dataset.date = isoDate(next);
  });

  // Кнопка «Записаться» у события заполняет комментарий и дату в форме брони
  document.querySelectorAll('[data-event]').forEach((link) => {
    link.addEventListener('click', () => {
      const date = link.closest('.event')?.querySelector('[data-date]')?.dataset.date;
      form.elements.comment.value = link.dataset.event;
      if (date) {
        dateInput.value = date;
        form.elements.time.value = link.closest('.event').querySelector('[data-time]').dataset.time;
      }
    });
  });

  // ---------- Появление блоков при прокрутке ----------
  const revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    // Карточки в одном ряду появляются друг за другом
    revealed.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      if (siblings.length > 1) el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 5) * 0.08}s`);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealed.forEach((el) => observer.observe(el));
  } else {
    revealed.forEach((el) => el.classList.add('is-visible'));
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
