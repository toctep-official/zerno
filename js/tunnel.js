(() => {
  // ---------- Туннель из фото: камера летит сквозь кофейню при прокрутке ----------
  const section = document.getElementById('top');
  if (!section) return;
  const title = document.getElementById('tunnel-title');
  const hint = document.getElementById('tunnel-hint');

  // Без анимаций показываем обычную сетку фото
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.classList.add('tunnel--static');
    return;
  }

  // Карточки разлетаются в разные стороны по «золотому углу», чтобы не наезжали друг на друга
  const cards = [...section.querySelectorAll('.tunnel__card')].map((el, i) => {
    const angle = i * 137.5 * Math.PI / 180;
    el.style.zIndex = i + 1;
    return {
      el,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      drift: 1 + (i % 3) * 0.2,
      rot: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
      index: i,
    };
  });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // Переводит v из точек input в точки output по прямым между ними
  const map = (v, input, output) => {
    if (v <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) {
      if (v <= input[i]) {
        const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
        return output[i - 1] + (output[i] - output[i - 1]) * t;
      }
    }
    return output[output.length - 1];
  };

  // Размеры экрана и надписи. Надпись меряем без масштаба, масштаб учитываем при расчёте
  const readStage = () => ({
    w: innerWidth, h: innerHeight, mobile: innerWidth < 768,
    titleW: title.offsetWidth, titleH: title.offsetHeight,
  });
  let stage = readStage();
  addEventListener('resize', () => { stage = readStage(); });
  addEventListener('load', () => { stage = readStage(); });

  // Мышь чуть сдвигает «камеру»
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // Прогресс полёта 0…1 за 1,7 экрана прокрутки. Первый экран выезжает снизу примерно с 0,5
  // и наезжает на туннель как шторка (см. .hero в style.css) — последние карточки долетают уже под ним
  const rawProgress = () => clamp(-section.getBoundingClientRect().top / (innerHeight * 1.7));

  const smooth = { p: rawProgress(), x: 0, y: 0 };
  const SPAN = 0.5; // какую часть полёта летит одна карточка
  const PERSPECTIVE = 1200; // как perspective у .tunnel__stage
  const GAP = 24; // зазор между карточкой и надписью

  const render = () => {
    const p = smooth.p;
    const farZ = stage.mobile ? -1200 : -1700;
    const nearZ = stage.mobile ? 350 : 500;
    const cardW = stage.mobile ? clamp(stage.w * 0.38, 130, 180) : clamp(stage.w * 0.18, 180, 270);
    const pan = stage.mobile ? 20 : 45;
    const titleScale = map(p, [0, 1], [1, 1.25]);

    for (const c of cards) {
      // Первая карточка стартует с началом прокрутки: при открытии сайта видно только название
      const start = (c.index / cards.length) * (1 - SPAN);
      const local = clamp((p - start) / SPAN);
      const z = farZ + (nearZ - farZ) * local;
      // Насколько перспектива уменьшает карточку на этой глубине
      const k = PERSPECTIVE / (PERSPECTIVE - z);
      // Карточка всегда снаружи прямоугольника надписи: её центр отодвинут
      // на половину надписи + половину самой карточки + зазор
      const halfW = (stage.titleW * titleScale + cardW * k) / 2 + GAP;
      const halfH = (stage.titleH * titleScale + cardW * 1.25 * k) / 2 + GAP;
      const edge = Math.min(halfW / Math.abs(c.cos || 1e-6), halfH / Math.abs(c.sin || 1e-6));
      // По мере приближения карточка ещё и уходит наружу — пролетает мимо «камеры»
      const dist = edge + local * Math.min(stage.w, stage.h) * 0.35 * c.drift;
      // Считали положение на экране, а сдвиг задаётся в глубине — делим на k
      const x = (c.cos * dist - smooth.x * pan) / k;
      const y = (c.sin * dist - smooth.y * pan) / k;
      c.el.style.width = cardW + 'px';
      c.el.style.opacity = map(local, [0, 0.15, 0.85, 0.98], [0, 1, 1, 0]);
      c.el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateZ(${c.rot}deg)`;
    }

    title.style.transform = `scale(${titleScale})`;
    title.style.opacity = map(p, [0, 0.33, 0.5], [1, 1, 0]);
    hint.style.opacity = map(p, [0, 0.06], [1, 0]);
  };

  // Анимация крутится, только пока секция на экране
  let visible = false;
  let running = false;
  const frame = () => {
    // Плавное догоняние вместо пружин
    smooth.p += (rawProgress() - smooth.p) * 0.1;
    smooth.x += (pointer.x - smooth.x) * 0.06;
    smooth.y += (pointer.y - smooth.y) * 0.06;
    render();
    if (visible) requestAnimationFrame(frame);
    else running = false;
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  }).observe(section);

  render();
})();
