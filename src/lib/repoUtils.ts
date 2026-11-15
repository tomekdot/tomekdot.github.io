/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CategoryKey, Repository } from '../types';

/**
 * Safely converts an unknown date string into a valid ISO string, or '' if invalid.
 */
export function safeIsoDate(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Safely extracts YYYY-MM-DD from an unknown date string, or '' if invalid.
 */
export function safeDateYmd(input?: string | null): string {
  const iso = safeIsoDate(input);
  return iso ? iso.split('T')[0] : '';
}

/**
 * Safely parses timestamp in ms from a date string, returning 0 if invalid.
 */
export function safeTimeMs(input?: string | null): number {
  if (!input) return 0;
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Safely returns a 4-digit year from a repository's createdYear or pushedAt date.
 */
export function safeRepoYear(repo: Pick<Repository, 'createdYear' | 'pushedAt'>, fallback = 2024): number {
  if (typeof repo.createdYear === 'number' && Number.isFinite(repo.createdYear) && repo.createdYear > 1990) {
    return repo.createdYear;
  }
  if (repo.pushedAt) {
    const d = new Date(repo.pushedAt);
    if (!Number.isNaN(d.getTime())) {
      return d.getFullYear();
    }
  }
  return fallback;
}

/**
 * Normalizes a potentially malformed cached Repository object from localStorage or GitHub API.
 */
export function sanitizeRepo(raw: Partial<Repository> & { name?: string }): Repository {
  const safeCat: CategoryKey[] =
    Array.isArray(raw.cat) && raw.cat.length > 0
      ? (raw.cat.filter(Boolean) as CategoryKey[])
      : ['other'];

  const safePushedAt = raw.pushedAt && !Number.isNaN(new Date(raw.pushedAt).getTime())
    ? raw.pushedAt
    : undefined;

  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'unknown-repo',
    desc: typeof raw.desc === 'string' ? raw.desc : '',
    descPl: typeof raw.descPl === 'string' ? raw.descPl : undefined,
    longDescEn: typeof raw.longDescEn === 'string' ? raw.longDescEn : undefined,
    longDescPl: typeof raw.longDescPl === 'string' ? raw.longDescPl : undefined,
    featuresEn: Array.isArray(raw.featuresEn) ? raw.featuresEn : undefined,
    featuresPl: Array.isArray(raw.featuresPl) ? raw.featuresPl : undefined,
    codeSnippet: raw.codeSnippet,
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : undefined,
    lang: typeof raw.lang === 'string' ? raw.lang : '',
    cat: safeCat,
    url: typeof raw.url === 'string' && raw.url ? raw.url : `https://github.com/tomekdot/${raw.name || ''}`,
    stars: typeof raw.stars === 'number' && Number.isFinite(raw.stars) ? raw.stars : 0,
    forks: typeof raw.forks === 'number' && Number.isFinite(raw.forks) ? raw.forks : 0,
    commitsCount: typeof raw.commitsCount === 'number' && Number.isFinite(raw.commitsCount) ? raw.commitsCount : 0,
    createdYear: typeof raw.createdYear === 'number' && Number.isFinite(raw.createdYear) ? raw.createdYear : undefined,
    pushedAt: safePushedAt,
    isPrivate: Boolean(raw.isPrivate),
    isFork: Boolean(raw.isFork),
    isContributed: Boolean(raw.isContributed),
    forkParent: typeof raw.forkParent === 'string' ? raw.forkParent : undefined,
    defaultBranch: typeof raw.defaultBranch === 'string' ? raw.defaultBranch : undefined,
    readme: typeof raw.readme === 'string' ? raw.readme : undefined,
  };
}

/**
 * Wraps React.lazy with automatic retry on transient dynamic-import failures.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (firstErr) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        return await factory();
      } catch {
        throw firstErr;
      }
    }
  });
}
