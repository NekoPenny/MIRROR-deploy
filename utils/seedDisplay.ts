/**
 * 统一种子展示为「在…时，我会…」形式。
 * 若已是该句式（或旧版「如果…那么…」）则原样返回，否则用兜底包装。
 */
export function formatSeedDisplay(text: string | undefined): string {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if ((t.includes('时') && t.includes('我会')) || (t.includes('如果') && t.includes('那么'))) return t;
  return `在需要调整时，我会：${t}`;
}
