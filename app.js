/* ============================================================
   Конфигурация
   ============================================================ */
const DATA_URL = 'data/consoles.json';

/* ============================================================
   Состояние
   ============================================================ */
let ENTITIES = {};     // id -> entity
let SECTIONS = [];     // секции верхнего уровня
let ITEM_INDEX = {};   // тот же ENTITIES, для роутинга

/* ============================================================
   DOM
   ============================================================ */
const app = document.getElementById('app');
const headerTitle = document.getElementById('headerTitle');
const backBtn = document.getElementById('backBtn');
const toTopBtn = document.getElementById('toTopBtn');

/* ============================================================
   Утилиты
   ============================================================ */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeTag(t) {
  if (typeof t === 'string') return { text: t, tone: 'neutral' };
  return { text: t.text || '', tone: t.tone || 'neutral' };
}

function getRoute() {
  const hash = location.hash.replace(/^#\/?/, '').trim();
  return hash || null;
}

function buildIcon(icon, emoji, cover, sizeClass) {
  const el = document.createElement('div');
  el.className = sizeClass + (cover ? ' cover' : '');

  if (icon) {
    const img = document.createElement('img');
    img.src = icon;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => {
      el.innerHTML = '';
      el.textContent = emoji || '📦';
    };
    el.appendChild(img);
  } else {
    el.textContent = emoji || '📦';
  }

  return el;
}

/* ============================================================
   Загрузка данных
   ============================================================ */

async function loadData() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    ENTITIES = json.entities || {};
    SECTIONS = Array.isArray(json.sections) ? json.sections : [];
    ITEM_INDEX = ENTITIES;

    console.log('Загружено сущностей:', Object.keys(ENTITIES).length,
                'секций верхнего уровня:', SECTIONS.length);
  } catch (err) {
    console.error('Не удалось загрузить данные:', err);
    app.innerHTML = `<div class="loading">Не удалось загрузить данные.<br>${esc(err.message)}</div>`;
  }
}

/* ============================================================
   Роутинг
   ============================================================ */

function render() {
  const id = getRoute();

  if (id && ITEM_INDEX[id]) {
    renderDetail(ITEM_INDEX[id]);
    headerTitle.textContent = ITEM_INDEX[id].title || ITEM_INDEX[id].text || 'Без названия';
    backBtn.classList.add('visible');
  } else if (id) {
    renderNotFound(id);
    headerTitle.textContent = 'Не найдено';
    backBtn.classList.add('visible');
  } else {
    renderHome();
    headerTitle.textContent = 'Коллекция';
    backBtn.classList.remove('visible');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ============================================================
   Главная
   ============================================================ */

function renderHome() {
  const wrap = document.createElement('div');
  wrap.className = 'view';
  let delay = 0;

  SECTIONS.forEach(sec => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'section';

    const sHeader = document.createElement('div');
    sHeader.className = 'section-header';
    sHeader.style.animationDelay = `${delay}ms`;
    delay += 40;

    const ids = sec.items || [];
    sHeader.innerHTML = `
      <div class="section-title">${esc(sec.title || '')}</div>
      <div class="section-count">${ids.length}</div>
    `;
    sectionEl.appendChild(sHeader);

    const list = document.createElement('div');
    list.className = 'list';

    ids.forEach(id => {
      const item = ENTITIES[id];
      if (!item) return;

      const el = document.createElement('a');
      el.className = 'item';
      el.href = `#/${id}`;
      el.style.animationDelay = `${delay}ms`;
      delay += 40;

      el.appendChild(buildIcon(item.icon, item.emoji, item.cover, 'icon'));

      const body = document.createElement('div');
      body.className = 'item-body';
      body.innerHTML = `
        <div class="item-title">${esc(item.title || 'Без названия')}</div>
        <div class="item-sub">${esc(item.desc || '')}</div>
      `;
      el.appendChild(body);

      const chev = document.createElement('div');
      chev.className = 'chevron';
      chev.textContent = '›';
      el.appendChild(chev);

      list.appendChild(el);
    });

    sectionEl.appendChild(list);
    wrap.appendChild(sectionEl);
  });

  app.replaceChildren(wrap);
}

/* ============================================================
   Экран детали
   ============================================================ */

function renderDetail(item) {
  const wrap = document.createElement('div');
  wrap.className = 'view';

  // Шапка
  const header = document.createElement('div');
  header.className = 'detail-header';
  header.appendChild(buildIcon(item.icon, item.emoji, item.cover, 'icon icon-lg'));

  const hBody = document.createElement('div');
  hBody.innerHTML = `
    <div class="detail-title">${esc(item.title || item.text || 'Без названия')}</div>
    ${item.desc ? `<div class="detail-desc">${esc(item.desc)}</div>` : ''}
  `;
  header.appendChild(hBody);
  wrap.appendChild(header);

  // Секции внутри сущности
  let delay = 0;
  (item.sections || []).forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'section';

    const sHeader = document.createElement('div');
    sHeader.className = 'section-header';
    sHeader.style.animationDelay = `${delay}ms`;
    delay += 40;

    const ids = section.items || [];
    sHeader.innerHTML = `
      <div class="section-title">${esc(section.title || '')}</div>
      <div class="section-count">${ids.length}</div>
    `;
    sectionEl.appendChild(sHeader);

    const list = document.createElement('div');
    list.className = 'detail-list';

    ids.forEach(id => {
      const entry = ENTITIES[id];
      if (!entry) return;

      const el = document.createElement('div');
      el.className = 'detail-item';
      el.style.animationDelay = `${delay}ms`;
      delay += 30;

      const hasExtra =
        entry.comment ||
        (entry.tags && entry.tags.length) ||
        (entry.links && entry.links.length);
      if (hasExtra) el.classList.add('has-extra');
      if (entry.icon) el.classList.add('with-icon');

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'detail-item-body';

      if (entry.icon) {
        el.appendChild(buildIcon(entry.icon, entry.emoji, entry.cover, 'icon'));
      }

      // Заголовок
      const title = document.createElement('div');
      title.className = 'detail-item-title';
      const label = entry.text || entry.title || '';
      if (entry.url) {
        const a = document.createElement('a');
        a.href = entry.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        title.appendChild(a);
      } else {
        title.textContent = label;
      }
      bodyWrap.appendChild(title);

      // Комментарий
      if (entry.comment) {
        const c = document.createElement('div');
        c.className = 'detail-item-comment';
        c.textContent = entry.comment;
        bodyWrap.appendChild(c);
      }

      // Теги
      if (entry.tags && entry.tags.length) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'detail-item-tags';
        entry.tags.forEach(t => {
          const tag = normalizeTag(t);
          const span = document.createElement('span');
          span.className = `tag ${tag.tone}`;
          span.textContent = tag.text;
          tagsWrap.appendChild(span);
        });
        bodyWrap.appendChild(tagsWrap);
      }

      // Ссылки
      if (entry.links && entry.links.length) {
        const linksWrap = document.createElement('div');
        linksWrap.className = 'detail-item-links';

        entry.links.forEach(link => {
          const a = document.createElement('a');
          a.className = 'link-card';
          a.href = link.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';

          a.innerHTML = `
            <div class="link-icon">↗</div>
            <div class="link-body">
              <div class="link-text">${esc(link.text || '')}</div>
              ${link.comment ? `<div class="link-comment">${esc(link.comment)}</div>` : ''}
            </div>
          `;
          linksWrap.appendChild(a);
        });

        bodyWrap.appendChild(linksWrap);
      }

      // Если у сущности есть вложенные sections — ссылка на отдельный экран
      if (entry.sections && entry.sections.length) {
        const a = document.createElement('a');
        a.className = 'link-card';
        a.href = `#/${id}`;
        a.style.marginTop = '10px';
        a.innerHTML = `
          <div class="link-icon">›</div>
          <div class="link-body">
            <div class="link-text">Открыть: ${esc(entry.title || entry.text || '')}</div>
            <div class="link-comment">Содержит ${entry.sections.length} секц.</div>
          </div>
        `;
        bodyWrap.appendChild(a);
      }

      el.appendChild(bodyWrap);
      list.appendChild(el);
    });

    sectionEl.appendChild(list);
    wrap.appendChild(sectionEl);
  });

// Карта стеллажа (только для боксов с валидным shelf)
  if (item.type === 'box' && item.shelf >= 1 && item.shelf <= 24) {
    const shelfBlock = document.createElement('div');
    shelfBlock.className = 'shelf-block';
    shelfBlock.innerHTML = `
      <div class="shelf-block-title">Стеллаж — ячейка ${item.shelf}</div>
      <div class="shelf-map">
        ${Array.from({ length: 24 }, (_, i) => {
          const n = i + 1;
          const cls = n === item.shelf ? 'shelf-cell active' : 'shelf-cell';
          return `<div class="${cls}">${n}</div>`;
        }).join('')}
      </div>
    `;
    wrap.appendChild(shelfBlock);
  }

  app.replaceChildren(wrap);
}

/* ============================================================
   Not found
   ============================================================ */

function renderNotFound(id) {
  const wrap = document.createElement('div');
  wrap.className = 'view not-found';
  wrap.innerHTML = `
    <div class="big">🤔</div>
    <div>Пункт «${esc(id)}» не найден</div>
  `;
  app.replaceChildren(wrap);
}

/* ============================================================
   Кнопка "наверх"
   ============================================================ */

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const route = getRoute();
    const show = window.scrollY > 300 && route && ITEM_INDEX[route];
    toTopBtn.classList.toggle('visible', !!show);
    ticking = false;
  });
}, { passive: true });

toTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================================================
   События
   ============================================================ */

window.addEventListener('hashchange', render);
backBtn.addEventListener('click', () => { location.hash = ''; });

/* ============================================================
   Старт
   ============================================================ */

(async function init() {
  app.innerHTML = '<div class="loading">Загрузка…</div>';
  await loadData();
  render();
})();
