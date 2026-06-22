/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CategorySpec, Repository, BlogPost } from './types';

export const CATEGORIES: Record<string, CategorySpec> = {
  pyplanet: {
    key: 'pyplanet',
    labelEn: 'PyPlanet Plugins',
    labelPl: 'Wtyczki PyPlanet',
    icon: 'Gamepad2',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30'
  },
  openplanet: {
    key: 'openplanet',
    labelEn: 'Openplanet Plugins',
    labelPl: 'Wtyczki Openplanet',
    icon: 'Globe',
    colorClass: 'text-fuchsia-400',
    bgClass: 'bg-fuchsia-500/10',
    borderClass: 'border-fuchsia-500/30'
  },
  trackmania: {
    key: 'trackmania',
    labelEn: 'Trackmania General',
    labelPl: 'Ogólne Trackmania',
    icon: 'Car',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30'
  },
  ai: {
    key: 'ai',
    labelEn: 'AI & Agents',
    labelPl: 'AI i Agenci',
    icon: 'Bot',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/30'
  },
  kul: {
    key: 'kul',
    labelEn: 'Academic (KUL)',
    labelPl: 'Projekty KUL (Studia)',
    icon: 'GraduationCap',
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30'
  },
  other: {
    key: 'other',
    labelEn: 'Other Utilities',
    labelPl: 'Inne Narzędzia',
    icon: 'Archive',
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/30'
  }
};

// Set this to true if you want to allow everyone (ordinary visitors without a token) to see private repositories by default.
// Ustaw na true, jeśli chcesz, aby każdy odwiedzający stronę (bez wpisanego tokenu) widział domyślnie prywatne repozytoria.
export const SHOW_PRIVATE_REPOS_TO_PUBLIC = false;

export const REPOS: Repository[] = [
  // PyPlanet
  {
    name: "pyplanet-clanspirits",
    desc: "Competitive spirit/team scoring based on local records.",
    descPl: "Konkurencja duchów/punktacja zespołowa oparta na rekordach lokalnych.",
    lang: "Python",
    cat: ["pyplanet", "trackmania"],
    url: "https://github.com/tomekdot/pyplanet-clanspirits",
    stars: 14,
    forks: 3,
    commitsCount: 38,
    createdYear: 2023,
    longDescEn: "Adds competitive team scoring structures, dynamic player ranks and 'clan' allegiance to your TrackMania PyPlanet server. Players can join spirits, earn points based on records, and compete in team rankings.",
    longDescPl: "Dodaje konkurencyjne systemy punktacji zespołowej, dynamiczne rangi graczy oraz przynależność do klanów (duchów) na serwerze TrackMania z PyPlanet. Gracze zbierają punkty za bicie rekordów.",
    codeSnippet: {
      filename: "clanwars/points.py",
      language: "python",
      code: `class ClanPointCalculator:
    def __init__(self, base_score=100, scale_factor=1.5):
        self.base_score = base_score
        self.scale = scale_factor

    def calculate_record_points(self, rank: int, total: int) -> int:
        if rank > 5:
            return 5
        return int(self.base_score * (1.0 / (rank ** self.scale)))`
    }
  },
  {
    name: "pyplanet-github-installer",
    desc: "Install plugins from GitHub with /ghinstall command.",
    descPl: "Instaluj pluginy bezpośrednio z GitHub poleceniem /ghinstall.",
    lang: "Python",
    cat: ["pyplanet", "trackmania"],
    url: "https://github.com/tomekdot/pyplanet-github-installer",
    stars: 12,
    forks: 2,
    commitsCount: 19,
    createdYear: 2023,
    longDescEn: "A utility plugin allowing TrackMania server managers to install other PyPlanet plugins directly from raw GitHub repositories. Handles download, file unpacking, validation, and auto-registration.",
    longDescPl: "Projekt narzędziowy dla moderatorów serwerów TrackMania umożliwiający pobieranie i ładowanie innych bibliotek/komponentów PyPlanet prosto z repozytorium GitHub za pomocą polecenia w grze.",
    codeSnippet: {
      filename: "commands.py",
      language: "python",
      code: `@command(name='ghinstall', admin=True)
async def gh_install_plugin(player, repo_path, **kwargs):
    # Fetch zipball from raw.githubusercontent
    url = f"https://api.github.com/repos/{repo_path}/zipball/master"
    await player.send_chat(f"Downloading from {repo_path}...")
    success = await download_and_extract_plugin(url)
    if success:
        await player.send_chat("Plugin loaded successfully! Restart server to apply.")`
    }
  },
  {
    name: "pyplanet-hello-world",
    desc: "Minimal starter template for creating PyPlanet plugins.",
    descPl: "Minimalny szablon początkowy do budowania wtyczek PyPlanet.",
    lang: "Python",
    cat: ["pyplanet", "trackmania"],
    url: "https://github.com/tomekdot/pyplanet-hello-world",
    stars: 5,
    forks: 1,
    commitsCount: 8,
    createdYear: 2023,
    longDescEn: "Boilerplate plugin for server developers. Comes configured with setting initializations, event listener interfaces, UI template renderers, and basic chat commands.",
    longDescPl: "Szablon wyjściowy dla developerów serwerowych. Posiada prekonfigurowane nasłuchiwacze zdarzeń, podstawowe okna graficzne UI oraz komendy czatu.",
    codeSnippet: {
      filename: "__init__.py",
      language: "python",
      code: `from pyplanet.apps.config import AppConfig

class HelloWorldConfig(AppConfig):
    name = 'pyplanet_hello_world'
    label = 'hello_world'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def on_start(self):
        self.context.signals.listen('trackmania.player_connect', self.player_connect)`
    }
  },
  {
    name: "pomodoro-plugin-dev",
    desc: "Pomodoro timer for Trackmania with tasks, statistics, and shortcuts.",
    descPl: "Licznik Pomodoro dla Trackmanii z zadaniami, statystykami i skrótami.",
    lang: "AngelScript",
    cat: ["openplanet", "trackmania"],
    url: "https://github.com/tomekdot/pomodoro-plugin-dev",
    stars: 21,
    forks: 4,
    commitsCount: 64,
    createdYear: 2024,
    longDescEn: "A high-productivity Pomodoro technique timer integrated right into Trackmania's overlay. Includes task checklists, custom session lengths, progress charts, automated track muting, and keyboard shortcuts.",
    longDescPl: "Dodatek integrujący system pracy/nauki Pomodoro bezpośrednio w grze TrackMania. Zawiera listę zadań, powiadomienia, wyciszanie muzyki podczas skupienia i szczegółowe statystyki z gry.",
    codeSnippet: {
      filename: "Main.as",
      language: "angelscript",
      code: `class PomodoroTimer {
    uint duration = 25 * 60;
    uint elapsed = 0;
    bool isWorking = true;

    void Update(float dt) {
        if (!isPaused) {
            elapsed += int(dt);
            if (elapsed >= duration) {
                PlayNotificationSound();
                TogglePhase();
            }
        }
    }
}`
    }
  },
  {
    name: "pursuit-channel-agent",
    desc: "AI agent that selects ManiaPlanet playlists based on the lunar month.",
    descPl: "Agent AI optymalizujący playlisty w ManiaPlanet na bazie kalendarza księżycowego.",
    lang: "Python",
    cat: ["ai", "trackmania"],
    url: "https://github.com/tomekdot/pursuit-channel-agent",
    stars: 8,
    forks: 1,
    commitsCount: 14,
    createdYear: 2023,
    longDescEn: "Automated agent that logs into server panels, monitors running configurations, and shifts track cycles following lunar fluctuations to balance atmospheric difficulty curves.",
    longDescPl: "Automatyczny skrypt i agent AI, który loguje się do systemu ManiaPlanet i ładuje odpowiednie paczki map dopasowane do aktualnej fazy cyklu księżycowego.",
    codeSnippet: {
      filename: "agent.py",
      language: "python",
      code: `def get_lunar_phase_playlist(day_of_month):
    if day_of_month in [0, 29]:
        return "NewMoon_Mystic_Tracks.xml"
    elif 14 <= day_of_month <= 16:
        return "FullMoon_HighIntensity_Tracks.xml"
    return "Standard_Rotation.xml"`
    }
  },
  {
    name: "pursuit-maps",
    desc: "ManiaPlanet Feedback S1 E1 TrackMania Pursuit maps dataset.",
    descPl: "Zbiór map z cyklu TrackMania Pursuit z unikalnymi metadanymi i skryptami.",
    lang: "Python",
    cat: ["trackmania"],
    url: "https://github.com/tomekdot/pursuit-maps",
    stars: 9,
    forks: 2,
    commitsCount: 22,
    createdYear: 2023,
    longDescEn: "Comprehensive dataset indexing pursuit maps with embedded track validation UIDs, hex headers, high-resolution thumbnail extractions, and original race configurations.",
    longDescPl: "Baza danych i skrypty indeksujące mapy z trybu pościgu w grze TrackMania. Obejmuje analizę nagłówków HEX oraz ekstrakcję ikon map.",
    codeSnippet: {
      filename: "extractor.py",
      language: "python",
      code: `def parse_map_xml(hex_data):
    # Locate <header> tags in ManiaPlanet map file
    start_idx = hex_data.find(b'<header')
    end_idx = hex_data.find(b'</header>') + 9
    return hex_data[start_idx:end_idx].decode('utf-8', errors='ignore')`
    }
  },
  // Openplanet
  {
    name: "apeiron-galaxy-dev",
    desc: "13 moon phase calendar plugin overlay for Trackmania.",
    descPl: "Kalendarz 13 cykli księżycowych z nakładką w grze Trackmania.",
    lang: "AngelScript",
    cat: ["openplanet", "trackmania"],
    url: "https://github.com/tomekdot/apeiron-galaxy-dev",
    stars: 18,
    forks: 3,
    commitsCount: 41,
    createdYear: 2024,
    longDescEn: "Immersive astronomical calendar dashboard rendered natively inside Trackmania. Follows the 13-moon system, featuring dynamic star signs, cosmic calculations, and full visual customization.",
    longDescPl: "Urokliwy kalendarz planetarno-księżycowy wyświetlany bezpośrednio na ekranie gry przez nakładkę Openplanet. Oblicza strefy i fazy kosmiczne dla zawodników.",
    codeSnippet: {
      filename: "Apeiron.as",
      language: "angelscript",
      code: `void RenderMenu() {
    if (UI::BeginMenu("Apeiron Galaxy")) {
        if (UI::MenuItem("Show Lunar Tracker", "", showTracker)) {
            showTracker = !showTracker;
        }
        UI::EndMenu();
    }
}`
    }
  },
  {
    name: "vehicle-detector-dev",
    desc: "Computer vision custom training sample exporter for ManiaPlanet 4.",
    descPl: "Zautomatyzowany eksporter próbek obrazu do trenowania sieci neuronowych.",
    lang: "AngelScript",
    cat: ["openplanet", "trackmania"],
    url: "https://github.com/tomekdot/vehicle-detector-dev",
    stars: 15,
    forks: 4,
    commitsCount: 30,
    createdYear: 2024,
    longDescEn: "A tracking framework extracting bounding boxes and 3D wireframe models of vehicles in real-time. Designed to gather custom dataset screenshots to train convolutional neural networks (YOLO).",
    longDescPl: "Rozbudowany skrypt wyciągający współrzędne 3D aut, nakładający ramki wykrywania obiektów oraz ułatwiający eksport datasetów treningowych z silnika gry.",
    codeSnippet: {
      filename: "BoundingBox.as",
      language: "angelscript",
      code: `vec3 GetVehicleScreenPos(CSmPlayer@ player) {
    auto scene_vis = Vehicle::GetVisualization(player);
    if (scene_vis !is null) {
        vec3 world_pos = scene_vis.Location.Position;
        return Camera::ToScreenSpace(world_pos);
    }
    return vec3(0, 0, 0);
}`
    }
  },
  {
    name: "event-calendar-dev",
    desc: "Lightweight upcoming event notifier overlay.",
    descPl: "Lekka nakładka informująca o nadchodzących wydarzeniach i fazach księżyca.",
    lang: "AngelScript",
    cat: ["openplanet", "trackmania"],
    url: "https://github.com/tomekdot/event-calendar-dev",
    stars: 7,
    forks: 1,
    commitsCount: 11,
    createdYear: 2024,
    longDescEn: "Keeps players aligned with schedules, community championships, and astronomical cycles, launching alerts directly in the corner of their gameplay view.",
    longDescPl: "Minimalistyczna wtyczka wyświetlająca przypomnienia o turniejach, ligach oraz zdarzeniach astronomicznych powiązanych z ekosystemem Trackmanii.",
    codeSnippet: {
      filename: "src/Main.as",
      language: "angelscript",
      code: `/*
 * Initializes the plugin's state at startup.
 * This function sets the initial date for the calendar to the current system date,
 * configures the debug mode based on settings, and restores the visibility state
 * of the main calendar window.
 */
void InitializePluginState() {
    // Synchronize the debug flag in the Helpers namespace with the plugin's settings.
    Helpers::SetDebugEnabled(S_EnableDebug);

    // If the calendar date has not been initialized yet (e.g., on first launch),
    // set it to the current system date.
    if (g_UIState.CalYear == 0) {
        Time::Info tm = Time::Parse(Time::Stamp);
        g_UIState.CalYear = tm.Year;
        g_UIState.CalMonth = tm.Month;
        g_UIState.SelectedDay = tm.Day;
        g_UIState.LastDateChangeMs = Time::Now;
    }

    // Restore the calendar window's visibility from the saved user setting.
    g_UIState.ShowCalendarWindow = S_ShowCalendarOnStart;
}

/*
 * The main entry point for the plugin, called once upon loading.
 * It orchestrates the entire startup sequence: initializing state, preloading assets,
 * performing the initial data fetch, and launching background coroutines for
 * periodic polling and notification monitoring.
 */
void Main() {
    InitializePluginState();
    PreloadSounds();
    Fetch::FetchLatestData();
    
    // Start the long-running background tasks.
    startnew(PollingCoroutine);     
    startnew(NotificationMonitorCoroutine); 
    startnew(AutoRefreshCoroutine);
}

/*
 * A long-running coroutine that periodically fetches the latest moon phase data.
 * This ensures that the event data stays up-to-date without requiring a manual refresh
 * or plugin reload. The polling interval is configurable.
 */
void PollingCoroutine() {
    while (true) {
        // Sleep for the configured interval. Enforce a minimum of 30 seconds to prevent API spam.
        int intervalSec = Math::Max(30, S_PollIntervalSec);
        sleep(intervalSec * 1000);
        
        // Fetch the latest data, which will update the global event list.
        if (S_EnableMoon) {
            Fetch::FetchLatestData();
        }
    }
}

/*
 * A long-running coroutine that monitors for pending notifications.
 * It checks periodically (e.g., every minute) if any events are within the
 * user-defined notification window and displays them if they haven't been shown already.
 */
void NotificationMonitorCoroutine() {
    while (true) {
        // On the first run, wait a few seconds to ensure the initial data fetch has completed
        // before trying to show any notifications.
        if (!g_InitialNotificationsShown) {
            sleep(5000); 
        }
        
        // After the initial notifications have been shown, this check will proceed without a delay.
        Notifications::ProcessAndShowNotifications();
        
        // Wait for one minute before the next check.
        sleep(kOneMinuteMs);
    }
}
/*
 * A coroutine that automatically retries fetching data if it seems stuck or missing.
 * If the user has navigated to a month that has no data and it's been more than 5 seconds
 * since the last navigation, this will trigger a refresh.
 */
void AutoRefreshCoroutine() {
    while (true) {
        // Call auto-retry for failed fetches (handles VPN/restart reconnections)
        Fetch::AutoRetryFailedFetches();

        // Only check if the window is open and we're not already loading.
        if (g_UIState.ShowCalendarWindow && !g_IsLoading && S_EnableMoon) {
            // If data for the currently viewed month is not what we last successfully fetched
            bool needsData = (g_UIState.CalYear != g_LastFetchedYear || g_UIState.CalMonth != g_LastFetchedMonth);
            
            // Check if we have any events - if empty, we may need to refresh
            bool hasEvents = !g_Events.IsEmpty();

            // If we need data or don't have events, and it's been more than 2 seconds since last change
            if ((needsData || !hasEvents) && (uint64(Time::Now) - g_UIState.LastDateChangeMs > 2000)) {
                if (S_EnableDebug) {
                    trace("[Moon] AutoRefreshCoroutine: Refreshing data for " + tostring(g_UIState.CalMonth) + "/" + tostring(g_UIState.CalYear));
                }
                Fetch::FetchForCalendarView();
            }
        }
        sleep(1000); // Check every second
    }
}`
    }
  },
  // AI / Agents
  {
    name: "trackmania-galaxy",
    desc: "Community wiki and structural knowledge base engine.",
    descPl: "Strukturalna encyklopedia wiedzy o uniwersum Trackmania Galaxy.",
    lang: "Ruby",
    cat: ["trackmania"],
    url: "https://github.com/tomekdot/trackmania-galaxy",
    stars: 11,
    forks: 2,
    commitsCount: 45,
    createdYear: 2023,
    longDescEn: "Static site and structured encyclopedic engine documenting advanced modding techniques, lunar servers information, custom maps, and script integrations.",
    longDescPl: "Portal dokumentacyjny i encyklopedia służąca do agregacji wiedzy o trybach astronomicznych i konfiguracjach serwerów TrackMania.",
    codeSnippet: {
      filename: "Gemfile",
      language: "ruby",
      code: `source 'https://rubygems.org'
gem 'jekyll', '~> 4.2'
gem 'jekyll-sitemap'
gem 'github-pages', group: :jekyll_plugins`
    }
  },
  {
    name: "hermes-skills",
    desc: "Hermes AI Agent skills and capability workflow expansions.",
    descPl: "Zbiór modułów funkcjonalności dla agentów AI z rodziny Hermes.",
    lang: "Python",
    cat: ["ai"],
    url: "https://github.com/tomekdot/hermes-skills",
    stars: 28,
    forks: 7,
    commitsCount: 74,
    createdYear: 2024,
    longDescEn: "A collection of custom modular skills for Hermes Agent, automating public GitHub workflow deprecated Node.js 20 actions scanning, Vite GitHub Pages deployments, and OpenPlanet/PyPlanet game plugins developer automation.",
    longDescPl: "Zbiór niestandardowych, modułowych narzędzi dla agenta Hermes, automatyzujących skanowanie przestarzałych akcji Node.js 20, wdrażanie aplikacji Vite na GitHub Pages oraz rozwój wtyczek OpenPlanet/PyPlanet.",
    codeSnippet: {
      filename: "hermes/skills/node24_scanner.py",
      language: "python",
      code: `class Node24ScannerSkill(BaseHermesSkill):
    async def scan_repository(self, repo_name: str) -> dict:
        # Scan workflow configurations for deprecated Node.js 20 actions
        workflows = await self.github.list_workflows(repo_name)
        deprecated = []
        for wf in workflows:
            content = await self.github.get_file_content(repo_name, wf["path"])
            if "setup-node@v3" in content or "node20" in content:
                deprecated.append({
                    "workflow": wf["name"],
                    "path": wf["path"],
                    "recommendation": "Upgrade to setup-node@v4 for Node.js 24 compatibility."
                })
        return {"repo": repo_name, "issues": deprecated}`
    }
  },
  {
    name: "MIKObot",
    desc: "Official chatbot for Mathematical Internet Olympiad Club (MIKO).",
    descPl: "Oficjalny bot ułatwiający naukę i komunikację Internetowego Koła MKO.",
    lang: "Python",
    cat: ["ai"],
    url: "https://github.com/tomekdot/MIKObot",
    stars: 16,
    forks: 3,
    commitsCount: 33,
    createdYear: 2023,
    longDescEn: "Telegram/Discord bot designed to manage task distributions, verify math puzzle submissions, track leadership schedules, and host mini-competitions.",
    longDescPl: "Interaktywny bot wspomagający rozwiązywanie i weryfikację zadań matematycznych, zarządzanie listami członków i przeprowadzanie mini-konkursów.",
    codeSnippet: {
      filename: "miko_bot/bot.py",
      language: "python",
      code: `async def verify_equation(message):
    equation = message.text.split("/solve ")[1]
    parsed_solution = math_parser.parse(equation)
    expected = database.get_solution(equation.id)
    if parsed_solution == expected:
        await message.reply("Correct answer! +10 MIKO points.")`
    }
  },
  {
    name: "re-tuning-432Hz",
    desc: "Musical signal re-tuning and acoustic frequency explorer.",
    descPl: "Eksperymentalny pakiety audio do dostrajania amplitudy do częstotliwości 432 Hz.",
    lang: "Python",
    cat: ["other"],
    url: "https://github.com/tomekdot/re-tuning-432Hz",
    stars: 13,
    forks: 1,
    commitsCount: 16,
    createdYear: 2023,
    longDescEn: "Applies pitch-shifting algorithms (FFT phase vocoder) to digital audio signals to alter tuning frequencies from standard 440 Hz standard pitch to Pythagorean 432 Hz.",
    longDescPl: "Program przeliczający nagrania audio ze stroju 440 Hz na uduchowiony strój 432 Hz przy zachowaniu stałego tempa poprzez algorytm FFT.",
    codeSnippet: {
      filename: "converter.py",
      language: "python",
      code: `import numpy as np
import scipy.io.wavfile as wav

def shift_pitch(data, rate, target=432, base=440):
    factor = target / base
    # Resample or run Phase Vocoder
    new_length = int(len(data) / factor)
    return np.interp(np.arange(0, len(data), factor), np.arange(0, len(data)), data)`
    }
  },
  // KUL
  {
    name: "KUL-2023-API",
    desc: "Academic API modeling and verification (KUL 2023).",
    descPl: "Akademickie modelowanie interfejsów sieciowych i walidacji API (KUL 2023).",
    lang: "HTML",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2023-API",
    stars: 4,
    forks: 0,
    commitsCount: 12,
    createdYear: 2023,
    longDescEn: "API documentation structures and sandbox endpoints built during university semester, demonstrating clean REST patterns, schema validations, and mock JSON servers.",
    longDescPl: "Strony dokumentacji API i piaskownice systemowe stworzone w ramach zajęć uczelnianych, dokumentujące czyste schematy JSON i operacje REST.",
    codeSnippet: {
      filename: "index.html",
      language: "html",
      code: `<div class="endpoint">
  <span class="method get">GET</span>
  <code>/api/v1/students</code>
  <p>Returns a list of student records in JSON format</p>
</div>`
    }
  },
  {
    name: "KUL-2023-PUS",
    desc: "Distributed systems and client-server communication protocols (PUS).",
    descPl: "Bezpieczeństwo i programowanie usług sieciowych (KUL 2023).",
    lang: "Python",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2023-PUS",
    stars: 3,
    forks: 0,
    commitsCount: 15,
    createdYear: 2023,
    longDescEn: "Practical socket communication, remote method invocations (RMI), UDP broadcast setups, and custom multithreaded client-server protocols designed for security courses.",
    longDescPl: "Projekty gniazd sieciowych, zdalnego wywoływania metod, rozsyłania pakietów UDP oraz wielowątkowych serwerów napisane na przedmioty sieciowe i bezpieczeństwo.",
    codeSnippet: {
      filename: "udp_server.py",
      language: "python",
      code: `import socket
server_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server_sock.bind(('0.0.0.0', 7070))
while True:
    data, addr = server_sock.recvfrom(1024)
    print(f"Packet received from: {addr}")
    server_sock.sendto(b"ACK_SECURE", addr)`
    }
  },
  {
    name: "KUL-2023-PO-II",
    desc: "Advanced Object-Oriented Programming principles in Java (PO-II).",
    descPl: "Zaawansowane paradygmaty programowania obiektowego w Javie (PO-II).",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2023-PO-II",
    stars: 5,
    forks: 0,
    commitsCount: 22,
    createdYear: 2023,
    longDescEn: "Comprehensive implementation of standard OOP design patterns (decorator, singleton, state, observer, strategy) along with concurrency safety, file pipelines, and generic typing.",
    longDescPl: "Zbiór zadań z Programowania Obiektowego II. Ćwiczenia obejmujące wzorce projektowe, wielowątkowość, generyki i strumienie wejścia/wyjścia (I/O).",
    codeSnippet: {
      filename: "DesignPatterns.java",
      language: "java",
      code: `public interface Observer {
    void update(String eventMessage);
}

public class Subject {
    private List<Observer> observers = new ArrayList<>();
    public void notifyAll(String msg) {
        observers.forEach(o -> o.update(msg));
    }
}`
    }
  },
  {
    name: "KUL-2023-AWRSP",
    desc: "Algorithmics and Complexity Analysis (AWRSP).",
    descPl: "Algorytmy i złożoność obliczeniowa — ćwiczenia i struktury danych.",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2023-AWRSP",
    stars: 6,
    forks: 1,
    commitsCount: 19,
    createdYear: 2023,
    longDescEn: "Studies of algorithmic complexity, tree traversals (BST, AVL), graph navigation (Dijkstra, Prim/Kruskal), dynamic programming, and search algorithms.",
    longDescPl: "Projekty analizujące złożoność czasową i pamięciową. Implementacje struktur takich jak drzewa AVL, algorytmy grafowe (Dijkstra) oraz podziały dynamiczne.",
    codeSnippet: {
      filename: "Dijkstra.java",
      language: "java",
      code: `public void solveDijkstra(int start) {
    PriorityQueue<Node> pq = new PriorityQueue<>(Comparator.comparingInt(n -> n.distance));
    nodes[start].distance = 0;
    pq.add(nodes[start]);
    while (!pq.isEmpty()) {
        Node curr = pq.poll();
        // check neighbors update...
    }
}`
    }
  },
  {
    name: "KUL-2023-AiSD",
    desc: "Algorithms and Data Structures basic syllabus (AiSD).",
    descPl: "Struktury danych i podstawy algorytmiki (AiSD KUL 2023).",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2023-AiSD",
    stars: 4,
    forks: 0,
    commitsCount: 20,
    createdYear: 2023,
    longDescEn: "Basic structures from queue systems, custom linked lists, hash collisions, sorting procedures (quicksort, mergesort), and classic computer science problems.",
    longDescPl: "Implementacja podstawowych struktur danych: listy dwukierunkowej, stacji kolejkowych, map mieszających oraz klasycznych algorytmów sortowania bąbelkowego i szybkiego.",
    codeSnippet: {
      filename: "QuickSort.java",
      language: "java",
      code: `public void quickSort(int[] arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`
    }
  },
  {
    name: "KUL-2024-SQL",
    desc: "Relational database systems design, normalization, and DML (SQL).",
    descPl: "Relacyjne bazy danych, normalizacja, zapytania DML i widoki (SQL).",
    lang: "SQL",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2024-SQL",
    stars: 6,
    forks: 1,
    commitsCount: 24,
    createdYear: 2024,
    longDescEn: "Coursework focused on schema architecture, ERD design, complex SQL joins, analytical functions, transactional rollbacks, and views optimization.",
    longDescPl: "Laboratoria z podstaw baz danych. Obejmują projektowanie diagramów ERD, wielokrotne złączenia tabel, agregacje analityczne i optymalizację indeksów.",
    codeSnippet: {
      filename: "queries.sql",
      language: "sql",
      code: `SELECT e.employee_id, e.last_name, d.department_name,
       RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) as salary_rank
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;`
    }
  },
  {
    name: "KUL-2024-SQL-II",
    desc: "Procedural SQL, stored procedures, triggers and constraints (SQL-II).",
    descPl: "Zaawansowany SQL, procedury wbudowane, wyzwalacze i kursory.",
    lang: "PLSQL",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2024-SQL-II",
    stars: 5,
    forks: 0,
    commitsCount: 18,
    createdYear: 2024,
    longDescEn: "Deep dive into Procedural Extensions (PL/SQL). Focuses on developing automated database rules, record filters, row-level triggers, cursor iteration, and transaction blocks.",
    longDescPl: "Zaawansowane techniki bazodanowe — procedury składowane, funkcje agregujące, obsługa wyjątków PL/SQL oraz optymalizacyjne klastry indeksów.",
    codeSnippet: {
      filename: "trigger.sql",
      language: "sql",
      code: `CREATE OR REPLACE TRIGGER audit_salary_change
BEFORE UPDATE OF salary ON employees
FOR EACH ROW
BEGIN
    INSERT INTO salary_history(emp_id, old_sal, new_sal, change_date)
    VALUES(:OLD.employee_id, :OLD.salary, :NEW.salary, SYSDATE);
END;`
    }
  },
  {
    name: "KUL-2024-Maven",
    desc: "Java build automation and project lifecycle management (Maven).",
    descPl: "Systemy budowania projektów Java i automatyzacja cyklu życia aplikacji.",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2024-Maven",
    stars: 3,
    forks: 0,
    commitsCount: 10,
    createdYear: 2024,
    longDescEn: "Modular Java architecture structured using Apache Maven. Covers dependency collision prevention, plugin compilation profiles, unit testing suites with JUnit, and artifact packaging.",
    longDescPl: "Konfiguracja wielomodułowych projektów Java przy użyciu Mavena. Tworzenie testów jednostkowych JUnit, zarządzanie zasobami i automatyczne pakowanie plików JAR.",
    codeSnippet: {
      filename: "pom.xml",
      language: "xml",
      code: `<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter-api</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>`
    }
  },
  {
    name: "KUL-2024-AWSJ",
    desc: "Algorithms and Selected Java Frameworks course (AWSJ).",
    descPl: "Wybrane ramy programowania i struktury w Java Web (AWSJ).",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2024-AWSJ",
    stars: 4,
    forks: 1,
    commitsCount: 17,
    createdYear: 2024,
    longDescEn: "Projects examining full-stack patterns, integrating ORM layers (Hibernate), database transactions, client interfaces, and reactive design patterns.",
    longDescPl: "Zagadnienia webowe w Java. Tworzenie serwerów, integracja z mapowaniem obiektowo-relacyjnym (Hibernate) oraz dynamiczne serwowanie stron.",
    codeSnippet: {
      filename: "Entity.java",
      language: "java",
      code: `@Entity
@Table(name = "items")
public class Item {
    @Id @GeneratedValue
    private Long id;
    
    @Column(nullable = false)
    private String title;
}`
    }
  },
  {
    name: "KUL-SQL-III",
    desc: "Database tuning, index architecture, query profiling (SQL-III).",
    descPl: "Profilowanie kwerend, optymalizacje indeksów i administracja bazami danych.",
    lang: "PLSQL",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-SQL-III",
    stars: 5,
    forks: 0,
    commitsCount: 14,
    createdYear: 2024,
    longDescEn: "Explores index optimizations, profiling statements with EXPLAIN PLAN, managing database cursors, partition management, and bulk collection processing.",
    longDescPl: "Optymalizacja czasu wykonywania zapytań (tuning). Obejmuje analizę ścieżek planu, zarządzanie kursorami i zapytania analityczne w systemie Oracle PL/SQL.",
    codeSnippet: {
      filename: "explain.sql",
      language: "sql",
      code: `EXPLAIN PLAN FOR
SELECT * FROM orders WHERE customer_id = 9012 AND total_amount > 500;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`
    }
  },
  {
    name: "KUL-ProgrammingWebsites",
    desc: "Frontend web layout design, accessible colors, fluid layouts.",
    descPl: "Podstawy tworzenia witryn internetowych, przystosowanie dla osób niepełnosprawnych.",
    lang: "CSS",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-ProgrammingWebsites",
    stars: 4,
    forks: 0,
    commitsCount: 11,
    createdYear: 2023,
    longDescEn: "Semantic HTML markups and custom CSS transitions adhering to Web Content Accessibility Guidelines (WCAG) AAA contrast requirements and responsive screen adaptability.",
    longDescPl: "Witryny wykonane przy użyciu semantycznego HTML5 oraz czystego CSS. Projekty dostosowane pod kątem czytelności i kontrastu.",
    codeSnippet: {
      filename: "style.css",
      language: "css",
      code: `@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}`
    }
  },
  {
    name: "KUL-2025-Gradle-2",
    desc: "Modern Java / Kotlin build pipeline configurations with Gradle.",
    descPl: "Budowa nowoczesnych potoków budowania systemów Gradle (Kotlin/Groovy DSL).",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2025-Gradle-2",
    stars: 4,
    forks: 0,
    commitsCount: 9,
    createdYear: 2025,
    longDescEn: "Configures Gradle tasks dependencies, custom build src directories, multiproject build pipelines using Kotlin DSL, and dependency management configurations.",
    longDescPl: "Projekt badający konfiguracje budowania Gradle przy użyciu Kotlin DSL, pre-kompilację tasków oraz zarządzanie repozytoriami zależności.",
    codeSnippet: {
      filename: "build.gradle.kts",
      language: "kotlin",
      code: `plugins {
    kotlin("jvm") version "1.9.21"
}

tasks.test {
    useJUnitPlatform()
    testLogging.showStandardStreams = true
}`
    }
  },
  {
    name: "KUL-2025-GradeWriterApp",
    desc: "Mobile academic grade management application written in Kotlin.",
    descPl: "Mobilny dzienniczek ocen studenta napisany w języku Kotlin.",
    lang: "Kotlin",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2025-GradeWriterApp",
    stars: 7,
    forks: 1,
    commitsCount: 23,
    createdYear: 2025,
    longDescEn: "A full Android Jetpack Compose utility tracker designed for mobile. Students can create schedules, input midterm results, calculate weighted GPA targets, and store logs in dynamic local files.",
    longDescPl: "Aplikacja na system Android stworzona w Jetpack Compose. Umożliwia wpisywanie cząstkowych ocen, automatyczne przeliczenie średniej ocen i eksport danych.",
    codeSnippet: {
      filename: "MainActivity.kt",
      language: "kotlin",
      code: `@Composable
fun GradeRow(subject: String, grade: Double) {
    Row(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Text(text = subject, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.weight(1f))
        Text(text = grade.toString(), color = Color.Green)
    }
}`
    }
  },
  {
    name: "KUL-AWSJ-14-01",
    desc: "Web services integration, REST services mapping, validation (AWSJ).",
    descPl: "Walidacja żądań REST i integracja serwisów internetowych.",
    lang: "HTML",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-AWSJ-14-01",
    stars: 3,
    forks: 0,
    commitsCount: 7,
    createdYear: 2025,
    longDescEn: "Responsive student registration web client connecting dynamically to API endpoints with extensive asynchronous error detection.",
    longDescPl: "Responsywny portal internetowy integrujący się z bazą danych studentów. Obsługuje asynchroniczne zapytania i czytelną prezentację błędów.",
    codeSnippet: {
      filename: "app.js",
      language: "javascript",
      code: `async function enrollStudent(studentData) {
    const response = await fetch('/api/v1/students/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
    });
    return await response.json();
}`
    }
  },
  // Other / Misc
  {
    name: "2023-AI-Project",
    desc: "Academic machine learning neural networks showcase from 2023.",
    descPl: "Akademicki projekt badający sieci neuronowe w języku Java (2023).",
    lang: "Java",
    cat: ["ai"],
    url: "https://github.com/tomekdot/2023-AI-Project",
    stars: 8,
    forks: 2,
    commitsCount: 19,
    createdYear: 2023,
    longDescEn: "Basic multilayer perceptron neural network designed from scratch in core Java without external frameworks. Demonstrates backpropagation, learning rate damping, and bias calculation.",
    longDescPl: "Sieć neuronowa (perceptor wielowarstwowy) zaimplementowany od zera w czystym języku Java. Ręczne obliczanie wag, propagacja wsteczna i funkcje aktywacji.",
    codeSnippet: {
      filename: "NeuralNetwork.java",
      language: "java",
      code: `public double sigmoid(double x) {
    return 1.0 / (1.0 + Math.exp(-x));
}

public void train(double[] inputs, double[] targets) {
    // Forward propagation -> Calculate error -> Adjust weights
    double[] outputs = feedForward(inputs);
    adjustWeightsBackprop(outputs, targets);
}`
    }
  },
  {
    name: "demo21-06",
    desc: "Experimental Java GUI visual sandbox and graphic renderer.",
    descPl: "Eksperymentalny silnik renderujący w Java Swing z czerwca 2021 roku.",
    lang: "Java",
    cat: ["other"],
    url: "https://github.com/tomekdot/demo21-06",
    isPrivate: true,
    stars: 4,
    forks: 0,
    commitsCount: 10,
    createdYear: 2021,
    longDescEn: "Java desktop prototype displaying particle physics, custom collision mechanics, and simple vectors rendered on double-buffer Canvas grids.",
    longDescPl: "Eksperymentalna aplikacja okienkowa w Javie obrazująca ruch cząsteczek fizycznych na płótnie Swing. Wykorzystuje technikę double-buffer.",
    codeSnippet: {
      filename: "SandboxPanel.java",
      language: "java",
      code: `public void paintComponent(Graphics g) {
    super.paintComponent(g);
    Graphics2D g2d = (Graphics2D) g;
    // Render particles anti-aliased
    g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    particles.forEach(p -> p.draw(g2d));
}`
    }
  },
  {
    name: "PAI",
    desc: "Interactive multimedia and web interfaces (PAI).",
    descPl: "Aplikacje i layouty multimedialne przy użyciu czystych technologii webowych.",
    lang: "HTML",
    cat: ["other"],
    url: "https://github.com/tomekdot/PAI",
    stars: 2,
    forks: 0,
    commitsCount: 8,
    createdYear: 2022,
    longDescEn: "Comprehensive web designs showcasing CSS Grid alignments, vector drawing inside inline Canvas elements, audio loops, and video integrations.",
    longDescPl: "Strony stworzone na zajęcia Programowania Aplikacji Internetowych. Zawierają integracje odtwarzaczy audio-video i autorskie arkusze CSS.",
    codeSnippet: {
      filename: "index.html",
      language: "html",
      code: `<canvas id="vectorCanvas" width="400" height="300"></canvas>
<script>
  const ctx = document.getElementById('vectorCanvas').getContext('2d');
  ctx.fillStyle = '#ff6b6b';
  ctx.arc(200, 150, 50, 0, Math.PI * 2);
  ctx.fill();
</script>`
    }
  },
  {
    name: "KUL-2022-PO-I",
    desc: "Java object structures, memory allocations, standard schemas (PO-I).",
    descPl: "Paradygmaty obiektowe I — dziedziczenie, interfejsy i pamięć w Javie.",
    lang: "Java",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2022-PO-I",
    stars: 5,
    forks: 0,
    commitsCount: 16,
    createdYear: 2022,
    longDescEn: "Introductory Java course assignments focusing on structure principles: references management, encapsulation, inheritance boundaries, collections (lists, sets), and unit validations.",
    longDescPl: "Podstawowe zadania akademickie z Programowania Obiektowego I. Obejmują polimorfizm, rzutowanie klas, obsługę list obiektowych i wyjątków.",
    codeSnippet: {
      filename: "Employee.java",
      language: "java",
      code: `public class Manager extends Employee {
    private double bonus;
    public Manager(String name, double salary, double bonus) {
        super(name, salary);
        this.bonus = bonus;
    }
    @Override
    public double getSalary() {
        return super.getSalary() + bonus;
    }
}`
    }
  },
  {
    name: "KUL-2022-SQL",
    desc: "Academic SQL database design, joins, normalization courses (KUL 2022).",
    descPl: "Podstawy inżynierii baz danych i normalizacji trzeciej postaci normalnej.",
    lang: "PLSQL",
    cat: ["kul"],
    url: "https://github.com/tomekdot/KUL-2022-SQL",
    stars: 4,
    forks: 0,
    commitsCount: 12,
    createdYear: 2022,
    longDescEn: "First-course database operations. Focuses on writing SELECT structures, basic updates, primary and foreign key alignments, and tables normalization into 3NF forms.",
    longDescPl: "Pierwsze projekty bazodanowe z poziomu studiów. Tworzenie prostych tabel, złączanie JOIN, klucze główne oraz rozbicia do trzeciej postaci normalnej.",
    codeSnippet: {
      filename: "create_tables.sql",
      language: "sql",
      code: `CREATE TABLE users (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username VARCHAR2(50) NOT NULL UNIQUE,
    email VARCHAR2(100) NOT NULL
);`
    }
  },
  {
    name: "2022-PAIP-Cpp",
    desc: "C++ advanced algorithmics and procedural memory blocks (PAIP).",
    descPl: "Zaawansowane paradygmaty strukturalne i zarządzanie pamięcią w C++ (PAIP).",
    lang: "C++",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-PAIP-Cpp",
    stars: 5,
    forks: 1,
    commitsCount: 14,
    createdYear: 2022,
    longDescEn: "Rigorous execution of operations in C++. Focuses on direct heap/stack allocations, pointers navigation, smart reference counters, custom destructors, and algorithmic execution speeds.",
    longDescPl: "Ćwiczenia z optymalnego uwalniania pamięci, wskaźników, referencji i struktur logicznych w języku C++. Obejmuje przeciążanie operatorów.",
    codeSnippet: {
      filename: "memory.cpp",
      language: "cpp",
      code: `#include <iostream>
#include <memory>

class Resource {
public:
    Resource() { std::cout << "Resource created\\n"; }
    ~Resource() { std::cout << "Resource freed\\n"; }
};

int main() {
    std::unique_ptr<Resource> ptr = std::make_unique<Resource>();
    return 0;
}`
    }
  },
  {
    name: "2022-PAIP-Java",
    desc: "Java design structures and desktop swing modules (PAIP).",
    descPl: "Komponenty graficzne i architektury wzorców w Java SE (PAIP).",
    lang: "Java",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-PAIP-Java",
    stars: 4,
    forks: 0,
    commitsCount: 11,
    createdYear: 2022,
    longDescEn: "Java application architectures built for client systems, integrating basic desktop menus, key binds, multi-view loaders, and dynamic state structures.",
    longDescPl: "Wzorce projektowe oraz architektura desktopowa w Java SE z wykorzystaniem kontrolek awatara i okien dialogowych JFrame.",
    codeSnippet: {
      filename: "AppFrame.java",
      language: "java",
      code: `public class AppFrame extends JFrame {
    public AppFrame() {
        setTitle("PAIP Java Desktop Client");
        setSize(800, 600);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
    }
}`
    }
  },
  {
    name: "2022-WWW",
    desc: "Academic responsive static layouts and graphic displays.",
    descPl: "Semantyczne struktury układów interfejsu i podstawy pisania CSS.",
    lang: "HTML",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-WWW",
    stars: 3,
    forks: 0,
    commitsCount: 8,
    createdYear: 2022,
    longDescEn: "Static web projects documenting browser configurations, flexbox and grid allocations, and style hierarchies.",
    longDescPl: "Wielostronicowe, czyste szablony statyczne pisane w ramach nauki podstaw pozycjonowania elementów i formatowania arkusza stylów.",
    codeSnippet: {
      filename: "index.html",
      language: "html",
      code: `<header class="main-header">
  <nav class="nav-bar">
    <ul class="nav-links">
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>`
    }
  },
  {
    name: "2022-SO",
    desc: "Operating systems, memory scheduling, pipe scripts.",
    descPl: "Systemy operacyjne — skrypty powłoki, przydzielanie czasu procesora.",
    lang: "",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-SO",
    stars: 5,
    forks: 0,
    commitsCount: 15,
    createdYear: 2022,
    longDescEn: "UNIX script automations with Bash, scheduling simulation charts (FIFO, SJF, Round Robin), multi-process forks, and IPC memory queues.",
    longDescPl: "Skrypty powłoki BASH, symulatory przydziałów procesora (SJF, rotacyjny) i mechanizmy synchronizacji procesów za pomocą potoków.",
    codeSnippet: {
      filename: "scheduler.sh",
      language: "bash",
      code: `#!/bin/bash
# SJF CPU scheduling simulation
processes=(3 8 2 5)
sorted_jobs=($(for i in "\${processes[@]}"; do echo "$i"; done | sort -n))
echo "Optimal SJF Execution Order: \${sorted_jobs[*]}"`
    }
  },
  {
    name: "Pliki",
    desc: "Polish content file formatting and parsing utilities.",
    descPl: "Narzędzia parsujące, analiza i konwersja plików płaskich.",
    lang: "",
    cat: ["other"],
    url: "https://github.com/tomekdot/Pliki",
    isPrivate: true,
    stars: 2,
    forks: 0,
    commitsCount: 6,
    createdYear: 2021,
    longDescEn: "Simple command line data structures for raw encoding modifications, directory scans, and CSV format mappings.",
    longDescPl: "Skrypty konsolowe i weryfikatory formatów do szybkiego porządkowania struktury plików na dysku oraz zmiany sposobu kodowania znaków.",
    codeSnippet: {
      filename: "parser.py",
      language: "python",
      code: `def strip_utf8_bom(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    if content.startswith(b'\\xef\\xbb\\xbf'):
        content = content[3:]
    with open(filepath, 'wb') as f:
        f.write(content)`
    }
  },
  {
    name: "2022-Big-Data-VL",
    desc: "Analytical pipelines and cluster file architectures (Big Data).",
    descPl: "Systemy analityki dużych wolumenów danych w chmurze obliczeniowej.",
    lang: "Python",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-Big-Data-VL",
    stars: 7,
    forks: 2,
    commitsCount: 13,
    createdYear: 2022,
    longDescEn: "Hands-on projects with PySpark, cluster map-reduce computations, query allocations on distributed nodes, and analytics modeling.",
    longDescPl: "Analiza dużych zbiorów danych. Ćwiczenia przy użyciu PySpark, transformacji MapReduce oraz rozproszonych kwerend na plikach logów serwerowych.",
    codeSnippet: {
      filename: "spark_job.py",
      language: "python",
      code: `from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("LogCounter").getOrCreate()
df = spark.read.text("hdfs://cluster/logs/*.log")
errors = df.filter(df.value.contains("ERROR"))
print(f"Total system failures: {errors.count()}")`
    }
  },
  {
    name: "2022-PAIP",
    desc: "Java architectural practices and dynamic multi-threaded threads.",
    descPl: "Struktury algorytmiczne, wielowątkowość i synchronizacja w Java.",
    lang: "Java",
    cat: ["other"],
    url: "https://github.com/tomekdot/2022-PAIP",
    stars: 4,
    forks: 0,
    commitsCount: 12,
    createdYear: 2022,
    longDescEn: "Concurreny pipelines implemented using classic concepts: thread sleep, thread waits/notify, reentrant locks, and atomic variables.",
    longDescPl: "Projekty rozwiązań problemu producenta-konsumenta z wykorzystaniem monitorów języka Java, wątków systemowych oraz klas blokujących.",
    codeSnippet: {
      filename: "ProducerConsumer.java",
      language: "java",
      code: `public synchronized void produce(int item) throws InterruptedException {
    while (queue.size() == LIMIT) {
        wait();
    }
    queue.add(item);
    notifyAll();
}`
    }
  },
  {
    name: "2021-22-WDI",
    desc: "Introduction to Computer Science algorithms with procedural C++.",
    descPl: "Klasyczne algorytmy strukturalne w C++ (Wstęp do Informatyki).",
    lang: "C++",
    cat: ["other"],
    url: "https://github.com/tomekdot/2021-22-WDI",
    stars: 6,
    forks: 2,
    commitsCount: 18,
    createdYear: 2021,
    longDescEn: "First-year computer science problems solving, including numeral systems converter (binary, octal, hex), prime tests, binary search loops, and matrix rotations.",
    longDescPl: "Projekty z pierwszego semestru studiów WDI. Konwertery systemów liczbowych, algorytm Euklidesa, sita Erastotenesa i wyszukiwanie binarne.",
    codeSnippet: {
      filename: "primes.cpp",
      language: "cpp",
      code: `bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}`
    }
  },
  {
    name: "tomekdot.github.io",
    desc: "Openplanet Plugins - tomekdot's plugins and projects.",
    descPl: "Wtyczki Openplanet - wtyczki i projekty autora tomekdot.",
    lang: "HTML",
    cat: ["other"],
    url: "https://github.com/tomekdot/tomekdot.github.io",
    stars: 0,
    forks: 0,
    commitsCount: 5,
    createdYear: 2026,
    longDescEn: "Personal portfolio and plugin showcase page hosted on GitHub Pages. Serves as central directory for Trackmania tools and active Openplanet scripting projects.",
    longDescPl: "Osobiste portfolio i witryna prezentująca wtyczki hostowana na GitHub Pages. Służy jako centralny katalog narzędzi Trackmania i aktywnych projektów Openplanet.",
    pushedAt: "2026-06-16T14:40:13Z",
    codeSnippet: {
      filename: "index.html",
      language: "html",
      code: `<!DOCTYPE html>
<html>
<head>
    <title>tomekdot's plugins and projects</title>
</head>
<body>
    <h1>Openplanet Plugins</h1>
    <p>Welcome to my curated collection of custom Trackmania and PyPlanet extensions.</p>
</body>
</html>`
    }
  },
  {
    name: "context-aware-music-recommendation-system",
    desc: "Context-Aware Music Recommendation System — Master's Thesis (RYM dataset, Apriori, weighted engine)",
    descPl: "System rekomendacji muzycznych uwzględniający kontekst — Praca Magisterska (zbiór danych RYM, algorytm Apriori, silnik ważony)",
    lang: "Jupyter Notebook",
    cat: ["ai"],
    url: "https://github.com/tomekdot/context-aware-music-recommendation-system",
    isPrivate: true,
    stars: 0,
    forks: 0,
    commitsCount: 24,
    createdYear: 2026,
    longDescEn: "A complete Context-Aware Music Recommendation System designed and developed as part of a Master's Thesis. Built around the Rate Your Music (RYM) dataset, utilizing the Apriori association rule mining algorithm and a custom weighted recommendation engine matching user moods, environments, and genres.",
    longDescPl: "Kompletny system rekomendacji muzyki uwzględniający kontekst (temat pracy magisterskiej). Oparty na zbiorze danych Rate Your Music (RYM), wykorzystujący asocjacyjny algorytm Apriori oraz autorski, ważony silnik rekomendacji dopasowujący utwory do nastroju, otoczenia i gatunków użytkownika.",
    codeSnippet: {
      filename: "recommendation_engine.ipynb",
      language: "python",
      code: `def get_recommendations(user_profile, context_tags, top_n=10):
    # Load RYM association rules mined with Apriori
    rules = load_apriori_rules()
    
    # Calculate weighted similarity scores matching genre profiles & mood contexts
    scored_items = []
    for item in candidate_tracks:
        score = calculate_weighted_score(item, user_profile, context_tags)
        scored_items.append((item, score))
        
    return sorted(scored_items, key=lambda x: x[1], reverse=True)[:top_n]`
    }
  }
];

export const LANG_COLORS: Record<string, string> = {
  Python: "#3b82f6",    // Blue
  Java: "#f43f5e",      // Rose
  JavaScript: "#eab308",// Yellow
  TypeScript: "#6366f1",// Indigo / Royal Blue
  HTML: "#f97316",      // Orange
  CSS: "#a855f7",       // Purple
  Ruby: "#e11d48",      // Red
  "C++": "#ec4899",     // Pink
  Kotlin: "#8b5cf6",    // Violet
  PLSQL: "#d97706",     // Amber
  SQL: "#ca8a04",       // Darker Yellow
  AngelScript: "#ffffff" // White
};

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    titleEn: "A New Plugin for OpenPlanet: \"Event Calendar\" – Never Miss Important Events Again!",
    titlePl: "Nowa wtyczka do OpenPlanet: „Event Calendar” – Nigdy więcej nie przegap ważnych wydarzeń!",
    excerptEn: "Do you ever miss important in-game events? We have great news for all OpenPlanet and ManiaPlanet players! This powerful, lightweight add-on will help you keep track of key dates, from tournament finals to broadcasts on the Pursuit Channel.",
    excerptPl: "Czy zdarza Ci się przegapić ważne wydarzenia w grze? Mamy świetne wieści dla wszystkich graczy OpenPlanet i ManiaPlanet! Ten potężny, lekki dodatek pomoże Ci śledzić kluczowe daty, od finałów turniejów po transmisje na Pursuit Channel.",
    date: "2026-06-18",
    readingTimeEn: "4 min read",
    readingTimePl: "4 min czytania",
    tags: ["Openplanet", "Trackmania", "Event", "Calendar", "Plugin"],
    contentEn: `### What is the Event Calendar Plugin?

**Event Calendar** is a new OpenPlanet plugin designed to help the community. Its goal is to provide a simple, convenient tool for tracking upcoming events. Instead of searching forums or social media, you can get all the important information in one place, right within the game interface. It’s the perfect solution for keeping your gaming schedule organised.

### Key Features

This plugin stands out for its simplicity and effectiveness. Here are the most important features:

*   **Lightweight Interface**: A small, discreet overlay displays upcoming events without disrupting your gameplay.
*   **Sound and Visual Notifications**: You can enable optional alerts to ensure you never miss the start of a tournament or an important broadcast.
*   **Support for Pursuit Channel**: The plugin specifically highlights and informs you about planned broadcasts on the Pursuit Channel.
*   **Easy Installation**: Copy the folder or install the .op package.

### Special Pursuit Channel Support

For many players, the ManiaPlanet community and the Pursuit Channel are essential. That’s why the plugin places a special emphasis on integration with this channel. The **Event Calendar** tracks schedules and allows you to set up notifications that will guarantee you don’t miss any streams or events. This is a key feature that makes this plugin an essential tool for every ManiaPlanet fan.

### Extensibility and Community Collaboration

A key goal of this project was to create a tool that would grow with the community. **Event Calendar** is fully open to extensions. Want to add your own event source? You can do so by implementing a simple parsing module. The author encourages contributions and pull requests on GitHub, making this an ideal gaming event calendar created with players. If you want to join the project, you’ll find all the information in the documentation.

### How to Install

Getting started with Event Calendar is easy:

1.  Go to the project’s [**GitHub page**](https://github.com/tomekdot/event-calendar-dev).
2.  Copy the \`event-calendar-dev\` folder to \`Openplanet4/Plugins/\` or download and install the \`.op\` package.
3.  Launch the game and enable the plugin in the OpenPlanet settings.

That’s it! Now you can enjoy an organised and personalised in-game calendar.

### Summary and Future

**Event Calendar** is more than just a simple plugin—it’s a tool that makes life easier for gamers and shows the value of community collaboration. Thanks to its lightweight nature, key features, and open design, it has the potential to become one of the most-used add-ons. Install this plugin today and join the journey!`,
    contentPl: `### Czym jest wtyczka Event Calendar?

**Event Calendar** to nowa wtyczka do OpenPlanet stworzona z myślą o społeczności. Jej celem jest dostarczenie prostego, wygodnego narzędzia do śledzenia nadchodzących wydarzeń. Zamiast przeszukiwać fora czy media społecznościowe, możesz mieć wszystkie ważne informacje w jednym miejscu, bezpośrednio w interfejsie gry. To idealne rozwiązanie do uporządkowania Twojego harmonogramu rozgrywek.

### Główne zalety wtyczki

Wtyczka wyróżnia się prostotą i efektywnością działania. Oto najważniejsze funkcje:

*   **Lekki interfejs**: Mała, dyskretna nakładka wyświetla nadchodzące wydarzenia bez przeszkadzania w rozgrywce.
*   **Powiadomienia dźwiękowe i wizualne**: Możesz włączyć opcjonalne alerty, by mieć pewność, że nie spóźnisz się na start turnieju lub ważnej transmisji.
*   **Wsparcie dla Pursuit Channel**: Wtyczka specjalnie wyróżnia i informuje o planowanych transmisjach na kanale Pursuit Channel.
*   **Prosta instalacja**: Wystarczy skopiować folder lub zainstalować pakiet \`.op\`.

### Specjalne wsparcie dla Pursuit Channel

Dla wielu graczy społeczność wokół ManiaPlanet i Pursuit Channel to podstawa. Dlatego wtyczka kładzie szczególny nacisk na integrację z tym kanałem. **Event Calendar** śledzi harmonogramy i pozwala ustawić powiadomienia, które zagwarantują, że nie ominie Cię żaden stream ani event. To kluczowa funkcja, która czyni ten dodatek niezbędnym narzędziem każdego fana ManiaPlanet.

### Możliwość rozszerzania i współpraca ze społecznością

Głównym celem przy tworzeniu tego projektu było stworzenie narzędzia, które będzie rosnąć wraz ze społecznością. **Event Calendar** jest w pełni otwarty na rozszerzenia. Chcesz dodać własne źródło wydarzeń? Możesz to zrobić poprzez zaimplementowanie prostego modułu parsującego. Autor zachęca do współtworzenia projektu i zgłaszania pull requestów na platformie GitHub, dzięki czemu jest to idealny kalendarz wydarzeń growych budowany z myślą o graczach i tworzony wraz z nimi. Jeśli chcesz dołączyć do projektu, wszystkie informacje znajdziesz w dokumentacji.

### Jak zainstalować

Rozpoczęcie korzystania z Event Calendar jest banalnie proste:

1.  Przejdź na stronę projektu w serwisie [**GitHub**](https://github.com/tomekdot/event-calendar-dev).
2.  Skopiuj folder \`event-calendar-dev\` do lokalizacji \`Openplanet4/Plugins/\` lub pobierz i zainstaluj plik \`.op\`.
3.  Uruchom grę i aktywuj wtyczkę w ustawieniach OpenPlanet.

I to wszystko! Możesz teraz cieszyć się uporządkowanym i spersonalizowanym kalendarzem wewnątrz gry.

### Podsumowanie i przyszłość

**Event Calendar** to coś więcej niż zwykły dodatek – to narzędzie ułatwiające życie fanom gry i dowód na to, jak wielką wartość niesie współpraca społeczności. Dzięki lekkości, kluczowym funkcjom i otwartej formule ma szansę stać się jedną z najchętniej używanych modyfikacji. Zainstaluj wtyczkę już dziś i stań się częścią tej przygody!`
  },
  {
    id: "2",
    titleEn: "Pomodoro Timer in Trackmania: Maintain Peak Racing Performance",
    titlePl: "Licznik Pomodoro w Trackmanii: Utrzymaj najwyższą formę wyścigową",
    excerptEn: "Tired of burning out during long practice runs? The Pomodoro Timer plugin integrates a productivity overlay directly into the game, featuring customizable alerts, automated music controls, and task checklists.",
    excerptPl: "Masz dość wypalenia podczas długich treningów? Wtyczka Pomodoro Timer integruje system produktywności bezpośrednio z nakładką gry, oferując spersonalizowane alerty, automatyczne wyciszanie muzyki i listy zadań.",
    date: "2026-06-18",
    readingTimeEn: "5 min read",
    readingTimePl: "5 min czytania",
    tags: ["Openplanet", "Trackmania", "Pomodoro", "Productivity"],
    contentEn: `### Boost Your Focus Directly In-Game

Have you ever sat down for "just a couple of minutes" of Trackmania practice, only to look up and realize four hours have passed and your shoulders are completely locked? You aren't alone. Long, unstructured practice sessions lead directly to fatigue, mental block, and lower consistency on the track.

To solve this, **Pomodoro Timer** integrates the world-renowned study and work system directly into your in-game interface.

### Core Features

*   **Modular Overlay**: Clean and subtle timer that floats elegantly alongside your speedo or map timer.
*   **Intuitive checklists**: Jot down which tracks, corners, or setups you want to practice in this specific session.
*   **Smart Automation**: The plugin can automatically mute the high-tempo in-game soundtrack during active break intervals to let you rest and breathe fully.
*   **Keyboard Shortcuts**: Start, pause, or switch phases without leaving the steering wheel or analog controller.

### Why It Works

By following the systematic 25-minute practice and 5-minute break cycles, your brain retains peak track memory much better. Instead of repeating mistakes mindlessly, you focus deeply on specific obstacles during work blocks, and completely step back during rest phases.

### Installing Pomodoro Timer

1.  Load your OpenPlanet client in-game.
2.  Search the plugin repository or grab the repository package from [**pomodoro-plugin-dev on GitHub**](https://github.com/tomekdot/pomodoro-plugin-dev).
3.  Place it into your plugin directories, and customize the sound alerts inside settings.`,
    contentPl: `### Zwiększ swoje skupienie bezpośrednio podczas jazdy

Czy kiedykolwiek zdarzyło Ci się usiąść „na chwilę”, by potrenować trasę w Trackmanii, a potem odkryć, że minęły cztery godziny, a Twoje ramiona są całkowicie zdrętwiałe? To powszechny problem. Długie treningi bez przerw prowadzą do zmęczenia, blokady psychicznej i spadku precyzji na torze.

Aby temu zaradzić, wtyczka **Pomodoro Timer** integruje uznaną na świecie technikę zarządzania czasem wprost z interfejsem gry Trackmania.

### Kluczowe funkcjonalności

*   **Modułowy interfejs**: Prosty, dyskretny czasownik wyświetlający się tuż obok prędkościomierza lub czasu okrążenia.
*   **Krótka lista zadań**: Wpisz trasy, zakręty lub triki, które chcesz potrenować w danej sesji.
*   **Inteligentna automatyzacja**: Wtyczka potrafi automatycznie wyciszyć energetyczną muzykę z gry na czas przerwy, ułatwiając odpoczynek i regenerację.
*   **Skróty klawiszowe**: Rozpoczynaj, pauzuj lub przełączaj fazy bez odrywania rąk od kierownicy czy pada.

### Dlaczego to działa?

Dzięki systematycznemu podziałowi na 25 minut głębokiego treningu i 5 minut aktywnego odpoczynku, Twój mózg o wiele szybciej rejestruje pamięć mięśniową. Zamiast bezmyślnie powtarzać te same błędy, uczysz się panować nad przejazdem ze świeżą uwagą.

### Jak zainstalować

1.  Uruchom grę Trackmania z aktywnym OpenPlanet.
2.  Wyszukaj wtyczkę w oficjalnym spisie lub pobierz najnowszy pakiet bezpośrednio z [**pomodoro-plugin-dev na GitHubie**](https://github.com/tomekdot/pomodoro-plugin-dev).
3.  Umieść pliki w folderze wtyczek i dostosuj powiadomienia dźwiękowe w menu konfiguracyjnym.`
  },
  {
    id: "3",
    titleEn: "PyPlanet ClanSpirits: Architectural Deep Dive into Competitive Server Scoring",
    titlePl: "PyPlanet ClanSpirits: Architektura zaawansowanego systemu klanowego i drużynowego",
    excerptEn: "How to safely scale active team allegiance database queries, resolve asynchronous SQLite operations, and award competitive spirit points on high-traffic ManiaPlanet servers.",
    excerptPl: "Jak bezpiecznie skalować zapytania bazodanowe o przynależność klanową, obsługiwać asynchroniczny zapis w SQLite i przyznawać punkty ducha na zatłoczonych serwerach.",
    date: "2026-06-18",
    readingTimeEn: "6 min read",
    readingTimePl: "6 min czytania",
    tags: ["Pyplanet", "Python", "Database", "Trackmania"],
    contentEn: `### Redefining Competition on Dedicated Servers

Running a dedicated server for ManiaPlanet or Trackmania requires more than just loading high-tech maps. To keep a community vibrant, server managers need system mechanics that award players a real sense of cooperative identity.

This architectural requirement led directly to the creation of **pyplanet-clanspirits**, a rich custom server controller module.

### Dynamic Allegiance Architecture

Instead of calculating a single global leaderboard where only the top 3 players feel victorious, \`pyplanet-clanspirits\` groups the player base into competitive custom factions or "Spirits". Every local record beaten, checkpoint passed, or track finish recorded funnels points directly into a shared clan score.

### Solving Async Database Hazards

The biggest engineering barrier with complex server add-ons is handling filesystem / database read-writer operations. PyPlanet handles event cycles inside a single-threaded Python \`asyncio\` loop. If your database calls block for even 50ms (for instance, waiting for a locked SQLite WAL file or a distant PostgreSQL query), the server network tick rate will stall, causing other players to instantly teleport or lose connection sync.

To prevent this, the plugin utilizes fully decoupled asynchronous drivers:

\`\`\`python
# Example of non-blocking player record storage run
async def save_clan_record(self, player, record_time, spirit_id):
    await self.instance.db.execute(
        "UPDATE spirits_score SET score = score + :pts WHERE spirit_id = :sid",
        {"pts": calculate_pts(record_time), "sid": spirit_id}
    )
    await self.instance.chat.send_message(f"Spirit point updated for {player.nickname}")
\`\`\`

### Community Impact

By utilizing this asynchronous orchestration, the server maintains perfect 100hz execution speeds while handling hundreds of driver check-ins every minute. Faction status leaderboards update instantly on the screen, encouraging teams to coordinate practice hours and defend their digital territories on the tracks.`,
    contentPl: `### Nowy wymiar rywalizacji na dedykowanych serwerach

Prowadzenie popularnego serwera w ManiaPlanet lub Trackmanii to coś więcej niż wgrywanie trudnych tras. Aby utrzymać zaangażowanie społeczności, administratorzy potrzebują mechanizmów budujących poczucie wspólnej tożsamości i rywalizacji drużynowej.

Z tej potrzeby zrodził się projekt **pyplanet-clanspirits** – zaawansowany moduł kontrolera serwerowego.

### Architektura podziału na frakcje

Zamiast standardowej globalnej tabeli, w której tylko ułamek kierowców czuje satysfakcję, \`pyplanet-clanspirits\` dzieli graczy na rywalizujące obozy (klany/duchy). Każdy pobity rekord życiowy, zaliczony punkt kontrolny czy ukończony wyścig przekłada się bezpośrednio na wspólne punkty klanu.

### Przezwyciężenie barier asynchroniczności (AsyncIO)

Największym wyzwaniem inżynieryjnym w wielbędnych wtyczkach jest bezpieczny zapis danych na dysku. PyPlanet przetwarza pętlę zdarzeń w oparciu o jednowątkowe środowisko \`asyncio\`. Jeśli operacja zapisu zablokuje serwer choćby na 50 ms, silnik sieciowy gry zacznie gubić pakiety, co gracze odczują jako teleportowanie aut (lagi).

Rozwiązaniem było przeniesienie wszystkich zadań na asynchroniczne przetworniki bazodanowe:

\`\`\`python
# Przykład nieblokującego zapisu rekordu gracza w tle
async def save_clan_record(self, player, record_time, spirit_id):
    await self.instance.db.execute(
        "UPDATE spirits_score SET score = score + :pts WHERE spirit_id = :sid",
        {"pts": calculate_pts(record_time), "sid": spirit_id}
    )
    await self.instance.chat.send_message(f"Punkty ducha zaktualizowane dla: {player.nickname}")
\`\`\`

### Korzyści dla graczy

Dzięki asynchronicznemu projektowi serwer utrzymuje stałe odświeżanie 100 Hz przy jednoczesnym rejestrowaniu setek rekordów czasowych na minutę. Harmonogramy frakcji aktualizują się w czasie rzeczywistym, motywując zespoły do wspólnych sesji treningowych.`
  },
  {
    id: "4",
    titleEn: "Hermes Skills: Modular Extensibility in Modern Autonomous AI",
    titlePl: "Hermes Skills: Modułowa rozszerzalność w nowoczesnych autonomicznych agentach AI",
    excerptEn: "A comprehensive look at how modular skills streamline DevOps automations like Node.js 24 migrations and simplify plugin ecosystems for OpenPlanet/PyPlanet game platforms under a unified standard.",
    excerptPl: "Kompleksowa analiza architektury hermes-skills ułatwiającej automatyzacje DevOps (migracje na Node 24) oraz upraszczającej integrowanie wtyczek OpenPlanet/PyPlanet dla platform gier.",
    date: "2026-06-18",
    readingTimeEn: "7 min read",
    readingTimePl: "7 min czytania",
    tags: ["AI", "Python", "Hermes", "Agent", "DevOps", "Trackmania"],
    contentEn: `### The Philosophy of Pragmatic AI Agentic Extensions

To bridge the gap between large language models and production-grade developer workspaces, autonomous systems require more than generalized conversational models. We need localized, deterministic action spaces. The **hermes-skills** library acts as a unified sensory-motor interface for developer agents, translating natural language reasoning into exact, sandboxed infrastructure executions without relying on simulated environments or mock behaviors.

### Theoretical Foundations & The Bridge Concept

The core philosophy of this modular architecture lies in dividing agentic capabilities into two orthogonal yet complementary vectors: deterministic system health operations and expressive application boilerplate design. Rather than teaching a model how to construct complex CI/CD environments or game plugin abstractions from raw principles each time, we supply declarative, pre-tested boundaries.

This approach creates a symbiotic loop:
1. **DevOps Security & Optimization Protocols**: Tools like automated CI/CD checks (such as scanning workflows for obsolete runtime configurations and automating frontend build pipeline uploads) reduce user operational overhead. Each routine serves as a functional, immutable capability that safe-shields the workspace.
2. **Deterministic Structural Blueprints**: Ranging from standardized frontend templates (Vite, React, Angular) to complex, niche modding architectures (OpenPlanet AngelScript and pyplanet wrappers for Trackmania multiplayer servers), these serve as concrete development canvases.

### The Intertwined Ecosystem

What unites these distinct domains under a single agentic environment? It is the thesis that **all software maintenance is eventually a text-transformation and orchestration task**. By mapping out specialized schemas—like high-scale map processing pipelines using micro-service triggers linked to spreadsheet-driven registries—Hermes forms a coherent cognitive map.

By replacing abstract, dynamic code generation with highly structured, predictable skill boundaries, we ensure deterministic safety, rapid execution loops, and robust, production-ready developer actions.`,
    contentPl: `### Filozofia pragmatycznych rozszerzeń dla agentów AI

Aby zasypać przepaść między modelami językowymi a produkcyjnymi środowiskami deweloperskimi, autonomiczne systemy potrzebują czegoś więcej niż tylko ogólnej zdolności konwersacyjnej. Wymagają one lokalnych, deterministycznych przestrzeni akcji. Biblioteka **hermes-skills** pełni rolę zunifikowanego interfejsu sensoryczno-motorycznego dla agenta Hermes, przekładając rozumowanie w języku naturalnym na precyzyjne, odizolowane wywołania systemowe bez polegania na emulacji czy sztucznych atrapach (mockach).

### Fundamenty teoretyczne: Koncepcja pomostu technologicznego

Główna filozofia tej modułowej architektury opiera się na podziale zdolności agenta na dwa ortogonalne, lecz dopełniające się wektory: deterministyczne operacje na poziomie systemowym oraz ekspresyjne szablony architektoniczne aplikacji. Zamiast uczyć model budowania od zera złożonych środowisk CI/CD czy struktur wtyczek dla serwerów gier za każdym razem, dostarczamy gotowe, przetestowane pod kątem bezpieczeństwa granice funkcjonalne.

To podejście tworzy symbiotyczną pętlę:
1. **Protokoły DevOps i automatyzacja procesów**: Narzędzia skanowania konfiguracji workflow pod kątem przestarzałych wersji uruchomieniowych oraz automatyzacja wdrażania dynamicznych aplikacji frontendowych minimalizują narzut operacyjny. Każda rutyna stanowi niezmienną, bezpieczną funkcję w arsenale agenta.
2. **Deterministyczne szablony strukturalne**: Obejmujące zarówno czyste wzorce dla frameworków webowych (Vite, React, Angular), jak i niszowe środowiska modyfikacji gier (AngelScript dla platformy OpenPlanet oraz pyplanet dla serwerów Trackmania). Służą one jako gotowe płótno dla zautomatyzowanego rozwoju oprogramowania.

### Spójny, połączony ekosystem

Co łączy te zróżnicowane dziedziny w ramach jednego środowiska agentycznego? To teza, że **każde utrzymanie systemów sprowadza się ostatecznie do transformacji tekstu i orkiestracji procesów**. Poprzez mapowanie wyspecjalizowanych potoków danych – takich jak masowe przetwarzanie map i integracja z zewnętrznymi rejestrami arkuszy – Hermes tworzy zintegrowaną mapę kognitywną narzędzi programisty.

Zastąpienie chaotycznego generowania kodu z góry określonymi, ustrukturyzowanymi granicami funkcjonalnymi gwarantuje determinizm, bezpieczeństwo działania i błyskawiczne pętle wykonawcze procesów wytwórczych.`
  }
];

