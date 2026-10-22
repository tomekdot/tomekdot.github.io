/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Play, 
  Pause, 
  Search, 
  Layers, 
  Sparkles, 
  BookOpen, 
  Tag as TagIcon,
  ExternalLink,
  Bot,
  Filter,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  Compass
} from 'lucide-react';
import { BlogPost, Repository } from '../types';

interface GalaxyGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogPosts: BlogPost[];
  repositories?: Repository[];
  lang: 'en' | 'pl';
  initialFilterMode?: 'all' | 'posts' | 'tags';
  onSelectBlogPost?: (post: BlogPost) => void;
  onSelectTag?: (tag: string) => void;
  onOpenAiDiscussion?: (post: BlogPost) => void;
}

interface GalaxyNode {
  id: string;
  type: 'post' | 'tag' | 'repo';
  labelEn: string;
  labelPl: string;
  dateStr?: string;
  timestamp: number;
  radius: number; // orbital distance from center
  angle: number;  // polar angle in radians
  x: number;      // cartesian x
  y: number;      // cartesian y
  size: number;   // rendered node radius
  color: string;
  connectedIds: string[];
  rawPost?: BlogPost;
  rawTag?: string;
  rawRepo?: Repository;
  excerpt?: string;
  readingTime?: string;
}

interface GalaxyEdge {
  id: string;
  source: string;
  target: string;
  sourceNode: GalaxyNode;
  targetNode: GalaxyNode;
}

// Matrix glyph characters for core cybernetic visual texture
const MATRIX_GLYPHS = [
  'オ', 'セ', 'ヒ', 'オ', '0', 'パ', 'テ', '4', '=', 'ム', 'マ',
  'ヌ', 'ホ', 'メ', '6', 'ム', ':', 'ケ', 'モ', 'サ', 'カ', 'ユ',
  'ヤ', 'ル', 'ワ', 'ユ', 'テ', '★', 'ヒ', '2', 'ナ', 'ウ', 'ヨ',
  'コ', 'エ', 'ホ', ':', 'タ', 'ヲ', 'ヒ', '2', 'シ', 'ム', 'コ',
  'カ', 'ヒ', 'X', '5', '5', 'ヒ', '2', 'ア', 'ム', 'コ', 'コ',
  'マ', 'モ', 'X', 'エ', 'ラ', 'ヨ', 'ヒ', '6', 'ネ', 'ラ', 'マ',
  'ク', 'ハ', '+', 'ン', '<', '+', 'チ', 'タ', 'シ', 'キ', 'ユ',
  'フ', '3', '+', '6', 'サ', 'ビ', '0', 'コ', 'ラ'
];

export default function GalaxyGraphModal({
  isOpen,
  onClose,
  blogPosts,
  repositories = [],
  lang,
  initialFilterMode = 'all',
  onSelectBlogPost,
  onSelectTag,
  onOpenAiDiscussion
}: GalaxyGraphModalProps) {
  // State
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'tags'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Timeline playback state
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineProgress, setTimelineProgress] = useState(1); // 0 to 1
  const timelineIntervalRef = useRef<any>(null);

  // SVG Container size
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 });

  // Update filter type when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilterType(initialFilterMode);
      setHoveredNodeId(null);
      setSelectedNodeId(null);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setTimelineProgress(1);
      setIsPlayingTimeline(false);
    }
  }, [isOpen, initialFilterMode]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 900,
          height: rect.height || 700,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Date ranges calculation (core = oldest · outer = newer)
  const { minTime, maxTime, sortedPosts } = useMemo(() => {
    const parsed = blogPosts.map(p => {
      const parts = p.date.split('-');
      const t = parts.length === 3
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime()
        : new Date(p.date).getTime();
      return {
        ...p,
        t: isNaN(t) ? new Date(2026, 5, 18).getTime() : t
      };
    }).sort((a, b) => a.t - b.t); // Rigorous ascending Unix Timestamp sort: oldest -> newest

    const minT = parsed.length > 0 ? parsed[0].t : new Date(2026, 5, 18).getTime();
    const maxT = parsed.length > 0 ? parsed[parsed.length - 1].t : new Date(2026, 7, 14).getTime();
    
    // Balanced buffer so earliest and latest nodes sit gracefully away from extremes
    const timeSpan = maxT - minT || (30 * 24 * 60 * 60 * 1000);
    const buffer = timeSpan * 0.05;
    return { minTime: minT - buffer, maxTime: maxT + buffer, sortedPosts: parsed };
  }, [blogPosts]);

  const minOrbitalRadius = 120;
  const maxOrbitalRadius = 330;

  // Pure time-to-radius mapping: core = oldest, outer = newer
  const getTimeRadius = useCallback((timestamp: number): number => {
    if (maxTime <= minTime) return (minOrbitalRadius + maxOrbitalRadius) / 2;
    const ratio = Math.max(0, Math.min(1, (timestamp - minTime) / (maxTime - minTime)));
    return minOrbitalRadius + ratio * (maxOrbitalRadius - minOrbitalRadius);
  }, [minTime, maxTime]);

  // Dynamic chronological orbital rings generated directly from the time scale
  const orbitalRings = useMemo(() => {
    if (sortedPosts.length === 0) return [];

    const uniqueDates = Array.from(new Set(sortedPosts.map(p => p.date)));
    
    return uniqueDates.map(dateStr => {
      const parts = dateStr.split('-');
      const t = parts.length === 3
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime()
        : new Date(dateStr).getTime();
      const r = getTimeRadius(t);
      const d = new Date(t);
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${day < 10 ? '0' + day : day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      return {
        dateStr,
        timestamp: t,
        radius: r,
        label
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Ascending order: core (oldest) to outer (newer)
  }, [sortedPosts, getTimeRadius]);

  // Compute all galaxy nodes and connected edges
  const { nodes, edges, allTagsList } = useMemo(() => {
    const calculatedNodes: GalaxyNode[] = [];
    const calculatedEdges: GalaxyEdge[] = [];
    const nodeMap = new Map<string, GalaxyNode>();

    // 1. Generate Post Nodes
    sortedPosts.forEach((post, idx) => {
      const orbitalRadius = getTimeRadius(post.t);
      
      // Distribute angle nicely with golden ratio distribution to prevent overlapping
      const goldenAngle = 2.39996323; // radians
      const angle = (idx * goldenAngle) + (idx % 2 === 0 ? 0.3 : -0.2);

      const x = Math.cos(angle) * orbitalRadius;
      const y = Math.sin(angle) * orbitalRadius;

      const readingTime = (lang === 'en' ? post.readingTimeEn : post.readingTimePl) || '3 min read';
      const excerpt = lang === 'en' ? post.excerptEn : post.excerptPl;

      const node: GalaxyNode = {
        id: `post-${post.id}`,
        type: 'post',
        labelEn: post.titleEn,
        labelPl: post.titlePl,
        dateStr: post.date,
        timestamp: post.t,
        radius: orbitalRadius,
        angle,
        x,
        y,
        size: 7.5,
        color: '#4ade80', // Emerald/green post node
        connectedIds: post.tags.map(t => `tag-${t}`),
        rawPost: post,
        excerpt,
        readingTime
      };

      calculatedNodes.push(node);
      nodeMap.set(node.id, node);
    });

    // 2. Generate Tag Nodes (Memory Hubs)
    const tagToPostsMap = new Map<string, string[]>();
    sortedPosts.forEach(p => {
      p.tags.forEach(t => {
        const arr = tagToPostsMap.get(t) || [];
        arr.push(`post-${p.id}`);
        tagToPostsMap.set(t, arr);
      });
    });

    const uniqueTags = Array.from(tagToPostsMap.keys());
    uniqueTags.forEach((tag, idx) => {
      const connectedPostIds = tagToPostsMap.get(tag) || [];
      
      // Calculate average position of connected posts
      let avgX = 0;
      let avgY = 0;
      let avgTime = 0;
      let count = 0;

      connectedPostIds.forEach(pId => {
        const pNode = nodeMap.get(pId);
        if (pNode) {
          avgX += pNode.x;
          avgY += pNode.y;
          avgTime += pNode.timestamp;
          count++;
        }
      });

      if (count > 0) {
        avgX /= count;
        avgY /= count;
        avgTime /= count;
      }

      // Slightly offset tag node outward/inward to create aesthetic diamond constellation
      const tagAngle = Math.atan2(avgY, avgX) + ((idx % 3 - 1) * 0.35);
      const tagTimeRadius = getTimeRadius(avgTime || (minTime + (maxTime - minTime) * 0.5));
      const tagDist = Math.min(340, Math.max(minOrbitalRadius - 15, tagTimeRadius + ((idx % 2 === 0 ? 25 : -20))));

      const x = Math.cos(tagAngle) * tagDist;
      const y = Math.sin(tagAngle) * tagDist;

      const node: GalaxyNode = {
        id: `tag-${tag}`,
        type: 'tag',
        labelEn: `#${tag.toUpperCase()}`,
        labelPl: `#${tag.toUpperCase()}`,
        timestamp: avgTime || minTime + (maxTime - minTime) * 0.5,
        radius: tagDist,
        angle: tagAngle,
        x,
        y,
        size: 9,
        color: '#c084fc', // Purple/fuchsia diamond
        connectedIds: connectedPostIds,
        rawTag: tag,
        excerpt: `${connectedPostIds.length} ${lang === 'en' ? 'linked articles' : 'połączonych artykułów'}`
      };

      calculatedNodes.push(node);
      nodeMap.set(node.id, node);
    });

    // 3. Connect Edges (Posts to Tags)
    calculatedNodes.forEach(sourceNode => {
      if (sourceNode.type === 'post') {
        sourceNode.connectedIds.forEach(targetId => {
          const targetNode = nodeMap.get(targetId);
          if (targetNode) {
            calculatedEdges.push({
              id: `${sourceNode.id}->${targetId}`,
              source: sourceNode.id,
              target: targetId,
              sourceNode,
              targetNode
            });
          }
        });
      }
    });

    return { 
      nodes: calculatedNodes, 
      edges: calculatedEdges, 
      allTagsList: uniqueTags 
    };
  }, [sortedPosts, minTime, maxTime, lang, getTimeRadius]);

  // Timeline playback loop
  useEffect(() => {
    if (isPlayingTimeline) {
      timelineIntervalRef.current = setInterval(() => {
        setTimelineProgress(prev => {
          if (prev >= 1) {
            setIsPlayingTimeline(false);
            return 1;
          }
          return Math.min(1, prev + 0.015);
        });
      }, 100);
    } else {
      if (timelineIntervalRef.current) {
        clearInterval(timelineIntervalRef.current);
      }
    }
    return () => {
      if (timelineIntervalRef.current) clearInterval(timelineIntervalRef.current);
    };
  }, [isPlayingTimeline]);

  // Filtered nodes based on active filter, timeline progress, and search
  const visibleNodes = useMemo(() => {
    const currentCutoffTime = minTime + (maxTime - minTime) * timelineProgress;

    return nodes.filter(n => {
      // Timeline filter
      if (n.timestamp > currentCutoffTime && timelineProgress < 0.99) return false;

      // Type filter
      if (filterType === 'posts' && n.type !== 'post') return false;
      if (filterType === 'tags' && n.type !== 'tag') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const label = (lang === 'en' ? n.labelEn : n.labelPl).toLowerCase();
        const excerpt = (n.excerpt || '').toLowerCase();
        const tag = (n.rawTag || '').toLowerCase();
        return label.includes(q) || excerpt.includes(q) || tag.includes(q);
      }

      return true;
    });
  }, [nodes, filterType, searchQuery, timelineProgress, minTime, maxTime, lang]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  // Hovered / selected connections highlighting
  const activeFocusNode = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    if (!targetId) return null;
    return nodes.find(n => n.id === targetId) || null;
  }, [hoveredNodeId, selectedNodeId, nodes]);

  const activeConnectedIds = useMemo(() => {
    if (!activeFocusNode) return new Set<string>();
    const set = new Set<string>();
    set.add(activeFocusNode.id);
    activeFocusNode.connectedIds.forEach(id => set.add(id));
    return set;
  }, [activeFocusNode]);

  // Pan and Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking background canvas, clear selected node
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.getAttribute('id') === 'galaxy_canvas_bg') {
      setSelectedNodeId(null);
    }
    // Enable dragging anywhere on the canvas or background elements
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel scroll zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoomLevel(prev => Math.min(3.2, Math.max(0.35, prev * zoomFactor)));
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.5, prev + 0.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.6, prev - 0.2));
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setTimelineProgress(1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="galaxy_obsidian_modal_root" 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fadeIn select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-[#07090E] border border-editorial-border/80 flex flex-col overflow-hidden shadow-2xl rounded-none"
        >
          {/* TOP HEADER & TIMELINE SCRUBBER */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between px-3 sm:px-5 py-2.5 bg-[#090C12] border-b border-editorial-border z-20 shrink-0 gap-3">
            
            <div className="flex items-center justify-between lg:w-auto gap-3">
              {/* Left Title & Status */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 bg-[#121824] border border-cyan-500/40 text-cyan-400 shrink-0">
                  <Compass size={16} className="animate-spin-slow" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-editorial-muted font-mono">
                    <span className="text-emerald-400 font-bold">@tomekdot</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{lang === 'en' ? 'Knowledge Network' : 'Sieć Wiedzy'}</span>
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold font-mono text-white uppercase tracking-wider truncate">
                    {lang === 'en' ? 'CONSTELLATION NETWORK' : 'SIEĆ POWIĄZAŃ WIEDZY'}
                  </h2>
                </div>
              </div>

              {/* Close Button (Visible on Mobile here for top-right alignment) */}
              <div className="flex lg:hidden items-center shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-editorial-muted hover:text-white bg-neutral-900 border border-editorial-border hover:border-editorial-accent transition-all cursor-pointer"
                  title={lang === 'en' ? 'Close view (Esc)' : 'Zamknij widok (Esc)'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Top Center Timeline Bar Scrubber (Now visible on mobile too) */}
            <div className="flex items-center gap-2 bg-[#0E131F] border border-editorial-border px-3 py-1.5 font-mono text-xs w-full lg:max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setIsPlayingTimeline(prev => !prev)}
                className="p-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 hover:text-white transition-all cursor-pointer shrink-0"
                title={isPlayingTimeline ? 'Pause timeline' : 'Play chronological timeline expansion'}
              >
                {isPlayingTimeline ? <Pause size={12} /> : <Play size={12} />}
              </button>

              {/* Scrubber timeline bar with event dots */}
              <div className="relative flex-1 flex items-center h-4 cursor-pointer min-w-0">
                {/* Background track */}
                <div className="w-full h-1 bg-neutral-800 relative rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-fuchsia-500 transition-all duration-100"
                    style={{ width: `${timelineProgress * 100}%` }}
                  />
                </div>

                {/* Event points */}
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-1">
                  {sortedPosts.map((p) => {
                    const norm = (p.t - minTime) / (maxTime - minTime || 1);
                    return (
                      <div 
                        key={p.id}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          norm <= timelineProgress ? 'bg-emerald-400 shadow-[0_0_6px_#4ade80]' : 'bg-neutral-600'
                        }`}
                        style={{ position: 'absolute', left: `${norm * 96 + 2}%` }}
                      />
                    );
                  })}
                </div>

                {/* Invisible input slider for scrubbing */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={timelineProgress}
                  onChange={(e) => {
                    setTimelineProgress(parseFloat(e.target.value));
                    setIsPlayingTimeline(false);
                  }}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full"
                />
              </div>

              <span className="text-[10px] text-editorial-muted font-bold tracking-wider shrink-0 whitespace-nowrap min-w-[45px] text-right">
                {new Date(minTime + (maxTime - minTime) * timelineProgress).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Right Window Actions (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-editorial-muted hover:text-white bg-neutral-900 border border-editorial-border hover:border-editorial-accent transition-all cursor-pointer"
                title={lang === 'en' ? 'Close view (Esc)' : 'Zamknij widok (Esc)'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* SECONDARY TOOLBAR: FILTER PILLS, SEARCH, & ZOOM CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#0A0D14] border-b border-editorial-border/60 z-10 shrink-0 font-mono text-xs">
            {/* Filter Mode Pills matching Repo modal button sizing */}
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 border border-editorial-border">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 text-[10.5px] uppercase font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60'
                    : 'text-editorial-muted hover:text-white'
                }`}
              >
                {lang === 'en' ? 'All Orbitals' : 'Wszystko'} ({nodes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('posts')}
                className={`px-2.5 py-1 text-[10.5px] uppercase font-bold transition-all cursor-pointer ${
                  filterType === 'posts'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                    : 'text-editorial-muted hover:text-white'
                }`}
              >
                ● {lang === 'en' ? 'Posts' : 'Wpisy'} ({sortedPosts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tags')}
                className={`px-2.5 py-1 text-[10.5px] uppercase font-bold transition-all cursor-pointer ${
                  filterType === 'tags'
                    ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/60'
                    : 'text-editorial-muted hover:text-white'
                }`}
              >
                ◆ {lang === 'en' ? 'Tags' : 'Tagi'} ({allTagsList.length})
              </button>
            </div>

            {/* Search Input & Zoom Toolbar */}
            <div className="flex items-center gap-2 flex-1 justify-end max-w-md">
              <div className="relative flex-1 max-w-[200px] sm:max-w-xs">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editorial-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Search galaxy nodes...' : 'Szukaj węzłów w galaktyce...'}
                  className="w-full bg-neutral-950 border border-editorial-border pl-7 pr-6 py-1 text-[11px] text-white font-mono placeholder:text-neutral-600 focus:border-cyan-400 outline-none uppercase"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Zoom Buttons matching repo control sizes */}
              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 border border-editorial-border">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 text-editorial-muted hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 text-editorial-muted hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="p-1 text-editorial-muted hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
                  title="Reset galaxy coordinate center"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN GRAPH CANVAS / SVG VIEW */}
          <div 
            className="relative flex-1 bg-[#06080D] overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            >
              <defs>
                {/* Central Sun Radial Gradient Glow */}
                <radialGradient id="sunCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#a855f7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>

                {/* Solar Corona Ray Gradient */}
                <linearGradient id="solarRayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>

                {/* Radial background aura */}
                <radialGradient id="galaxyCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                  <stop offset="40%" stopColor="#a855f7" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>

                {/* Node filter glow */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="sunGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* TRANSFORM CONTAINER WITH PAN & ZOOM */}
              <g
                transform={`translate(${dimensions.width / 2 + panOffset.x}, ${dimensions.height / 2 + panOffset.y}) scale(${zoomLevel})`}
              >
                {/* Central Radial Cosmic Glow */}
                <circle cx="0" cy="0" r="360" fill="url(#galaxyCoreGlow)" />

                {/* CONCENTRIC ORBITAL RINGS WITH DATE LABELS */}
                {orbitalRings.map((ring, idx) => {
                  const r = ring.radius;
                  return (
                    <g key={ring.dateStr} className="pointer-events-none">
                      {/* Orbital line circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r={r}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray={idx % 2 === 0 ? "4,4" : "2,6"}
                        opacity="0.6"
                      />

                      {/* Small axis tick on the vertical timeline axis */}
                      <line
                        x1="-5"
                        y1={-r}
                        x2="5"
                        y2={-r}
                        stroke="#475569"
                        strokeWidth="1.2"
                        opacity="0.85"
                      />

                      {/* Date label on top axis */}
                      <text
                        x="0"
                        y={-r - 6}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9.5"
                        fontFamily="monospace"
                        letterSpacing="1"
                        opacity="0.9"
                      >
                        {ring.label}
                      </text>
                    </g>
                  );
                })}

                {/* TIMELINE VERTICAL SPINE AXIS (Core -> Outer) */}
                <line
                  x1="0"
                  y1={-minOrbitalRadius + 15}
                  x2="0"
                  y2={-maxOrbitalRadius - 15}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2,4"
                  opacity="0.5"
                  className="pointer-events-none"
                />

                {/* RADIAL AXIS SPOKES */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x2 = Math.cos(rad) * 360;
                  const y2 = Math.sin(rad) * 360;
                  return (
                    <line
                      key={deg}
                      x1="0"
                      y1="0"
                      x2={x2}
                      y2={y2}
                      stroke="#1e293b"
                      strokeWidth="0.75"
                      strokeDasharray="2,8"
                      opacity="0.35"
                    />
                  );
                })}

                {/* CENTRAL ANIMATED ORGANIC SOLAR CORE (Living Sun / Słońce) */}
                <g className="pointer-events-none select-none">
                  {/* Outer Solar Aura Corona Disc (Pulsating) */}
                  <circle cx="0" cy="0" r="90" fill="url(#sunCoreGlow)" filter="url(#sunGlow)">
                    <animate attributeName="r" values="80;105;80" dur="5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.75;0.95;0.75" dur="5s" repeatCount="indefinite" />
                  </circle>

                  {/* Outer Clockwise Rotating Solar Flare Beams */}
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="30s"
                      repeatCount="indefinite"
                    />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
                      const rad = (deg * Math.PI) / 180;
                      const x2 = Math.cos(rad) * 80;
                      const y2 = Math.sin(rad) * 80;
                      return (
                        <line
                          key={i}
                          x1="0"
                          y1="0"
                          x2={x2}
                          y2={y2}
                          stroke={i % 2 === 0 ? "#fbbf24" : "#38bdf8"}
                          strokeWidth={i % 3 === 0 ? "2.5" : "1.2"}
                          opacity={i % 2 === 0 ? "0.7" : "0.45"}
                          strokeDasharray={i % 2 === 0 ? "none" : "3,5"}
                        />
                      );
                    })}
                  </g>

                  {/* Counter-Clockwise Rotating Corona Plasma Ring */}
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="360 0 0"
                      to="0 0 0"
                      dur="20s"
                      repeatCount="indefinite"
                    />
                    <circle cx="0" cy="0" r="64" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="12,6" opacity="0.8" />
                    <circle cx="0" cy="0" r="54" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6,8" opacity="0.7" />
                    <circle cx="0" cy="0" r="44" fill="none" stroke="#e879f9" strokeWidth="0.8" strokeDasharray="3,6" opacity="0.6" />
                  </g>

                  {/* Inner Pulsating Solar Plasma Body */}
                  <circle cx="0" cy="0" r="48" fill="#170d04" stroke="#fbbf24" strokeWidth="2" filter="url(#glow)">
                    <animate attributeName="r" values="45;52;45" dur="4s" repeatCount="indefinite" />
                  </circle>

                  {/* Solar Core Energy Plasma Waves */}
                  <circle cx="0" cy="0" r="32" fill="#d97706" opacity="0.4" filter="url(#sunGlow)">
                    <animate attributeName="r" values="28;36;28" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Central Radiant Sun Nucleus Pupil */}
                  <circle cx="0" cy="0" r="20" fill="#fbbf24" filter="url(#glow)">
                    <animate attributeName="r" values="18;23;18" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="11" fill="#fffbebe6" />
                  <circle cx="0" cy="0" r="5" fill="#ffffff">
                    <animate attributeName="r" values="4;6.5;4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* CONSTELLATION CONNECTION EDGES */}
                {edges.map((edge) => {
                  const sourceVisible = visibleNodeIds.has(edge.source);
                  const targetVisible = visibleNodeIds.has(edge.target);
                  if (!sourceVisible || !targetVisible) return null;

                  const isConnectedToFocus = activeFocusNode && 
                    (edge.source === activeFocusNode.id || edge.target === activeFocusNode.id);

                  return (
                    <line
                      key={edge.id}
                      x1={edge.sourceNode.x}
                      y1={edge.sourceNode.y}
                      x2={edge.targetNode.x}
                      y2={edge.targetNode.y}
                      stroke={isConnectedToFocus ? '#38bdf8' : '#334155'}
                      strokeWidth={isConnectedToFocus ? 1.8 : 0.8}
                      strokeDasharray={isConnectedToFocus ? 'none' : '3,3'}
                      opacity={isConnectedToFocus ? 0.9 : 0.4}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* GALAXY NODES */}
                {visibleNodes.map((node) => {
                  const isHovered = hoveredNodeId === node.id;
                  const isSelected = selectedNodeId === node.id;
                  const isNeighbor = activeConnectedIds.has(node.id);
                  const isDimmed = activeFocusNode && !isNeighbor;

                  const nodeLabel = lang === 'en' ? node.labelEn : node.labelPl;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(prev => prev === node.id ? null : node.id);
                      }}
                      className="cursor-pointer transition-all duration-150"
                      opacity={isDimmed ? 0.25 : 1}
                    >
                      {/* Outer pulse aura when focused */}
                      {(isHovered || isSelected) && (
                        <circle
                          cx="0"
                          cy="0"
                          r={node.size * 2.2}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="1.5"
                          className="animate-ping"
                          opacity="0.7"
                        />
                      )}

                      {/* NODE SHAPE: Circle for Post / Diamond for Tag */}
                      {node.type === 'tag' ? (
                        /* Purple Diamond Marker (Memory / Tag Hub) */
                        <polygon
                          points={`0,${-node.size} ${node.size},0 0,${node.size} ${-node.size},0`}
                          fill={isHovered || isSelected ? '#e879f9' : node.color}
                          stroke="#ffffff"
                          strokeWidth={isHovered || isSelected ? 2 : 1}
                          filter="url(#glow)"
                        />
                      ) : (
                        /* Green Circle Marker (Article / Skill) */
                        <circle
                          cx="0"
                          cy="0"
                          r={isHovered || isSelected ? node.size * 1.3 : node.size}
                          fill={isHovered || isSelected ? '#86efac' : node.color}
                          stroke="#ffffff"
                          strokeWidth={isHovered || isSelected ? 2 : 1}
                          filter="url(#glow)"
                        />
                      )}

                      {/* Node Label Text */}
                      <text
                        x="0"
                        y={node.size + 13}
                        textAnchor="middle"
                        fill={isHovered || isSelected ? '#ffffff' : isNeighbor ? '#e2e8f0' : '#94a3b8'}
                        fontSize={node.type === 'tag' ? '10' : '9.5'}
                        fontFamily="monospace"
                        fontWeight={isHovered || isSelected || node.type === 'tag' ? 'bold' : 'normal'}
                        className="pointer-events-none transition-colors duration-150 select-none shadow-black"
                      >
                        {node.type === 'tag' ? nodeLabel : nodeLabel.length > 20 ? `${nodeLabel.slice(0, 18)}…` : nodeLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* FLOATING HUD TOOLTIP CARD */}
            {activeFocusNode && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="absolute top-4 right-4 z-30 w-72 sm:w-84 bg-[#0B0F19]/95 border border-editorial-border p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs space-y-2.5"
              >
                {/* HUD Header */}
                <div className="flex items-center justify-between pb-2 border-b border-editorial-border">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[9.5px] uppercase font-bold ${
                      activeFocusNode.type === 'tag' 
                        ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                    }`}>
                      {activeFocusNode.type === 'tag' ? (lang === 'en' ? 'TAG' : 'TAG') : (lang === 'en' ? 'POST' : 'WPIS / POST')}
                    </span>

                    {activeFocusNode.dateStr && (
                      <span className="text-[10px] text-editorial-muted flex items-center gap-1">
                        <Calendar size={10} className="text-editorial-accent" />
                        {activeFocusNode.dateStr}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      setHoveredNodeId(null);
                    }}
                    className="p-1 text-editorial-muted hover:text-white hover:bg-neutral-800 transition-all cursor-pointer border border-editorial-border/60 shrink-0"
                    title={lang === 'en' ? 'Deselect (X)' : 'Odznacz (X)'}
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* HUD Title & Description */}
                <div>
                  <h3 className="font-bold text-white text-sm leading-snug mb-1">
                    {lang === 'en' ? activeFocusNode.labelEn : activeFocusNode.labelPl}
                  </h3>
                  {activeFocusNode.excerpt && (
                    <p className="text-editorial-muted text-[11px] font-sans leading-relaxed line-clamp-3">
                      {activeFocusNode.excerpt}
                    </p>
                  )}
                </div>

                {/* Connected Tags / Nodes list */}
                <div className="pt-2 border-t border-editorial-border/60">
                  <span className="text-[9px] uppercase text-editorial-muted font-bold block mb-1.5">
                    {lang === 'en' ? 'Connected Constellation Nodes:' : 'Połączone Węzły Konstelacji:'}
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {activeFocusNode.connectedIds.map(id => {
                      const target = nodes.find(n => n.id === id);
                      if (!target) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedNodeId(id)}
                          className="px-1.5 py-0.5 bg-neutral-900 border border-editorial-border hover:border-cyan-400 text-zinc-300 hover:text-white text-[9.5px] cursor-pointer"
                        >
                          {lang === 'en' ? target.labelEn : target.labelPl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-editorial-border flex gap-2">
                  {activeFocusNode.type === 'post' && activeFocusNode.rawPost && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectBlogPost && activeFocusNode.rawPost) {
                            onSelectBlogPost(activeFocusNode.rawPost);
                            onClose();
                          }
                        }}
                        className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 hover:text-white font-bold uppercase tracking-wider text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <BookOpen size={12} />
                        <span>{lang === 'en' ? 'Read Article' : 'Czytaj Wpis'}</span>
                      </button>

                      {onOpenAiDiscussion && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenAiDiscussion && activeFocusNode.rawPost) {
                              onOpenAiDiscussion(activeFocusNode.rawPost);
                              onClose();
                            }
                          }}
                          className="py-1.5 px-2.5 bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-300 hover:text-white font-bold uppercase text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                          title="Discuss with AI"
                        >
                          <Bot size={12} />
                        </button>
                      )}
                    </>
                  )}

                  {activeFocusNode.type === 'tag' && activeFocusNode.rawTag && onSelectTag && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTag && activeFocusNode.rawTag) {
                          onSelectTag(activeFocusNode.rawTag);
                          onClose();
                        }
                      }}
                      className="w-full py-1.5 bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-300 hover:text-white font-bold uppercase tracking-wider text-[10.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <TagIcon size={12} />
                      <span>{lang === 'en' ? 'Filter by this tag' : 'Filtruj wg tego tagu'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* BOTTOM LEFT LEGEND */}
            <div className="absolute bottom-4 left-4 z-20 bg-[#090C14]/90 border border-editorial-border p-3 font-mono text-xs space-y-1.5 backdrop-blur-sm pointer-events-auto">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#4ade80]" />
                <span className="text-[11px] font-bold uppercase">{lang === 'en' ? 'POST' : 'WPIS / POST'}</span>
              </div>
              <div className="flex items-center gap-2 text-fuchsia-400">
                <span className="w-2.5 h-2.5 rotate-45 bg-fuchsia-400 shadow-[0_0_6px_#c084fc]" />
                <span className="text-[11px] font-bold uppercase">{lang === 'en' ? 'TAG' : 'TAG'}</span>
              </div>
              <div className="text-[9.5px] text-editorial-muted pt-1 border-t border-editorial-border/60">
                <span className="text-zinc-400 font-medium">core = oldest · outer = newer</span>
              </div>
              <div className="text-[10px] text-zinc-300 font-bold flex items-center justify-between gap-2 pt-0.5">
                <span className="text-emerald-400">
                  {new Date(minTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-editorial-muted">→</span>
                <span className="text-fuchsia-400">
                  {new Date(maxTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
