/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryKey = 'pyplanet' | 'openplanet' | 'trackmania' | 'ai' | 'kul' | 'other';

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
  commitsCount: number;
  createdYear: number;
  longDescEn?: string;
  longDescPl?: string;
  codeSnippet?: {
    filename: string;
    language: string;
    code: string;
  };
  pushedAt?: string;
  isPrivate?: boolean;
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
  readingTimeEn: string;
  readingTimePl: string;
  tags: string[];
}

export interface LanguageStat {
  name: string;
  color: string;
  count: number;
  percentage: number;
}
