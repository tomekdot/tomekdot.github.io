/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Github, 
  Star, 
  GitFork, 
  Languages, 
  ListFilter, 
  SlidersHorizontal, 
  Sparkles,
  Gamepad2,
  Globe,
  Car,
  Bot,
  MessageSquare,
  GraduationCap,
  LayoutGrid,
  Wrench,
  Archive,
  ArrowUpDown,
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
  Clock,
  Tag,
  Newspaper,
  Calendar,
  Youtube,
  Heart,
  Key,
  Lock,
  ShieldCheck,
  Trash2,
  ChevronDown,
  GitCommit,
  Layers,
  Compass,
  Code,
  X
} from 'lucide-react';
import { CategoryKey, Repository, BlogPost } from './types';
import { CATEGORIES, REPOS, BLOG_POSTS, SHOW_PRIVATE_REPOS_TO_PUBLIC, REPO_BLACKLIST, CONTRIBUTED_FORKS, calculateReadingTime, detectCategories, autoEnrichRepo } from './data';
import LanguageChart from './components/LanguageChart';
import RepoCard from './components/RepoCard';
import RepoModal from './components/RepoModal';
import BlogModal from './components/BlogModal';
import DeveloperStatsModal from './components/DeveloperStatsModal';
import BlogStatsModal from './components/BlogStatsModal';
import GalaxyGraphModal from './components/GalaxyGraphModal';
import TerminalConsole from './components/TerminalConsole';
import YearRangeFilter from './components/YearRangeFilter';

export default function App() {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'projects' | 'blog'>('projects');
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [selectedBlogTag, setSelectedBlogTag] = useState<string>('all');
  const [blogSortBy, setBlogSortBy] = useState<'latest' | 'readingTime' | 'title'>('latest');
  const [blogViewLayout, setBlogViewLayout] = useState<'grid' | 'compact' | 'grouped'>('grid');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isBlogStatsModalOpen, setIsBlogStatsModalOpen] = useState(false);
  const [isGalaxyModalOpen, setIsGalaxyModalOpen] = useState(false);
  const [galaxyFilterMode, setGalaxyFilterMode] = useState<'all' | 'posts' | 'tags'>('all');

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all' | 'plugins' | 'forked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stars' | 'year' | 'year-asc' | 'commits'>('stars');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [appLang, setAppLang] = useState<'en' | 'pl'>('en');
  const [viewLayout, setViewLayout] = useState<'grouped' | 'grid' | 'compact'>('grouped');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number]>([2021, 2026]);
  const [isYearFilterOpen, setIsYearFilterOpen] = useState(true);
  const [hasCachedData, setHasCachedData] = useState<boolean>(() => {
    return !!localStorage.getItem('github_repos_cache');
  });
  const [reposList, setReposList] = useState<Repository[]>(() => {
    const cached = localStorage.getItem('github_repos_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((r: Repository) => {
              const isBlacklisted = REPO_BLACKLIST.some(b => b.toLowerCase() === r.name.toLowerCase());
              if (isBlacklisted) return false;
              if (r.isFork && !r.isContributed && !CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === r.name.toLowerCase())) {
                return false;
              }
              return true;
            })
            .map((r: Repository) => {
              const base = REPOS.find(orig => 
                orig.name.toLowerCase() === r.name.toLowerCase() || 
                orig.url.toLowerCase() === r.url.toLowerCase()
              );
              const isContributed = (base && base.isContributed) || r.isContributed || CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === r.name.toLowerCase());
              const merged: Repository = {
                ...r,
                isPrivate: base ? (base.isPrivate || base.cat.includes('kul')) : r.isPrivate,
                isContributed: isContributed,
                cat: (base ? base.cat : (r.cat && r.cat.length > 0 ? r.cat : ['other'])) as CategoryKey[]
              };
              return autoEnrichRepo(merged);
            });
        }
      } catch (e) {
        console.warn('Could not parse cached repo list', e);
      }
    }
    return REPOS
      .filter(r => {
        const isBlacklisted = REPO_BLACKLIST.some(b => b.toLowerCase() === r.name.toLowerCase());
        if (isBlacklisted) return false;
        if (r.isFork && !r.isContributed && !CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === r.name.toLowerCase())) {
          return false;
        }
        return true;
      })
      .map(r => {
        const isPrivateOrAcademic = r.isPrivate || r.cat.includes('kul');
        const formatted = {
          ...r,
          cat: r.cat,
          isPrivate: isPrivateOrAcademic,
          isContributed: r.isContributed || CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === r.name.toLowerCase()),
          stars: isPrivateOrAcademic ? 0 : r.stars,
          commitsCount: isPrivateOrAcademic ? 0 : r.commitsCount
        };
        return autoEnrichRepo(formatted);
      });
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [apiUser, setApiUser] = useState<string | null>(() => {
    return localStorage.getItem('github_api_user') || null;
  });
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [hidePrivate, setHidePrivate] = useState<boolean>(() => {
    // 1. Check URL query parameters (e.g. ?show_private=true)
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('show_private');
    if (queryParam === 'true' || queryParam === '1') {
      return false;
    }
    if (queryParam === 'false' || queryParam === '0') {
      return true;
    }
    // 2. Check static config from src/data.ts
    if (SHOW_PRIVATE_REPOS_TO_PUBLIC) {
      return false;
    }
    // 3. Default back to check for logged-in user with token
    return !localStorage.getItem('github_personal_token');
  });
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tempTokenValue, setTempTokenValue] = useState(() => {
    return localStorage.getItem('github_personal_token') || '';
  });
  const [hasGithubToken, setHasGithubToken] = useState(() => {
    return !!localStorage.getItem('github_personal_token');
  });
  const [syncStats, setSyncStats] = useState<{
    lastSync: string | null;
    publicCount: number;
    privateCount: number;
  }>(() => {
    const cached = localStorage.getItem('github_sync_stats');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return { lastSync: null, publicCount: 0, privateCount: 0 };
  });

  // Helper to copy updated repository collection to clipboard
  const handleExportRepos = useCallback(() => {
    try {
      const dataStr = JSON.stringify(reposList, null, 2);
      navigator.clipboard.writeText(dataStr);
      setExportSuccess('copied');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to copy repos:', err);
      setExportSuccess('error');
      setTimeout(() => setExportSuccess(null), 3000);
    }
  }, [reposList]);

  // Helper to download repos as JSON file
  const handleDownloadJSON = useCallback(() => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reposList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "repos.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess('downloaded');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to download repos.json:', err);
      setExportSuccess('error');
      setTimeout(() => setExportSuccess(null), 3000);
    }
  }, [reposList]);

  // Live GitHub API synchronizer
  const fetchGitHubData = useCallback(async (forced = false) => {
    try {
      setIsSyncing(true);
      setSyncFailed(false);
      setTokenError(null);
      
      if (forced) {
        localStorage.removeItem('github_repos_cache');
        setHasCachedData(false);
        // Evict specific README and Commits cache keys as well to ensure a complete refresh
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('github_readme_cache_') || key.startsWith('github_commits_cache_')) {
            localStorage.removeItem(key);
          }
        });
      }

      const token = localStorage.getItem('github_personal_token') || '';
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      // If token is present, let's verify identity first to make sure the token is valid
      if (token) {
        try {
          const userRes = await fetch('https://api.github.com/user', { headers });
          if (!userRes.ok) {
            console.error('GitHub authentication verify failed with status:', userRes.status);
            if (userRes.status === 401) {
              setTokenError(appLang === 'en' 
                ? 'Invalid token (401). Verify if the token is correct, not expired, and has correct scopes.' 
                : 'Błędny token (401). Sprawdź, czy token jest poprawny, nie wygasł i posiada odpowiedni zakres uprawnień.');
            } else {
              setTokenError(appLang === 'en' 
                ? `GitHub API Auth Error (${userRes.status})` 
                : `Błąd autoryzacji API GitHub (${userRes.status})`);
            }
            setSyncFailed(true);
            setIsSyncing(false);
            return;
          }
          const userData = await userRes.json();
          if (userData && userData.login) {
            if (userData.login.toLowerCase() !== 'tomekdot') {
              setTokenError(appLang === 'en' 
                ? "Access denied. Only the portfolio owner ('tomekdot') can synchronize private repositories." 
                : "Brak dostępu. Tylko właściciel portfolio ('tomekdot') może synchronizować prywatne projekty.");
              localStorage.removeItem('github_personal_token');
              localStorage.removeItem('github_api_user');
              setHasGithubToken(false);
              setApiUser(null);
              setSyncFailed(true);
              setIsSyncing(false);
              return;
            }
            setApiUser(userData.login);
            localStorage.setItem('github_api_user', userData.login);
          }
        } catch (e) {
          console.error('Error during GitHub token verification:', e);
          setTokenError(appLang === 'en' ? 'Connection error.' : 'Błąd połączenia z API.');
          setSyncFailed(true);
          setIsSyncing(false);
          return;
        }
      } else {
        setApiUser(null);
        localStorage.removeItem('github_api_user');
      }

      // If token is present, we fetch from 'user/repos' with pagination of up to 2 pages (up to 200 repos) 
      // sorted by 'updated' to safely retrieve private and public items without cut-offs.
      let data: any[] = [];
      if (token) {
        const page1Url = 'https://api.github.com/user/repos?per_page=100&page=1&sort=updated';
        const page2Url = 'https://api.github.com/user/repos?per_page=100&page=2&sort=updated';
        
        const [res1, res2] = await Promise.all([
          fetch(page1Url, { headers }),
          fetch(page2Url, { headers }).catch(() => null)
        ]);
        
        if (!res1.ok) {
          console.warn('GitHub API responded with status', res1.status, '- Falling back to offline snapshot.');
          setSyncFailed(true);
          setIsSyncing(false);
          return;
        }
        
        const data1 = await res1.json();
        const data2 = res2 && res2.ok ? await res2.json() : [];
        
        data = [
          ...(Array.isArray(data1) ? data1 : []),
          ...(Array.isArray(data2) ? data2 : [])
        ];
      } else {
        const response = await fetch('https://api.github.com/users/tomekdot/repos?per_page=100', { headers });
        if (!response.ok) {
          console.warn('GitHub API responded with status', response.status, '- Falling back to offline snapshot.');
          setSyncFailed(true);
          setIsSyncing(false);
          return;
        }
        data = await response.json();
      }

      // Proactively fetch context-aware-music-recommendation-system directly if missing.
      // This serves as an absolute bulletproof fallback if standard listings filter it out.
      if (token && Array.isArray(data)) {
        const targetRepoName = 'context-aware-music-recommendation-system';
        const alreadyFetched = data.some(r => r.name.toLowerCase() === targetRepoName.toLowerCase());
        if (!alreadyFetched) {
          try {
            console.log(`Repository "${targetRepoName}" not in main list. Doing dedicated direct fetch fallback...`);
            const specificRes = await fetch(`https://api.github.com/repos/tomekdot/${targetRepoName}`, { headers });
            if (specificRes.ok) {
              const specificData = await specificRes.json();
              console.log(`Successfully fetched specific private repository metadata: ${specificData.name}`);
              data.push(specificData);
            } else {
              console.warn(`Dedicated direct fetch for "${targetRepoName}" responded with status:`, specificRes.status);
            }
          } catch (err) {
            console.warn(`Error during dedicated fetch for "${targetRepoName}":`, err);
          }
        }
      }

      if (Array.isArray(data)) {
        data = data.filter(item => {
          const isBlacklisted = REPO_BLACKLIST.some(b => b.toLowerCase() === item.name.toLowerCase());
          if (isBlacklisted) return false;
          // Filter out pure forks that have no personal contribution (keep only own and contributed)
          if (item.fork) {
            const isContributed = CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === item.name.toLowerCase());
            if (!isContributed) return false;
          }
          return true;
        });
      }

      console.log('GitHub synchronized elements:', data.length, data.map(r => r.name));

      if (Array.isArray(data)) {
        // Read previous cached lists to prevent losing dynamic counters like commitsCount
        const cachedReposRaw = localStorage.getItem('github_repos_cache');
        let parsedCachedRepos: Repository[] = [];
        if (cachedReposRaw) {
          try {
            parsedCachedRepos = JSON.parse(cachedReposRaw) || [];
          } catch (e) {}
        }

        // Merge fetched data with our preconfigured REPOS
        const updated = REPOS.map(repo => {
          const match = data.find(item => 
            item.name.toLowerCase() === repo.name.toLowerCase() ||
            item.name.toLowerCase() === repo.url.split('/').pop()?.toLowerCase() ||
            item.html_url.toLowerCase() === repo.url.toLowerCase()
          );

          // Determine if repository should be private (preconfigured private/KUL or checked as private on GitHub)
          const isPrivateOrAcademic = repo.isPrivate || repo.cat.includes('kul') || (match ? !!match.private : false);

          // Get the most up-to-date commits count from previous cache or individual cache
          const repoNameSlug = repo.url ? (repo.url.split('/').pop() || repo.name) : repo.name;
          const individualCacheKey = `github_commits_cache_${repoNameSlug}`;
          const cachedCommits = localStorage.getItem(individualCacheKey);
          
          let commitsCount = isPrivateOrAcademic ? 0 : (repo.commitsCount || 0);
          if (cachedCommits) {
            commitsCount = parseInt(cachedCommits, 10);
          } else {
            const cacheMatch = parsedCachedRepos.find(c => c.name.toLowerCase() === repo.name.toLowerCase());
            if (cacheMatch && cacheMatch.commitsCount > 0) {
              commitsCount = cacheMatch.commitsCount;
            }
          }

          // If we have a match
          if (match) {
            const isFork = match ? !!match.fork : !!repo.isFork;
            const isContributed = (match ? CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === match.name.toLowerCase()) : false) || repo.isContributed || CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === repo.name.toLowerCase());
            const forkParent = match?.parent?.full_name || match?.source?.full_name || repo.forkParent;

            return {
              ...repo,
              cat: repo.cat,
              isPrivate: isPrivateOrAcademic,
              isFork: isFork,
              isContributed: isContributed,
              forkParent: forkParent,
              stars: isPrivateOrAcademic ? 0 : match.stargazers_count,
              forks: match.forks_count,
              lang: match.language || repo.lang,
              // Update description if matching
              desc: match.description || repo.desc,
              pushedAt: match.pushed_at,
              commitsCount: commitsCount,
              createdYear: match.created_at ? new Date(match.created_at).getFullYear() : (repo.createdYear || 2024),
            };
          }
          // If no match is found, respect preconfigured isPrivate / KUL status
          const fallbackPrivate = repo.isPrivate || repo.cat.includes('kul');
          return {
            ...repo,
            cat: repo.cat,
            isPrivate: fallbackPrivate,
            isFork: !!repo.isFork,
            isContributed: repo.isContributed || CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === repo.name.toLowerCase()),
            forkParent: repo.forkParent,
            stars: fallbackPrivate ? 0 : (repo.stars || 0),
            commitsCount: fallbackPrivate ? 0 : commitsCount,
          };
        });

        // Also dynamically add real repositories from GitHub that are not in REPOS
        const existingNamesOrUrls = new Set([
          ...REPOS.map(r => r.name.toLowerCase()),
          ...REPOS.map(r => r.url.toLowerCase()),
          ...REPOS.map(r => r.url.split('/').pop()?.toLowerCase() || '')
        ]);

        const dynamicRepos: Repository[] = [];
        data.forEach(item => {
          const nameLower = item.name.toLowerCase();
          const urlLower = item.html_url.toLowerCase();
          if (!existingNamesOrUrls.has(nameLower) && !existingNamesOrUrls.has(urlLower)) {
            // Determine category dynamically using comprehensive detector
            const cat = detectCategories({
              name: item.name,
              description: item.description,
              language: item.language,
              topics: item.topics,
              html_url: item.html_url
            });

            // Parse year
            let createdYear = 2024;
            if (item.created_at) {
              createdYear = new Date(item.created_at).getFullYear();
            }

            const isPrivateOrAcademic = item.private;

            // Retain previously loaded dynamic repo commits
            const repoNameSlug = item.html_url ? (item.html_url.split('/').pop() || item.name) : item.name;
            const individualCacheKey = `github_commits_cache_${repoNameSlug}`;
            const cachedCommits = localStorage.getItem(individualCacheKey);
            let commitsCount = 0;
            if (cachedCommits) {
              commitsCount = parseInt(cachedCommits, 10);
            } else {
              const cacheMatch = parsedCachedRepos.find(c => c.name.toLowerCase() === item.name.toLowerCase());
              if (cacheMatch && cacheMatch.commitsCount > 0) {
                commitsCount = cacheMatch.commitsCount;
              }
            }

            dynamicRepos.push({
              name: item.name,
              desc: item.description || '',
              descPl: item.description || '',
              lang: item.language || '',
              cat: cat,
              url: item.html_url,
              stars: item.stargazers_count || 0,
              forks: item.forks_count,
              commitsCount: commitsCount,
              createdYear: createdYear,
              pushedAt: item.pushed_at,
              isPrivate: isPrivateOrAcademic,
              isFork: !!item.fork,
              isContributed: item.fork ? CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === item.name.toLowerCase()) : false,
              forkParent: item.parent?.full_name || item.source?.full_name,
            });
          }
        });

        const finalRepos = [...updated, ...dynamicRepos]
          .filter(r => !r.isFork || r.isContributed || CONTRIBUTED_FORKS.some(cf => cf.toLowerCase() === r.name.toLowerCase()))
          .map(r => autoEnrichRepo(r));
        localStorage.setItem('github_repos_cache', JSON.stringify(finalRepos));

        // Calculate dynamic sync stats
        const publicCount = finalRepos.filter(r => !r.isPrivate).length;
        const privateCount = finalRepos.filter(r => r.isPrivate).length;
        const statsObj = {
          lastSync: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          publicCount,
          privateCount
        };
        localStorage.setItem('github_sync_stats', JSON.stringify(statsObj));
        setSyncStats(statsObj);

        setHasCachedData(true);
        setReposList(finalRepos);
      }
    } catch (err) {
      console.warn('Network issue while accessing GitHub repository indexes. Utilizing local data snapshot gracefully.', err);
      setSyncFailed(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchGitHubData(false);
  }, [fetchGitHubData]);

  // Statistics counters (fully synchronized with private visibility filter)
  const stats = useMemo(() => {
    const visibleList = reposList.filter(repo => {
      return !hidePrivate || !repo.isPrivate;
    });
    const total = visibleList.length;
    const pyplanet = visibleList.filter(r => r.cat.includes('pyplanet')).length;
    const openplanet = visibleList.filter(r => r.cat.includes('openplanet')).length;
    const totalPlugins = pyplanet + openplanet;
    const trackmania = visibleList.filter(r => r.cat.includes('trackmania') || r.cat.includes('pyplanet') || r.cat.includes('openplanet')).length;
    const ai = visibleList.filter(r => r.cat.includes('ai')).length;
    const kul = visibleList.filter(r => r.cat.includes('kul')).length;
    const web = visibleList.filter(r => r.cat.includes('web')).length;
    const tools = visibleList.filter(r => r.cat.includes('tools')).length;
    const totalCommits = visibleList.reduce((acc, r) => acc + (r.commitsCount || 12), 0);
    const totalStars = visibleList.reduce((acc, r) => acc + (r.stars || 0), 0);
    const forked = visibleList.filter(r => !!r.isFork).length;

    // Latest modified / updated repository
    const sortedByActivity = [...visibleList]
      .filter(r => !!r.pushedAt)
      .sort((a, b) => {
        const timeA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
        const timeB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
        return timeB - timeA;
      });
    const latestUpdated = sortedByActivity[0] || null;

    return {
      total,
      pyplanet,
      openplanet,
      totalPlugins,
      trackmania,
      ai,
      kul,
      web,
      tools,
      totalCommits,
      totalStars,
      forked,
      latestUpdated
    };
  }, [reposList, hidePrivate]);

  // Category item counts synchronized with hidePrivate visibility toggle
  const categoryCounts = useMemo(() => {
    const visibleList = reposList.filter(repo => {
      return !hidePrivate || !repo.isPrivate;
    });
    const counts: Record<string, number> = {
      all: visibleList.length
    };
    (Object.keys(CATEGORIES) as CategoryKey[]).forEach(catKey => {
      counts[catKey] = visibleList.filter(r => r.cat.includes(catKey)).length;
    });
    return counts;
  }, [reposList, hidePrivate]);

  // Sorted categories alphabetically by localized label for clean alphabetical navigation
  const sortedCategories = useMemo(() => {
    const specs = Object.values(CATEGORIES);
    return [...specs].sort((a, b) => {
      const labelA = appLang === 'en' ? a.labelEn : a.labelPl;
      const labelB = appLang === 'en' ? b.labelEn : b.labelPl;
      return labelA.localeCompare(labelB, appLang === 'pl' ? 'pl' : 'en', { sensitivity: 'base' });
    });
  }, [appLang]);

  // Retrieve unique programming languages list for drop-down filter, synchronized with the hidePrivate setting
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    let hasShellOther = false;
    reposList.forEach(r => {
      const matchesPrivate = !hidePrivate || !r.isPrivate;
      if (matchesPrivate) {
        const rawLang = (r.lang || '').trim();
        if (rawLang === '' || rawLang === 'Shell' || rawLang === 'Other' || rawLang === 'Shell/Other') {
          hasShellOther = true;
        } else {
          langs.add(rawLang);
        }
      }
    });
    const sorted = Array.from(langs).sort();
    if (hasShellOther) {
      sorted.push('Shell/Other');
    }
    return sorted;
  }, [reposList, hidePrivate]);

  // Available min and max creation years across currently visible repositories
  const { minAvailableYear, maxAvailableYear, yearDistribution } = useMemo(() => {
    const visibleList = reposList.filter(repo => !hidePrivate || !repo.isPrivate);
    let min = 2026;
    let max = 2021;
    const dist: Record<number, number> = {};

    visibleList.forEach(r => {
      const yr = r.createdYear || (r.pushedAt ? new Date(r.pushedAt).getFullYear() : 2024);
      if (yr < min) min = yr;
      if (yr > max) max = yr;
      dist[yr] = (dist[yr] || 0) + 1;
    });

    if (min > max) {
      min = 2021;
      max = 2026;
    }

    return { minAvailableYear: min, maxAvailableYear: max, yearDistribution: dist };
  }, [reposList, hidePrivate]);

  // Synchronize year range bounds when dataset bounds update
  useEffect(() => {
    setSelectedYearRange(prev => {
      const nextMin = Math.max(minAvailableYear, Math.min(prev[0], maxAvailableYear));
      const nextMax = Math.min(maxAvailableYear, Math.max(prev[1], minAvailableYear));
      if (nextMin !== prev[0] || nextMax !== prev[1]) {
        return [nextMin, nextMax];
      }
      return prev;
    });
  }, [minAvailableYear, maxAvailableYear]);

  const isFullYearRange = selectedYearRange[0] === minAvailableYear && selectedYearRange[1] === maxAvailableYear;

  // Synchronize language dropdown selection when the available language list changes
  useEffect(() => {
    if (filterLang !== 'all' && filterLang !== '' && !allLanguages.includes(filterLang)) {
      setFilterLang('all');
    }
  }, [allLanguages, filterLang]);

  // Main filter and Sort logic
  const filteredAndSortedRepos = useMemo(() => {
    let result = reposList.filter(repo => {
      // 1. Search Query
      const normQuery = searchQuery.toLowerCase();
      const repoIsShellOther = 
        !repo.lang || 
        repo.lang.trim() === '' || 
        repo.lang === 'Shell' || 
        repo.lang === 'Other' || 
        repo.lang === 'Shell/Other';

      const matchesSearch = 
        repo.name.toLowerCase().includes(normQuery) ||
        repo.desc.toLowerCase().includes(normQuery) ||
        (repo.descPl && repo.descPl.toLowerCase().includes(normQuery)) ||
        (repo.lang && repo.lang.toLowerCase().includes(normQuery)) ||
        (repoIsShellOther && (normQuery.includes('shell') || normQuery.includes('inne') || normQuery.includes('other')));

      // 2. Category selection (strictly pyplanet and openplanet for plugins, or forked)
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'plugins'
            ? (repo.cat.includes('pyplanet') || repo.cat.includes('openplanet'))
            : selectedCategory === 'forked'
              ? !!repo.isFork
              : repo.cat.includes(selectedCategory);

      // 3. Language filter select (with robust Shell/Other handling)
      const isShellOtherFilter = 
        filterLang === 'Shell/Other' || 
        filterLang === 'Shell' || 
        filterLang === 'Other';

      const matchesLanguage = 
        filterLang === 'all' || filterLang === ''
          ? true
          : isShellOtherFilter
            ? repoIsShellOther
            : repo.lang === filterLang;

      // 4. Hide Private filter option (hide explicitly private or academic)
      const matchesPrivate = !hidePrivate || !repo.isPrivate;

      // 5. Created Year filter select
      const repoYear = repo.createdYear || (repo.pushedAt ? new Date(repo.pushedAt).getFullYear() : 2024);
      const matchesYear = repoYear >= selectedYearRange[0] && repoYear <= selectedYearRange[1];

      return matchesSearch && matchesCategory && matchesLanguage && matchesPrivate && matchesYear;
    });

    // 4. Sort logic
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'stars') {
        return b.stars - a.stars;
      } else if (sortBy === 'year') {
        return (b.createdYear || 0) - (a.createdYear || 0);
      } else if (sortBy === 'year-asc') {
        return (a.createdYear || 0) - (b.createdYear || 0);
      } else if (sortBy === 'commits') {
        return (b.commitsCount || 0) - (a.commitsCount || 0);
      }
      return 0;
    });

    return result;
  }, [reposList, searchQuery, selectedCategory, filterLang, selectedYearRange, sortBy, hidePrivate]);

  // Spectrum list filtered by search, category, year and private, but NOT by language
  // so that clicking any language retains the full spectrum of options to switch
  const languageSpectrumRepos = useMemo(() => {
    return reposList.filter(repo => {
      // 1. Search Query
      const normQuery = searchQuery.toLowerCase();
      const repoIsShellOther = 
        !repo.lang || 
        repo.lang.trim() === '' || 
        repo.lang === 'Shell' || 
        repo.lang === 'Other' || 
        repo.lang === 'Shell/Other';

      const matchesSearch = 
        repo.name.toLowerCase().includes(normQuery) ||
        repo.desc.toLowerCase().includes(normQuery) ||
        (repo.descPl && repo.descPl.toLowerCase().includes(normQuery)) ||
        (repo.lang && repo.lang.toLowerCase().includes(normQuery)) ||
        (repoIsShellOther && (normQuery.includes('shell') || normQuery.includes('inne') || normQuery.includes('other')));

      // 2. Category selection
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'plugins'
            ? (repo.cat.includes('pyplanet') || repo.cat.includes('openplanet'))
            : selectedCategory === 'forked'
              ? !!repo.isFork
              : repo.cat.includes(selectedCategory);

      // 3. Hide Private
      const matchesPrivate = !hidePrivate || !repo.isPrivate;

      // 4. Created Year
      const repoYear = repo.createdYear || (repo.pushedAt ? new Date(repo.pushedAt).getFullYear() : 2024);
      const matchesYear = repoYear >= selectedYearRange[0] && repoYear <= selectedYearRange[1];

      return matchesSearch && matchesCategory && matchesPrivate && matchesYear;
    });
  }, [reposList, searchQuery, selectedCategory, selectedYearRange, hidePrivate]);

  // Extract all unique blog tags dynamically
  const allBlogTags = useMemo(() => {
    const tags = new Set<string>();
    BLOG_POSTS.forEach(post => {
      post.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, []);

  // Filter blog posts by search query and active tab tag selection
  const filteredBlogPosts = useMemo(() => {
    const list = BLOG_POSTS.filter(post => {
      const normQuery = blogSearchQuery.toLowerCase();
      const matchesSearch = 
        blogSearchQuery.trim() === '' ||
        post.titleEn.toLowerCase().includes(normQuery) ||
        post.titlePl.toLowerCase().includes(normQuery) ||
        post.excerptEn.toLowerCase().includes(normQuery) ||
        post.excerptPl.toLowerCase().includes(normQuery) ||
        post.tags.some(t => t.toLowerCase().includes(normQuery));
      
      const matchesTag = selectedBlogTag === 'all' || post.tags.includes(selectedBlogTag);
      return matchesSearch && matchesTag;
    });

    return [...list].sort((a, b) => {
      if (blogSortBy === 'latest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (blogSortBy === 'title') {
        const titleA = appLang === 'en' ? a.titleEn : a.titlePl;
        const titleB = appLang === 'en' ? b.titleEn : b.titlePl;
        return titleA.localeCompare(titleB);
      }
      if (blogSortBy === 'readingTime') {
        const timeA = parseInt(a.readingTimeEn || '2', 10);
        const timeB = parseInt(b.readingTimeEn || '2', 10);
        return timeA - timeB;
      }
      return 0;
    });
  }, [blogSearchQuery, selectedBlogTag, blogSortBy, appLang]);

  // Clean filters helper
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFilterLang('all');
    setSortBy('stars');
    setSelectedYearRange([minAvailableYear, maxAvailableYear]);
    setHidePrivate(true);
  };

  // Find the synchronized repo from the active reposList to make sure stars counts are correct
  const activeSelectedRepo = useMemo(() => {
    if (!selectedRepo) return null;
    return reposList.find(r => r.name.toLowerCase() === selectedRepo.name.toLowerCase()) || selectedRepo;
  }, [selectedRepo, reposList]);

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text font-sans flex flex-col justify-between selection:bg-editorial-accent selection:text-editorial-bg border-2 sm:border-4 md:border-8 border-[#1A1A1A]">
      
      {/* 1. Header Toolbar navigation */}
      <nav id="top_app_navbar" className="sticky top-0 z-40 bg-editorial-bg/95 border-b border-editorial-border px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src="https://avatars.githubusercontent.com/tomekdot" 
            alt="tomekdot avatar mini" 
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-editorial-border"
          />
          <span translate="no" className="font-mono font-bold tracking-tight text-xs sm:text-sm text-white notranslate">
            tomekdot
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Languages Selector */}
          <button
            type="button"
            id="lang_toggle_btn"
            onClick={() => setAppLang(appLang === 'en' ? 'pl' : 'en')}
            className="h-8 sm:h-9 px-2.5 flex items-center justify-center gap-1.5 text-editorial-muted hover:text-white border border-editorial-border hover:bg-neutral-900 transition-colors font-mono cursor-pointer shrink-0 text-xs font-bold"
            title="Toggle language / Zmień język"
          >
            <Languages size={14} className="text-editorial-accent shrink-0" />
            <span className="uppercase tracking-wider">{appLang}</span>
          </button>

          {/* GitHub redirect link */}
          <a
            href="https://github.com/tomekdot"
            target="_blank"
            rel="noreferrer"
            className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center text-editorial-muted hover:text-white border border-editorial-border hover:bg-neutral-900 transition-colors shrink-0"
            title="Tomek's GitHub Profile"
          >
            <Github size={14} />
          </a>

          {/* YouTube redirect link */}
          <a
            href="https://youtube.com/@tomekdot"
            target="_blank"
            rel="noreferrer"
            className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center text-editorial-muted hover:text-[#FF0000] border border-editorial-border hover:bg-neutral-900 transition-colors shrink-0"
            title="Tomek's YouTube Channel"
          >
            <Youtube size={14} />
          </a>

          {/* PayPal redirect link */}
          <a
            href="https://paypal.me/tomekdot"
            target="_blank"
            rel="noreferrer"
            className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center text-editorial-muted hover:text-[#0079C1] border border-editorial-border hover:bg-neutral-900 transition-colors shrink-0"
            title={appLang === 'en' ? 'Support on PayPal' : 'Wesprzyj przez PayPal'}
          >
            <Heart size={14} />
          </a>
        </div>
      </nav>

      {/* 2. Interactive Hero Profile Block */}
      <header id="app_profile_hero" className="border-b border-editorial-border p-4 sm:p-6 md:p-8 lg:p-10 bg-editorial-bg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 md:gap-8">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed border-editorial-accent flex items-center justify-center p-1 shrink-0">
            <img 
              className="w-full h-full rounded-full object-cover" 
              src="https://avatars.githubusercontent.com/tomekdot" 
              alt="tomekdot profile picture"
            />
          </div>

          <div className="flex-grow w-full text-center sm:text-left">
            <div className="flex flex-col md:flex-row justify-between items-center sm:items-start md:items-end gap-3 sm:gap-4">
              {/* Username & Description */}
              <div className="min-w-0">
                <h1 translate="no" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight font-mono text-white leading-none notranslate">
                  tomekdot
                </h1>
                <p className="text-[#8b949e] italic mt-2 text-xs sm:text-sm font-sans leading-relaxed">
                  {appLang === 'en' 
                    ? 'Developing Trackmania plugins and AI agents with precision.' 
                    : 'Rozwijanie wtyczek Trackmania i agentów AI z najwyższą precyzją.'}
                </p>
              </div>

              {/* Framed Archival Index & Status Badge (Unified for Desktop and Mobile) */}
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 px-3.5 py-2.5 bg-editorial-sidebar-bg border border-editorial-border w-full md:w-auto font-mono shrink-0 shadow-sm my-1 md:my-0">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8b949e] block">Archival Index</span>
                  <span className="text-xs sm:text-sm font-bold text-white">VOL. 2026</span>
                </div>
                <div className="h-6 w-px bg-editorial-border shrink-0" />
                <div className="text-right">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8b949e] flex items-center gap-1 justify-end">
                    <span>Status</span>
                    <button 
                      type="button"
                      id="force_sync_btn"
                      onClick={() => fetchGitHubData(true)}
                      disabled={isSyncing}
                      title={appLang === 'en' ? 'Force Sync & Clear Cache' : 'Wymuś synchronizację i wyczyść cache'}
                      className={`hover:text-white transition-all focus:outline-none p-0.5 border border-transparent rounded bg-transparent ${isSyncing ? 'animate-spin' : 'hover:border-editorial-border hover:bg-neutral-900'} cursor-pointer`}
                    >
                      <RefreshCw size={10} />
                    </button>
                  </span>
                  <span className={`text-xs sm:text-sm font-bold transition-all ${
                    isSyncing 
                      ? 'text-editorial-accent animate-pulse' 
                      : syncFailed 
                        ? (hasCachedData ? 'text-[#3fb950]' : 'text-amber-500') 
                        : 'text-[#3fb950]'
                  }`}>
                    {isSyncing 
                      ? (appLang === 'en' ? 'Syncing...' : 'Synchronizacja...') 
                      : syncFailed 
                        ? (hasCachedData 
                          ? (appLang === 'en' ? 'Active (Cached)' : 'Aktywny (Cache)') 
                          : (appLang === 'en' ? 'Offline (Snapshot)' : 'Zapis (Offline)')) 
                        : (appLang === 'en' ? 'Active' : 'Aktywny')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-2.5 mt-3 sm:mt-4 text-[11px] sm:text-xs">
            <a
              href="https://github.com/tomekdot"
              target="_blank"
              rel="noreferrer"
              className="h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 border border-editorial-border hover:border-white bg-[#0D0D0D] hover:bg-neutral-900 font-mono text-editorial-muted hover:text-white transition-all rounded-none shrink-0"
              title="GitHub Profile"
            >
              <Github size={13} />
              <span>GITHUB</span>
            </a>
            <a
              href="https://youtube.com/@tomekdot"
              target="_blank"
              rel="noreferrer"
              className="h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 border border-editorial-border hover:border-[#FF0000] bg-[#0D0D0D] hover:bg-red-950/10 font-mono text-editorial-muted hover:text-white transition-all rounded-none shrink-0"
              title="YouTube (@tomekdot)"
            >
              <Youtube size={13} className="text-[#FF0000]" />
              <span>YOUTUBE</span>
            </a>
            <a
              href="https://paypal.me/tomekdot"
              target="_blank"
              rel="noreferrer"
              className="h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 border border-editorial-border hover:border-[#0079C1] bg-[#0D0D0D] hover:bg-blue-950/10 font-mono text-editorial-muted hover:text-white transition-all rounded-none shrink-0"
              title="PayPal Sponsor (@tomekdot)"
            >
              <Heart size={13} className="text-[#0079C1]" />
              <span>PAYPAL</span>
            </a>
            <button
              type="button"
              id="admin_sync_btn"
              onClick={() => setIsTokenModalOpen(true)}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 border font-mono transition-all rounded-none cursor-pointer group shrink-0 ${
                hasGithubToken 
                  ? 'border-emerald-700/80 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300' 
                  : 'border-amber-900/60 hover:border-amber-500 bg-[#0D0D0D] hover:bg-amber-950/20 text-amber-400/90 hover:text-amber-300'
              }`}
              title={appLang === 'en' ? 'Admin Access: Sync Private Repositories' : 'Dostęp Administratora: Synchronizacja prywatnych repozytoriów'}
            >
              {hasGithubToken ? (
                <>
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  <span className="font-bold flex items-center">
                    <span className="hidden sm:inline">{appLang === 'en' ? 'ADMIN: SYNC ACTIVE' : 'ADMIN: SYNCHRONIZACJA AKTYWNA'}</span>
                    <span className="sm:hidden">{appLang === 'en' ? 'SYNC ACTIVE' : 'AKTYWNA'}</span>
                    {syncStats?.lastSync && (
                      <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 ml-2 border border-emerald-500/30">
                        {syncStats.lastSync}
                      </span>
                    )}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-0.5" />
                </>
              ) : (
                <>
                  <Lock size={11} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">{appLang === 'en' ? 'SYNC PRIVATE' : 'DODAJ PRYWATNE'}</span>
                  <span className="text-[8px] sm:text-[9px] uppercase px-1 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold ml-0.5">
                    {appLang === 'en' ? 'ADMIN' : 'ADMIN'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* 3. Core Workspace Section */}
      <main className="flex-grow grid grid-cols-1 md:grid-cols-[310px_1fr] lg:grid-cols-[340px_1fr] md:divide-x divide-editorial-border border-b border-editorial-border bg-editorial-bg md:overflow-hidden">
        {/* Left Sidebar block */}
        <aside className="p-3.5 sm:p-4 md:p-5 lg:p-6 pb-4 md:pb-44 flex flex-col justify-start gap-3.5 sm:gap-4 md:gap-6 lg:gap-7 bg-editorial-sidebar-bg md:overflow-y-auto">
          <div className="space-y-4 md:space-y-6">
            {/* Main Tabs Navigation */}
            <div className="flex h-[38px] border border-editorial-border p-1 bg-neutral-950 font-mono text-[11px] rounded-none mb-3 sm:mb-4 box-border">
              <button
                type="button"
                id="tab_trigger_projects"
                onClick={() => setActiveWorkspaceTab('projects')}
                className={`flex-1 h-full flex items-center justify-center transition-all cursor-pointer font-bold uppercase tracking-wider ${activeWorkspaceTab === 'projects' ? 'bg-[#1D170E] border border-editorial-accent text-editorial-accent' : 'border border-transparent text-editorial-muted hover:text-white'}`}
                title={appLang === 'en' ? 'Project Archive' : 'Archiwum projektów'}
              >
                📁 {appLang === 'en' ? `Repos (${stats.total})` : `Projekty (${stats.total})`}
              </button>
              <button
                type="button"
                id="tab_trigger_blog"
                onClick={() => setActiveWorkspaceTab('blog')}
                className={`flex-1 h-full flex items-center justify-center transition-all cursor-pointer font-bold uppercase tracking-wider ${activeWorkspaceTab === 'blog' ? 'bg-[#1D170E] border border-editorial-accent text-editorial-accent' : 'border border-transparent text-editorial-muted hover:text-white'}`}
                title={appLang === 'en' ? 'Blog Posts Journal' : 'Wpisy na blogu'}
              >
                📝 {appLang === 'en' ? `Blog (${BLOG_POSTS.length})` : `Blog (${BLOG_POSTS.length})`}
              </button>
            </div>

            {activeWorkspaceTab === 'projects' ? (
              <>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8b949e] font-mono font-bold">
                  {appLang === 'en' ? 'Categories' : 'Kategorie'}
                </h2>
                <nav translate="no" className="flex flex-col gap-2.5 sm:gap-3 text-xs sm:text-[13.5px] md:text-[14px] font-bold font-mono notranslate">
                  <button
                    type="button"
                    id="category_nav_all"
                    onClick={() => setSelectedCategory('all')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'all' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    00. {appLang === 'en' ? 'Show All' : 'Wszystko'} ({categoryCounts.all || 0})
                  </button>
                  {sortedCategories.map((catSpec, index) => {
                    const numberStr = String(index + 1).padStart(2, '0');
                    const label = appLang === 'en' ? catSpec.labelEn : catSpec.labelPl;
                    const count = categoryCounts[catSpec.key] || 0;
                    return (
                      <button
                        key={catSpec.key}
                        type="button"
                        id={`category_nav_${catSpec.key}`}
                        onClick={() => setSelectedCategory(catSpec.key)}
                        className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === catSpec.key ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                      >
                        {numberStr}. {label} ({count})
                      </button>
                    );
                  })}
                </nav>
              </>
            ) : (
              <>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8b949e] font-mono font-bold">
                  {appLang === 'en' ? 'Blog Tags' : 'Tagi wpisów'}
                </h2>
                <nav translate="no" className="flex flex-col gap-2.5 sm:gap-3 text-xs sm:text-[13.5px] md:text-[14px] font-bold font-mono notranslate">
                  <button
                    type="button"
                    id="blog_tag_nav_all"
                    onClick={() => setSelectedBlogTag('all')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedBlogTag === 'all' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    00. {appLang === 'en' ? 'Show All' : 'Wszystko'} ({BLOG_POSTS.length})
                  </button>
                  {allBlogTags.map((tag, index) => {
                    const numberStr = String(index + 1).padStart(2, '0');
                    const cnt = BLOG_POSTS.filter(b => b.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        type="button"
                        id={`blog_tag_nav_${tag}`}
                        onClick={() => setSelectedBlogTag(tag)}
                        className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedBlogTag === tag ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                      >
                        {numberStr}. {tag.toUpperCase()} ({cnt})
                      </button>
                    );
                  })}
                </nav>
              </>
            )}
          </div>

          {activeWorkspaceTab === 'projects' ? (
            <div className="bg-editorial-sidebar-bg p-2.5 sm:p-3 md:p-3.5 border-2 border-editorial-border rounded-none space-y-2.5 sm:space-y-3 mb-1 sm:mb-2 md:mb-6 shadow-xl overflow-hidden box-border">
              {/* Header with Title and Volume Badge */}
              <div className="flex items-center justify-between border-b border-editorial-border pb-2 gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 bg-[#1D170E] border border-editorial-accent/50 text-editorial-accent shrink-0">
                    <Sparkles size={12} />
                  </div>
                  <h3 className="text-[11.5px] sm:text-xs font-bold uppercase font-mono text-editorial-accent tracking-wide whitespace-nowrap">
                    {appLang === 'en' ? 'Developer Stats' : 'Statystyki Twórcy'}
                  </h3>
                </div>
                <span className="text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-muted shrink-0 ml-1">
                  @tomekdot
                </span>
              </div>

              {/* High-legibility Metrics Grid with perfect bounding */}
              <div translate="no" className="grid grid-cols-2 gap-1.5 sm:gap-2 notranslate font-mono">
                {/* Total Repos */}
                <button
                  type="button"
                  id="filter_all_sidebar_tile"
                  onClick={() => setSelectedCategory('all')}
                  className={`p-2 sm:p-2.5 transition-all text-left flex flex-col justify-between group cursor-pointer overflow-hidden min-w-0 ${
                    selectedCategory === 'all'
                      ? 'bg-neutral-900 border-2 border-editorial-accent/80'
                      : 'bg-[#0B0B0B] hover:bg-neutral-900 border border-editorial-border hover:border-editorial-accent/50'
                  }`}
                  title={appLang === 'en' ? 'Filter all repositories' : 'Pokaż wszystkie repozytoria'}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] sm:text-[9.5px] font-bold uppercase text-editorial-muted group-hover:text-white truncate">
                      {appLang === 'en' ? 'Repos' : 'Repozytoria'}
                    </span>
                    <Layers size={10} className="text-editorial-muted group-hover:text-editorial-accent shrink-0 ml-0.5" />
                  </div>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-black text-white leading-none block whitespace-nowrap">
                      {stats.total}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-editorial-muted font-normal block mt-1 truncate">
                      {appLang === 'en' ? 'Indexed' : 'Wszystkie'}
                    </span>
                  </div>
                </button>

                {/* Trackmania / PyPlanet / Openplanet Plugins (all 6 plugins) */}
                <button
                  type="button"
                  id="filter_plugins_sidebar_tile"
                  onClick={() => setSelectedCategory(selectedCategory === 'plugins' ? 'all' : 'plugins')}
                  className={`p-2 sm:p-2.5 transition-all text-left flex flex-col justify-between group cursor-pointer overflow-hidden min-w-0 ${
                    selectedCategory === 'plugins'
                      ? 'bg-emerald-950/60 border-2 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-emerald-950/25 hover:bg-emerald-950/40 border border-emerald-800/50 hover:border-emerald-500'
                  }`}
                  title={appLang === 'en' ? `Show all ${stats.totalPlugins} Trackmania Plugins (PyPlanet & Openplanet)` : `Pokaż wszystkie ${stats.totalPlugins} wtyczki (PyPlanet & Openplanet)`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] sm:text-[9.5px] font-bold uppercase text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1 truncate">
                      <Gamepad2 size={10} className="shrink-0" />
                      <span className="truncate">Plugins</span>
                    </span>
                    {selectedCategory === 'plugins' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-0.5" />
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-black text-emerald-400 leading-none block whitespace-nowrap">
                      {stats.totalPlugins}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-emerald-300/80 font-normal block mt-1 truncate">
                      {stats.pyplanet} PyP / {stats.openplanet} OP
                    </span>
                  </div>
                </button>

                {/* AI Agents */}
                <button
                  type="button"
                  id="filter_ai_sidebar_tile"
                  onClick={() => setSelectedCategory(selectedCategory === 'ai' ? 'all' : 'ai')}
                  className={`p-2 sm:p-2.5 transition-all text-left flex flex-col justify-between group cursor-pointer overflow-hidden min-w-0 ${
                    selectedCategory === 'ai'
                      ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'bg-cyan-950/25 hover:bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500'
                  }`}
                  title={appLang === 'en' ? 'Filter AI & Autonomous Agents' : 'Pokaż Agentów AI'}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] sm:text-[9.5px] font-bold uppercase text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1 truncate">
                      <Bot size={10} className="shrink-0" />
                      <span className="truncate">AI Agents</span>
                    </span>
                    {selectedCategory === 'ai' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-0.5" />
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-black text-cyan-400 leading-none block whitespace-nowrap">
                      {stats.ai}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-cyan-300/80 font-normal block mt-1 truncate">
                      Autonomous
                    </span>
                  </div>
                </button>

                {/* Forked Repositories Filter Tile */}
                <button
                  type="button"
                  id="filter_forks_sidebar_tile"
                  onClick={() => setSelectedCategory(selectedCategory === 'forked' ? 'all' : 'forked')}
                  className={`p-2 sm:p-2.5 transition-all text-left flex flex-col justify-between group cursor-pointer overflow-hidden min-w-0 ${
                    selectedCategory === 'forked'
                      ? 'bg-purple-950/60 border-2 border-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.3)]'
                      : 'bg-purple-950/25 hover:bg-purple-950/40 border border-purple-800/50 hover:border-purple-500'
                  }`}
                  title={appLang === 'en' ? `Show all ${stats.forked} Forked Repositories` : `Pokaż wszystkie ${stats.forked} sforkowane repozytoria`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] sm:text-[9.5px] font-bold uppercase text-purple-300 group-hover:text-purple-200 flex items-center gap-1 truncate">
                      <GitFork size={10} className="shrink-0" />
                      <span className="truncate">{appLang === 'en' ? 'Forked' : 'Forki'}</span>
                    </span>
                    {selectedCategory === 'forked' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 ml-0.5" />
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-black text-purple-400 leading-none block whitespace-nowrap">
                      {stats.forked}
                    </span>
                    <span className="text-[8px] sm:text-[8.5px] text-purple-300/80 font-normal block mt-1 truncate">
                      {appLang === 'en' ? 'Upstream Forks' : 'Sforkowane'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Latest Change Live Banner */}
              {stats.latestUpdated && (
                <div
                  onClick={() => setSelectedRepo(stats.latestUpdated)}
                  className="p-2 sm:p-2.5 bg-[#0B0B0B] hover:bg-[#141414] border border-editorial-border hover:border-editorial-accent/70 transition-all cursor-pointer space-y-1 group overflow-hidden"
                >
                  <div className="flex items-center justify-between text-editorial-accent text-[9px] sm:text-[9.5px] font-mono font-bold uppercase">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent animate-pulse inline-block shrink-0" />
                      <span className="truncate">{appLang === 'en' ? 'Latest Update' : 'Ostatnia Zmiana'}</span>
                    </span>
                    {stats.latestUpdated.pushedAt && (
                      <span className="text-zinc-400 font-mono font-normal text-[8px] sm:text-[8.5px] shrink-0 ml-1">
                        {new Date(stats.latestUpdated.pushedAt).toISOString().split('T')[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold font-mono text-white group-hover:text-editorial-accent transition-colors truncate">
                    {stats.latestUpdated.name}
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] text-editorial-muted font-sans line-clamp-1">
                    {appLang === 'en' ? stats.latestUpdated.desc : (stats.latestUpdated.descPl || stats.latestUpdated.desc)}
                  </p>
                </div>
              )}

              {/* Large High-Contrast Trigger Button */}
              <button
                type="button"
                id="open_dev_stats_modal_sidebar_btn"
                onClick={() => setIsStatsModalOpen(true)}
                className="w-full py-2 sm:py-2.5 px-2 bg-[#1C160E] hover:bg-[#2A2012] border-2 border-editorial-accent hover:border-[#f59e0b] text-editorial-accent hover:text-white font-mono font-bold uppercase tracking-normal sm:tracking-wide text-[10.5px] sm:text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md group overflow-hidden"
              >
                <Sparkles size={12} className="text-editorial-accent group-hover:rotate-12 transition-transform shrink-0" />
                <span className="whitespace-nowrap">{appLang === 'en' ? 'FULL STATS & LOGS' : 'PEŁNE STATYSTYKI'}</span>
                <span className="text-editorial-muted group-hover:text-white shrink-0">→</span>
              </button>
            </div>
          ) : (
            <div className="bg-editorial-sidebar-bg p-3 sm:p-4 border-2 border-editorial-border rounded-none space-y-3 mb-1 sm:mb-2 md:mb-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between border-b border-editorial-border pb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase font-mono text-editorial-accent tracking-wider">
                  {appLang === 'en' ? 'Journal Stats' : 'Statystyki Bloga'}
                </h3>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-muted">
                  DEV LOG
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <button 
                  type="button"
                  id="open_galaxy_graph_posts_card"
                  onClick={() => {
                    setGalaxyFilterMode('posts');
                    setIsGalaxyModalOpen(true);
                  }}
                  className="p-2.5 bg-[#0B0B0B] hover:bg-[#121B17] border border-editorial-border hover:border-emerald-500/80 transition-all flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden"
                  title={appLang === 'en' ? 'Open Galaxy Graph (Posts node network)' : 'Otwórz Galaxy Graph (Wpisy)'}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-editorial-muted group-hover:text-emerald-400 transition-colors">{appLang === 'en' ? 'Posts' : 'Wpisy'}</span>
                    <Compass size={11} className="text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all" />
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl sm:text-2xl font-black text-white">{BLOG_POSTS.length}</span>
                    <span className="text-[8.5px] font-mono text-emerald-400/80 group-hover:text-emerald-300">GRAPH →</span>
                  </div>
                </button>

                <button 
                  type="button"
                  id="open_galaxy_graph_tags_card"
                  onClick={() => {
                    setGalaxyFilterMode('tags');
                    setIsGalaxyModalOpen(true);
                  }}
                  className="p-2.5 bg-neutral-950 hover:bg-[#1A0F22] border border-editorial-border hover:border-fuchsia-500/80 transition-all flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden"
                  title={appLang === 'en' ? 'Open Galaxy Graph (Tags memory hubs)' : 'Otwórz Galaxy Graph (Tagi)'}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-editorial-accent group-hover:text-fuchsia-400 transition-colors">Tags</span>
                    <Compass size={11} className="text-fuchsia-400 opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all" />
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl sm:text-2xl font-black text-editorial-accent group-hover:text-fuchsia-300">{allBlogTags.length}</span>
                    <span className="text-[8.5px] font-mono text-fuchsia-400/80 group-hover:text-fuchsia-300">GRAPH →</span>
                  </div>
                </button>
              </div>

              {/* High-Contrast Blog Stats & AI Modal Button */}
              <button
                type="button"
                id="open_blog_stats_modal_sidebar_btn"
                onClick={() => setIsBlogStatsModalOpen(true)}
                className="w-full py-2 sm:py-2.5 px-2 bg-[#1C160E] hover:bg-[#2A2012] border-2 border-editorial-accent hover:border-[#f59e0b] text-editorial-accent hover:text-white font-mono font-bold uppercase tracking-normal sm:tracking-wide text-[10.5px] sm:text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md group overflow-hidden"
              >
                <Sparkles size={12} className="text-editorial-accent group-hover:rotate-12 transition-transform shrink-0" />
                <span className="whitespace-nowrap">{appLang === 'en' ? 'BLOG STATS & AI' : 'STATYSTYKI BLOGA & AI'}</span>
                <span className="text-editorial-muted group-hover:text-white shrink-0">→</span>
              </button>
            </div>
          )}
        </aside>

        {/* Right workspace section block */}
        <section className="p-3.5 sm:p-4 md:p-5 lg:p-6 pb-20 sm:pb-28 md:pb-48 bg-editorial-bg md:overflow-y-auto">
          {activeWorkspaceTab === 'projects' ? (
            <div className="main-content flex flex-col gap-4 sm:gap-5">
              {/* Header controls, year filter, language spectrum, and active filters container */}
              <div className="space-y-2 sm:space-y-2.5">
                {/* Main workspace control toolbar */}
                <div className="space-y-2 sm:space-y-2.5">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 justify-between items-stretch lg:items-center">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-editorial-muted shrink-0 pointer-events-none" size={14} />
                    <input
                      type="text"
                      id="repos_search_input"
                      placeholder={appLang === 'en' ? "Search repos by key, lang, metadata..." : "Szukaj po nazwie, tagach, językach..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-[38px] bg-editorial-sidebar-bg border border-editorial-border focus:border-editorial-accent focus:ring-0 rounded-none pl-10 pr-9 py-2 text-xs sm:text-sm outline-none text-white placeholder:text-zinc-600 transition-all font-mono uppercase tracking-wide box-border"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-muted hover:text-white p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Layout Buttons (Grouped / Grid / Compact) */}
                  <div className="bg-editorial-sidebar-bg p-1 rounded-none border border-editorial-border flex items-center gap-1 text-xs font-mono shrink-0 w-full lg:w-[280px] h-[38px] box-border">
                    <button
                      type="button"
                      id="layout_btn_grouped"
                      onClick={() => setViewLayout('grouped')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider
                        ${viewLayout === 'grouped' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'}`}
                    >
                      {appLang === 'en' ? 'Grouped' : 'Grupuj'}
                    </button>
                    <button
                      type="button"
                      id="layout_btn_grid"
                      onClick={() => setViewLayout('grid')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider
                        ${viewLayout === 'grid' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'}`}
                    >
                      {appLang === 'en' ? 'Grid' : 'Siatka'}
                    </button>
                    <button
                      type="button"
                      id="layout_btn_compact"
                      onClick={() => setViewLayout('compact')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider
                        ${viewLayout === 'compact' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'}`}
                    >
                      {appLang === 'en' ? 'Compact' : 'Kompakt'}
                    </button>
                  </div>
                </div>

                {/* Filters sub-row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full sm:w-auto gap-1.5">
                    {/* Amber Admin-style Hide/Show Private toggle button */}
                    <button
                      type="button"
                      id="toggle_hide_private_btn"
                      onClick={() => setHidePrivate(!hidePrivate)}
                      className={`flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 border transition-all cursor-pointer text-[10.5px] sm:text-xs uppercase tracking-wider rounded-none shrink-0 group ${
                        !hidePrivate 
                          ? 'border-amber-500/80 bg-amber-950/40 text-amber-300 font-bold shadow-sm shadow-amber-950/40' 
                          : 'border-amber-900/60 hover:border-amber-500 bg-[#0D0D0D] hover:bg-amber-950/20 text-amber-400/90 hover:text-amber-300'
                      }`}
                      title={appLang === 'en' ? 'Toggle visibility of private repositories' : 'Przełącz widoczność prywatnych repozytoriów'}
                    >
                      {!hidePrivate ? (
                        <Eye size={12} className="text-amber-400 shrink-0" />
                      ) : (
                        <Lock size={11} className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="truncate">
                        {!hidePrivate 
                          ? (appLang === 'en' ? 'SHOWN' : 'JAWNE') 
                          : (appLang === 'en' ? 'HIDDEN' : 'UKRYTE')}
                      </span>
                      <span className="text-[8.5px] sm:text-[9px] uppercase px-1 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0 hidden xs:inline">
                        ADMIN
                      </span>
                    </button>

                    {/* Year Range Filter Toggle Button */}
                    <button
                      type="button"
                      id="toggle_year_filter_drawer_btn"
                      onClick={() => setIsYearFilterOpen(!isYearFilterOpen)}
                      className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border transition-all cursor-pointer text-[10.5px] sm:text-xs uppercase tracking-wider rounded-none shrink-0 group ${
                        !isFullYearRange
                          ? 'border-sky-500 bg-sky-950/50 text-sky-300 font-bold shadow-[0_0_8px_rgba(88,166,255,0.25)]'
                          : isYearFilterOpen
                            ? 'border-sky-500/60 bg-neutral-900 text-sky-300'
                            : 'border-editorial-border bg-[#0D0D0D] hover:border-editorial-accent/50 text-editorial-muted hover:text-white'
                      }`}
                      title={appLang === 'en' ? 'Toggle creation year range slider filter' : 'Przełącz filtr suwaka rocznika projektu'}
                    >
                      <Calendar size={12} className={!isFullYearRange ? 'text-sky-400' : 'text-editorial-muted group-hover:text-white'} />
                      <span className="truncate">
                        {appLang === 'en' ? 'YEAR' : 'ROK'}: {selectedYearRange[0] === selectedYearRange[1] ? selectedYearRange[0] : `${selectedYearRange[0]}–${selectedYearRange[1]}`}
                      </span>
                      {!isFullYearRange && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" />
                      )}
                    </button>

                    {/* Language Droplist */}
                    <div className="relative flex items-center min-w-0">
                      <select
                        id="language_filter_select"
                        value={filterLang}
                        onChange={(e) => setFilterLang(e.target.value)}
                        translate="no"
                        className="w-full bg-editorial-sidebar-bg border border-editorial-border text-[10.5px] sm:text-xs text-white font-mono py-1.5 pl-2 sm:pl-3 pr-5 sm:pr-7 rounded-none focus:border-editorial-accent focus:outline-none transition-colors notranslate appearance-none cursor-pointer truncate"
                      >
                        <option value="all">{appLang === 'en' ? 'ALL LANGS' : 'WSZYSTKIE'}</option>
                        {allLanguages.map(l => (
                          <option key={l} value={l}>
                            {l === 'Shell/Other' 
                              ? (appLang === 'en' ? 'SHELL / OTHER' : 'SHELL / INNE') 
                              : l.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none text-editorial-muted">
                        <ChevronDown size={11} />
                      </div>
                    </div>

                    {/* Sorting selection dropdown */}
                    <div className="relative flex items-center min-w-0">
                      <select
                        id="sort_filter_select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-editorial-sidebar-bg border border-editorial-border text-[10.5px] sm:text-xs text-white font-mono py-1.5 pl-2 sm:pl-3 pr-5 sm:pr-7 rounded-none focus:border-editorial-accent focus:outline-none transition-colors appearance-none cursor-pointer truncate"
                      >
                        <option value="stars">{appLang === 'en' ? '★ STARS' : '★ GWIAZDKI'}</option>
                        <option value="year">{appLang === 'en' ? '📅 YEAR (NEWEST)' : '📅 ROK (NAJNOWSZE)'}</option>
                        <option value="year-asc">{appLang === 'en' ? '📅 YEAR (OLDEST)' : '📅 ROK (NAJSTARSZE)'}</option>
                        <option value="name">{appLang === 'en' ? 'A-Z NAME' : 'A-Z NAZWA'}</option>
                        <option value="commits">{appLang === 'en' ? 'COMMITS' : 'COMMITY'}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none text-editorial-muted">
                        <ChevronDown size={11} />
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-editorial-muted font-mono hidden sm:inline">
                    {filteredAndSortedRepos.length} {appLang === 'en' ? 'repos found' : 'znalezionych'}
                  </span>
                </div>

                {/* Year Range Slider Filter Component */}
                {isYearFilterOpen && (
                  <YearRangeFilter
                    minYear={minAvailableYear}
                    maxYear={maxAvailableYear}
                    selectedRange={selectedYearRange}
                    onChange={setSelectedYearRange}
                    yearDistribution={yearDistribution}
                    totalFilteredCount={filteredAndSortedRepos.length}
                    lang={appLang}
                  />
                )}
              </div>

              {/* Active stats spectrum panel with interactive language buttons */}
              <LanguageChart 
                repos={languageSpectrumRepos} 
                lang={appLang} 
                selectedLang={filterLang}
                onSelectLang={(langName) => {
                  setFilterLang(prev => prev === langName ? 'all' : langName);
                }}
              />

              {/* Active Filter Notification Bar */}
              {(selectedCategory !== 'all' || !isFullYearRange || (filterLang !== 'all' && filterLang !== '')) && (
                <div className="p-2 sm:p-2.5 bg-[#13110C] border border-editorial-accent/60 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-white">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="w-2 h-2 rounded-full bg-editorial-accent animate-pulse shrink-0" />
                    <span className="text-editorial-accent font-bold uppercase shrink-0">
                      {appLang === 'en' ? 'FILTERS APPLIED:' : 'AKTYWNE FILTRY:'}
                    </span>
                    
                    {selectedCategory !== 'all' && (
                      <div className="inline-flex items-center gap-1.5 bg-neutral-900 border border-editorial-accent/40 px-2 py-0.5">
                        <span className="text-zinc-200 uppercase font-semibold text-[11px]">
                          {selectedCategory === 'plugins'
                            ? (appLang === 'en' ? `Trackmania Plugins (${categoryCounts.plugins || 0})` : `Pluginy Trackmania (${categoryCounts.plugins || 0})`)
                            : selectedCategory === 'forked'
                              ? (appLang === 'en' ? `Forks (${categoryCounts.forked || 0})` : `Forki (${categoryCounts.forked || 0})`)
                              : (CATEGORIES[selectedCategory as CategoryKey]
                                  ? (appLang === 'en' ? CATEGORIES[selectedCategory as CategoryKey].labelEn : CATEGORIES[selectedCategory as CategoryKey].labelPl)
                                  : selectedCategory)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('all')}
                          className="text-editorial-muted hover:text-white cursor-pointer ml-1 text-xs"
                          title={appLang === 'en' ? 'Remove category filter' : 'Usuń filtr kategorii'}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {filterLang !== 'all' && filterLang !== '' && (
                      <div className="inline-flex items-center gap-1.5 bg-neutral-900 border border-editorial-accent/60 px-2 py-0.5 text-editorial-accent">
                        <Code size={11} className="text-editorial-accent shrink-0" />
                        <span className="uppercase font-semibold text-[11px]">
                          {appLang === 'en' ? 'Language: ' : 'Język: '}
                          {filterLang === 'Shell/Other' || filterLang === 'Shell' || filterLang === 'Other'
                            ? (appLang === 'en' ? 'Shell / Other' : 'Shell / Inne')
                            : filterLang}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFilterLang('all')}
                          className="text-editorial-accent hover:text-white cursor-pointer ml-1 text-xs"
                          title={appLang === 'en' ? 'Remove language filter' : 'Usuń filtr języka'}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {!isFullYearRange && (
                      <div className="inline-flex items-center gap-1.5 bg-sky-950/40 border border-sky-400/50 px-2 py-0.5 text-sky-300">
                        <Calendar size={11} className="text-sky-400" />
                        <span className="uppercase font-semibold text-[11px]">
                          {appLang === 'en' ? 'Year: ' : 'Rok: '}{selectedYearRange[0] === selectedYearRange[1] ? selectedYearRange[0] : `${selectedYearRange[0]}–${selectedYearRange[1]}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedYearRange([minAvailableYear, maxAvailableYear])}
                          className="text-sky-400 hover:text-white cursor-pointer ml-1 text-xs"
                          title={appLang === 'en' ? 'Reset year range' : 'Zresetuj zakres lat'}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[11px] text-editorial-accent hover:text-white uppercase font-bold underline cursor-pointer"
                  >
                    {appLang === 'en' ? 'Clear All Filters ✕' : 'Wyczyść Wszystkie Filtry ✕'}
                  </button>
                </div>
              )}
              </div>

              {/* Repositories stream view with custom Layout configurations */}
              <div>
                {filteredAndSortedRepos.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-editorial-border bg-editorial-sidebar-bg">
                    <Sparkles size={28} className="mx-auto text-editorial-muted mb-3" />
                    <p className="text-editorial-muted font-mono text-xs uppercase tracking-wide">
                      {appLang === 'en' ? 'No repositories found for given constraints.' : 'Brak projektów spełniających dane filtry.'}
                    </p>
                    <button
                      type="button"
                      id="empty_clear_btn"
                      onClick={handleClearFilters}
                      className="mt-4 text-xs font-bold text-editorial-accent hover:brightness-110 font-mono uppercase tracking-wider underline decoration-dotted"
                    >
                      {appLang === 'en' ? 'Reset selection criteria' : 'Zresetuj filtry'}
                    </button>
                  </div>
                ) : viewLayout === 'compact' ? (
                  /* Compact 1-column list layout */
                  <div className="space-y-2">
                    {filteredAndSortedRepos.map(repo => (
                      <RepoCard
                        key={repo.name}
                        repo={repo}
                        onSelect={setSelectedRepo}
                        lang={appLang}
                        compact={true}
                      />
                    ))}
                  </div>
                ) : viewLayout === 'grouped' && (selectedCategory === 'all' || selectedCategory === 'plugins') ? (
                  /* Category Grouped View layout */
                  <div className="space-y-10 sm:space-y-12">
                    {sortedCategories
                      .filter(catSpec =>
                        selectedCategory === 'all'
                          ? true
                          : selectedCategory === 'plugins'
                            ? (catSpec.key === 'pyplanet' || catSpec.key === 'openplanet')
                            : catSpec.key === selectedCategory
                      )
                      .map(catSpec => {
                        const groupItems = filteredAndSortedRepos.filter(r => r.cat.includes(catSpec.key));
                      if (groupItems.length === 0) return null;

                      return (
                        <div key={catSpec.key} className="relative clear-both mb-8 sm:mb-10">
                          <div className="section-header flex items-center justify-between gap-3 pb-3 sm:pb-3.5 mb-5 sm:mb-6 border-b-2 border-editorial-border w-full min-w-0 relative clear-both">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                              <span className="text-editorial-accent shrink-0 flex items-center justify-center">
                                {catSpec.key === 'pyplanet' && <Gamepad2 size={16} />}
                                {catSpec.key === 'openplanet' && <Globe size={16} />}
                                {catSpec.key === 'trackmania' && <Car size={16} />}
                                {catSpec.key === 'ai' && <Bot size={16} />}
                                {catSpec.key === 'discord' && <MessageSquare size={16} />}
                                {catSpec.key === 'kul' && <GraduationCap size={16} />}
                                {catSpec.key === 'web' && <LayoutGrid size={16} />}
                                {catSpec.key === 'tools' && <Wrench size={16} />}
                                {catSpec.key === 'other' && <Archive size={16} />}
                              </span>
                              <h2 className="font-mono font-bold uppercase tracking-wider text-base md:text-lg text-white truncate min-w-0 whitespace-nowrap overflow-hidden">
                                {appLang === 'en' ? catSpec.labelEn : catSpec.labelPl}
                              </h2>
                            </div>
                            <span className="text-[10px] font-mono border border-editorial-border px-2 py-0.5 text-editorial-muted font-bold shrink-0 whitespace-nowrap ml-2">
                              {groupItems.length} REPOS
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                            {groupItems.map(repo => (
                              <RepoCard
                                key={repo.name}
                                repo={repo}
                                onSelect={setSelectedRepo}
                                lang={appLang}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat Grid view layout */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {filteredAndSortedRepos.map(repo => (
                      <RepoCard
                        key={repo.name}
                        repo={repo}
                        onSelect={setSelectedRepo}
                        lang={appLang}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Blog posts search view & layout controls */}
              <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 items-stretch lg:items-center justify-between">
                  {/* Left: Search input */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-editorial-muted shrink-0 pointer-events-none" size={14} />
                    <input
                      type="text"
                      id="blog_search_input"
                      placeholder={appLang === 'en' ? "Search journal articles by title, keywords or content..." : "Szukaj artykułów po tytule, słowach kluczowych lub treści..."}
                      value={blogSearchQuery}
                      onChange={(e) => setBlogSearchQuery(e.target.value)}
                      className="w-full h-[38px] bg-editorial-sidebar-bg border border-editorial-border focus:border-editorial-accent focus:ring-0 rounded-none pl-10 pr-9 py-2 text-xs sm:text-sm outline-none text-white placeholder:text-zinc-600 transition-all font-mono uppercase tracking-wide box-border"
                    />
                    {blogSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBlogSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-muted hover:text-white p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Right: Layout Switcher (Grouped / Grid / Compact) */}
                  <div className="bg-editorial-sidebar-bg p-1 rounded-none border border-editorial-border flex items-center gap-1 text-xs font-mono shrink-0 w-full lg:w-[280px] h-[38px] box-border">
                    <button
                      type="button"
                      id="blog_layout_btn_grouped"
                      onClick={() => setBlogViewLayout('grouped')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider ${
                        blogViewLayout === 'grouped' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'
                      }`}
                    >
                      {appLang === 'en' ? 'Grouped' : 'Grupuj'}
                    </button>
                    <button
                      type="button"
                      id="blog_layout_btn_grid"
                      onClick={() => setBlogViewLayout('grid')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider ${
                        blogViewLayout === 'grid' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'
                      }`}
                    >
                      {appLang === 'en' ? 'Grid' : 'Siatka'}
                    </button>
                    <button
                      type="button"
                      id="blog_layout_btn_compact"
                      onClick={() => setBlogViewLayout('compact')}
                      className={`flex-1 h-full flex items-center justify-center px-2 sm:px-3 transition-all cursor-pointer uppercase text-[10.5px] sm:text-xs tracking-wider ${
                        blogViewLayout === 'compact' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold border border-editorial-accent/40' 
                          : 'border border-transparent text-editorial-muted hover:text-white'
                      }`}
                    >
                      {appLang === 'en' ? 'Compact' : 'Kompakt'}
                    </button>
                  </div>
                </div>

                {/* Filters sub-row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full sm:w-auto">
                    {/* Tag filter dropdown - styled identical to Repos Language Droplist */}
                    <div className="relative flex items-center min-w-0">
                      <select
                        id="blog_tag_filter_select"
                        value={selectedBlogTag}
                        onChange={(e) => setSelectedBlogTag(e.target.value)}
                        className="w-full bg-editorial-sidebar-bg border border-editorial-border text-[10.5px] sm:text-xs text-white font-mono py-1.5 pl-2 sm:pl-3 pr-5 sm:pr-7 rounded-none focus:border-editorial-accent focus:outline-none transition-colors appearance-none cursor-pointer uppercase truncate"
                      >
                        <option value="all">{appLang === 'en' ? 'ALL TAGS' : 'WSZYSTKIE'}</option>
                        {allBlogTags.map(tag => (
                          <option key={tag} value={tag}>#{tag.toUpperCase()}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none text-editorial-muted">
                        <ChevronDown size={11} />
                      </div>
                    </div>

                    {/* Sort dropdown - styled identical to Repos Sort Droplist */}
                    <div className="relative flex items-center min-w-0">
                      <select
                        id="blog_sort_filter_select"
                        value={blogSortBy}
                        onChange={(e) => setBlogSortBy(e.target.value as any)}
                        className="w-full bg-editorial-sidebar-bg border border-editorial-border text-[10.5px] sm:text-xs text-white font-mono py-1.5 pl-2 sm:pl-3 pr-5 sm:pr-7 rounded-none focus:border-editorial-accent focus:outline-none transition-colors appearance-none cursor-pointer uppercase truncate"
                      >
                        <option value="latest">{appLang === 'en' ? '🕒 NEWEST' : '🕒 NAJNOWSZE'}</option>
                        <option value="readingTime">{appLang === 'en' ? '⏱ READ TIME' : '⏱ CZAS CZYTANIA'}</option>
                        <option value="title">{appLang === 'en' ? 'A-Z TITLE' : 'A-Z TYTUŁ'}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none text-editorial-muted">
                        <ChevronDown size={11} />
                      </div>
                    </div>

                    {(blogSearchQuery !== '' || selectedBlogTag !== 'all') && (
                      <button
                        type="button"
                        id="blog_clear_filters_btn"
                        onClick={() => {
                          setBlogSearchQuery('');
                          setSelectedBlogTag('all');
                        }}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-neutral-900 border border-editorial-accent text-[10.5px] sm:text-xs text-editorial-accent hover:text-white transition-all uppercase tracking-wider rounded-none cursor-pointer shrink-0"
                        title={appLang === 'en' ? 'Reset active filters' : 'Wyczyść filtry'}
                      >
                        <X size={11} />
                        <span>{appLang === 'en' ? 'Reset' : 'Wyczyść'}</span>
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-editorial-muted font-mono hidden sm:inline">
                    {filteredBlogPosts.length} {appLang === 'en' ? 'articles found' : 'artykułów'}
                  </span>
                </div>
              </div>

              {/* Active Tag Filter Notification Bar */}
              {selectedBlogTag !== 'all' && (
                <div className="p-3 bg-[#13110C] border border-editorial-accent/60 flex items-center justify-between font-mono text-xs text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-editorial-accent animate-pulse" />
                    <span className="text-editorial-accent font-bold uppercase">
                      {appLang === 'en' ? 'TAG FILTER APPLIED:' : 'AKTYWNY FILTR TAGA:'}
                    </span>
                    <span className="font-semibold text-white uppercase">#{selectedBlogTag}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBlogTag('all')}
                    className="text-[10px] text-editorial-muted hover:text-white uppercase tracking-wider underline cursor-pointer"
                  >
                    {appLang === 'en' ? 'Clear filter [x]' : 'Wyczyść filtr [x]'}
                  </button>
                </div>
              )}

              {/* Blog Posts Stream layout */}
              <div className="pt-2 sm:pt-3 space-y-6">
                {filteredBlogPosts.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-editorial-border bg-editorial-sidebar-bg">
                    <Newspaper size={28} className="mx-auto text-editorial-muted mb-3" />
                    <p className="text-editorial-muted font-mono text-xs uppercase tracking-wide">
                      {appLang === 'en' ? 'No articles found matching active constraints.' : 'Brak artykułów spełniających podane kryteria.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBlogSearchQuery('');
                        setSelectedBlogTag('all');
                      }}
                      className="mt-4 text-xs font-bold text-editorial-accent hover:brightness-110 font-mono uppercase tracking-wider underline decoration-dotted cursor-pointer"
                    >
                      {appLang === 'en' ? 'Reset blog selection' : 'Zresetuj filtry bloga'}
                    </button>
                  </div>
                ) : blogViewLayout === 'compact' ? (
                  /* Compact 1-column list layout */
                  <div className="space-y-2 font-mono">
                    {filteredBlogPosts.map(post => {
                      const title = appLang === 'en' ? post.titleEn : post.titlePl;
                      const excerpt = appLang === 'en' ? post.excerptEn : post.excerptPl;
                      const content = appLang === 'en' ? post.contentEn : post.contentPl;
                      const explicitReadingTime = appLang === 'en' ? post.readingTimeEn : post.readingTimePl;
                      const readingTime = explicitReadingTime || calculateReadingTime(content, appLang);

                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedBlogPost(post)}
                          className="border border-editorial-border hover:border-editorial-accent/60 bg-editorial-sidebar-bg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all group cursor-pointer rounded-none hover:bg-neutral-900/60"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Newspaper size={16} className="text-editorial-accent shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-white group-hover:text-editorial-accent transition-colors truncate">
                                  {title}
                                </h3>
                                <span className="text-[9px] text-editorial-muted border border-editorial-border/60 px-1.5 py-0.5 bg-neutral-950 font-semibold shrink-0">
                                  {post.date}
                                </span>
                              </div>
                              <p className="text-editorial-muted text-xs font-mono line-clamp-1 mt-0.5">
                                {excerpt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 text-xs">
                            <div className="hidden lg:flex items-center gap-1">
                              {post.tags.slice(0, 2).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBlogTag(tag);
                                  }}
                                  className="px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-neutral-900 border border-editorial-border text-editorial-accent hover:border-cyan-400 hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  #{tag.toUpperCase()}
                                </button>
                              ))}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold whitespace-nowrap shrink-0">
                              <Clock size={10} className="text-editorial-accent shrink-0" />
                              {readingTime}
                            </span>
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-neutral-950 border border-editorial-border text-[10px] font-bold text-editorial-accent uppercase group-hover:border-editorial-accent transition-all shrink-0 whitespace-nowrap"
                            >
                              {appLang === 'en' ? 'Read →' : 'Czytaj →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : blogViewLayout === 'grouped' ? (
                  /* Grouped by main tag layout */
                  <div className="space-y-10 sm:space-y-12 font-mono">
                    {allBlogTags.filter(tag => selectedBlogTag === 'all' || tag === selectedBlogTag).map(tag => {
                      const groupPosts = filteredBlogPosts.filter(p => p.tags.includes(tag));
                      if (groupPosts.length === 0) return null;

                      return (
                        <div key={tag} className="relative clear-both mb-8 sm:mb-10">
                          <div className="section-header flex items-center justify-between gap-3 pb-3 sm:pb-3.5 mb-5 sm:mb-6 border-b-2 border-editorial-border w-full min-w-0 relative clear-both">
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="text-editorial-accent font-bold text-sm md:text-base shrink-0">#</span>
                              <h2 className="font-bold uppercase tracking-wider text-sm md:text-base text-editorial-accent truncate min-w-0 whitespace-nowrap overflow-hidden">
                                {tag.toUpperCase()}
                              </h2>
                            </div>
                            <span className="text-[10px] border border-editorial-border px-2 py-0.5 text-editorial-muted font-bold shrink-0 whitespace-nowrap ml-2">
                              {groupPosts.length} ARTICLES
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                            {groupPosts.map(post => {
                              const title = appLang === 'en' ? post.titleEn : post.titlePl;
                              const excerpt = appLang === 'en' ? post.excerptEn : post.excerptPl;
                              const content = appLang === 'en' ? post.contentEn : post.contentPl;
                              const explicitReadingTime = appLang === 'en' ? post.readingTimeEn : post.readingTimePl;
                              const readingTime = explicitReadingTime || calculateReadingTime(content, appLang);

                              return (
                                <div
                                  key={post.id}
                                  onClick={() => setSelectedBlogPost(post)}
                                  className="group relative border-b border-editorial-border p-6 cursor-pointer flex flex-col justify-between transition-all bg-transparent hover:bg-white/[0.03]"
                                >
                                  <div>
                                    {/* Card Header stats & tags */}
                                    <div className="flex items-center justify-between mb-3 text-editorial-muted font-mono text-[10px] uppercase tracking-wider">
                                      <span className="font-semibold text-editorial-accent">
                                        #{post.tags[0]?.toUpperCase()}
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <Calendar size={11} className="text-neutral-500 shrink-0" />
                                          <span>{post.date}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock size={11} className="text-neutral-500 shrink-0" />
                                          <span>{readingTime}</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Title: Monospace matching RepoCard */}
                                    <h3 className="text-base sm:text-lg font-bold font-mono text-white mb-2 group-hover:text-editorial-accent group-hover:translate-x-0.5 transition-all flex flex-wrap items-center gap-2">
                                      <Newspaper size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0" />
                                      <span>{title}</span>
                                    </h3>

                                    {/* Description */}
                                    <p className="text-editorial-muted text-sm leading-relaxed mb-4 max-w-2xl font-mono line-clamp-4">
                                      {excerpt}
                                    </p>
                                  </div>

                                  {/* Footer tags & actions */}
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {post.tags.slice(0, 3).map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBlogTag(tag);
                                          }}
                                          className="flex items-center gap-1.5 border border-editorial-border px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-300 hover:border-editorial-accent hover:text-white transition-colors cursor-pointer uppercase shrink-0"
                                        >
                                          #{tag.toUpperCase()}
                                        </button>
                                      ))}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedBlogPost(post)}
                                      className="text-editorial-accent group-hover:brightness-110 transition-all flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest shrink-0 self-start sm:self-auto cursor-pointer"
                                    >
                                      {appLang === 'en' ? 'Read Journal →' : 'Czytaj wpis →'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Standard Grid View layout matching Repos 2-column layout */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredBlogPosts.map(post => {
                      const title = appLang === 'en' ? post.titleEn : post.titlePl;
                      const excerpt = appLang === 'en' ? post.excerptEn : post.excerptPl;
                      const content = appLang === 'en' ? post.contentEn : post.contentPl;
                      const explicitReadingTime = appLang === 'en' ? post.readingTimeEn : post.readingTimePl;
                      const readingTime = explicitReadingTime || calculateReadingTime(content, appLang);

                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedBlogPost(post)}
                          className="group relative border-b border-editorial-border p-6 cursor-pointer flex flex-col justify-between transition-all bg-transparent hover:bg-white/[0.03]"
                        >
                          <div>
                            {/* Card Header stats & tags */}
                            <div className="flex items-center justify-between mb-3 text-editorial-muted font-mono text-[10px] uppercase tracking-wider">
                              <span className="font-semibold text-editorial-accent">
                                #{post.tags[0]?.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} className="text-neutral-500 shrink-0" />
                                  <span>{post.date}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-neutral-500 shrink-0" />
                                  <span>{readingTime}</span>
                                </span>
                              </div>
                            </div>

                            {/* Title: Monospace matching RepoCard */}
                            <h3 className="text-base sm:text-lg font-bold font-mono text-white mb-2 group-hover:text-editorial-accent group-hover:translate-x-0.5 transition-all flex flex-wrap items-center gap-2">
                              <Newspaper size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0" />
                              <span>{title}</span>
                            </h3>

                            {/* Description */}
                            <p className="text-editorial-muted text-sm leading-relaxed mb-4 max-w-2xl font-mono line-clamp-4">
                              {excerpt}
                            </p>
                          </div>

                          {/* Footer tags & actions */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted">
                            <div className="flex items-center gap-2 flex-wrap">
                              {post.tags.slice(0, 3).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBlogTag(tag);
                                  }}
                                  className="flex items-center gap-1.5 border border-editorial-border px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-300 hover:border-editorial-accent hover:text-white transition-colors cursor-pointer uppercase shrink-0"
                                >
                                  #{tag.toUpperCase()}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedBlogPost(post)}
                              className="text-editorial-accent group-hover:brightness-110 transition-all flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest shrink-0 self-start sm:self-auto cursor-pointer"
                            >
                              {appLang === 'en' ? 'Read Journal →' : 'Czytaj wpis →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* 6. High-fidelity dynamic retro control shell console */}
      <TerminalConsole onSelectCategory={(cat) => setSelectedCategory(cat as any)} lang={appLang} repos={reposList} isModalOpen={!!activeSelectedRepo} />

      {/* 7. Repository Details Pop-Up dialog */}
      <RepoModal
        repo={activeSelectedRepo}
        onClose={() => setSelectedRepo(null)}
        lang={appLang}
        onUpdateRepo={(updated) => {
          setReposList(prev => {
            const nextList = prev.map(r => 
              r.name.toLowerCase() === updated.name.toLowerCase() 
                ? { ...r, ...updated } 
                : r
            );
            try {
              localStorage.setItem('tomekdot_portfolio_repos', JSON.stringify(nextList));
            } catch (err) {
              console.warn('Failed to persist repos to localStorage', err);
            }
            return nextList;
          });
        }}
      />

      {/* 8. Blog Details View dialog */}
      <BlogModal
        post={selectedBlogPost}
        onClose={() => setSelectedBlogPost(null)}
        lang={appLang}
      />

      {/* 9. Full Developer Statistics & Changelog Modal for Repos */}
      <DeveloperStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        repos={reposList.filter(r => !hidePrivate || !r.isPrivate)}
        lang={appLang}
        initialTab="new_plugins"
        onSelectRepo={(r) => {
          setIsStatsModalOpen(false);
          setSelectedRepo(r);
        }}
      />

      {/* 9.5 Full Blog Stats & Interactive AI Synthesis Modal */}
      <BlogStatsModal
        isOpen={isBlogStatsModalOpen}
        onClose={() => setIsBlogStatsModalOpen(false)}
        blogPosts={BLOG_POSTS}
        lang={appLang}
        onSelectBlogPost={(post) => {
          setIsBlogStatsModalOpen(false);
          setSelectedBlogPost(post);
        }}
        onOpenGalaxyGraph={(tag) => {
          setGalaxyFilterMode('tags');
          setIsGalaxyModalOpen(true);
          // If we want the galaxy graph to focus on a tag, we might need a way, but let's just open it.
        }}
      />

      {/* 9.6 Obsidian Galaxy Constellation Network Graph Modal */}
      <GalaxyGraphModal
        isOpen={isGalaxyModalOpen}
        onClose={() => setIsGalaxyModalOpen(false)}
        blogPosts={BLOG_POSTS}
        repositories={reposList}
        lang={appLang}
        initialFilterMode={galaxyFilterMode}
        onSelectBlogPost={(post) => {
          setIsGalaxyModalOpen(false);
          setSelectedBlogPost(post);
        }}
        onSelectTag={(tag) => {
          setSelectedBlogTag(tag);
          setActiveWorkspaceTab('blog');
        }}
        onOpenAiDiscussion={(post) => {
          setIsGalaxyModalOpen(false);
          setIsBlogStatsModalOpen(true);
        }}
      />

      {/* 10. GitHub Token Config Modal */}
      <AnimatePresence>
        {isTokenModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="token_modal_backdrop"
            className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsTokenModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              id="token_modal_window"
              className="bg-[#0A0A0A] border-2 border-amber-800/60 max-w-sm w-full max-h-[85vh] overflow-y-auto p-4 md:p-5 relative shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col scrollbar-thin scrollbar-thumb-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3 border-b border-editorial-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-amber-950/60 border border-amber-700/60 text-amber-400">
                    <Lock size={13} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold font-mono text-white tracking-widest uppercase">
                        {appLang === 'en' ? 'ADMIN ACCESS CONSOLE' : 'KONSOLA ADMINISTRATORA'}
                      </h3>
                      <span className="text-[8px] uppercase px-1 py-0.2 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold font-mono">
                        {appLang === 'en' ? 'ADMIN ONLY' : 'DLA ADMINA'}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-amber-500/80 uppercase tracking-tight">
                      {appLang === 'en' ? 'Private Repositories Synchronization' : 'Synchronizacja Prywatnych Repozytoriów'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="close_token_modal_btn"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="text-editorial-muted hover:text-white transition-colors cursor-pointer font-mono text-[10px] uppercase ml-2"
                >
                  [{appLang === 'en' ? 'Close' : 'Zamknij'}]
                </button>
              </div>

              {/* Admin Notice */}
              <div className="mb-3 p-2 bg-amber-950/20 border border-amber-800/40 text-[10px] font-mono leading-relaxed text-amber-200/90 flex items-start gap-2">
                <ShieldCheck size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  {appLang === 'en'
                    ? "This administrative tool is reserved for the repository author (tomekdot) to authorize GitHub API queries with private repo scope."
                    : "To narzędzie administracyjne jest przeznaczone dla autora repozytoriów (tomekdot), aby autoryzować zapytania GitHub API do prywatnych projektów."}
                </p>
              </div>

              {/* Description */}
              <p className="text-[11px] text-editorial-muted leading-relaxed mb-3 font-sans">
                {appLang === 'en' 
                  ? "Public visitors view cached & static snapshots. Authenticating with an authorized GitHub Personal Access Token (PAT) unlocks live synchronization with restricted/private repositories."
                  : "Domyślnie goście widzą zoptymalizowany zapis publiczny. Wprowadzenie autoryzowanego tokenu GitHub PAT odblokowuje pełną synchronizację z prywatnymi projektami."}
              </p>

              {/* Scope Warning Info Card - Collapsible details to save vertical space */}
              <details className="mb-3 border border-editorial-border bg-neutral-950/60 transition-all">
                <summary className="p-2 text-amber-400 font-mono text-[9px] leading-relaxed cursor-pointer select-none flex items-center justify-between hover:bg-neutral-900 transition-colors">
                  <span className="font-bold uppercase tracking-wider">{appLang === 'en' ? '🔒 TOKEN SCOPE PERMISSIONS' : '🔒 WYMAGANE UPRAWNIENIA TOKENU'}</span>
                  <span className="text-[8px] opacity-75 font-mono">▸</span>
                </summary>
                <div className="p-2 border-t border-editorial-border/30 text-amber-200/80 font-mono text-[9px] leading-normal bg-neutral-950">
                  {appLang === 'en'
                    ? "Classic Tokens require the full 'repo' scope. Fine-Grained Tokens require read access for 'Repository contents' and 'Metadata'. The token is stored exclusively in your browser's localStorage."
                    : "Klasyczne tokeny wymagają uprawnienia 'repo'. Fine-Grained Tokens wymagają uprawnień do odczytu 'Repository contents' oraz 'Metadata'. Token jest zapisywany wyłącznie lokalnie w Twojej przeglądarce."}
                </div>
              </details>

              {/* Dynamic Authentication Feedback Cards */}
              {tokenError && (
                <div role="alert" className="mb-3 p-2 bg-red-950/40 border border-red-800/80 text-red-300 font-mono text-[10px] leading-relaxed">
                  <strong className="text-red-400 uppercase tracking-wider text-[9px]">{appLang === 'en' ? '❌ AUTH ERROR:' : '❌ BŁĄD AUTORYZACJI:'}</strong>
                  <p className="mt-0.5 selection:bg-red-900 leading-normal">{tokenError}</p>
                </div>
              )}

              {apiUser && !tokenError && (
                <div className="mb-3 p-2 bg-emerald-950/30 border border-emerald-800/85 text-emerald-300 font-mono text-[10px] leading-relaxed flex items-center justify-between">
                  <div>
                    <strong className="text-emerald-400 uppercase tracking-wider text-[9px]">{appLang === 'en' ? '👑 ADMIN CONNECTED:' : '👑 ADMIN ZALOGOWANY:'}</strong>
                    <span className="ml-1.5 text-white font-bold">{apiUser}</span>
                  </div>
                  <span className="text-[8px] bg-emerald-950 text-emerald-300 px-1 py-0.5 border border-emerald-800/50 rounded-none uppercase font-bold tracking-widest">AUTHORIZED</span>
                </div>
              )}

              {/* Sync Statistics Summary */}
              {syncStats.lastSync && (
                <div className="mb-3 p-2.5 bg-neutral-900 border border-editorial-border font-mono text-[10px] leading-normal select-none">
                  <div className="text-editorial-accent font-bold uppercase tracking-wider mb-1.5 text-[9px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent animate-pulse inline-block" />
                    <span>{appLang === 'en' ? 'ADMIN SYNC SUMMARY' : 'PODSUMOWANIE SYNCHRONIZACJI'}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 py-0.5">
                    <span className="text-editorial-muted">{appLang === 'en' ? 'Last sync:' : 'Ostatnia synch.:'}</span>
                    <span className="text-white font-semibold">{syncStats.lastSync}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 py-0.5">
                    <span className="text-editorial-muted">{appLang === 'en' ? 'Public:' : 'Publiczne:'}</span>
                    <span className="text-white font-semibold">{syncStats.publicCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-editorial-muted">{appLang === 'en' ? 'Private / Hidden:' : 'Prywatne / Ukryte:'}</span>
                    <span className="text-editorial-accent font-bold">{syncStats.privateCount}</span>
                  </div>
                </div>
              )}

              {/* Creator Toolbox */}
              {apiUser && apiUser.toLowerCase() === 'tomekdot' && syncStats.lastSync && (
                <div className="mb-3 p-2.5 bg-amber-950/10 border border-amber-800/30 font-mono text-[9px] leading-relaxed">
                  <div className="text-amber-400 font-bold uppercase tracking-wider mb-1.5 text-[9px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    <span>{appLang === 'en' ? '👑 OWNER TOOLBOX (TOMEKDOT)' : '👑 NARZĘDZIA WŁAŚCICIELA'}</span>
                  </div>
                  
                  <div className="mb-2 p-1.5 bg-neutral-900 border border-neutral-800 flex justify-between items-center text-[8px]">
                    <span className="text-neutral-400 uppercase tracking-wide">
                      {appLang === 'en' ? 'Public Visibility:' : 'Publiczna Widoczność:'}
                    </span>
                    <span className={`px-1 rounded-none font-bold uppercase tracking-widest ${
                      SHOW_PRIVATE_REPOS_TO_PUBLIC 
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' 
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                    }`}>
                      {SHOW_PRIVATE_REPOS_TO_PUBLIC 
                        ? (appLang === 'en' ? 'ENABLED (VISIBLE)' : 'WŁĄCZONA (WIDOCZNE)') 
                        : (appLang === 'en' ? 'DISABLED (HIDDEN)' : 'WYŁĄCZONA (UKRYTE)')}
                    </span>
                  </div>

                  <p className="text-[8.5px] text-neutral-400 leading-normal mb-2.5">
                    {appLang === 'en' 
                      ? "1. Export compiled list of repositories below and save in 'src/data.ts'." 
                      : "1. Wyeksportuj listę repozytoriów poniżej i zapisz ją w pliku 'src/data.ts'."}
                    <br />
                    {appLang === 'en'
                      ? "2. To let everyone see your private projects without a token, open 'src/data.ts' and change SHOW_PRIVATE_REPOS_TO_PUBLIC to true."
                      : "2. Aby każdy widział Twoje prywatne projekty bez podawania tokenu, zmień SHOW_PRIVATE_REPOS_TO_PUBLIC na true w pliku 'src/data.ts'."}
                  </p>
                  
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handleExportRepos}
                      className="w-full text-center py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-650 hover:border-amber-400 text-amber-250 transition-all cursor-pointer font-bold uppercase tracking-wider text-[8.5px]"
                    >
                      {exportSuccess === 'copied' 
                        ? (appLang === 'en' ? '✅ COPIED TO CLIPBOARD!' : '✅ SKOPIOWANO!') 
                        : (appLang === 'en' ? '📋 COPY REPOS FOR DATA.TS' : '📋 SKOPIUJ REPOS DO DATA.TS')}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJSON}
                      className="w-full text-center py-1 bg-[#121212] hover:bg-neutral-900 border border-neutral-850 text-neutral-350 transition-all cursor-pointer font-semibold uppercase tracking-wider text-[8.5px]"
                    >
                      {exportSuccess === 'downloaded' 
                        ? (appLang === 'en' ? '✅ DOWNLOADED!' : '✅ POBRANO!') 
                        : (appLang === 'en' ? '💾 DOWNLOAD REPOS.JSON' : '💾 POBIERZ REPOS.JSON')}
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="space-y-3 font-mono">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="token_input" className="block text-[9px] uppercase tracking-wider text-amber-400 font-bold">
                      {appLang === 'en' ? 'Admin Personal Access Token' : 'Osobisty Token Dostępu Admina (PAT)'}
                    </label>
                    <span className="text-[8px] text-editorial-muted font-mono">
                      {appLang === 'en' ? 'Local storage only' : 'Tylko pamięć lokalna'}
                    </span>
                  </div>
                  <input
                    type="password"
                    id="token_input"
                    value={tempTokenValue}
                    onChange={(e) => setTempTokenValue(e.target.value)}
                    placeholder="ghp_************************************"
                    className="w-full bg-[#111111] border border-editorial-border focus:border-amber-500 focus:ring-0 px-2.5 py-1.5 text-xs outline-none text-white font-mono placeholder:text-neutral-700"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = tempTokenValue.trim();
                      if (trimmed) {
                        localStorage.setItem('github_personal_token', trimmed);
                        setHasGithubToken(true);
                        setHidePrivate(false); // Automatically show private repositories upon manual setting
                      } else {
                        localStorage.removeItem('github_personal_token');
                        localStorage.removeItem('github_sync_stats');
                        setSyncStats({ lastSync: null, publicCount: 0, privateCount: 0 });
                        setHasGithubToken(false);
                      }
                      setIsTokenModalOpen(false);
                      fetchGitHubData(true); // Sync with new setups
                    }}
                    className="flex-1 py-1.5 bg-amber-950/40 border border-amber-600/80 text-amber-400 hover:bg-amber-500 hover:text-black font-bold uppercase tracking-wider text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <Lock size={12} />
                    <span>{appLang === 'en' ? 'AUTHORIZE & SYNC' : 'AUTORYZUJ I SYNCHRONIZUJ'}</span>
                  </button>

                  {hasGithubToken && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('github_personal_token');
                        localStorage.removeItem('github_sync_stats');
                        setSyncStats({ lastSync: null, publicCount: 0, privateCount: 0 });
                        setTempTokenValue('');
                        setHasGithubToken(false);
                        setIsTokenModalOpen(false);
                        fetchGitHubData(true); // Clear everything
                      }}
                      className="px-3 py-1.5 border border-red-900 text-red-500 hover:bg-neutral-900 transition-all font-semibold uppercase tracking-wider text-xs cursor-pointer inline-flex items-center justify-center"
                      title={appLang === 'en' ? 'Disconnect Admin Token' : 'Odłącz Token Admina'}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer block removed at developer's request */}
    </div>
  );
}
