/** 已知标签的翻译 key 映射（不区分大小写） */
const TAG_TO_I18N_KEY: Record<string, string> = {
  pleasant: 'mood.pleasant',
  stressful: 'mood.stressful',
  calm: 'mood.calm',
  thrilled: 'mood.thrilled',
  irritating: 'mood.irritating',
  neutral: 'mood.neutral',
  work: 'tags.work',
  relationships: 'tags.relationships',
  self: 'tags.self',
  health: 'tags.health',
  unexpected: 'tags.unexpected',
};

export function translateTag(tag: string, t: (key: string) => string): string {
  const normalized = tag.trim();
  const key = TAG_TO_I18N_KEY[normalized.toLowerCase()];
  return key ? t(key) : normalized;
}
