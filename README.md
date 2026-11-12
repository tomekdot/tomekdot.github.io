<div align="center">

# 🌌 tomekdot

**Interactive GitHub portfolio and technical journal**

Trackmania plugins, agentic AI systems and academic CS projects, built with React + Vite.

[**🚀 Live demo →**](https://tomekdot.github.io/) · [Polski](README.pl.md)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Features

**🔍 Browse**
- 📦 Repository cards with stars, forks, language and category
- 🔎 Search and filters by name, language, category and year
- 📊 Tech stack chart with language breakdown
- 🗂️ Grouped, grid and compact views

**🌠 Explore**
- 🪐 Galaxy: orbital map of posts and tags on a timeline
- 💻 Interactive terminal for browsing repositories CLI-style
- 🧩 Architecture (UML) and detailed statistics modals
- 📖 Technical journal on agents, performance and knowledge graphs

**⚙️ Under the hood**
- 🔄 Live sync with the GitHub API
- 🇵🇱 🇬🇧 PL / EN interface with correct Polish pluralization
- 🔒 Private repositories toggle
- 📱 Responsive layout, reduced-motion support and a lightweight mode for weaker phones
- ⚡ Lazy-loaded modals for fast first paint

## 🗂️ Categories

| Category | Scope |
|---|---|
| 🤖 AI & Autonomous Agents | LLM projects and agents |
| 🌐 Openplanet Plugins | Trackmania in-game plugins (AngelScript) |
| 🐍 PyPlanet Plugins | Trackmania server plugins (Python) |
| 🏎️ Trackmania | Maps and related tools |
| 🔧 Dev Tools & Automation | CLI tools and scripts |
| 💬 Discord & Community Bots | Bots and community tools |
| 🌍 Web Apps & APIs | Web and fullstack projects |
| 🎓 Academic (KUL) | University projects |
| 📦 Other Utilities & Archives | Miscellaneous |

## 🛠️ Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Motion · Lucide Icons · React Markdown (rehype / remark)

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build -> dist/
npm run lint     # type check (tsc --noEmit)
```

Deployment: GitHub Actions builds the project and publishes it to GitHub Pages.

## 🤖 AI providers (optional)

The built-in assistant can use Google Gemini (API key from Google AI Studio) or a local engine: Ollama, LM Studio or a custom OpenAI-compatible endpoint. The key is stored only in the browser (`localStorage` or `sessionStorage`).

## 📄 License

[MIT](LICENSE) © Tomasz Kaczak