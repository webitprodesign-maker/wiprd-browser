const CONTAINER_COLORS = {
  default: '#9a9aa6',
  personal: '#3b82f6',
  work: '#f97316',
  banking: '#22c55e',
  shopping: '#a855f7'
};

const state = {
  profile: 'personal',
  container: 'default',
  workspace: 'general',
  splitView: false,
  tabs: [],
  activeTabId: null,
  secondaryTabId: null,
  aiHistory: []
};

// DOM Elements
const zenSidebar = document.getElementById('zenSidebar');
const tabList = document.getElementById('tabList');
const primaryPane = document.getElementById('primaryPane');
const secondaryPane = document.getElementById('secondaryPane');
const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const activeContainerPill = document.getElementById('activeContainerPill');
const profileSelect = document.getElementById('profileSelect');
const containerSelect = document.getElementById('containerSelect');
const aiSidebar = document.getElementById('aiSidebar');
const aiProvider = document.getElementById('aiProvider');
const aiApiKey = document.getElementById('aiApiKey');
const aiIncludePage = document.getElementById('aiIncludePage');
const aiPagePill = document.getElementById('aiPagePill');
const aiMessages = document.getElementById('aiMessages');
const aiForm = document.getElementById('aiForm');
const aiPromptInput = document.getElementById('aiPromptInput');

// Window Controls
document.getElementById('winMin').onclick = () => window.wiprd.minimize();
document.getElementById('winMax').onclick = () => window.wiprd.maximize();
document.getElementById('winClose').onclick = () => window.wiprd.close();

// Sidebar & Split View Toggles
document.getElementById('btnToggleSidebar').onclick = () => {
  zenSidebar.classList.toggle('compact');
};

document.getElementById('btnToggleAI').onclick = () => {
  aiSidebar.classList.toggle('hidden');
  updateAIPagePill();
};

document.getElementById('btnCloseAI').onclick = () => {
  aiSidebar.classList.add('hidden');
};

document.getElementById('btnSplitView').onclick = (e) => {
  state.splitView = !state.splitView;
  e.currentTarget.classList.toggle('active', state.splitView);
  secondaryPane.classList.toggle('hidden', !state.splitView);
  if (state.splitView && !state.secondaryTabId) {
    const other = state.tabs.find((t) => t.id !== state.activeTabId);
    if (other) {
      state.secondaryTabId = other.id;
    } else {
      createTab('https://duckduckgo.com', true);
    }
  }
  renderPanes();
};

// Profile & Container changes
profileSelect.onchange = () => {
  state.profile = profileSelect.value;
};

containerSelect.onchange = () => {
  state.container = containerSelect.value;
};

// Workspaces
document.querySelectorAll('.workspace-btn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.workspace-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.workspace = btn.dataset.ws;
    const wsTabs = state.tabs.filter((t) => t.workspace === state.workspace);
    if (wsTabs.length > 0) {
      activateTab(wsTabs[0].id);
    } else {
      createTab('https://duckduckgo.com');
    }
    renderTabs();
  };
});

// Navigation Controls
document.getElementById('btnBack').onclick = () => getActiveWebview()?.goBack();
document.getElementById('btnForward').onclick = () => getActiveWebview()?.goForward();
document.getElementById('btnReload').onclick = () => getActiveWebview()?.reload();
document.getElementById('btnNewTab').onclick = () => createTab('https://duckduckgo.com');

urlForm.onsubmit = (e) => {
  e.preventDefault();
  const raw = urlInput.value.trim();
  if (!raw) return;
  const url = normalizeUrl(raw);
  const wv = getActiveWebview();
  if (wv) wv.loadURL(url);
};

function normalizeUrl(input) {
  if (/^https?:\/\//i.test(input)) return input;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input)) return `https://${input}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
}

function createTab(url = 'https://duckduckgo.com', asSecondary = false) {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const tab = {
    id,
    url,
    title: 'Novo Separador',
    workspace: state.workspace,
    profile: state.profile,
    container: state.container
  };

  const wv = document.createElement('webview');
  wv.setAttribute('src', url);
  wv.setAttribute('partition', `persist:${tab.profile}-${tab.container}`);
  wv.setAttribute('allowpopups', '');

  wv.addEventListener('page-title-updated', (e) => {
    tab.title = e.title || tab.url;
    renderTabs();
    if (tab.id === state.activeTabId) updateAIPagePill();
  });

  wv.addEventListener('did-navigate', (e) => {
    tab.url = e.url;
    if (tab.id === state.activeTabId) {
      urlInput.value = e.url;
      updateAIPagePill();
    }
  });

  wv.addEventListener('did-navigate-in-page', (e) => {
    tab.url = e.url;
    if (tab.id === state.activeTabId) urlInput.value = e.url;
  });

  tab.webview = wv;
  state.tabs.push(tab);

  if (asSecondary) {
    state.secondaryTabId = id;
  } else {
    state.activeTabId = id;
  }

  renderTabs();
  renderPanes();
  return tab;
}

function activateTab(id) {
  state.activeTabId = id;
  const tab = state.tabs.find((t) => t.id === id);
  if (tab) {
    urlInput.value = tab.url;
    activeContainerPill.textContent = `${tab.profile} · ${tab.container}`;
    activeContainerPill.style.borderLeft = `3px solid ${CONTAINER_COLORS[tab.container] || '#9a9aa6'}`;
  }
  renderTabs();
  renderPanes();
  updateAIPagePill();
}

function closeTab(id, e) {
  e.stopPropagation();
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const [removed] = state.tabs.splice(idx, 1);
  removed.webview.remove();

  if (state.activeTabId === id) {
    const next = state.tabs.find((t) => t.workspace === state.workspace) || state.tabs[0];
    state.activeTabId = next ? next.id : null;
  }
  if (state.secondaryTabId === id) {
    state.secondaryTabId = null;
  }
  if (state.tabs.length === 0) {
    createTab('https://duckduckgo.com');
  } else {
    renderTabs();
    renderPanes();
  }
}

function getActiveWebview() {
  return state.tabs.find((t) => t.id === state.activeTabId)?.webview || null;
}

function renderTabs() {
  tabList.innerHTML = '';
  const visibleTabs = state.tabs.filter((t) => t.workspace === state.workspace);
  visibleTabs.forEach((tab) => {
    const item = document.createElement('div');
    item.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
    item.onclick = () => activateTab(tab.id);

    const dot = document.createElement('span');
    dot.className = 'tab-dot';
    dot.style.background = CONTAINER_COLORS[tab.container] || '#9a9aa6';

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = (e) => closeTab(tab.id, e);

    item.append(dot, title, closeBtn);
    tabList.appendChild(item);
  });
}

function renderPanes() {
  primaryPane.innerHTML = '';
  secondaryPane.innerHTML = '';

  const primaryTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (primaryTab) {
    primaryPane.appendChild(primaryTab.webview);
    urlInput.value = primaryTab.url;
    activeContainerPill.textContent = `${primaryTab.profile} · ${primaryTab.container}`;
  }

  if (state.splitView && state.secondaryTabId) {
    const secTab = state.tabs.find((t) => t.id === state.secondaryTabId);
    if (secTab) secondaryPane.appendChild(secTab.webview);
  }
}

// AI Sidebar Logic (Brave Leo + Firefox Multi-AI)
function updateAIPagePill() {
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  aiPagePill.textContent = tab ? `Página: ${tab.title}` : 'Página: Nenhuma';
}

// Persist API Key per provider
aiProvider.onchange = () => {
  aiApiKey.value = localStorage.getItem(`wiprd_key_${aiProvider.value}`) || '';
  aiApiKey.style.display = aiProvider.value === 'ollama' ? 'none' : 'block';
};

aiApiKey.oninput = () => {
  localStorage.setItem(`wiprd_key_${aiProvider.value}`, aiApiKey.value.trim());
};

// Load saved key on startup
aiApiKey.value = localStorage.getItem(`wiprd_key_${aiProvider.value}`) || '';

document.querySelectorAll('.chip-btn').forEach((btn) => {
  btn.onclick = () => sendAIMessage(btn.dataset.prompt);
});

aiForm.onsubmit = (e) => {
  e.preventDefault();
  const text = aiPromptInput.value.trim();
  if (!text) return;
  aiPromptInput.value = '';
  sendAIMessage(text);
};

async function getActivePageContext() {
  if (!aiIncludePage.checked) return null;
  const wv = getActiveWebview();
  if (!wv) return null;
  try {
    const text = await wv.executeJavaScript('document.body ? document.body.innerText : ""');
    const tab = state.tabs.find((t) => t.id === state.activeTabId);
    return {
      title: tab?.title || '',
      url: tab?.url || '',
      text: text || ''
    };
  } catch {
    return null;
  }
}

function appendAIMessage(role, text) {
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}

async function sendAIMessage(prompt) {
  appendAIMessage('user', prompt);
  state.aiHistory.push({ role: 'user', content: prompt });

  const loadingEl = appendAIMessage('assistant', 'A pensar...');
  const pageContext = await getActivePageContext();

  const res = await window.wiprd.aiChat({
    provider: aiProvider.value,
    apiKey: aiApiKey.value.trim(),
    messages: state.aiHistory.slice(-10),
    pageContext
  });

  if (res.ok) {
    loadingEl.textContent = res.reply;
    state.aiHistory.push({ role: 'assistant', content: res.reply });
  } else {
    loadingEl.textContent = `⚠️ ${res.error}`;
  }
}

// Initialize with first tab
createTab('https://duckduckgo.com');
