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

  // Карточки раскладываются по «золотому углу», чтобы не наезжали друг на друга
  const cards = [...section.querySelectorAll('.tunnel__card')].map((el, i) => {
    const angle = i * 137.5 * Math.PI / 180;
    el.style.zIndex = i + 1;
    return {
      el,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      rx: 0.28 + (i % 3) * 0.08,
      ry: 0.26 + (i % 2) * 0.09,
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

  const readStage = () => ({ w: innerWidth, h: innerHeight, mobile: innerWidth < 768 });
  let stage = readStage();
  addEventListener('resize', () => { stage = readStage(); });

  // Мышь чуть сдвигает «камеру»
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  // Прогресс полёта 0…1 — насколько прокручена секция
  const rawProgress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  const smooth = { p: rawProgress(), x: 0, y: 0 };
  const SPAN = 0.55; // какую часть полёта летит одна карточка
  const LEAD = 0.2;  // туннель — первый экран: первые фото уже в пути, когда сайт открылся

  const render = () => {
    const p = smooth.p;
    const farZ = stage.mobile ? -1200 : -1700;
    const nearZ = stage.mobile ? 350 : 500;
    const cardW = stage.mobile ? clamp(stage.w * 0.38, 130, 180) : clamp(stage.w * 0.18, 180, 270);
    const pan = stage.mobile ? 20 : 45;

    for (const c of cards) {
      const start = -LEAD + (c.index / cards.length) * (1 - SPAN + LEAD);
      const local = clamp((p - start) / SPAN);
      const z = farZ + (nearZ - farZ) * local;
      const x = c.cos * stage.w * c.rx - smooth.x * pan;
      const y = c.sin * stage.h * c.ry - smooth.y * pan;
      c.el.style.width = cardW + 'px';
      c.el.style.opacity = map(local, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);
      c.el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateZ(${c.rot}deg)`;
    }

    title.style.transform = `scale(${map(p, [0, 1], [1, 1.35])})`;
    title.style.opacity = map(p, [0, 0.8, 1], [1, 1, 0]);
    hint.style.opacity = map(p, [0, 0.12], [1, 0]);
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
