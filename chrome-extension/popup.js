const setupView = document.getElementById('setup-view');
const mainView = document.getElementById('main-view');
const setupUrlInput = document.getElementById('setup-url');
const setupSaveBtn = document.getElementById('setup-save');
const changeUrlLink = document.getElementById('change-url');

const pageIcon = document.getElementById('page-icon');
const pageTitle = document.getElementById('page-title');
const pageUrl = document.getElementById('page-url');
const linkName = document.getElementById('link-name');
const groupSelect = document.getElementById('group-select');
const addBtn = document.getElementById('add-btn');
const statusEl = document.getElementById('status');

let startPageUrl = '';

// Init
chrome.storage.sync.get(['startPageUrl'], async (result) => {
  startPageUrl = result.startPageUrl || '';
  if (!startPageUrl) {
    showSetup();
  } else {
    await showMain();
  }
});

function showSetup() {
  setupView.style.display = '';
  mainView.style.display = 'none';
  setupUrlInput.value = startPageUrl;
  setupUrlInput.focus();
}

async function showMain() {
  setupView.style.display = 'none';
  mainView.style.display = '';

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    const url = tab.url || '';
    const title = tab.title || '';
    const domain = getDomain(url);

    pageTitle.textContent = title;
    pageUrl.textContent = url;
    linkName.value = title;

    if (domain) {
      pageIcon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
  }

  // Load groups
  await loadGroups();
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function normalizeUrl(url) {
  url = url.trim().replace(/\/+$/, '');
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

// Save URL
setupSaveBtn.addEventListener('click', () => {
  const url = normalizeUrl(setupUrlInput.value);
  if (!url || url === 'https://') return;
  startPageUrl = url;
  chrome.storage.sync.set({ startPageUrl }, () => showMain());
});

setupUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') setupSaveBtn.click();
});

// Change URL
changeUrlLink.addEventListener('click', (e) => {
  e.preventDefault();
  showSetup();
});

// Load groups from Start Page API
async function loadGroups() {
  groupSelect.innerHTML = '<option value="">Loading...</option>';
  try {
    const res = await fetch(`${startPageUrl}/api/links/groups`, {
      credentials: 'include'
    });

    if (res.status === 401) {
      groupSelect.innerHTML = '<option value="">Sign in to your Start Page first</option>';
      addBtn.disabled = true;
      return;
    }

    if (!res.ok) throw new Error('Failed to load groups');

    const data = await res.json();
    groupSelect.innerHTML = '';
    if (data.groups && data.groups.length > 0) {
      data.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.title;
        groupSelect.appendChild(opt);
      });
      addBtn.disabled = false;
    } else {
      groupSelect.innerHTML = '<option value="">No groups found</option>';
      addBtn.disabled = true;
    }
  } catch (e) {
    groupSelect.innerHTML = '<option value="">Could not connect</option>';
    addBtn.disabled = true;
  }
}

// Add link
addBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  statusEl.style.display = 'none';

  const name = linkName.value.trim();
  const url = pageUrl.textContent;
  const groupId = groupSelect.value;

  if (!name || !url) return;

  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  try {
    const res = await fetch(`${startPageUrl}/api/links/add`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, name, url, useFavicon: true })
    });

    if (res.ok) {
      const data = await res.json();
      statusEl.className = 'status success';
      statusEl.textContent = `Added to "${data.groupTitle}"`;
      statusEl.style.display = 'block';
      addBtn.textContent = 'Added!';
      setTimeout(() => window.close(), 1500);
    } else {
      const err = await res.json().catch(() => ({}));
      statusEl.className = 'status error';
      statusEl.textContent = err.error || 'Failed to add link';
      statusEl.style.display = 'block';
      addBtn.disabled = false;
      addBtn.textContent = 'Add Link';
    }
  } catch (e) {
    statusEl.className = 'status error';
    statusEl.textContent = 'Could not connect to Start Page';
    statusEl.style.display = 'block';
    addBtn.disabled = false;
    addBtn.textContent = 'Add Link';
  }
});
