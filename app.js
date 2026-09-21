/* ============================================================
   Конфигурация
   ============================================================ */
const DATA_URL = 'data/consoles.json';

/* ============================================================
   Состояние
   ============================================================ */
let DATA = {};
let ITEM_INDEX = {}; // плоский индекс: id -> item

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
  return String(s)
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
    DATA = await res.json();

    // Строим плоский индекс id -> item
    ITEM_INDEX = {};
    Object.entries(DATA).forEach(([id, item]) => {
      ITEM_INDEX[id] = item;
    });
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
    headerTitle.textContent = ITEM_INDEX[id].title;
    backBtn.classList.add('visible');
  } else if (id) {
    renderNotFound(id);
    headerTitle.textContent = 'Не найдено';
    backBtn.classList.add('visible');
  } else {
    renderList();
    headerTitle.textContent = 'Консоли';
    backBtn.classList.remove('visible');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ============================================================
   Главный список
   ============================================================ */

function renderList() {
  const wrap = document.createElement('div');
  wrap.className = 'view';
  const list = document.createElement('div');
  list.className = 'list';

  Object.entries(DATA).forEach(([id, item], i) => {
    const el = document.createElement('a');
    el.className = 'item';
    el.href = `#/${id}`;
    el.style.animationDelay = `${i * 40}ms`;

    el.appendChild(buildIcon(item.icon, item.emoji, item.cover, 'icon'));

    const body = document.createElement('div');
    body.className = 'item-body';
    body.innerHTML = `
      <div class="item-title">${esc(item.title)}</div>
      <div class="item-sub">${esc(item.desc)}</div>
    `;
    el.appendChild(body);

    const chev = document.createElement('div');
    chev.className = 'chevron';
    chev.textContent = '›';
    el.appendChild(chev);

    list.appendChild(el);
  });

  wrap.appendChild(list);
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
    <div class="detail-title">${esc(item.title)}</div>
    <div class="detail-desc">${esc(item.desc)}</div>
  `;
  header.appendChild(hBody);
  wrap.appendChild(header);

  // Секции
  let delay = 0;
  item.sections.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'section';

    const sHeader = document.createElement('div');
    sHeader.className = 'section-header';
    sHeader.style.animationDelay = `${delay}ms`;
    delay += 40;
    sHeader.innerHTML = `
      <div class="section-title">${esc(section.title)}</div>
      <div class="section-count">${section.items.length}</div>
    `;
    sectionEl.appendChild(sHeader);

    const list = document.createElement('div');
    list.className = 'detail-list';

    section.items.forEach(entry => {
      const el = document.createElement('div');
      el.className = 'detail-item';
      el.style.animationDelay = `${delay}ms`;
      delay += 30;

      const hasExtra = entry.comment || (entry.tags && entry.tags.length);
      if (hasExtra) el.classList.add('has-extra');
      if (entry.icon) el.classList.add('with-icon');

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'detail-item-body';

      if (entry.icon) {
        el.appendChild(buildIcon(entry.icon, entry.emoji, entry.cover, 'icon'));
      }

      const title = document.createElement('div');
      title.className = 'detail-item-title';
      if (entry.url) {
        const a = document.createElement('a');
        a.href = entry.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = entry.text;
        title.appendChild(a);
      } else {
        title.textContent = entry.text;
      }
      bodyWrap.appendChild(title);

      if (entry.comment) {
        const c = document.createElement('div');
        c.className = 'detail-item-comment';
        c.textContent = entry.comment;
        bodyWrap.appendChild(c);
      }

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

      el.appendChild(bodyWrap);
      list.appendChild(el);
    });

    sectionEl.appendChild(list);
    wrap.appendChild(sectionEl);
  });

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
