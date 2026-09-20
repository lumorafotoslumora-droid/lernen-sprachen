/* Lernen Sprachen — Karteikarten-App
 * Vanilla JS, no build step. Karten & Lernfortschritt liegen auf dem
 * Server (pro angemeldetem Konto); nur UI-Einstellungen bleiben lokal.
 */

const LANGS = {
  sl: { name: 'Slovenščina', speech: 'sl-SI' },
  en: { name: 'English', speech: 'en-US' },
  de: { name: 'Deutsch', speech: 'de-DE' },
  fr: { name: 'Français', speech: 'fr-FR' },
};

const SETTINGS_KEY = 'lls_settings_v2';
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

// ---------- API helper ----------

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Fehler (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Local UI settings ----------

function loadLocalSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) settings = { ...settings, ...JSON.parse(raw) };
}
function saveLocalSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ---------- Server data ----------

async function fetchCards() {
  cards = await api('/api/cards');
}
async function fetchProgress() {
  progress = await api('/api/cards/progress/all');
}

async function createCard(data) {
  const card = await api('/api/cards', { method: 'POST', body: JSON.stringify(data) });
  cards.push(card);
  return card;
}
async function updateCardApi(id, data) {
  const card = await api(`/api/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx !== -1) cards[idx] = card;
  return card;
}
async function deleteCardApi(id) {
  await api(`/api/cards/${id}`, { method: 'DELETE' });
  cards = cards.filter((c) => c.id !== id);
  delete progress[id];
}
async function importCardsApi(items, mode) {
  cards = await api('/api/cards/import', { method: 'POST', body: JSON.stringify({ cards: items, mode }) });
}
async function resetCardsApi() {
  cards = await api('/api/cards/reset', { method: 'POST' });
  progress = {};
}
function pushProgress(cardId, box, due) {
  api(`/api/cards/progress/${cardId}`, { method: 'PUT', body: JSON.stringify({ box, due }) }).catch((err) =>
    console.error('Fortschritt konnte nicht gespeichert werden:', err)
  );
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
  pushProgress(currentCardId, p.box, p.due);

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
    words.innerHTML = `<strong>${escapeHtml(card.category) || 'Ohne Kategorie'}</strong>
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
  document.getElementById('edit-id').value = String(card.id);
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

async function deleteCard(id) {
  if (!confirm('Diese Karte wirklich löschen?')) return;
  try {
    await deleteCardApi(id);
    renderCardList();
  } catch (err) {
    alert('Löschen fehlgeschlagen: ' + err.message);
  }
}

async function handleFormSubmit(e) {
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

  try {
    if (editId) {
      await updateCardApi(Number(editId), data);
    } else {
      await createCard(data);
    }
    resetForm();
    renderCardList();
  } catch (err) {
    alert('Speichern fehlgeschlagen: ' + err.message);
  }
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
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('invalid');
      const replace = confirm(
        `${imported.length} Karte(n) gefunden. OK = Vorhandene Karten ERSETZEN, Abbrechen = zu vorhandenen HINZUFÜGEN.`
      );
      const normalized = imported.map((c) => ({
        category: c.category || '',
        sl: c.sl || '',
        en: c.en || '',
        de: c.de || '',
        fr: c.fr || '',
        image: c.image || '',
      }));
      await importCardsApi(normalized, replace ? 'replace' : 'add');
      if (replace) {
        progress = {};
        await fetchProgress();
      }
      renderCardList();
      refreshCategoryOptions();
      alert('Import erfolgreich.');
    } catch (err) {
      alert('Import fehlgeschlagen: ' + (err.message === 'invalid' ? 'ungültige Datei.' : err.message));
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

async function resetToDefaults() {
  if (!confirm('Wirklich alle Karten und den Lernfortschritt auf die Standardliste zurücksetzen?')) return;
  try {
    await resetCardsApi();
    renderCardList();
    refreshCategoryOptions();
    startSession(buildQueue());
  } catch (err) {
    alert('Zurücksetzen fehlgeschlagen: ' + err.message);
  }
}

// ---------- Auth ----------

function initAuthTabs() {
  document.querySelectorAll('.auth-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const which = btn.dataset.authTab;
      document.getElementById('login-form').classList.toggle('hidden', which !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', which !== 'register');
      document.getElementById('login-error').classList.add('hidden');
      document.getElementById('register-error').classList.add('hidden');
    });
  });
}

function initAuthForms() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('login-email').value.trim(),
          password: document.getElementById('login-password').value,
        }),
      });
      await onAuthSuccess(data.email);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.classList.add('hidden');
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('register-email').value.trim(),
          password: document.getElementById('register-password').value,
        }),
      });
      await onAuthSuccess(data.email);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    location.reload();
  });
}

async function onAuthSuccess(email) {
  document.getElementById('account-email').textContent = email;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  await loadAppData();
}

async function checkAuth() {
  try {
    const me = await api('/api/auth/me');
    document.getElementById('account-email').textContent = me.email;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    return true;
  } catch {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    return false;
  }
}

// ---------- Init ----------

function initEventListeners() {
  document.getElementById('lang-from').addEventListener('change', (e) => {
    settings.from = e.target.value;
    saveLocalSettings();
    startSession(buildQueue());
  });
  document.getElementById('lang-to').addEventListener('change', (e) => {
    settings.to = e.target.value;
    saveLocalSettings();
    startSession(buildQueue());
  });
  document.getElementById('swap-langs').addEventListener('click', () => {
    [settings.from, settings.to] = [settings.to, settings.from];
    document.getElementById('lang-from').value = settings.from;
    document.getElementById('lang-to').value = settings.to;
    saveLocalSettings();
    startSession(buildQueue());
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    settings.category = e.target.value;
    saveLocalSettings();
    startSession(buildQueue());
  });
  document.getElementById('due-only').addEventListener('change', (e) => {
    settings.dueOnly = e.target.checked;
    saveLocalSettings();
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

async function loadAppData() {
  await Promise.all([fetchCards(), fetchProgress()]);
  refreshCategoryOptions();
  document.getElementById('category-filter').value = settings.category;
  startSession(buildQueue());
}

async function init() {
  loadLocalSettings();
  document.getElementById('lang-from').value = settings.from;
  document.getElementById('lang-to').value = settings.to;
  document.getElementById('due-only').checked = settings.dueOnly;

  initTabs();
  initEventListeners();
  initAuthTabs();
  initAuthForms();

  const authed = await checkAuth();
  if (authed) await loadAppData();
}

document.addEventListener('DOMContentLoaded', init);
