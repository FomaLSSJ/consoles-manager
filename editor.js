/* ============================================================
   Редактор коллекции
   ============================================================ */

const DATA_URL = 'data/consoles.json';

let DATA = {
  entities: {},
  sections: []
};

let selectedEntityId = null;
let _selectedTopSection = null;

/* ---------- Справочник типов ---------- */
const ENTITY_TYPES = [
  { id: '',          label: '— без типа —', icon: '·',  color: 'etc' },
  { id: 'box',       label: 'Бокс',         icon: '📦', color: 'box' },
  { id: 'console',   label: 'Консоль',      icon: '🎮', color: 'console' },
  { id: 'game',      label: 'Игра',         icon: '🕹️', color: 'game' },
  { id: 'gamepad',   label: 'Геймпад',      icon: '🎯', color: 'gamepad' },
  { id: 'accessory', label: 'Аксессуар',    icon: '🔌', color: 'accessory' },
  { id: 'cable',     label: 'Кабель',       icon: '🔗', color: 'cable' },
  { id: 'cartridge', label: 'Картридж',     icon: '💾', color: 'cartridge' },
  { id: 'tool',      label: 'Инструмент',   icon: '🔧', color: 'tool' },
  { id: 'etc',       label: 'Другое',       icon: '📎', color: 'etc' }
];

function typeInfo(typeId) {
  return ENTITY_TYPES.find(t => t.id === typeId)
      || ENTITY_TYPES.find(t => t.id === 'etc');
}

/* ---------- DOM ---------- */
const topSectionsEl  = document.getElementById('topSections');
const entityListEl   = document.getElementById('entityList');
const contentEl      = document.getElementById('content');
const entitySearchEl = document.getElementById('entitySearch');
const typeFilterEl   = document.getElementById('entityTypeFilter');
const toastEl        = document.getElementById('toast');

/* ---------- Утилиты ---------- */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function el(tag, className = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function toast(msg, isErr = false) {
  toastEl.textContent = msg;
  toastEl.className = 'toast visible' + (isErr ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toastEl.className = 'toast' + (isErr ? ' err' : '');
  }, 2400);
}

function uid(prefix = 'id') {
  let i = 1;
  while (DATA.entities[`${prefix}-${i}`]) i++;
  return `${prefix}-${i}`;
}

/* ---------- Загрузка ---------- */

async function loadFromUrl() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    if (!DATA.entities) DATA.entities = {};
    if (!Array.isArray(DATA.sections)) DATA.sections = [];
    selectedEntityId = null;
    _selectedTopSection = null;
    renderAll();
    toast('JSON загружен с сайта');
  } catch (err) {
    toast('Ошибка загрузки: ' + err.message, true);
  }
}

function loadFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);
      if (!json.entities) json.entities = {};
      if (!Array.isArray(json.sections)) json.sections = [];
      DATA = json;
      selectedEntityId = null;
      _selectedTopSection = null;
      renderAll();
      toast('Файл загружен');
    } catch (err) {
      toast('Некорректный JSON: ' + err.message, true);
    }
  };
  reader.readAsText(file, 'utf-8');
}

/* ---------- Скачивание ---------- */

function download() {
  const clean = cleanData(DATA);
  const blob = new Blob([JSON.stringify(clean, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'consoles.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Файл сохранён');
}

function cleanData(obj) {
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) {
      const v = obj[k];
      if (v === null || v === undefined) continue;
      out[k] = cleanData(v);
    }
    return out;
  }
  return obj;
}

/* ============================================================
   Фильтр типов
   ============================================================ */

function fillTypeFilter() {
  if (!typeFilterEl) return;
  const current = typeFilterEl.value;
  typeFilterEl.replaceChildren();

  ENTITY_TYPES.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.id ? `${t.icon} ${t.label}` : 'Все типы';
    typeFilterEl.appendChild(o);
  });

  typeFilterEl.value = current;
}

/* ============================================================
   Сайдбар
   ============================================================ */

function renderTopSections() {
  topSectionsEl.replaceChildren();

  DATA.sections.forEach((sec, i) => {
    const itemEl = el('div', 'ed-item' + (i === _selectedTopSection ? ' active' : ''));
    itemEl.innerHTML = `<div class="ed-item-id">${esc(sec.title || '(без названия)')}</div>`;
    itemEl.onclick = () => selectTopSection(i);
    topSectionsEl.appendChild(itemEl);
  });
}

function renderEntityList() {
  entityListEl.replaceChildren();

  const filterText = entitySearchEl.value.trim().toLowerCase();
  const filterType = typeFilterEl?.value || '';

  const all = Object.entries(DATA.entities).filter(([id, ent]) => {
    if (filterText) {
      const title = (ent.title || ent.text || '').toLowerCase();
      if (!id.toLowerCase().includes(filterText) && !title.includes(filterText)) return false;
    }
    if (filterType && (ent.type || '') !== filterType) return false;
    return true;
  });

  const groups = {};
  all.forEach(([id, ent]) => {
    const t = ent.type || '';
    if (!groups[t]) groups[t] = [];
    groups[t].push([id, ent]);
  });

  ENTITY_TYPES.forEach(typeDef => {
    const list = groups[typeDef.id];
    if (!list || !list.length) return;

    list.sort(([a], [b]) => a.localeCompare(b));

    const groupEl = el('div', 'ed-group');
    groupEl.innerHTML = `
      <div class="ed-group-title">
        <span>${typeDef.icon}</span>
        <span>${esc(typeDef.label)}</span>
        <span class="ed-group-count">${list.length}</span>
      </div>
    `;

    const itemsWrap = el('div', 'ed-list');
    list.forEach(([id, ent]) => {
      const itemEl = el('div', 'ed-item' + (id === selectedEntityId ? ' active' : ''));
      const title = ent.title || ent.text || '';
      itemEl.innerHTML = `
        <div class="ed-item-id">${esc(id)}</div>
        ${title ? `<div class="ed-item-title">${esc(title)}</div>` : ''}
      `;
      itemEl.onclick = () => selectEntity(id);
      itemsWrap.appendChild(itemEl);
    });

    groupEl.appendChild(itemsWrap);
    entityListEl.appendChild(groupEl);
  });

  if (!all.length) {
    const empty = el('div', 'ed-placeholder');
    empty.textContent = 'Ничего не найдено';
    empty.style.padding = '20px 0';
    entityListEl.appendChild(empty);
  }
}

function renderAll() {
  renderTopSections();
  renderEntityList();
  renderContent();
}

/* ============================================================
   Выбор
   ============================================================ */

function selectTopSection(i) {
  _selectedTopSection = i;
  selectedEntityId = null;
  renderTopSections();
  renderEntityList();
  renderContent();
}

function selectEntity(id) {
  selectedEntityId = id;
  _selectedTopSection = null;
  renderTopSections();
  renderEntityList();
  renderContent();
}

/* ============================================================
   Контент
   ============================================================ */

function renderContent() {
  if (selectedEntityId) {
    renderEntityEditor(selectedEntityId);
  } else if (_selectedTopSection !== null) {
    renderTopSectionEditor(_selectedTopSection);
  } else {
    contentEl.innerHTML = '<div class="ed-placeholder">Выберите сущность или секцию слева, либо загрузите JSON сверху.</div>';
  }
}

/* ============================================================
   Редактор секции верхнего уровня
   ============================================================ */

function renderTopSectionEditor(i) {
  const sec = DATA.sections[i];
  if (!sec) { renderContent(); return; }

  contentEl.replaceChildren();
  const wrap = el('div');

  const head = el('div', 'ed-section');
  head.innerHTML = `
    <div class="ed-section-title">Секция верхнего уровня #${i + 1}</div>
    <div class="ed-field">
      <label>Заголовок</label>
      <input class="ed-input" id="secTitle" value="${esc(sec.title || '')}">
    </div>
  `;
  head.querySelector('#secTitle').oninput = e => {
    sec.title = e.target.value;
    renderTopSections();
  };
  wrap.appendChild(head);

  const itemsBlock = el('div', 'ed-section');
  itemsBlock.innerHTML = `
    <div class="ed-section-title">
      Пункты (ссылки на сущности)
      <button class="ed-btn small" id="addItem">+ добавить</button>
    </div>
  `;

  if (!Array.isArray(sec.items)) sec.items = [];

  const list = el('div', '');
  sec.items.forEach((itemId, idx) => {
    list.appendChild(buildItemRow(sec, idx, itemId));
  });
  itemsBlock.appendChild(list);

  itemsBlock.querySelector('#addItem').onclick = () => {
    sec.items.push('');
    renderContent();
  };

  wrap.appendChild(itemsBlock);

  const controls = el('div', 'ed-section');
  const delBtn = el('button', 'ed-btn danger');
  delBtn.textContent = 'Удалить секцию';
  delBtn.onclick = () => {
    if (!confirm(`Удалить секцию «${sec.title}»?`)) return;
    DATA.sections.splice(i, 1);
    _selectedTopSection = null;
    renderAll();
    toast('Секция удалена');
  };
  controls.appendChild(delBtn);
  wrap.appendChild(controls);

  contentEl.appendChild(wrap);
}

/* ============================================================
   Строка пункта
   ============================================================ */

function buildItemRow(parent, idx, itemId) {
  const row = el('div', 'sub-block');
  row.innerHTML = `
    <div class="sub-block-header">
      <span class="drag-handle">⋮⋮</span>
      <div class="combo-slot"></div>
      <button class="ed-btn small" data-up>↑</button>
      <button class="ed-btn small" data-down>↓</button>
      <button class="ed-btn small danger" data-del>✕</button>
    </div>
  `;

  const combo = buildEntityCombo(parent.items[idx], newId => {
    parent.items[idx] = newId;
    renderEntityList();
  });
  row.querySelector('.combo-slot').replaceWith(combo);

  row.querySelector('[data-up]').onclick = () => {
    if (idx === 0) return;
    [parent.items[idx - 1], parent.items[idx]] = [parent.items[idx], parent.items[idx - 1]];
    renderContent();
  };
  row.querySelector('[data-down]').onclick = () => {
    if (idx >= parent.items.length - 1) return;
    [parent.items[idx + 1], parent.items[idx]] = [parent.items[idx], parent.items[idx + 1]];
    renderContent();
  };
  row.querySelector('[data-del]').onclick = () => {
    parent.items.splice(idx, 1);
    renderContent();
  };

  return row;
}

/* ============================================================
   Combobox выбора сущности
   ============================================================ */

function buildEntityCombo(currentId, onChange) {
  const wrap = el('div', 'combo' + (currentId ? ' has-value' : ''));

  const input = el('input', 'combo-input');
  input.type = 'text';
  input.placeholder = currentId ? '' : 'Нажмите, чтобы выбрать сущность…';
  input.value = currentId || '';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.readOnly = true;

  const clearBtn = el('button', 'combo-clear');
  clearBtn.type = 'button';
  clearBtn.textContent = '×';

  wrap.appendChild(input);
  wrap.appendChild(clearBtn);

  const dropdown = el('div', 'combo-dropdown');
  document.body.appendChild(dropdown);

  let highlightedIdx = -1;
  let isOpen = false;

  function positionDropdown() {
    const r = input.getBoundingClientRect();
    dropdown.style.left = r.left + 'px';
    dropdown.style.top = (r.bottom + 4) + 'px';
    dropdown.style.width = r.width + 'px';
  }

  function renderOptions(query) {
    const q = (query || '').trim().toLowerCase();
    dropdown.innerHTML = '';

    const entries = Object.entries(DATA.entities)
      .filter(([id, ent]) => {
        if (!q) return true;
        const title = (ent.title || ent.text || '').toLowerCase();
        return id.toLowerCase().includes(q) || title.includes(q);
      })
      .sort(([aId], [bId]) => aId.localeCompare(bId));

    if (!entries.length) {
      const empty = el('div', 'combo-empty');
      empty.textContent = 'Ничего не найдено';
      dropdown.appendChild(empty);
      return;
    }

    entries.forEach(([id, ent], i) => {
      const title = ent.title || ent.text || '';
      const info = typeInfo(ent.type);
      const opt = el('div', 'combo-option');
      opt.dataset.id = id;
      opt.innerHTML = `
        <div class="combo-option-id">${info.icon} ${esc(id)}</div>
        ${title ? `<div class="combo-option-title">${esc(title)}</div>` : ''}
      `;
      if (i === highlightedIdx) opt.classList.add('highlighted');

      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        select(id);
      });
      opt.addEventListener('mouseenter', () => {
        highlightedIdx = i;
        updateHighlight();
      });

      dropdown.appendChild(opt);
    });
  }

  function select(id) {
    input.value = id;
    wrap.classList.toggle('has-value', !!id);
    close();
    onChange(id);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    highlightedIdx = 0;
    renderOptions('');
    positionDropdown();
    dropdown.classList.add('open');
  }

  function close() {
    isOpen = false;
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    highlightedIdx = -1;
  }

  function updateHighlight() {
    [...dropdown.children].forEach((c, i) => {
      c.classList.toggle('highlighted', i === highlightedIdx);
    });
    const active = dropdown.children[highlightedIdx];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (isOpen) close();
    else open();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { open(); return; }
      highlightedIdx = Math.min(highlightedIdx + 1, dropdown.children.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      highlightedIdx = Math.max(highlightedIdx - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = dropdown.children[highlightedIdx];
      if (opt && opt.dataset.id) select(opt.dataset.id);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.value = '';
    wrap.classList.remove('has-value');
    onChange('');
    close();
  });

  document.addEventListener('mousedown', (e) => {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) close();
  });

  window.addEventListener('scroll', () => { if (isOpen) positionDropdown(); }, true);
  window.addEventListener('resize', () => { if (isOpen) positionDropdown(); });

  return wrap;
}

/* ============================================================
   Мини-карта стеллажа
   ============================================================ */

function buildShelfMap(currentShelf) {
  const wrap = el('div');
  wrap.innerHTML = `<div class="shelf-map"></div>`;

  const grid = wrap.querySelector('.shelf-map');
  const total = 24;
  const shelfNum = parseInt(currentShelf, 10);

  for (let i = 1; i <= total; i++) {
    const cell = el('div', 'shelf-cell');
    cell.textContent = i;
    if (i === shelfNum) cell.classList.add('active');
    grid.appendChild(cell);
  }

  return wrap;
}

function isValidShelf(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && n <= 24;
}

/* ============================================================
   Редактор сущности
   ============================================================ */

function renderEntityEditor(id) {
  const ent = DATA.entities[id];
  if (!ent) { renderContent(); return; }

  contentEl.replaceChildren();
  const wrap = el('div');

  const info = typeInfo(ent.type);

  const basic = el('div', 'ed-section');
  basic.innerHTML = `
    <div class="ed-section-title">
      Основное
      <span class="ed-type-badge ${info.color}" id="typeBadge">${info.icon} ${esc(info.label)}</span>
    </div>
    <div class="ed-field">
      <label>ID</label>
      <input class="ed-input" id="f-id" value="${esc(id)}">
      <div class="ed-hint">По нему строится ссылка #/id. Смена id обновит все ссылки.</div>
    </div>
    <div class="ed-field">
      <label>Тип</label>
      <select class="ed-select" id="f-type">
        ${ENTITY_TYPES.map(t => `
          <option value="${t.id}" ${(ent.type || '') === t.id ? 'selected' : ''}>
            ${t.icon} ${esc(t.label)}
          </option>
        `).join('')}
      </select>
      <div class="ed-hint">Определяет группу в списке и фильтр сверху.</div>
    </div>
    <div class="ed-field" id="shelfField" style="${ent.type === 'box' ? '' : 'display:none'}">
      <label>Стеллаж</label>
      <div class="shelf-field-body">
        <input class="ed-input" id="f-shelf" type="number" min="1" max="24"
               value="${ent.shelf ?? ''}"
               placeholder="1–24 (необязательно)">
        <div class="ed-hint">Номер ячейки на стеллаже 4×6. Нумерация с верхнего левого угла.</div>
        <div id="shelfMapWrap"></div>
      </div>
    </div>
    <div class="ed-field">
      <label>Заголовок (title)</label>
      <input class="ed-input" id="f-title" value="${esc(ent.title || '')}">
    </div>
    <div class="ed-field">
      <label>Текст (text)</label>
      <input class="ed-input" id="f-text" value="${esc(ent.text || '')}">
      <div class="ed-hint">Используется, когда объект — пункт списка внутри другой сущности.</div>
    </div>
    <div class="ed-field">
      <label>Описание (desc)</label>
      <textarea class="ed-textarea" id="f-desc">${esc(ent.desc || '')}</textarea>
    </div>
    <div class="ed-field">
      <label>Emoji</label>
      <input class="ed-input" id="f-emoji" value="${esc(ent.emoji || '')}" placeholder="🎮">
    </div>
    <div class="ed-field">
      <label>Иконка (icon)</label>
      <input class="ed-input" id="f-icon" value="${esc(ent.icon || '')}" placeholder="assets/nes.png">
    </div>
    <div class="ed-field">
      <label>Cover</label>
      <input type="checkbox" id="f-cover" ${ent.cover ? 'checked' : ''}>
      <div class="ed-hint">Если включено, картинка заполняет плитку целиком.</div>
    </div>
    <div class="ed-field">
      <label>URL</label>
      <input class="ed-input" id="f-url" value="${esc(ent.url || '')}" placeholder="https://...">
      <div class="ed-hint">Если задан, title в списках становится ссылкой.</div>
    </div>
    <div class="ed-field">
      <label>Комментарий</label>
      <textarea class="ed-textarea" id="f-comment">${esc(ent.comment || '')}</textarea>
    </div>
  `;
  wrap.appendChild(basic);

  basic.querySelector('#f-title').oninput = e => { ent.title = e.target.value; renderEntityList(); };
  basic.querySelector('#f-text').oninput  = e => { ent.text = e.target.value; renderEntityList(); };
  basic.querySelector('#f-desc').oninput  = e => { ent.desc = e.target.value; };
  basic.querySelector('#f-emoji').oninput = e => { ent.emoji = e.target.value; };
  basic.querySelector('#f-icon').oninput  = e => { ent.icon = e.target.value; };
  basic.querySelector('#f-cover').onchange = e => { ent.cover = e.target.checked; };
  basic.querySelector('#f-url').oninput   = e => { ent.url = e.target.value; };
  basic.querySelector('#f-comment').oninput = e => { ent.comment = e.target.value; };

  /* Стеллаж — карта и обновление */
  function refreshShelfMap() {
    const mapWrap = basic.querySelector('#shelfMapWrap');
    if (!mapWrap) return;
    mapWrap.replaceChildren();

    if (!isValidShelf(ent.shelf)) {
      const hint = el('div', 'shelf-hint');
      hint.textContent = 'Укажите номер ячейки (1–24), чтобы увидеть план стеллажа.';
      mapWrap.appendChild(hint);
      return;
    }
    mapWrap.appendChild(buildShelfMap(ent.shelf));
  }

  function refreshShelfVisibility() {
    const shelfField = basic.querySelector('#shelfField');
    if (!shelfField) return;
    shelfField.style.display = (ent.type === 'box') ? '' : 'none';
    refreshShelfMap();
  }

  const shelfInput = basic.querySelector('#f-shelf');
  if (shelfInput) {
    shelfInput.oninput = e => {
      const v = e.target.value.trim();
      if (v === '') {
        delete ent.shelf;
      } else {
        ent.shelf = parseInt(v, 10);
      }
      refreshShelfMap();
    };
  }

  basic.querySelector('#f-type').onchange = e => {
    const v = e.target.value;
    if (v) ent.type = v;
    else delete ent.type;

    const newInfo = typeInfo(ent.type);
    const badge = basic.querySelector('#typeBadge');
    if (badge) {
      badge.className = 'ed-type-badge ' + newInfo.color;
      badge.textContent = `${newInfo.icon} ${newInfo.label}`;
    }

    refreshShelfVisibility();
    renderEntityList();
  };

  basic.querySelector('#f-id').onchange = e => {
    const newId = e.target.value.trim();
    if (!newId || newId === id) { e.target.value = id; return; }
    if (DATA.entities[newId]) {
      toast('Такой id уже существует', true);
      e.target.value = id;
      return;
    }
    DATA.entities[newId] = ent;
    delete DATA.entities[id];

    DATA.sections.forEach(sec => {
      if (sec.items) sec.items = sec.items.map(x => x === id ? newId : x);
    });
    Object.values(DATA.entities).forEach(e2 => {
      if (e2.sections) {
        e2.sections.forEach(s2 => {
          if (s2.items) s2.items = s2.items.map(x => x === id ? newId : x);
        });
      }
    });
    selectedEntityId = newId;
    renderAll();
    toast('ID изменён');
  };

  wrap.appendChild(buildTagsSection(ent));
  wrap.appendChild(buildLinksSection(ent));
  wrap.appendChild(buildSectionsEditor(ent));

  const danger = el('div', 'ed-section');
  const delBtn = el('button', 'ed-btn danger');
  delBtn.textContent = 'Удалить сущность';
  delBtn.onclick = () => {
    if (!confirm(`Удалить сущность «${id}»? Все ссылки на неё из секций тоже исчезнут.`)) return;
    delete DATA.entities[id];
    DATA.sections.forEach(sec => {
      if (sec.items) sec.items = sec.items.filter(x => x !== id);
    });
    Object.values(DATA.entities).forEach(e2 => {
      if (e2.sections) {
        e2.sections.forEach(s2 => {
          if (s2.items) s2.items = s2.items.filter(x => x !== id);
        });
      }
    });
    selectedEntityId = null;
    renderAll();
    toast('Сущность удалена');
  };
  danger.appendChild(delBtn);
  wrap.appendChild(danger);

  contentEl.appendChild(wrap);

  // Инициализация карты стеллажа при открытии
  refreshShelfVisibility();
}

/* ---------- Теги ---------- */

function buildTagsSection(ent) {
  const wrap = el('div', 'ed-section');
  wrap.innerHTML = `
    <div class="ed-section-title">
      Теги
      <button class="ed-btn small" id="addTag">+ тег</button>
    </div>
  `;

  if (!Array.isArray(ent.tags)) ent.tags = [];
  const list = el('div', '');
  ent.tags.forEach((t, idx) => {
    let tag = typeof t === 'string' ? { text: t, tone: 'neutral' } : t;
    ent.tags[idx] = tag;

    const row = el('div', 'sub-block');
    row.innerHTML = `
      <div class="sub-block-header">
        <input class="ed-input" data-text value="${esc(tag.text || '')}" placeholder="текст тега">
        <select class="ed-select" data-tone style="width:130px">
          <option value="neutral">neutral</option>
          <option value="good">good</option>
          <option value="warn">warn</option>
          <option value="bad">bad</option>
        </select>
        <button class="ed-btn small danger" data-del>✕</button>
      </div>
    `;
    const toneSel = row.querySelector('[data-tone]');
    toneSel.value = tag.tone || 'neutral';

    row.querySelector('[data-text]').oninput = e => { tag.text = e.target.value; };
    toneSel.onchange = e => { tag.tone = e.target.value; };
    row.querySelector('[data-del]').onclick = () => {
      ent.tags.splice(idx, 1);
      renderEntityEditor(selectedEntityId);
    };

    list.appendChild(row);
  });

  wrap.appendChild(list);
  wrap.querySelector('#addTag').onclick = () => {
    ent.tags.push({ text: '', tone: 'neutral' });
    renderEntityEditor(selectedEntityId);
  };

  return wrap;
}

/* ---------- Ссылки ---------- */

function buildLinksSection(ent) {
  const wrap = el('div', 'ed-section');
  wrap.innerHTML = `
    <div class="ed-section-title">
      Ссылки
      <button class="ed-btn small" id="addLink">+ ссылка</button>
    </div>
  `;

  if (!Array.isArray(ent.links)) ent.links = [];
  const list = el('div', '');
  ent.links.forEach((link, idx) => {
    const row = el('div', 'sub-block');
    row.innerHTML = `
      <div class="sub-block-header">
        <input class="ed-input" data-text value="${esc(link.text || '')}" placeholder="текст">
        <button class="ed-btn small danger" data-del>✕</button>
      </div>
      <input class="ed-input" data-url value="${esc(link.url || '')}" placeholder="https://..." style="margin-bottom:6px">
      <input class="ed-input" data-comment value="${esc(link.comment || '')}" placeholder="описание">
    `;
    row.querySelector('[data-text]').oninput = e => { link.text = e.target.value; };
    row.querySelector('[data-url]').oninput = e => { link.url = e.target.value; };
    row.querySelector('[data-comment]').oninput = e => { link.comment = e.target.value; };
    row.querySelector('[data-del]').onclick = () => {
      ent.links.splice(idx, 1);
      renderEntityEditor(selectedEntityId);
    };
    list.appendChild(row);
  });

  wrap.appendChild(list);
  wrap.querySelector('#addLink').onclick = () => {
    ent.links.push({ text: '', url: '', comment: '' });
    renderEntityEditor(selectedEntityId);
  };

  return wrap;
}

/* ---------- Вложенные секции ---------- */

function buildSectionsEditor(ent) {
  const wrap = el('div', 'ed-section');
  wrap.innerHTML = `
    <div class="ed-section-title">
      Секции внутри сущности
      <button class="ed-btn small" id="addSub">+ секция</button>
    </div>
  `;

  if (!Array.isArray(ent.sections)) ent.sections = [];

  ent.sections.forEach((sec, si) => {
    const block = el('div', 'sub-block');
    block.style.background = '#131620';

    block.innerHTML = `
      <div class="sub-block-header">
        <input class="ed-input" data-title value="${esc(sec.title || '')}" placeholder="название секции">
        <button class="ed-btn small" data-up>↑</button>
        <button class="ed-btn small" data-down>↓</button>
        <button class="ed-btn small danger" data-del>✕</button>
      </div>
    `;

    if (!Array.isArray(sec.items)) sec.items = [];

    const itemsBox = el('div', '');
    itemsBox.style.marginTop = '8px';

    sec.items.forEach((itemId, idx) => {
      itemsBox.appendChild(buildItemRow(sec, idx, itemId));
    });

    const addItemBtn = el('button', 'ed-btn small');
    addItemBtn.textContent = '+ пункт';
    addItemBtn.style.marginTop = '6px';
    addItemBtn.onclick = () => {
      sec.items.push('');
      renderEntityEditor(selectedEntityId);
    };
    itemsBox.appendChild(addItemBtn);

    block.appendChild(itemsBox);

    block.querySelector('[data-title]').oninput = e => { sec.title = e.target.value; };
    block.querySelector('[data-up]').onclick = () => {
      if (si === 0) return;
      [ent.sections[si-1], ent.sections[si]] = [ent.sections[si], ent.sections[si-1]];
      renderEntityEditor(selectedEntityId);
    };
    block.querySelector('[data-down]').onclick = () => {
      if (si >= ent.sections.length - 1) return;
      [ent.sections[si+1], ent.sections[si]] = [ent.sections[si], ent.sections[si+1]];
      renderEntityEditor(selectedEntityId);
    };
    block.querySelector('[data-del]').onclick = () => {
      ent.sections.splice(si, 1);
      renderEntityEditor(selectedEntityId);
    };

    wrap.appendChild(block);
  });

  wrap.querySelector('#addSub').onclick = () => {
    ent.sections.push({ title: 'Новая секция', items: [] });
    renderEntityEditor(selectedEntityId);
  };

  return wrap;
}

/* ============================================================
   Добавление
   ============================================================ */

function addEntity() {
  const filterType = typeFilterEl?.value || '';
  const prefix = filterType || 'entity';
  const id = uid(prefix);
  DATA.entities[id] = { title: 'Новая сущность', desc: '' };
  if (filterType) DATA.entities[id].type = filterType;
  selectedEntityId = id;
  _selectedTopSection = null;
  renderAll();
  toast('Сущность добавлена');
}

function addTopSection() {
  DATA.sections.push({ title: 'Новая секция', items: [] });
  _selectedTopSection = DATA.sections.length - 1;
  selectedEntityId = null;
  renderAll();
  toast('Секция добавлена');
}

/* ============================================================
   События
   ============================================================ */

document.getElementById('btnLoadUrl').onclick = loadFromUrl;
document.getElementById('btnDownload').onclick = download;
document.getElementById('fileInput').onchange = e => {
  const f = e.target.files[0];
  if (f) loadFromFile(f);
};
document.getElementById('addEntity').onclick = addEntity;
document.getElementById('addTopSection').onclick = addTopSection;
entitySearchEl.oninput = renderEntityList;
typeFilterEl.onchange = renderEntityList;

/* ============================================================
   Старт
   ============================================================ */

(async function init() {
  fillTypeFilter();
  await loadFromUrl();
})();
