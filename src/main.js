const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#111114',
    icon: path.join(__dirname, 'assets', 'logo.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

// Multi-provider AI handler (OpenAI, Anthropic, Gemini, Ollama)
ipcMain.handle('ai:chat', async (_event, { provider, apiKey, model, messages, pageContext }) => {
  const systemPrompt = pageContext
    ? `You are WIPRD AI, an assistant built into WIPRD Browser (similar to Brave Leo). The user is currently viewing:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\n\nPage Content:\n${pageContext.text.slice(0, 12000)}\n\nAnswer the user's question concisely and helpfully based on this page when relevant.`
    : 'You are WIPRD AI, a helpful assistant built into WIPRD Browser.';

  try {
    if (provider === 'openai') {
      if (!apiKey) throw new Error('API Key da OpenAI em falta.');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...messages]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro na API da OpenAI');
      return { ok: true, reply: data.choices[0].message.content };
    }

    if (provider === 'anthropic') {
      if (!apiKey) throw new Error('API Key da Anthropic em falta.');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-latest',
          max_tokens: 1024,
          system: systemPrompt,
          messages
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro na API da Anthropic');
      return { ok: true, reply: data.content[0].text };
    }

    if (provider === 'gemini') {
      if (!apiKey) throw new Error('API Key do Google Gemini em falta.');
      const geminiModel = model || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro na API do Gemini');
      return { ok: true, reply: data.candidates[0].content.parts[0].text };
    }

    if (provider === 'ollama') {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          stream: false,
          messages: [{ role: 'system', content: systemPrompt }, ...messages]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao contactar Ollama local');
      return { ok: true, reply: data.message.content };
    }

    throw new Error(`Fornecedor desconhecido: ${provider}`);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
