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
  GraduationCap,
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
  Trash2
} from 'lucide-react';
import { CategoryKey, Repository, BlogPost } from './types';
import { CATEGORIES, REPOS, BLOG_POSTS, SHOW_PRIVATE_REPOS_TO_PUBLIC } from './data';
import LanguageChart from './components/LanguageChart';
import RepoCard from './components/RepoCard';
import RepoModal from './components/RepoModal';
import BlogModal from './components/BlogModal';
import TerminalConsole from './components/TerminalConsole';

export default function App() {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'projects' | 'blog'>('projects');
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [selectedBlogTag, setSelectedBlogTag] = useState<string>('all');

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stars' | 'year' | 'commits'>('stars');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [appLang, setAppLang] = useState<'en' | 'pl'>('en');
  const [viewLayout, setViewLayout] = useState<'grouped' | 'grid'>('grouped');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [hasCachedData, setHasCachedData] = useState<boolean>(() => {
    return !!localStorage.getItem('github_repos_cache');
  });
  const [reposList, setReposList] = useState<Repository[]>(() => {
    const cached = localStorage.getItem('github_repos_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Could not parse cached repo list', e);
      }
    }
    return REPOS.map(r => {
      const isPrivateOrAcademic = r.isPrivate || r.cat.includes('kul');
      return {
        ...r,
        isPrivate: isPrivateOrAcademic,
        stars: isPrivateOrAcademic ? 0 : r.stars,
        commitsCount: isPrivateOrAcademic ? 0 : r.commitsCount
      };
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
          
          let commitsCount = isPrivateOrAcademic ? 0 : repo.commitsCount;
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
            return {
              ...repo,
              isPrivate: isPrivateOrAcademic,
              stars: isPrivateOrAcademic ? 0 : match.stargazers_count,
              forks: match.forks_count,
              lang: match.language || repo.lang,
              // Update description if matching
              desc: match.description || repo.desc,
              pushedAt: match.pushed_at,
              commitsCount: commitsCount,
            };
          }
          // If no match is found, treat as private (restore original portfolio behavior to keep public count at 13)
          return {
            ...repo,
            isPrivate: true,
            stars: 0,
            commitsCount: commitsCount,
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
            // Determine category dynamically
            const descLower = (item.description || '').toLowerCase();
            let cat: CategoryKey[] = [];
            
            // Trackmania check
            const isTrackmania = nameLower.includes('trackmania') || nameLower.includes('mania') || descLower.includes('trackmania');
            
            if (nameLower.includes('pyplanet')) {
              cat.push('pyplanet');
              cat.push('trackmania');
            } else if (nameLower.includes('openplanet') || nameLower.includes('plugin') || descLower.includes('openplanet') || descLower.includes('plugin')) {
              cat.push('openplanet');
              cat.push('trackmania');
            } else if (isTrackmania) {
              cat.push('trackmania');
            }
            
            // AI / ML check (contains neural networks, recommendation engines, apriori, agents, gpt, bots, etc.)
            const hasAiKeywords = 
              nameLower.includes('ai') || nameLower.includes('agent') || nameLower.includes('bot') || nameLower.includes('gpt') || nameLower.includes('recommendation') || nameLower.includes('network') || nameLower.includes('learning') || nameLower.includes('apriori') ||
              descLower.includes('ai ') || descLower.includes('agent') || descLower.includes('recommendation') || descLower.includes('learning') || descLower.includes('apriori') || descLower.includes('neural') || descLower.includes('intelligence');
            
            if (hasAiKeywords) {
              cat.push('ai');
            }
            
            // Academic / University / Thesis check (Thesis, Master, Magister, Studia, KUL, University, etc.)
            const hasKulKeywords = 
              nameLower.includes('kul') || nameLower.includes('uniwersytet') || nameLower.includes('academic') || nameLower.includes('studia') || nameLower.includes('thesis') || nameLower.includes('praca') || nameLower.includes('master') || nameLower.includes('magister') || nameLower.includes('licencjat') ||
              descLower.includes('kul') || descLower.includes('university') || descLower.includes('academic') || descLower.includes('studia') || descLower.includes('thesis') || descLower.includes('master\'s') || descLower.includes('magister') || descLower.includes('licencjat') || descLower.includes('praca');
              
            if (hasKulKeywords) {
              cat.push('kul');
            }
            
            // If empty, classify as other
            if (cat.length === 0) {
              cat.push('other');
            }

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
              desc: item.description || 'Public archive item fetched from developer repository on GitHub.',
              descPl: item.description || 'Publiczne repozytorium pobrane dynamicznie z profilu GitHub twórcy.',
              lang: item.language || '',
              cat: cat,
              url: item.html_url,
              stars: item.stargazers_count || 0,
              forks: item.forks_count,
              commitsCount: commitsCount,
              createdYear: createdYear,
              longDescEn: `Automatic entry for ${item.name}. This utility has ${item.stargazers_count} stars and ${item.forks_count} forks on Github.`,
              longDescPl: `Automatyczny wpis dla ${item.name}. To repozytorium posiada ${item.stargazers_count} gwiazdek i ${item.forks_count} forków.`,
              pushedAt: item.pushed_at,
              isPrivate: isPrivateOrAcademic,
            });
          }
        });

        const finalRepos = [...updated, ...dynamicRepos];
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
    const kul = visibleList.filter(r => r.cat.includes('kul')).length;
    const ai = visibleList.filter(r => r.cat.includes('ai')).length;

    return { total, pyplanet, openplanet, kul, ai };
  }, [reposList, hidePrivate]);

  // Category item counts synchronized with hidePrivate visibility toggle
  const categoryCounts = useMemo(() => {
    const visibleList = reposList.filter(repo => {
      return !hidePrivate || !repo.isPrivate;
    });
    return {
      all: visibleList.length,
      pyplanet: visibleList.filter(r => r.cat.includes('pyplanet')).length,
      openplanet: visibleList.filter(r => r.cat.includes('openplanet')).length,
      trackmania: visibleList.filter(r => r.cat.includes('trackmania')).length,
      ai: visibleList.filter(r => r.cat.includes('ai')).length,
      kul: visibleList.filter(r => r.cat.includes('kul')).length,
      other: visibleList.filter(r => r.cat.includes('other') || (!r.cat.includes('pyplanet') && !r.cat.includes('openplanet') && !r.cat.includes('trackmania') && !r.cat.includes('ai') && !r.cat.includes('kul'))).length,
    };
  }, [reposList, hidePrivate]);

  // Retrieve unique programming languages list for drop-down filter, synchronized with the hidePrivate setting
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    reposList.forEach(r => {
      const matchesPrivate = !hidePrivate || !r.isPrivate;
      if (matchesPrivate && r.lang) {
        langs.add(r.lang);
      }
    });
    return Array.from(langs).sort();
  }, [reposList, hidePrivate]);

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
      const matchesSearch = 
        repo.name.toLowerCase().includes(normQuery) ||
        repo.desc.toLowerCase().includes(normQuery) ||
        (repo.descPl && repo.descPl.toLowerCase().includes(normQuery)) ||
        (repo.lang && repo.lang.toLowerCase().includes(normQuery));

      // 2. Category selection
      const matchesCategory = selectedCategory === 'all' || repo.cat.includes(selectedCategory);

      // 3. Language filter select
      const matchesLanguage = filterLang === 'all' || repo.lang === filterLang;

      // 4. Hide Private filter option (hide explicitly private or academic)
      const matchesPrivate = !hidePrivate || !repo.isPrivate;

      return matchesSearch && matchesCategory && matchesLanguage && matchesPrivate;
    });

    // 4. Sort logic
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'stars') {
        return b.stars - a.stars;
      } else if (sortBy === 'year') {
        return b.createdYear - a.createdYear;
      } else if (sortBy === 'commits') {
        return b.commitsCount - a.commitsCount;
      }
      return 0;
    });

    return result;
  }, [reposList, searchQuery, selectedCategory, filterLang, sortBy, hidePrivate]);

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
    return BLOG_POSTS.filter(post => {
      const normQuery = blogSearchQuery.toLowerCase();
      const matchesSearch = 
        post.titleEn.toLowerCase().includes(normQuery) ||
        post.titlePl.toLowerCase().includes(normQuery) ||
        post.excerptEn.toLowerCase().includes(normQuery) ||
        post.excerptPl.toLowerCase().includes(normQuery) ||
        post.tags.some(t => t.toLowerCase().includes(normQuery));
      
      const matchesTag = selectedBlogTag === 'all' || post.tags.includes(selectedBlogTag);
      return matchesSearch && matchesTag;
    });
  }, [blogSearchQuery, selectedBlogTag]);

  // Clean filters helper
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFilterLang('all');
    setSortBy('stars');
    setHidePrivate(true);
  };

  // Find the synchronized repo from the active reposList to make sure stars counts are correct
  const activeSelectedRepo = useMemo(() => {
    if (!selectedRepo) return null;
    return reposList.find(r => r.name.toLowerCase() === selectedRepo.name.toLowerCase()) || selectedRepo;
  }, [selectedRepo, reposList]);

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text font-sans flex flex-col justify-between selection:bg-editorial-accent selection:text-editorial-bg border-8 border-[#1A1A1A]">
      
      {/* 1. Header Toolbar navigation */}
      <nav id="top_app_navbar" className="sticky top-0 z-40 bg-editorial-bg/95 border-b border-editorial-border px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img 
            src="https://avatars.githubusercontent.com/tomekdot" 
            alt="tomekdot avatar mini" 
            className="w-7 h-7 rounded-full border border-editorial-border"
          />
          <span translate="no" className="font-mono font-bold tracking-tight text-sm text-white notranslate">
            tomekdot
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Languages Selector */}
          <button
            type="button"
            id="lang_toggle_btn"
            onClick={() => setAppLang(appLang === 'en' ? 'pl' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1 bg-editorial-sidebar-bg border border-editorial-border text-xs text-editorial-text hover:text-white transition-all cursor-pointer font-mono"
            title="Toggle language / Zmień język"
          >
            <Languages size={13} className="text-editorial-accent" />
            <span className="text-[10px] uppercase font-bold tracking-wider">{appLang}</span>
          </button>

          {/* GitHub redirect link */}
          <a
            href="https://github.com/tomekdot"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-editorial-muted hover:text-white border border-editorial-border hover:bg-neutral-900 transition-colors"
            title="Tomek's GitHub Profile"
          >
            <Github size={15} />
          </a>

          {/* YouTube redirect link */}
          <a
            href="https://youtube.com/@tomekdot"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-editorial-muted hover:text-[#FF0000] border border-editorial-border hover:bg-neutral-900 transition-colors"
            title="Tomek's YouTube Channel"
          >
            <Youtube size={15} />
          </a>

          {/* PayPal redirect link */}
          <a
            href="https://paypal.me/tomekdot"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-editorial-muted hover:text-[#0079C1] border border-editorial-border hover:bg-neutral-900 transition-colors"
            title={appLang === 'en' ? 'Support on PayPal' : 'Wesprzyj przez PayPal'}
          >
            <Heart size={15} />
          </a>
        </div>
      </nav>

      {/* 2. Interactive Hero Profile Block */}
      <header id="app_profile_hero" className="border-b border-editorial-border flex flex-col md:flex-row items-center p-8 md:p-10 gap-8 md:gap-10 bg-editorial-bg">
        <div className="flex-none">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-editorial-accent flex items-center justify-center p-1">
            <img 
              className="w-full h-full rounded-full object-cover" 
              src="https://avatars.githubusercontent.com/tomekdot" 
              alt="tomekdot profile picture"
            />
          </div>
        </div>
        <div className="flex-grow w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-2">
            <h1 translate="no" className="text-5xl sm:text-6xl font-black tracking-tight font-mono text-white leading-none notranslate">
              tomekdot
            </h1>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-[#8b949e] font-mono">Archival Index</p>
                <p className="text-xl font-bold font-mono text-white">VOL. 2026</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[10px] uppercase tracking-widest text-[#8b949e] font-mono flex items-center gap-1.5 justify-end">
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
                </p>
                <p className={`text-xl font-bold font-mono transition-all ${
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
                </p>
              </div>
            </div>
          </div>
          <p className="text-[#8b949e] italic mt-3 text-sm font-sans">
            {appLang === 'en' 
              ? 'Developing Trackmania plugins and AI agents with precision.' 
              : 'Rozwijanie wtyczek Trackmania i agentów AI z najwyższą precyzją.'}
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <a
              href="https://github.com/tomekdot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-border hover:border-white bg-[#0D0D0D] hover:bg-neutral-900 text-xs font-mono text-editorial-muted hover:text-white transition-all rounded-none"
              title="GitHub Profile"
            >
              <Github size={13} />
              <span>GITHUB</span>
            </a>
            <a
              href="https://youtube.com/@tomekdot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-border hover:border-[#FF0000] bg-[#0D0D0D] hover:bg-red-950/10 text-xs font-mono text-editorial-muted hover:text-white transition-all rounded-none"
              title="YouTube (@tomekdot)"
            >
              <Youtube size={13} className="text-[#FF0000]" />
              <span>YOUTUBE</span>
            </a>
            <a
              href="https://paypal.me/tomekdot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-border hover:border-[#0079C1] bg-[#0D0D0D] hover:bg-blue-950/10 text-xs font-mono text-editorial-muted hover:text-white transition-all rounded-none"
              title="PayPal Sponsor (@tomekdot)"
            >
              <Heart size={13} className="text-[#0079C1]" />
              <span>PAYPAL</span>
            </a>
            <button
              type="button"
              onClick={() => setIsTokenModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-editorial-border hover:border-editorial-accent bg-[#0D0D0D] hover:bg-neutral-900 text-xs font-mono text-editorial-muted hover:text-white transition-all rounded-none cursor-pointer"
              title={appLang === 'en' ? 'Configure GitHub Personal Access Token' : 'Skonfiguruj Osobisty Token Dostępu GitHub'}
            >
              <Key size={13} className={hasGithubToken ? "text-editorial-accent" : ""} />
              <span>{hasGithubToken ? (appLang === 'en' ? 'PRIVATE SYNC: ON' : 'SYNCHRONIZACJA PRYWATNYCH ON') : (appLang === 'en' ? 'SYNC PRIVATE REPOS' : 'DODAJ PRYWATNE')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Core Workspace Section */}
      <main className="flex-grow grid grid-cols-1 md:grid-cols-[280px_1fr] md:divide-x divide-editorial-border border-b border-editorial-border bg-editorial-bg overflow-hidden">
        {/* Left Sidebar block */}
        <aside className="p-6 md:p-8 flex flex-col justify-between bg-editorial-sidebar-bg space-y-8 md:space-y-0">
          <div className="space-y-6">
            {/* Main Tabs Navigation */}
            <div className="flex border border-editorial-border p-1 bg-neutral-950 font-mono text-[11px] rounded-none mb-4">
              <button
                type="button"
                id="tab_trigger_projects"
                onClick={() => setActiveWorkspaceTab('projects')}
                className={`flex-1 py-1.5 text-center transition-all cursor-pointer font-bold uppercase tracking-wider ${activeWorkspaceTab === 'projects' ? 'bg-[#1D170E] border border-editorial-accent text-editorial-accent' : 'text-editorial-muted hover:text-white'}`}
                title={appLang === 'en' ? 'Project Archive' : 'Archiwum projektów'}
              >
                📁 {appLang === 'en' ? 'Repos' : 'Projekty'}
              </button>
              <button
                type="button"
                id="tab_trigger_blog"
                onClick={() => setActiveWorkspaceTab('blog')}
                className={`flex-1 py-1.5 text-center transition-all cursor-pointer font-bold uppercase tracking-wider ${activeWorkspaceTab === 'blog' ? 'bg-[#1D170E] border border-editorial-accent text-editorial-accent' : 'text-editorial-muted hover:text-white'}`}
                title={appLang === 'en' ? 'Blog Posts Journal' : 'Wpisy na blogu'}
              >
                📝 {appLang === 'en' ? 'Blog' : 'Blog'}
              </button>
            </div>

            {activeWorkspaceTab === 'projects' ? (
              <>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8b949e] font-mono font-bold">
                  {appLang === 'en' ? 'Categories' : 'Kategorie'}
                </h2>
                <nav translate="no" className="flex flex-col gap-4 text-base font-bold font-mono notranslate">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'all' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    00. {appLang === 'en' ? 'Show All' : 'Wszystko'} ({categoryCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('pyplanet')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'pyplanet' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    01. PyPlanet ({categoryCounts.pyplanet})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('openplanet')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'openplanet' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    02. OpenPlanet ({categoryCounts.openplanet})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('trackmania')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'trackmania' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    03. Trackmania ({categoryCounts.trackmania})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ai')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'ai' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    04. AI Agents ({categoryCounts.ai})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('kul')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'kul' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    05. Academic ({categoryCounts.kul})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('other')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedCategory === 'other' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    06. Misc ({categoryCounts.other})
                  </button>
                </nav>
              </>
            ) : (
              <>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8b949e] font-mono font-bold">
                  {appLang === 'en' ? 'Blog Tags' : 'Tagi wpisów'}
                </h2>
                <nav className="flex flex-col gap-4 text-base font-bold font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedBlogTag('all')}
                    className={`text-left hover:text-editorial-accent transition-colors cursor-pointer uppercase ${selectedBlogTag === 'all' ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                  >
                    # {appLang === 'en' ? 'All posts' : 'Wszystkie'} ({BLOG_POSTS.length})
                  </button>
                  {allBlogTags.map(tag => {
                    const cnt = BLOG_POSTS.filter(b => b.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedBlogTag(tag)}
                        className={`text-left hover:text-editorial-accent transition-colors cursor-pointer ${selectedBlogTag === tag ? 'text-editorial-accent border-b border-editorial-accent pb-0.5 w-fit' : 'text-editorial-muted'}`}
                      >
                        # {tag.toUpperCase()} ({cnt})
                      </button>
                    );
                  })}
                </nav>
              </>
            )}
          </div>

          {activeWorkspaceTab === 'projects' ? (
            <div className="bg-neutral-950/45 p-4 border border-editorial-border rounded-none space-y-3">
              <h3 className="text-xs font-bold uppercase font-mono text-editorial-accent">
                {appLang === 'en' ? 'Developer Stats' : 'Statystyki Twórcy'}
              </h3>
              <div translate="no" className="grid grid-cols-2 gap-4 notranslate">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-white">{stats.total}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">Repos</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-emerald-400">{stats.pyplanet}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">PyPlanet</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-fuchsia-400">{stats.openplanet}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">Openplanet</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-sky-400">{stats.ai}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">AI</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950/45 p-4 border border-editorial-border rounded-none space-y-3">
              <h3 className="text-xs font-bold uppercase font-mono text-editorial-accent">
                {appLang === 'en' ? 'Journal Stats' : 'Statystyki Bloga'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-white">{BLOG_POSTS.length}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">{appLang === 'en' ? 'Posts' : 'Posty'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-mono text-fuchsia-400">{allBlogTags.length}</span>
                  <span className="text-[9px] font-mono uppercase text-[#8b949e]">Tags</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right workspace section block */}
        <section className="p-6 md:p-8 pb-48 md:pb-60 lg:pb-64 bg-editorial-bg space-y-6 overflow-y-auto">
          {activeWorkspaceTab === 'projects' ? (
            <>
              {/* Main workspace control toolbar */}
              <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center pb-4 border-b border-editorial-border">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-editorial-muted" size={16} />
                  <input
                    type="text"
                    id="repos_search_input"
                    placeholder={appLang === 'en' ? "Search by archive key, metadata, languages..." : "Szukaj po tagach, metadanych, językach..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-editorial-sidebar-bg border border-editorial-border focus:border-editorial-accent focus:ring-0 rounded-none pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder:text-zinc-600 transition-all font-mono uppercase tracking-wide"
                  />
                </div>

                {/* Layout and Language Advanced filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Hide Private toggle button */}
                  <button
                    type="button"
                    id="toggle_hide_private_btn"
                    onClick={() => setHidePrivate(!hidePrivate)}
                    className={`flex items-center gap-2 px-3 py-2 border transition-all cursor-pointer font-mono text-xs uppercase tracking-wider rounded-none
                      ${hidePrivate 
                        ? 'border-editorial-accent text-editorial-accent bg-[#1D170E]' 
                        : 'border-editorial-border text-editorial-muted hover:text-white bg-editorial-sidebar-bg'}`}
                  >
                    {hidePrivate ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>
                      {hidePrivate 
                        ? (appLang === 'en' ? 'Private Hidden' : 'Ukryte prywatne') 
                        : (appLang === 'en' ? 'Private Shown' : 'Pokazuj prywatne')}
                    </span>
                  </button>

                  {/* Language Droplist */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-editorial-muted font-mono uppercase tracking-wide hidden sm:inline">{appLang === 'en' ? 'Language:' : 'Język:'}</span>
                    <select
                      id="language_filter_select"
                      value={filterLang}
                      onChange={(e) => setFilterLang(e.target.value)}
                      translate="no"
                      className="bg-editorial-sidebar-bg border border-editorial-border text-xs text-white font-mono py-2 px-3 rounded-none focus:border-editorial-accent focus:outline-none transition-colors notranslate"
                    >
                      <option value="all">{appLang === 'en' ? 'ALL LANGUAGES' : 'WSZYSTKIE JĘZYKI'}</option>
                      {allLanguages.map(l => (
                        <option key={l} value={l}>{l.toUpperCase()}</option>
                      ))}
                      <option value="">SHELL / OTHER</option>
                    </select>
                  </div>

                  {/* Sorting selection dropdown */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown size={13} className="text-editorial-muted" />
                    <select
                      id="sort_filter_select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-editorial-sidebar-bg border border-editorial-border text-xs text-white font-mono py-2 px-3 rounded-none focus:border-editorial-accent focus:outline-none transition-colors"
                    >
                      <option value="stars">{appLang === 'en' ? 'SORT BY STARS' : 'NAJWIĘCEJ GWIAZDEK'}</option>
                      <option value="name">{appLang === 'en' ? 'SORT ALPHA A-Z' : 'ALFABETYCZNIE A-Z'}</option>
                      <option value="commits">{appLang === 'en' ? 'SORT BY COMMITS' : 'NAJWIĘCEJ COMMITÓW'}</option>
                    </select>
                  </div>

                  {/* Toggle layout (grouped / grid list) */}
                  <div className="bg-editorial-sidebar-bg p-1 rounded-none border border-editorial-border flex items-center gap-1 text-xs font-mono">
                    <button
                      type="button"
                      id="layout_btn_grouped"
                      onClick={() => setViewLayout('grouped')}
                      className={`px-3 py-1.5 transition-all cursor-pointer uppercase text-[11px] tracking-wider
                        ${viewLayout === 'grouped' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold' 
                          : 'text-editorial-muted hover:text-white'}`}
                    >
                      {appLang === 'en' ? 'Grouped' : 'Grupuj'}
                    </button>
                    <button
                      type="button"
                      id="layout_btn_grid"
                      onClick={() => setViewLayout('grid')}
                      className={`px-3 py-1.5 transition-all cursor-pointer uppercase text-[11px] tracking-wider
                        ${viewLayout === 'grid' 
                          ? 'bg-neutral-900 text-editorial-accent font-bold' 
                          : 'text-editorial-muted hover:text-white'}`}
                    >
                      {appLang === 'en' ? 'Flat Grid' : 'Siatka'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active stats spectrum panel */}
              <LanguageChart repos={filteredAndSortedRepos} lang={appLang} />

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
                ) : viewLayout === 'grouped' && selectedCategory === 'all' ? (
                  /* Category Grouped View layout */
                  <div className="space-y-10">
                    {Object.values(CATEGORIES).map(catSpec => {
                      const groupItems = filteredAndSortedRepos.filter(r => r.cat.includes(catSpec.key));
                      if (groupItems.length === 0) return null;

                      return (
                        <div key={catSpec.key} className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b-2 border-editorial-border">
                            <span className="text-editorial-accent">
                              {catSpec.key === 'pyplanet' && <Gamepad2 size={16} />}
                              {catSpec.key === 'openplanet' && <Globe size={16} />}
                              {catSpec.key === 'trackmania' && <Car size={16} />}
                              {catSpec.key === 'ai' && <Bot size={16} />}
                              {catSpec.key === 'kul' && <GraduationCap size={16} />}
                              {catSpec.key === 'other' && <Archive size={16} />}
                            </span>
                            <h2 className="font-mono font-bold uppercase tracking-wider text-base md:text-lg text-white">
                              {appLang === 'en' ? catSpec.labelEn : catSpec.labelPl}
                            </h2>
                            <span className="text-[10px] font-mono border border-editorial-border px-2 py-0.5 text-editorial-muted ml-auto font-bold">
                              {groupItems.length} REPOS
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </>
          ) : (
            <>
              {/* Blog posts search view controls */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center pb-4 border-b border-editorial-border">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-editorial-muted" size={16} />
                  <input
                    type="text"
                    id="blog_search_input"
                    placeholder={appLang === 'en' ? "Search journal articles by title, keywords or content..." : "Szukaj artykułów po tytule, słowach kluczowych lub treści..."}
                    value={blogSearchQuery}
                    onChange={(e) => setBlogSearchQuery(e.target.value)}
                    className="w-full bg-editorial-sidebar-bg border border-editorial-border focus:border-editorial-accent focus:ring-0 rounded-none pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder:text-zinc-600 transition-all font-mono uppercase tracking-wide"
                  />
                </div>

                {(blogSearchQuery !== '' || selectedBlogTag !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlogSearchQuery('');
                      setSelectedBlogTag('all');
                    }}
                    className="px-4 py-2 bg-neutral-900 border border-editorial-border text-xs text-editorial-accent hover:text-white transition-all font-mono uppercase tracking-wider rounded-none cursor-pointer text-center"
                  >
                    {appLang === 'en' ? 'Show All Posts' : 'Pokaż wszystkie wpisy'}
                  </button>
                )}
              </div>

              {/* Blog Posts Stream layout */}
              <div className="space-y-6">
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBlogPosts.map(post => {
                      const title = appLang === 'en' ? post.titleEn : post.titlePl;
                      const excerpt = appLang === 'en' ? post.excerptEn : post.excerptPl;
                      const readingTime = appLang === 'en' ? post.readingTimeEn : post.readingTimePl;

                      return (
                        <div
                          key={post.id}
                          className="border border-editorial-border hover:border-editorial-accent/60 bg-editorial-sidebar-bg p-5 flex flex-col justify-between transition-all group duration-300 relative rounded-none hover:shadow-lg hover:shadow-black/20"
                        >
                          <div>
                            {/* Date time header layout */}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-editorial-muted uppercase tracking-wider mb-3">
                              <span className="flex items-center gap-1 font-bold text-white/80">
                                <Calendar size={11} className="text-editorial-accent" />
                                {post.date}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {readingTime}
                              </span>
                            </div>

                            {/* Headline */}
                            <h3
                              onClick={() => setSelectedBlogPost(post)}
                              className="text-sm font-bold font-mono text-white mb-2 leading-snug cursor-pointer hover:text-editorial-accent transition-colors uppercase tracking-wide"
                            >
                              {title}
                            </h3>

                            {/* Brief intro */}
                            <p className="text-editorial-muted text-[11px] leading-relaxed mb-4 line-clamp-3 font-mono font-medium">
                              {excerpt}
                            </p>
                          </div>

                          {/* Footer Tag metadata and triggers */}
                          <div className="pt-3 border-t border-editorial-border flex flex-col gap-3">
                            <div className="flex flex-wrap gap-1">
                              {post.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  onClick={() => setSelectedBlogTag(tag)}
                                  className="text-[9px] font-mono px-1.5 py-0.5 border border-editorial-border/60 bg-neutral-950 text-editorial-muted hover:text-editorial-accent cursor-pointer animate-none"
                                >
                                  #{tag.toUpperCase()}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedBlogPost(post)}
                              className="w-full py-2 bg-neutral-950 border border-editorial-border text-[10px] font-mono font-bold text-center tracking-wider text-editorial-accent uppercase hover:brightness-110 hover:border-editorial-accent transition-all cursor-pointer"
                            >
                              {appLang === 'en' ? 'Read Journal' : 'Czytaj Wpis'}
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
          setReposList(prev => prev.map(r => 
            r.name.toLowerCase() === updated.name.toLowerCase() 
              ? { ...r, commitsCount: updated.commitsCount } 
              : r
          ));
        }}
      />

      {/* 8. Blog Details View dialog */}
      <BlogModal
        post={selectedBlogPost}
        onClose={() => setSelectedBlogPost(null)}
        lang={appLang}
      />

      {/* 9. GitHub Token Config Modal */}
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
              className="bg-[#0A0A0A] border border-editorial-border max-w-sm w-full max-h-[85vh] overflow-y-auto p-4 md:p-5 relative shadow-2xl flex flex-col scrollbar-thin scrollbar-thumb-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3 border-b border-editorial-border pb-2">
                <div className="flex items-center gap-2">
                  <Key className="text-editorial-accent" size={14} />
                  <h3 className="text-xs font-bold font-mono text-white tracking-widest uppercase">
                    {appLang === 'en' ? 'GITHUB TOKEN CONFIG' : 'USTAWIENIA TOKENU GITHUB'}
                  </h3>
                </div>
                <button
                  type="button"
                  id="close_token_modal_btn"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="text-editorial-muted hover:text-white transition-colors cursor-pointer font-mono text-[10px] uppercase"
                >
                  [{appLang === 'en' ? 'Close' : 'Zamknij'}]
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] text-editorial-muted leading-relaxed mb-3 font-sans">
                {appLang === 'en' 
                  ? "By default, public requests only return public repos. Adding a GitHub Personal Access Token (PAT) with 'repo' scope allows you to securely pull and catalog private/restricted repositories in the interface."
                  : "Domyślnie zwykłe zapytania pobierają tylko publiczne dane. Podanie osobistego tokenu dostępu GitHub (PAT) o zakresie 'repo' pozwala na bezpieczne wczytanie i pokazywanie prywatnych projektów."}
              </p>

              {/* Scope Warning Info Card - Collapsible details to save vertical space */}
              <details className="mb-3 border border-editorial-border bg-neutral-950/60 transition-all">
                <summary className="p-2 text-[#ffad33] font-mono text-[9px] leading-relaxed cursor-pointer select-none flex items-center justify-between hover:bg-neutral-900 transition-colors">
                  <span className="font-bold uppercase tracking-wider">{appLang === 'en' ? '⚠️ VIEW REPO SCOPE REQUIREMENTS' : '⚠️ WYMOGI DOTYCZĄCE UPRAWNIEŃ'}</span>
                  <span className="text-[8px] opacity-75 font-mono">▸</span>
                </summary>
                <div className="p-2 border-t border-editorial-border/30 text-[#ffb84d] font-mono text-[9px] leading-normal bg-neutral-950">
                  {appLang === 'en'
                    ? "Classic Tokens must have the full 'repo' checkbox checked on GitHub. Fine-Grained Tokens must have read access granted for 'Repository contents' and 'Metadata'. Otherwise, GitHub won't return your private repositories!"
                    : "Klasyczne tokeny (Classic Tokens) muszą mieć zaznaczony cały zakres 'repo'. Fine-Grained Tokens muszą mieć nadane uprawnienia do odczytu dla 'Repository contents' i 'Metadata'. W przeciwnym razie GitHub nie zwróci Twoich prywatnych repozytoriów!"}
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
                <div className="mb-3 p-2 bg-green-950/40 border border-emerald-800/85 text-emerald-300 font-mono text-[10px] leading-relaxed flex items-center justify-between">
                  <div>
                    <strong className="text-emerald-400 uppercase tracking-wider text-[9px]">{appLang === 'en' ? '✅ CONNECTED:' : '✅ POŁĄCZONO:'}</strong>
                    <span className="ml-1.5 text-white font-bold">{apiUser}</span>
                  </div>
                  <span className="text-[8px] bg-emerald-950 text-emerald-300 px-1 py-0.5 border border-emerald-800/50 rounded-none uppercase font-bold tracking-widest">ACTIVE</span>
                </div>
              )}

              {/* Sync Statistics Summary */}
              {syncStats.lastSync && (
                <div className="mb-3 p-2.5 bg-neutral-900 border border-editorial-border font-mono text-[10px] leading-normal select-none">
                  <div className="text-editorial-accent font-bold uppercase tracking-wider mb-1.5 text-[9px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent animate-pulse inline-block" />
                    <span>{appLang === 'en' ? 'SYNCHRONIZATION SUMMARY' : 'STATYSTYKI POŁĄCZENIA'}</span>
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
                  <label htmlFor="token_input" className="block text-[9px] uppercase tracking-wider text-editorial-muted mb-1 font-bold">
                    {appLang === 'en' ? 'Personal Access Token' : 'Osobisty Token Dostępu'}
                  </label>
                  <input
                    type="password"
                    id="token_input"
                    value={tempTokenValue}
                    onChange={(e) => setTempTokenValue(e.target.value)}
                    placeholder="ghp_..."
                    className="w-full bg-[#111111] border border-editorial-border focus:border-editorial-accent focus:ring-0 px-2.5 py-1.5 text-xs outline-none text-white font-mono"
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
                    className="flex-1 py-1.5 bg-[#1D170E] border border-editorial-accent text-editorial-accent hover:bg-editorial-accent hover:text-black font-semibold uppercase tracking-wider text-xs transition-all cursor-pointer"
                  >
                    {appLang === 'en' ? 'SAVE & SYNC' : 'ZAPISZ I SYNCHRONIZUJ'}
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
                      title={appLang === 'en' ? 'Remove Token' : 'Usuń Token'}
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
