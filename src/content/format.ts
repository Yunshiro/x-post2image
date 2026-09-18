const COMPACT_SUFFIX: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

export function pageLocale(): string {
  return document.documentElement.lang || navigator.language || "en";
}

export function isZhLocale(locale = pageLocale()): boolean {
  return locale.toLowerCase().startsWith("zh");
}

function compact(value: number, divisor: number, suffix: string): string {
  const scaled = value / divisor;
  const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}${suffix}`;
}

export function formatCompact(value: number, locale = pageLocale()): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  const n = Math.round(value);
  if (isZhLocale(locale)) {
    if (n < 10_000) {
      return String(n);
    }
    if (n < 100_000_000) {
      return compact(n, 10_000, "万");
    }
    return compact(n, 100_000_000, "亿");
  }
  if (n < 1_000) {
    return String(n);
  }
  if (n < 1_000_000) {
    return compact(n, 1_000, "K");
  }
  if (n < 1_000_000_000) {
    return compact(n, 1_000_000, "M");
  }
  return compact(n, 1_000_000_000, "B");
}

export function formatFull(value: number, locale = pageLocale()): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

export function parseCount(input: string): number | null {
  const source = input.trim().replace(/,/g, "");
  if (!source) {
    return 0;
  }

  const yi = source.match(/([\d]+(?:\.[\d]+)?)\s*亿/i);
  if (yi) {
    return Math.round(Number(yi[1]) * 100_000_000);
  }
  const wan = source.match(/([\d]+(?:\.[\d]+)?)\s*万/i);
  if (wan) {
    return Math.round(Number(wan[1]) * 10_000);
  }

  const compactMatch = source.match(/([\d]+(?:\.[\d]+)?)\s*([kmb])\b/i);
  if (compactMatch) {
    const suffix = compactMatch[2].toLowerCase();
    return Math.round(Number(compactMatch[1]) * (COMPACT_SUFFIX[suffix] ?? 1));
  }

  const grouped = input.trim().match(/(\d{1,3}(?:,\d{3})+)/);
  if (grouped) {
    return Number(grouped[1].replace(/,/g, ""));
  }

  const plain = source.match(/(\d+(?:\.\d+)?)/);
  if (!plain) {
    return null;
  }
  return Math.round(Number(plain[1]));
}
