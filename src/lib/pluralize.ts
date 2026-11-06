/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Polish grammatical pluralization helper.
 * Rules for Polish noun declension with numerals:
 * - 1: one (e.g. 1 gwiazdka, 1 fork, 1 commit)
 * - 2, 3, 4, 22-24, 32-34... (ends in 2, 3, 4 except 12, 13, 14): few (e.g. 2 gwiazdki, 2 forki, 2 commity)
 * - 0, 5-21, 25-31...: many (e.g. 0 gwiazdek, 5 gwiazdek, 12 gwiazdek, 21 gwiazdek)
 */
export function pluralizePolish(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const abs = Math.abs(count);
  if (abs === 1) return one;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}

/**
 * Format stars label with proper pluralization in EN and PL
 * e.g.:
 * EN: "1 stargazer on GitHub", "2 stargazers on GitHub"
 * PL: "1 gwiazdka na GitHubie", "2 gwiazdki na GitHubie", "5 gwiazdek na GitHubie"
 */
export function formatGitHubStars(count: number, lang: 'en' | 'pl'): string {
  if (lang === 'en') {
    return `${count} ${count === 1 ? 'stargazer on GitHub' : 'stargazers on GitHub'}`;
  }
  const noun = pluralizePolish(count, 'gwiazdka', 'gwiazdki', 'gwiazdek');
  return `${count} ${noun} na GitHubie`;
}

/**
 * Format star count and noun
 * e.g. "1 gwiazdka", "2 gwiazdki", "5 gwiazdek"
 */
export function formatStarsCount(count: number, lang: 'en' | 'pl'): string {
  if (lang === 'en') {
    return `${count} ${count === 1 ? 'star' : 'stars'}`;
  }
  return `${count} ${pluralizePolish(count, 'gwiazdka', 'gwiazdki', 'gwiazdek')}`;
}

/**
 * Format forks count and noun
 */
export function formatForksCount(count: number, lang: 'en' | 'pl'): string {
  if (lang === 'en') {
    return `${count} ${count === 1 ? 'fork' : 'forks'}`;
  }
  return `${count} ${pluralizePolish(count, 'fork', 'forki', 'forków')}`;
}

/**
 * Format commits count and noun
 */
export function formatCommitsCount(count: number, lang: 'en' | 'pl'): string {
  if (lang === 'en') {
    return `${count} ${count === 1 ? 'commit' : 'commits'}`;
  }
  return `${count} ${pluralizePolish(count, 'commit', 'commity', 'commitów')}`;
}
