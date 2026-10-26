// События-тарифы: переключатель «Разово / Абонемент», плавная смена цен и конфетти.
// По мотивам 21st.dev/@Codehagen/components/pricing, но без React и библиотек.
(() => {
  const sw = document.getElementById('billing-switch');
  if (!sw) return;

  const labelOnce = document.getElementById('billing-once');
  const labelSub = document.getElementById('billing-sub');
  const prices = document.querySelectorAll('#events .price');
  const totals = document.querySelectorAll('#events .plan__total');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fmt = new Intl.NumberFormat('ru-RU');

  // Цена «докручивается» от старого числа к новому за 0,6 с
  const animate = (el, to) => {
    const from = Number(el.dataset.current || el.dataset.once);
    el.dataset.current = to;
    if (calm.matches) { el.textContent = fmt.format(to); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 600, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt.format(Math.round(from + (to - from) * ease));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Конфетти вылетает из переключателя — как в референсе при выборе годовой оплаты
  const COLORS = ['#F2C94C', '#FFFCF5', '#8C97BF', '#2F7A4B'];
  const confetti = () => {
    if (calm.matches) return;
    const box = sw.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    for (let i = 0; i < 36; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti';
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      bit.style.background = COLORS[i % COLORS.length];
      document.body.append(bit);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 60;
      bit.animate([
        { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: .6 },
        { transform: `translate(${dx * 1.2}px, ${dy + 140}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2, .7, .3, 1)' })
        .finished.then(() => bit.remove());
    }
  };

  const setBilling = (sub) => {
    if ((sw.getAttribute('aria-checked') === 'true') === sub) return;
    sw.setAttribute('aria-checked', String(sub));
    labelOnce.classList.toggle('is-active', !sub);
    labelSub.classList.toggle('is-active', sub);
    prices.forEach((el) => animate(el, Number(sub ? el.dataset.sub : el.dataset.once)));
    totals.forEach((el) => {
      el.textContent = sub ? `${fmt.format(el.dataset.subTotal)} ₽ за 4 занятия` : 'Разовое посещение';
    });
    if (sub) confetti();
  };

  labelOnce.classList.add('is-active');
  sw.addEventListener('click', () => setBilling(sw.getAttribute('aria-checked') !== 'true'));
  labelOnce.addEventListener('click', () => setBilling(false));
  labelSub.addEventListener('click', () => setBilling(true));
})();
