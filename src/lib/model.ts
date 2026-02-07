export function normalizeModelAlias(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const key = trimmed.toLowerCase().replace(/\s+/g, '-');
  if (key === 'sonnet-latest' || key === 'latest-sonnet' || key === 'claude-sonnet-latest') return 'sonnet';
  if (key === 'opus-latest' || key === 'latest-opus' || key === 'claude-opus-latest') return 'opus';
  if (key === 'haiku-latest' || key === 'latest-haiku' || key === 'claude-haiku-latest') return 'haiku';
  return trimmed;
}
