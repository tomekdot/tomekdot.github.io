<div align="center">

# 🌌 tomekdot

**Interaktywne portfolio na GitHubie i dziennik techniczny**

Pluginy Trackmania, agentowe systemy AI i projekty akademickie, zbudowane w React + Vite.

[**🚀 Zobacz demo →**](https://tomekdot.github.io/)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Funkcje

**🔍 Przeglądanie**
- 📦 Karty repozytoriów z gwiazdkami, forkami, językiem i kategorią
- 🔎 Wyszukiwanie i filtry po nazwie, języku, kategorii i roku
- 📊 Wykres technologii, czyli podział stosu
- 🗂️ Widoki: grupowany, siatka i kompaktowy

**🌠 Eksploracja**
- 🪐 Galaktyka: orbitalna mapa wpisów i tagów na osi czasu
- 💻 Interaktywny terminal do przeglądania repozytoriów w stylu CLI
- 🧩 Modale z architekturą (UML) i szczegółowymi statystykami
- 📖 Dziennik techniczny o agentach, wydajności i grafach wiedzy

**⚙️ Pod maską**
- 🔄 Synchronizacja z GitHub API na żywo
- 🇵🇱 🇬🇧 Interfejs PL / EN z poprawną polską odmianą
- 🔒 Przełącznik prywatnych repozytoriów
- 📱 Responsywny układ, obsługa ograniczenia ruchu i lekki tryb dla słabszych telefonów
- ⚡ Modale ładowane leniwie dla szybkiego startu

## 🗂️ Kategorie

| Kategoria | Zakres |
|---|---|
| 🤖 AI & Autonomous Agents | Projekty LLM i agenty |
| 🌐 Openplanet Plugins | Pluginy Trackmania (AngelScript) |
| 🐍 PyPlanet Plugins | Pluginy serwera Trackmania (Python) |
| 🏎️ Trackmania | Mapy i powiązane narzędzia |
| 🔧 Dev Tools & Automation | Narzędzia CLI i skrypty |
| 💬 Discord & Community Bots | Boty i narzędzia społecznościowe |
| 🌍 Web Apps & APIs | Aplikacje webowe i fullstack |
| 🎓 Academic (KUL) | Projekty uniwersyteckie |
| 📦 Other Utilities & Archives | Różne |

## 🛠️ Stack technologiczny

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Motion · Lucide Icons · React Markdown (rehype / remark)

## 🚀 Uruchomienie

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produkcyjny → dist/
npm run lint     # sprawdzenie typów (tsc --noEmit)
```

Wdrożenie: GitHub Actions buduje projekt i publikuje go na GitHub Pages.

## 🤖 Dostawcy AI (opcjonalnie)

Wbudowany asystent może korzystać z Google Gemini (klucz z Google AI Studio) albo z lokalnego silnika: Ollama, LM Studio lub własnego endpointu zgodnego z OpenAI. Klucz jest przechowywany wyłącznie w przeglądarce (`localStorage` lub `sessionStorage`).

## 📄 Licencja

[MIT](LICENSE) © Tomasz Kaczak