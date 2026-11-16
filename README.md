# WIPRD Browser

Browser desktop baseado em **Chromium (Electron)** com design e funcionalidades inspiradas no **Zen Browser**, **Brave Leo** e **Firefox Multi-AI**.

## Funcionalidades
- **Visual Zen Browser:** Separadores verticais, modo compacto, *Workspaces* (Geral, Trabalho, Pesquisa, Media) e *Split View* (2 páginas lado a lado).
- **Perfis e Containers:** Isolamento real de sessão/cookies por perfil e container (`persist:<perfil>-<container>`).
- **WIPRD AI Sidebar (Leo + Firefox):** Lê automaticamente o conteúdo da página aberta e permite escolher entre **Google Gemini**, **OpenAI**, **Anthropic Claude** ou **Ollama (Local)**.

## Executar localmente
```bash
npm install
npm start
```

## Gerar Instaladores (macOS e Windows)
- **macOS (`.dmg` e `.zip`):** `npm run build:mac` (executar num Mac ou via GitHub Actions)
- **Windows (`.exe` NSIS):** `npm run build:win` (executar num Windows ou via GitHub Actions)

O workflow em `.github/workflows/build.yml` gera automaticamente os instaladores para **macOS** e **Windows** no GitHub Actions.
