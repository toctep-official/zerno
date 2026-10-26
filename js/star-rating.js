(() => {
  // ---------- Звёздный рейтинг ----------
  // В разметке: <span class="star-rating" data-value="4.9"></span>
  // Необязательно: data-max="5", data-size="sm|md|lg", data-orientation="horizontal",
  // data-label="подпись", data-partial="false" — закрашивать только целые звёзды.
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.8l-6.4 3.5 1.4-7.2-5.3-5 7.2-.9z"/></svg>';

  const render = (el) => {
    const max = Math.max(1, Math.floor(Number(el.dataset.max) || 5));
    const value = Math.max(0, Math.min(Number(el.dataset.value) || 0, max));
    const partial = el.dataset.partial !== 'false';

    let stars = '';
    for (let i = 0; i < max; i++) {
      // Сколько закрасить у этой звезды: 4,9 → у пятой 90%
      const ratio = partial ? Math.max(0, Math.min(1, value - i)) : (value >= i + 1 ? 1 : 0);
      const fill = ratio > 0 ? `<span class="star-rating__fill" style="width:${ratio * 100}%">${STAR}</span>` : '';
      stars += `<span class="star-rating__star">${STAR}${fill}</span>`;
    }

    el.dataset.size ||= 'lg';
    el.dataset.orientation ||= 'vertical';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${value.toLocaleString('ru-RU')} из ${max}`);
    el.innerHTML = `<span class="star-rating__stars">${stars}</span>`
      + (el.dataset.label ? `<span class="star-rating__label">${el.dataset.label}</span>` : '');
  };

  document.querySelectorAll('.star-rating').forEach(render);
})();
