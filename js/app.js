/* Lernen Sprachen — Karteikarten-App
 * Vanilla JS, no build step, all data stored in localStorage in the browser.
 */

const LANGS = {
  sl: { name: 'Slovenščina', speech: 'sl-SI' },
  en: { name: 'English', speech: 'en-US' },
  de: { name: 'Deutsch', speech: 'de-DE' },
  fr: { name: 'Français', speech: 'fr-FR' },
};

const STORAGE = {
  cards: 'lls_cards_v1',
  progress: 'lls_progress_v1',
  settings: 'lls_settings_v1',
};

const DAY = 24 * 60 * 60 * 1000;
const BOX_INTERVALS = [0, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];

let cards = [];
let progress = {};
let settings = { from: 'de', to: 'fr', category: 'all', dueOnly: false };

let queue = [];
let queueIndex = 0;
let sessionCorrect = 0;
let sessionWrong = 0;
let sessionWrongIds = [];
let currentCardId = null;
let editingImageDataUrl = '';

// ---------- Persistence ----------

function uid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadState() {
  const rawCards = localStorage.getItem(STORAGE.cards);
  if (rawCards) {
    cards = JSON.parse(rawCards);
  } else {
    cards = DEFAULT_CARDS.map((c) => ({ id: uid(), image: '', ...c }));
    saveCards();
  }

  const rawProgress = localStorage.getItem(STORAGE.progress);
  progress = rawProgress ? JSON.parse(rawProgress) : {};

  const rawSettings = localStorage.getItem(STORAGE.settings);
  if (rawSettings) settings = { ...settings, ...JSON.parse(rawSettings) };
}

function saveCards() {
  localStorage.setItem(STORAGE.cards, JSON.stringify(cards));
}
function saveProgress() {
  localStorage.setItem(STORAGE.progress, JSON.stringify(progress));
}
function saveSettings() {
  localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
}

// ---------- Tabs ----------

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'manage') renderCardList();
    });
  });
}

// ---------- Categories ----------

function getCategories() {
  const set = new Set(cards.map((c) => c.category).filter(Boolean));
  return [...set].sort();
}

function refreshCategoryOptions() {
  const filterSel = document.getElementById('category-filter');
  const prevValue = filterSel.value || settings.category;
  filterSel.innerHTML = '<option value="all">Alle</option>';
  getCategories().forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterSel.appendChild(opt);
  });
  filterSel.value = [...filterSel.options].some((o) => o.value === prevValue) ? prevValue : 'all';

  const datalist = document.getElementById('category-list');
  datalist.innerHTML = '';
  getCategories().forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    datalist.appendChild(opt);
  });
}

// ---------- Speech ----------

function speak(text, langCode) {
  if (!('speechSynthesis' in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANGS[langCode].speech;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ---------- Practice queue ----------

function buildQueue() {
  const now = Date.now();
  let filtered = cards.filter((c) => settings.category === 'all' || c.category === settings.category);
  if (settings.dueOnly) {
    filtered = filtered.filter((c) => {
      const p = progress[c.id];
      return !p || p.due <= now;
    });
  }
  // Fisher-Yates shuffle
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  return filtered.map((c) => c.id);
}

function startSession(cardIds) {
  queue = cardIds;
  queueIndex = 0;
  sessionCorrect = 0;
  sessionWrong = 0;
  sessionWrongIds = [];
  document.getElementById('session-summary').classList.add('hidden');
  showNextCard();
}

function showNextCard() {
  updateProgressBar();
  const flashcard = document.getElementById('flashcard');
  const emptyState = document.getElementById('empty-state');
  const answerButtons = document.getElementById('answer-buttons');

  if (queueIndex >= queue.length) {
    if (queue.length === 0) {
      flashcard.classList.add('hidden');
      answerButtons.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      showSummary();
    }
    return;
  }

  emptyState.classList.add('hidden');
  flashcard.classList.remove('hidden');
  flashcard.classList.remove('flipped');
  answerButtons.classList.add('hidden');

  currentCardId = queue[queueIndex];
  const card = cards.find((c) => c.id === currentCardId);
  if (!card) {
    queueIndex++;
    showNextCard();
    return;
  }

  document.getElementById('front-category').textContent = card.category || '';
  document.getElementById('back-category').textContent = card.category || '';
  document.getElementById('front-word').textContent = card[settings.from];
  document.getElementById('back-word').textContent = card[settings.to];

  const frontImg = document.getElementById('front-image');
  const backImg = document.getElementById('back-image');
  if (card.image) {
    frontImg.src = card.image;
    backImg.src = card.image;
    frontImg.classList.remove('hidden');
    backImg.classList.remove('hidden');
  } else {
    frontImg.classList.add('hidden');
    backImg.classList.add('hidden');
  }
}

function updateProgressBar() {
  const total = queue.length;
  const done = Math.min(queueIndex, total);
  document.getElementById('progress-text').textContent = `${done} / ${total}`;
  document.getElementById('progress-fill').style.width = total ? `${(done / total) * 100}%` : '0%';
}

function flipCard() {
  const flashcard = document.getElementById('flashcard');
  const wasFlipped = flashcard.classList.contains('flipped');
  flashcard.classList.toggle('flipped');
  if (!wasFlipped) {
    document.getElementById('answer-buttons').classList.remove('hidden');
  }
}

function answer(known) {
  if (currentCardId === null) return;
  const p = progress[currentCardId] || { box: 0, due: 0 };
  if (known) {
    p.box = Math.min(BOX_INTERVALS.length - 1, p.box + 1);
    sessionCorrect++;
  } else {
    p.box = 0;
    sessionWrong++;
    sessionWrongIds.push(currentCardId);
  }
  p.due = Date.now() + BOX_INTERVALS[p.box];
  progress[currentCardId] = p;
  saveProgress();

  queueIndex++;
  showNextCard();
}

function showSummary() {
  document.getElementById('progress-text').textContent = `${queue.length} / ${queue.length}`;
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('flashcard').classList.add('hidden');
  document.getElementById('answer-buttons').classList.add('hidden');
  const total = sessionCorrect + sessionWrong;
  document.getElementById('summary-text').textContent =
    `${sessionCorrect} von ${total} richtig gewusst.` +
    (sessionWrong > 0 ? ` ${sessionWrong} Karte(n) brauchen noch Übung.` : ' Stark! 🎉');
  document.getElementById('btn-restart-wrong').classList.toggle('hidden', sessionWrong === 0);
  document.getElementById('session-summary').classList.remove('hidden');
}

// ---------- Manage cards ----------

function renderCardList() {
  refreshCategoryOptions();
  const listEl = document.getElementById('card-list');
  const search = document.getElementById('search-cards').value.trim().toLowerCase();

  const filtered = cards.filter((c) => {
    if (!search) return true;
    return ['sl', 'en', 'de', 'fr', 'category'].some((k) => (c[k] || '').toLowerCase().includes(search));
  });

  document.getElementById('card-count').textContent = `${filtered.length} Karte(n)`;
  listEl.innerHTML = '';

  filtered.forEach((card) => {
    const row = document.createElement('div');
    row.className = 'card-row';

    const img = card.image
      ? Object.assign(document.createElement('img'), { src: card.image })
      : Object.assign(document.createElement('div'), { className: 'no-img' });
    row.appendChild(img);

    const words = document.createElement('div');
    words.className = 'card-row-words';
    words.innerHTML = `<strong>${card.category || 'Ohne Kategorie'}</strong>
      🇸🇮 ${escapeHtml(card.sl)} · 🇬🇧 ${escapeHtml(card.en)} · 🇩🇪 ${escapeHtml(card.de)} · 🇫🇷 ${escapeHtml(card.fr)}`;
    row.appendChild(words);

    const actions = document.createElement('div');
    actions.className = 'card-row-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'Bearbeiten';
    editBtn.addEventListener('click', () => startEditCard(card.id));
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.title = 'Löschen';
    delBtn.addEventListener('click', () => deleteCard(card.id));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);

    listEl.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function resetForm() {
  document.getElementById('card-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = 'Neue Karte hinzufügen';
  document.getElementById('submit-btn').textContent = 'Karte hinzufügen';
  document.getElementById('cancel-edit-btn').classList.add('hidden');
  document.getElementById('image-preview').classList.add('hidden');
  editingImageDataUrl = '';
}

function startEditCard(id) {
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  document.getElementById('edit-id').value = card.id;
  document.getElementById('field-category').value = card.category || '';
  document.getElementById('field-sl').value = card.sl;
  document.getElementById('field-en').value = card.en;
  document.getElementById('field-de').value = card.de;
  document.getElementById('field-fr').value = card.fr;
  document.getElementById('field-image-url').value = card.image && !card.image.startsWith('data:') ? card.image : '';
  editingImageDataUrl = card.image && card.image.startsWith('data:') ? card.image : '';
  const preview = document.getElementById('image-preview');
  if (card.image) {
    preview.src = card.image;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
  document.getElementById('form-title').textContent = 'Karte bearbeiten';
  document.getElementById('submit-btn').textContent = 'Änderungen speichern';
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="manage"]').classList.add('active');
  document.getElementById('tab-manage').classList.add('active');
  document.getElementById('field-sl').focus();
}

function deleteCard(id) {
  if (!confirm('Diese Karte wirklich löschen?')) return;
  cards = cards.filter((c) => c.id !== id);
  delete progress[id];
  saveCards();
  saveProgress();
  renderCardList();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-id').value;
  const imageUrl = document.getElementById('field-image-url').value.trim();
  const image = imageUrl || editingImageDataUrl || '';

  const data = {
    category: document.getElementById('field-category').value.trim(),
    sl: document.getElementById('field-sl').value.trim(),
    en: document.getElementById('field-en').value.trim(),
    de: document.getElementById('field-de').value.trim(),
    fr: document.getElementById('field-fr').value.trim(),
    image,
  };

  if (editId) {
    const idx = cards.findIndex((c) => c.id === editId);
    if (idx !== -1) cards[idx] = { ...cards[idx], ...data };
  } else {
    cards.push({ id: uid(), ...data });
  }
  saveCards();
  resetForm();
  renderCardList();
}

function handleImageFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editingImageDataUrl = reader.result;
    document.getElementById('field-image-url').value = '';
    const preview = document.getElementById('image-preview');
    preview.src = editingImageDataUrl;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// ---------- Import / export ----------

function exportCards() {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lernen-sprachen-karten.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importCards(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('invalid');
      const replace = confirm(
        `${imported.length} Karte(n) gefunden. OK = Vorhandene Karten ERSETZEN, Abbrechen = zu vorhandenen HINZUFÜGEN.`
      );
      const normalized = imported.map((c) => ({
        id: c.id || uid(),
        category: c.category || '',
        sl: c.sl || '',
        en: c.en || '',
        de: c.de || '',
        fr: c.fr || '',
        image: c.image || '',
      }));
      cards = replace ? normalized : [...cards, ...normalized];
      saveCards();
      renderCardList();
      refreshCategoryOptions();
      alert('Import erfolgreich.');
    } catch (err) {
      alert('Import fehlgeschlagen: ungültige Datei.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function resetToDefaults() {
  if (!confirm('Wirklich alle Karten und den Lernfortschritt auf die Standardliste zurücksetzen?')) return;
  cards = DEFAULT_CARDS.map((c) => ({ id: uid(), image: '', ...c }));
  progress = {};
  saveCards();
  saveProgress();
  renderCardList();
  refreshCategoryOptions();
  startSession(buildQueue());
}

// ---------- Init ----------

function initEventListeners() {
  document.getElementById('lang-from').addEventListener('change', (e) => {
    settings.from = e.target.value;
    saveSettings();
    startSession(buildQueue());
  });
  document.getElementById('lang-to').addEventListener('change', (e) => {
    settings.to = e.target.value;
    saveSettings();
    startSession(buildQueue());
  });
  document.getElementById('swap-langs').addEventListener('click', () => {
    [settings.from, settings.to] = [settings.to, settings.from];
    document.getElementById('lang-from').value = settings.from;
    document.getElementById('lang-to').value = settings.to;
    saveSettings();
    startSession(buildQueue());
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    settings.category = e.target.value;
    saveSettings();
    startSession(buildQueue());
  });
  document.getElementById('due-only').addEventListener('change', (e) => {
    settings.dueOnly = e.target.checked;
    saveSettings();
    startSession(buildQueue());
  });

  document.getElementById('flashcard').addEventListener('click', (e) => {
    if (e.target.closest('.speak-btn')) return;
    flipCard();
  });
  document.getElementById('speak-front').addEventListener('click', (e) => {
    e.stopPropagation();
    speak(document.getElementById('front-word').textContent, settings.from);
  });
  document.getElementById('speak-back').addEventListener('click', (e) => {
    e.stopPropagation();
    speak(document.getElementById('back-word').textContent, settings.to);
  });

  document.getElementById('btn-known').addEventListener('click', () => answer(true));
  document.getElementById('btn-unknown').addEventListener('click', () => answer(false));
  document.getElementById('btn-restart-all').addEventListener('click', () => startSession(buildQueue()));
  document.getElementById('btn-restart-wrong').addEventListener('click', () => startSession([...sessionWrongIds]));

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('tab-practice').classList.contains('active')) return;
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.key === 'ArrowRight' || e.key === '1') {
      if (!document.getElementById('answer-buttons').classList.contains('hidden')) answer(true);
    } else if (e.key === 'ArrowLeft' || e.key === '0') {
      if (!document.getElementById('answer-buttons').classList.contains('hidden')) answer(false);
    } else if (e.key.toLowerCase() === 's') {
      speak(document.getElementById('front-word').textContent, settings.from);
    }
  });

  document.getElementById('card-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);
  document.getElementById('field-image-file').addEventListener('change', handleImageFile);
  document.getElementById('search-cards').addEventListener('input', renderCardList);

  document.getElementById('export-btn').addEventListener('click', exportCards);
  document.getElementById('import-input').addEventListener('change', importCards);
  document.getElementById('reset-btn').addEventListener('click', resetToDefaults);
}

function init() {
  loadState();
  document.getElementById('lang-from').value = settings.from;
  document.getElementById('lang-to').value = settings.to;
  document.getElementById('due-only').checked = settings.dueOnly;
  refreshCategoryOptions();
  document.getElementById('category-filter').value = settings.category;
  initTabs();
  initEventListeners();
  startSession(buildQueue());
}

document.addEventListener('DOMContentLoaded', init);
