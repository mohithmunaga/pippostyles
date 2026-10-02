// ==========================================================================
// CARD MANAGER & NAME EDITOR
// Manage card names (pic1, pic2...), delete, add 100s of photos, and mobile sync.
// Accessible via [Shift + I] or the "MANAGE CARDS" button.
// ==========================================================================

import { getAllCards, setAllCards, addNewCard, updateCardName, updateCardData, deleteCard, clearAllCards } from './data.js';
import { rebuildCylinderPanels } from './webgl.js';

let modalContainer = null;
let isOpen = false;
let currentTab = 'names'; // 'names', 'mobile', 'upload'
let searchFilter = '';

export function initImageManager() {
  window.addEventListener('keydown', (e) => {
    const isEditingInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (!isEditingInput && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      toggleImageManager();
    } else if (e.key === 'Escape' && isOpen) {
      closeImageManager();
    }
  });

  window.openImageManager = openImageManager;
  window.closeImageManager = closeImageManager;
  window.toggleImageManager = toggleImageManager;
}

export async function openImageManager() {
  if (!modalContainer) {
    createModalDOM();
  }
  try {
    const res = await fetch('/api/cards');
    const d = await res.json();
    if (d.success && Array.isArray(d.cards)) {
      setAllCards(d.cards);
    }
  } catch (e) {}
  refreshCardsList();
  fetchNetworkInfo();
  modalContainer.style.display = 'flex';
  requestAnimationFrame(() => {
    modalContainer.classList.add('is-active');
  });
  isOpen = true;
}

export function closeImageManager() {
  if (!modalContainer) return;
  modalContainer.classList.remove('is-active');
  setTimeout(() => {
    modalContainer.style.display = 'none';
  }, 250);
  isOpen = false;
}

export function toggleImageManager() {
  if (isOpen) closeImageManager();
  else openImageManager();
}

function createModalDOM() {
  modalContainer = document.createElement('div');
  modalContainer.id = 'card-manager-modal';
  modalContainer.className = 'card-mgr-modal';
  modalContainer.style.display = 'none';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .card-mgr-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(4, 4, 12, 0.88);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
    }
    .card-mgr-modal.is-active {
      opacity: 1;
    }
    .card-mgr-panel {
      background: #0d0c18;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      width: 100%;
      max-width: 680px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(21, 0, 225, 0.3);
      overflow: hidden;
      transform: scale(0.96) translateY(10px);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card-mgr-modal.is-active .card-mgr-panel {
      transform: scale(1) translateY(0);
    }
    .card-mgr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }
    .card-mgr-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card-mgr-badge {
      font-size: 10px;
      background: #1500E1;
      color: #fff;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .card-mgr-close {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 20px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-mgr-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .card-mgr-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.3);
    }
    .card-mgr-tab-btn {
      flex: 1;
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .card-mgr-tab-btn.is-active {
      color: #fff;
      background: rgba(21, 0, 225, 0.15);
      border-bottom-color: #3b28ff;
    }
    .card-mgr-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card-mgr-search-input {
      background: #080710;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
      width: 100%;
    }
    .card-mgr-search-input:focus {
      border-color: #3b28ff;
    }
    .card-mgr-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 440px;
      overflow-y: auto;
    }
    .card-mgr-row {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #151424;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 14px;
      transition: border-color 0.2s;
    }
    .card-mgr-row:focus-within {
      border-color: #3b28ff;
    }
    .card-mgr-thumb {
      width: 48px;
      height: 64px;
      border-radius: 6px;
      object-fit: cover;
      background: #000;
      flex-shrink: 0;
    }
    .card-mgr-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .card-mgr-num {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255, 255, 255, 0.5);
    }
    .card-mgr-input {
      background: #0b0a14;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 7px 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      outline: none;
      width: 100%;
    }
    .card-mgr-input:focus {
      border-color: #1500E1;
      box-shadow: 0 0 0 2px rgba(21, 0, 225, 0.35);
    }
    .card-mgr-del-btn {
      width: 30px;
      height: 30px;
      background: rgba(255, 59, 48, 0.15);
      border: 1px solid rgba(255, 59, 48, 0.3);
      color: #ff3b30;
      border-radius: 6px;
      font-size: 16px;
      display: grid;
      place-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .card-mgr-footer {
      padding: 14px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-mgr-btn {
      background: #1500E1;
      color: #fff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .card-mgr-btn:hover {
      background: #2b17f5;
    }
    .card-mgr-btn--danger {
      background: rgba(255, 59, 48, 0.15);
      border: 1px solid rgba(255, 59, 48, 0.3);
      color: #ff3b30;
    }
    .card-mgr-btn--secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .card-mgr-empty {
      text-align: center;
      padding: 30px 10px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }
  `;
  document.head.appendChild(styleEl);

  modalContainer.innerHTML = `
    <div class="card-mgr-panel" role="dialog">
      <div class="card-mgr-header">
        <div class="card-mgr-title">
          <span>Card Manager &amp; Name Editor</span>
          <span class="card-mgr-badge" id="card-mgr-count-badge">0 Cards</span>
        </div>
        <button type="button" class="card-mgr-close" id="card-mgr-close-btn">&times;</button>
      </div>

      <div class="card-mgr-tabs">
        <button type="button" class="card-mgr-tab-btn is-active" id="tab-btn-names">Edit Card Names</button>
        <button type="button" class="card-mgr-tab-btn" id="tab-btn-mobile">Mobile Sync (QR)</button>
        <button type="button" class="card-mgr-tab-btn" id="tab-btn-pc-upload">Upload from PC</button>
      </div>

      <div class="card-mgr-body">
        <!-- TAB 1: EDIT CARD NAMES -->
        <div id="tab-pane-names" style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="card-mgr-search-input" class="card-mgr-search-input" placeholder="Search cards by name (e.g. pic42)...">
          <div class="card-mgr-list" id="card-mgr-items-list"></div>
        </div>

        <!-- TAB 2: MOBILE SYNC (QR) -->
        <div id="tab-pane-mobile" style="display: none; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 10px 0;">
          <div style="font-size: 15px; font-weight: 700;">Add 100s of Photos from your Mobile Phone</div>
          <div style="font-size: 13px; color: rgba(255,255,255,0.65); max-width: 440px;">
            Scan this QR code with your phone camera to select 10s or 100s of photos. They will be added as pic1, pic2, pic3 with instant name editing.
          </div>

          <div style="background: #fff; padding: 12px; border-radius: 12px; display: inline-block;">
            <img id="card-mgr-qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://localhost:3000/upload" alt="Scan with Phone" style="width: 180px; height: 180px; display: block;">
          </div>

          <div style="display: flex; gap: 8px; width: 100%; max-width: 440px;">
            <input type="text" id="card-mgr-mobile-url" class="card-mgr-input" readonly value="http://localhost:3000/upload" style="text-align: center;">
            <a href="/upload" target="_blank" class="card-mgr-btn card-mgr-btn--secondary" style="text-decoration: none; display: inline-flex; align-items: center;">Open Page</a>
          </div>
        </div>

        <!-- TAB 3: UPLOAD FROM PC -->
        <div id="tab-pane-pc-upload" style="display: none; flex-direction: column; gap: 16px;">
          <div style="font-size: 13px; color: rgba(255,255,255,0.7);">
            Select 10s or 100s of photos from your computer. They will be added as pic1, pic2, pic3...
          </div>
          <input type="file" id="card-mgr-file-input" accept="image/*" multiple style="display:none;">
          <button type="button" class="card-mgr-btn" id="card-mgr-pick-pc-btn" style="padding: 16px; font-size: 15px;">
            Select Photos from Computer
          </button>
        </div>
      </div>

      <div class="card-mgr-footer">
        <div style="display: flex; gap: 8px;">
          <button type="button" class="card-mgr-btn card-mgr-btn--danger" id="card-mgr-clear-all-btn">Remove All Cards</button>
          <button type="button" class="card-mgr-btn card-mgr-btn--secondary" id="card-mgr-renumber-btn">Renumber pic1..N</button>
        </div>
        <button type="button" class="card-mgr-btn" id="card-mgr-done-btn">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalContainer);

  // Tab switching
  const tabNames = document.getElementById('tab-btn-names');
  const tabMobile = document.getElementById('tab-btn-mobile');
  const tabPc = document.getElementById('tab-btn-pc-upload');

  const paneNames = document.getElementById('tab-pane-names');
  const paneMobile = document.getElementById('tab-pane-mobile');
  const panePc = document.getElementById('tab-pane-pc-upload');

  function setTab(tab) {
    currentTab = tab;
    [tabNames, tabMobile, tabPc].forEach(b => b.classList.remove('is-active'));
    [paneNames, paneMobile, panePc].forEach(p => p.style.display = 'none');

    if (tab === 'names') {
      tabNames.classList.add('is-active');
      paneNames.style.display = 'flex';
      refreshCardsList();
    } else if (tab === 'mobile') {
      tabMobile.classList.add('is-active');
      paneMobile.style.display = 'flex';
      fetchNetworkInfo();
    } else if (tab === 'upload') {
      tabPc.classList.add('is-active');
      panePc.style.display = 'flex';
    }
  }

  tabNames.addEventListener('click', () => setTab('names'));
  tabMobile.addEventListener('click', () => setTab('mobile'));
  tabPc.addEventListener('click', () => setTab('upload'));

  document.getElementById('card-mgr-close-btn').addEventListener('click', closeImageManager);
  document.getElementById('card-mgr-done-btn').addEventListener('click', closeImageManager);

  // Search input
  const searchInput = document.getElementById('card-mgr-search-input');
  searchInput.addEventListener('input', (e) => {
    searchFilter = e.target.value.toLowerCase().trim();
    refreshCardsList();
  });

  // Renumber pic1..N
  document.getElementById('card-mgr-renumber-btn').addEventListener('click', async () => {
    const cards = getAllCards();
    if (cards.length === 0) return;
    if (confirm(`Renumber all ${cards.length} cards sequentially as pic1, pic2, pic3...?`)) {
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const newTitle = `pic${i + 1}`;
        card.title = newTitle;
        await fetch('/api/cards/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, title: newTitle })
        });
      }
      refreshCardsList();
      rebuildCylinderPanels();
      if (window.renderWorksPage) window.renderWorksPage();
    }
  });

  // Clear all button
  document.getElementById('card-mgr-clear-all-btn').addEventListener('click', async () => {
    if (confirm('Remove all cards and start fresh?')) {
      clearAllCards();
      rebuildCylinderPanels();
      refreshCardsList();
      if (window.renderWorksPage) window.renderWorksPage();
    }
  });

  // Pick from PC
  const fileInput = document.getElementById('card-mgr-file-input');
  const pickPcBtn = document.getElementById('card-mgr-pick-pc-btn');

  pickPcBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    pickPcBtn.disabled = true;
    pickPcBtn.textContent = `Processing ${files.length} photos...`;

    const currentCards = getAllCards();
    const BATCH_SIZE = 10;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const payloadImages = [];

      for (let j = 0; j < batch.length; j++) {
        const file = batch[j];
        const dataUrl = await readAndCompressImage(file);
        const nextNum = currentCards.length + i + j + 1;
        payloadImages.push({
          dataUrl,
          title: `pic${nextNum}`,
          note: 'Uploaded from computer',
          year: String(new Date().getFullYear())
        });
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: payloadImages })
        });
        const d = await res.json();
        if (d.success && d.allCards) {
          setAllCards(d.allCards);
        }
      } catch (err) {
        alert('Upload error: ' + err.message);
        break;
      }
    }

    rebuildCylinderPanels();
    setTab('names');
    if (window.renderWorksPage) window.renderWorksPage();

    pickPcBtn.disabled = false;
    pickPcBtn.textContent = 'Select Photos from Computer';
    fileInput.value = '';
  });
}

function refreshCardsList() {
  const itemsList = document.getElementById('card-mgr-items-list');
  const countBadge = document.getElementById('card-mgr-count-badge');
  if (!itemsList) return;

  const cards = getAllCards();
  countBadge.textContent = `${cards.length} Card${cards.length !== 1 ? 's' : ''}`;
  itemsList.innerHTML = '';

  if (cards.length === 0) {
    itemsList.innerHTML = `
      <div class="card-mgr-empty">
        No photos in gallery yet.<br>
        Scan the QR code under "Mobile Sync" or click "Upload from PC" to add photos as pic1, pic2...
      </div>
    `;
    return;
  }

  const filtered = searchFilter
    ? cards.filter(c => (c.title || '').toLowerCase().includes(searchFilter))
    : cards;

  if (filtered.length === 0) {
    itemsList.innerHTML = `<div class="card-mgr-empty">No cards match "${searchFilter}".</div>`;
    return;
  }

  filtered.forEach((card) => {
    const index = cards.findIndex(c => c.id === card.id);
    const row = document.createElement('div');
    row.className = 'card-mgr-row';

    const img = document.createElement('img');
    img.className = 'card-mgr-thumb';
    img.src = card.cover || card.image || card.imageSmall;

    const meta = document.createElement('div');
    meta.className = 'card-mgr-meta';

    const num = document.createElement('span');
    num.className = 'card-mgr-num';
    num.textContent = `Card #${index + 1}`;

    const input = document.createElement('input');
    input.className = 'card-mgr-input';
    input.type = 'text';
    input.value = card.title || `pic${index + 1}`;

    let debounceTimer = null;
    input.addEventListener('input', (e) => {
      const newTitle = e.target.value.trim() || `pic${index + 1}`;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateCardName(card.id, newTitle);
        if (window.renderWorksPage) window.renderWorksPage();
      }, 350);
    });

    meta.appendChild(num);
    meta.appendChild(input);

    const delBtn = document.createElement('button');
    delBtn.className = 'card-mgr-del-btn';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Delete card';
    delBtn.addEventListener('click', () => {
      if (confirm(`Remove ${card.title}?`)) {
        deleteCard(card.id);
        rebuildCylinderPanels();
        refreshCardsList();
        if (window.renderWorksPage) window.renderWorksPage();
      }
    });

    row.appendChild(img);
    row.appendChild(meta);
    row.appendChild(delBtn);
    itemsList.appendChild(row);
  });
}

async function fetchNetworkInfo() {
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    if (data.uploadUrl) {
      const qrImg = document.getElementById('card-mgr-qr-img');
      const urlInput = document.getElementById('card-mgr-mobile-url');
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.uploadUrl)}`;
      }
      if (urlInput) {
        urlInput.value = data.uploadUrl;
      }
    }
  } catch (e) {}
}

function readAndCompressImage(file, maxDimension = 4096, quality = 0.98) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size < 15 * 1024 * 1024) {
          resolve(e.target.result);
          return;
        }
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
