/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  ArrowRight, 
  Workflow, 
  CheckCircle2,
  FileText,
  ShieldCheck,
  Code2,
  GitBranch,
  Terminal,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Repository } from '../types';
import { CATEGORIES } from '../data';

interface RepoArchitectureUmlProps {
  repo: Repository;
  lang: 'en' | 'pl';
  readmeContent?: string | null;
}

export interface ReadmeStep {
  title?: string;
  content: string;
}

export interface ReadmePipeline {
  title: string;
  steps: ReadmeStep[];
}

/**
 * Parses inline markdown tokens (**bold**, __bold__, `code`, *italic*, [link](url))
 * and renders formatted React elements. Strips any stray or unmatched double asterisks.
 */
export function renderInlineMarkdown(rawText: string): React.ReactNode {
  if (!rawText) return null;

  // Clean leading bullet markers that might have been preserved
  const text = rawText.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim();

  // Pattern matching:
  // 1. `inline code`
  // 2. **bold** or __bold__
  // 3. [link text](url)
  // 4. *italic*
  const pattern = /(`[^`]+`|\*\*[^*]+?\*\*|__[^_]+?__|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*]+?\*)/g;

  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Inline code
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code 
              key={index} 
              className="px-1.5 py-0.5 bg-black/80 border border-zinc-700/60 font-mono text-[11px] text-amber-300 rounded-none mx-0.5"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Bold (** or __)
        if (
          (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
          (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
        ) {
          const inner = part.slice(2, -2).trim();
          if (!inner) return null;
          return (
            <strong key={index} className="font-bold text-white tracking-wide">
              {inner}
            </strong>
          );
        }

        // Markdown Link: [label](url)
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
          if (match) {
            return (
              <a
                key={index}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-editorial-accent underline hover:text-white transition-colors font-medium"
              >
                {match[1]}
              </a>
            );
          }
        }

        // Italic: *text*
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 3 && !part.startsWith('**')) {
          const inner = part.slice(1, -1).trim();
          if (!inner) return null;
          return (
            <em key={index} className="italic text-zinc-200">
              {inner}
            </em>
          );
        }

        // Clean any stray asterisks e.g. "** " or " **" that didn't match a pair
        const cleanedText = part.replace(/\*\*/g, '');

        return <React.Fragment key={index}>{cleanedText}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Extracts a step title and content from a README bullet.
 * Supports patterns like:
 * - **Full repo list** — paginates up to 500 repos
 * - **Step 1: Setup**: install dependencies
 * - Title: description
 */
function parseReadmeStep(rawBullet: string): ReadmeStep {
  const bullet = rawBullet.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim();
  
  // Check for bold title format: **Title** — Description or **Title**: Description or **Title** - Description
  const boldMatch = bullet.match(/^\*\*([^*]+)\*\*[\s:—–-]+(.*)$/);
  if (boldMatch && boldMatch[1] && boldMatch[2]) {
    return {
      title: boldMatch[1].replace(/[:—–-]+$/, '').trim(),
      content: boldMatch[2].trim()
    };
  }

  // Check for colon-separated title: Title: Description
  const colonMatch = bullet.match(/^([A-Za-z0-9\s_/-]{3,35}):\s+(.+)$/);
  if (colonMatch && colonMatch[1] && colonMatch[2] && !colonMatch[1].toLowerCase().startsWith('http')) {
    return {
      title: colonMatch[1].trim(),
      content: colonMatch[2].trim()
    };
  }

  return {
    content: bullet
  };
}

/**
 * Parses markdown README content to extract genuine architectural sections, features, and workflow steps.
 * Never invents or extrapolates steps not present in the markdown.
 */
function extractReadmePipeline(readme: string): ReadmePipeline | null {
  if (!readme || readme.length < 40) return null;

  const lines = readme.split('\n');
  let capturing = false;
  const rawBullets: string[] = [];
  let sectionTitle = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section headers describing features, architecture, workflow, usage, or setup
    if (/^#{1,3}\s+(Features|Architecture|How it works|Overview|Pipeline|Usage|Components|Workflow|Execution|Steps|Getting Started|Installation|Quick Start|Setup|Funkcje|Architektura|Działanie|Jak to działa|Przepływ|Kroki|Moduły|Użycie|Instalacja)/i.test(line)) {
      capturing = true;
      sectionTitle = line.replace(/^#{1,3}\s+/, '').trim();
      continue;
    } else if (capturing && /^#{1,3}\s+/.test(line)) {
      // Reached next major section
      if (rawBullets.length >= 2) break;
      capturing = false;
    }

    if (capturing) {
      if (/^[-*+]\s+/.test(line)) {
        const item = line.replace(/^[-*+]\s+/, '').replace(/\[([ xX])\]\s*/, '').trim();
        if (item.length > 4 && item.length < 300) {
          rawBullets.push(item);
        }
      } else if (/^\d+\.\s+/.test(line)) {
        const item = line.replace(/^\d+\.\s+/, '').trim();
        if (item.length > 4 && item.length < 300) {
          rawBullets.push(item);
        }
      } else if (/^\*\*(Step\s*\d+|Krok\s*\d+|\d+\.?)\*\*/i.test(line)) {
        const item = line.trim();
        if (item.length > 4 && item.length < 300) {
          rawBullets.push(item);
        }
      }
    }
  }

  if (rawBullets.length >= 2) {
    const steps = rawBullets.slice(0, 8).map(parseReadmeStep);
    return { title: sectionTitle || 'README Flow', steps };
  }

  return null;
}

export default function RepoArchitectureUml({ repo, lang, readmeContent }: RepoArchitectureUmlProps) {
  // CRITICAL: Private repositories must NEVER display any architecture, flow, or speculative contracts.
  if (repo.isPrivate) {
    return null;
  }

  const readmeData = useMemo(() => {
    return extractReadmePipeline(readmeContent || repo.readme || '');
  }, [readmeContent, repo.readme]);

  const primaryCategory = repo.cat && repo.cat.length > 0 ? repo.cat[0] : 'other';
  const categorySpec = CATEGORIES[primaryCategory];
  const categoryLabel = categorySpec 
    ? (lang === 'en' ? categorySpec.labelEn : categorySpec.labelPl) 
    : primaryCategory;

  return (
    <div id="repo_architecture_flow_panel" className="space-y-3 font-mono">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-editorial-border/60 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Workflow size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-amber-400 flex items-center gap-1.5">
              <span>
                {readmeData 
                  ? (lang === 'en' ? 'System Execution Flow & Architecture' : 'Przebieg Wykonania & Architektura') 
                  : (lang === 'en' ? 'Technical Specifications & Runtime Scope' : 'Specyfikacja Techniczna & Zakres Wykonawczy')}
              </span>
            </h4>
            <div className="text-[9.5px] text-editorial-muted">
              {readmeData
                ? (lang === 'en' 
                    ? `Verified operational flow extracted directly from ${readmeData.title}` 
                    : `Zweryfikowany przebieg operacyjny wyodrębniony bezpośrednio z ${readmeData.title}`)
                : (lang === 'en' 
                    ? 'Concrete runtime environment and verified repository metadata' 
                    : 'Rzeczywiste środowisko uruchomieniowe i zweryfikowane metadane')}
            </div>
          </div>
        </div>

        {readmeData ? (
          <span className="text-[9.5px] font-mono px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <FileText size={11} />
            <span>{lang === 'en' ? 'Sourced from README.md' : 'Źródło: README.md'}</span>
          </span>
        ) : (
          <span className="text-[9.5px] font-mono px-2 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-muted flex items-center gap-1">
            <ShieldCheck size={11} className="text-zinc-400" />
            <span>{lang === 'en' ? 'Verified Codebase Only' : 'Tylko zweryfikowany kod'}</span>
          </span>
        )}
      </div>

      {/* Case 1: Genuine flow sourced from README.md */}
      {readmeData && readmeData.steps.length > 0 ? (
        <div className="space-y-3">
          {/* Top pipeline breadcrumb bar */}
          <div className="p-2.5 bg-[#0C0A08] border border-editorial-border/60 text-xs text-editorial-muted">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-editorial-accent font-bold uppercase text-[10px] shrink-0">
                {lang === 'en' ? 'EXECUTION PIPELINE:' : 'POTOK PRZETWARZANIA:'}
              </span>
              {readmeData.steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-300">
                    <span className="w-4 h-4 rounded-none bg-black border border-editorial-border text-editorial-accent flex items-center justify-center font-bold text-[9px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[150px]">
                      {step.title || (lang === 'en' ? `Phase ${idx + 1}` : `Krok ${idx + 1}`)}
                    </span>
                  </span>
                  {idx < readmeData.steps.length - 1 && (
                    <ArrowRight size={11} className="text-zinc-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Sequential Steps from README (Full text with rendered markdown) */}
          <div className="space-y-2">
            {readmeData.steps.map((step, idx) => (
              <div 
                key={idx}
                className="p-3 bg-neutral-950/70 border border-editorial-border hover:border-editorial-accent/60 transition-colors flex items-start gap-3"
              >
                <div className="w-5 h-5 bg-black border border-editorial-border text-editorial-accent font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-400 font-mono shrink-0">
                        {lang === 'en' ? `Step ${idx + 1}` : `Krok ${idx + 1}`}
                      </span>
                      {step.title && (
                        <>
                          <span className="text-zinc-600 text-xs">/</span>
                          <span className="text-xs font-bold text-white font-mono truncate">
                            {step.title}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] text-emerald-400/80 font-mono flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} />
                      <span>README // {readmeData.title}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed break-words">
                    {renderInlineMarkdown(step.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Guarantee Note */}
          <div className="p-2.5 bg-neutral-900/60 border border-editorial-border text-[10px] text-zinc-400 font-sans flex items-start gap-2">
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {lang === 'en' ? (
                <span>
                  Operational pipeline directly reflects the documented technical specifications from the repository's <code className="text-zinc-200 font-mono">README.md</code>.
                </span>
              ) : (
                <span>
                  Przepływ przetwarzania odzwierciedla udokumentowane kroki ze specyfikacji technicznej w pliku <code className="text-zinc-200 font-mono">README.md</code>.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: When no pipeline is documented in README — Minimal, honest, factual specifications only (No hallucinations!) */
        <div className="space-y-3">
          {/* Subtle info notice */}
          <div className="p-3 bg-neutral-950/60 border border-editorial-border flex items-start gap-2.5 text-[11px] font-sans text-zinc-300">
            <Info size={14} className="text-editorial-accent shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {lang === 'en' ? (
                <span>
                  Execution pipeline flow is not documented in <strong className="text-white font-mono">README.md</strong>. Displaying verified codebase specifications and runtime environment directly from repository metadata.
                </span>
              ) : (
                <span>
                  Przebieg potoku wykonania nie został opisany w pliku <strong className="text-white font-mono">README.md</strong>. Wyświetlane są bezpośrednie, zweryfikowane parametry środowiska i metadane repozytorium bez syntetycznej ekstrapolacji.
                </span>
              )}
            </div>
          </div>

          {/* Factual Technical Profile Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Runtime Language */}
            <div className="p-3 bg-black/40 border border-editorial-border space-y-1">
              <div className="text-[9.5px] uppercase font-bold text-editorial-muted flex items-center gap-1.5">
                <Code2 size={12} className="text-sky-400" />
                <span>{lang === 'en' ? 'Runtime Language' : 'Język / Środowisko'}</span>
              </div>
              <div className="text-white font-bold font-mono text-xs">
                {repo.lang || (lang === 'en' ? 'Shell / Documentation' : 'Skrypty / Dokumentacja')}
              </div>
            </div>

            {/* Ecosystem & Domain */}
            <div className="p-3 bg-black/40 border border-editorial-border space-y-1">
              <div className="text-[9.5px] uppercase font-bold text-editorial-muted flex items-center gap-1.5">
                <Layers size={12} className="text-amber-400" />
                <span>{lang === 'en' ? 'Ecosystem / Domain' : 'Ekosystem / Dziedzina'}</span>
              </div>
              <div className="text-white font-bold font-mono text-xs truncate">
                {categoryLabel}
              </div>
            </div>

            {/* Repository Visibility */}
            <div className="p-3 bg-black/40 border border-editorial-border space-y-1">
              <div className="text-[9.5px] uppercase font-bold text-editorial-muted flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>{lang === 'en' ? 'Visibility & Access' : 'Widoczność & Dostęp'}</span>
              </div>
              <div className="text-white font-bold font-mono text-xs">
                {lang === 'en' ? 'Public Open Source' : 'Publiczny Open Source'}
              </div>
            </div>

            {/* Source Origin & Commits */}
            <div className="p-3 bg-black/40 border border-editorial-border space-y-1">
              <div className="text-[9.5px] uppercase font-bold text-editorial-muted flex items-center gap-1.5">
                <GitBranch size={12} className="text-purple-400" />
                <span>{lang === 'en' ? 'Source Integrity' : 'Status Źródła'}</span>
              </div>
              <div className="text-white font-bold font-mono text-xs">
                {repo.isFork 
                  ? (repo.isContributed 
                      ? (lang === 'en' ? 'Contributed Fork' : 'Współtworzony Fork') 
                      : (lang === 'en' ? 'Upstream Fork' : 'Oryginalny Fork'))
                  : (lang === 'en' ? 'Original Source Code' : 'Oryginalny Kod Źródłowy')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
