/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryKey = 'pyplanet' | 'openplanet' | 'trackmania' | 'ai' | 'discord' | 'kul' | 'web' | 'tools' | 'other';

export interface CategorySpec {
  key: CategoryKey;
  labelEn: string;
  labelPl: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export interface Repository {
  name: string;
  desc: string;
  descPl?: string;
  lang: string;
  cat: CategoryKey[];
  url: string;
  stars: number;
  forks: number;
  commitsCount?: number;
  createdYear?: number;
  longDescEn?: string;
  longDescPl?: string;
  featuresEn?: string[];
  featuresPl?: string[];
  capabilities?: string[];
  codeSnippet?: {
    filename: string;
    language: string;
    code: string;
  };
  readme?: string;
  pushedAt?: string;
  isPrivate?: boolean;
  isFork?: boolean;
  isContributed?: boolean;
  forkParent?: string;
}

export interface BlogPost {
  id: string;
  titleEn: string;
  titlePl: string;
  excerptEn: string;
  excerptPl: string;
  contentEn: string;
  contentPl: string;
  date: string;
  readingTimeEn?: string;
  readingTimePl?: string;
  tags: string[];
  aiVersionNote?: string;
  aiVersionNoteEn?: string;
  aiVersionNotePl?: string;
  draftVersionContent?: string;
  draftVersionContentEn?: string;
  draftVersionContentPl?: string;
}

export interface LanguageStat {
  name: string;
  color: string;
  count: number;
  percentage: number;
}
