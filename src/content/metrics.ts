import { formatCompact, formatFull, pageLocale, parseCount } from "./format";

export type MetricKey = "replies" | "reposts" | "likes" | "bookmarks" | "views";

export type MetricsState = Record<MetricKey, number>;

export const EMPTY_METRICS: MetricsState = {
  replies: 0,
  reposts: 0,
  likes: 0,
  bookmarks: 0,
  views: 0,
};

const ACTION_TESTIDS: Record<MetricKey, string[]> = {
  replies: ["reply"],
  reposts: ["retweet", "unretweet"],
  likes: ["like", "unlike"],
  bookmarks: ["bookmark", "removeBookmark"],
  views: [],
};

function actionGroup(article: HTMLElement): HTMLElement | null {
  const groups = Array.from(article.querySelectorAll<HTMLElement>('div[role="group"]'));
  return (
    groups.find((group) =>
      group.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"]'),
    ) ?? null
  );
}

function findControl(article: HTMLElement, key: MetricKey): HTMLElement | null {
  const group = actionGroup(article);
  const scope = group ?? article;
  for (const testId of ACTION_TESTIDS[key]) {
    const found = scope.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (found) {
      return found;
    }
  }
  if (key === "views") {
    return (
      scope.querySelector<HTMLElement>('a[href*="/analytics"]') ??
      scope.querySelector<HTMLElement>('[aria-label*="view" i]') ??
      scope.querySelector<HTMLElement>('[aria-label*="浏览"]') ??
      scope.querySelector<HTMLElement>('[aria-label*="次观看"]') ??
      scope.querySelector<HTMLElement>('[aria-label*="曝光"]')
    );
  }
  if (key === "bookmarks") {
    return (
      scope.querySelector<HTMLElement>('[aria-label*="Bookmark" i]') ??
      scope.querySelector<HTMLElement>('[aria-label*="收藏"]') ??
      scope.querySelector<HTMLElement>('[aria-label*="書籤"]') ??
      scope.querySelector<HTMLElement>('[aria-label*="ブックマーク"]')
    );
  }
  return null;
}

function findCountTextTarget(control: Element): HTMLElement | null {
  const transition = control.querySelector<HTMLElement>(
    '[data-testid="app-text-transition-container"]',
  );
  if (transition) {
    const nested = transition.querySelector<HTMLElement>("span span, span");
    return nested ?? transition;
  }
  const spans = Array.from(control.querySelectorAll<HTMLElement>("span"));
  return (
    [...spans].reverse().find((span) => {
      const text = span.textContent?.trim() ?? "";
      return text !== "" && /^[\d.,]+[KMB万亿]?$/.test(text) && span.children.length === 0;
    }) ?? null
  );
}

function readControlCount(control: Element | null): number {
  if (!control) {
    return 0;
  }
  const aria = control.getAttribute("aria-label") ?? control.getAttribute("title") ?? "";
  const fromAria = parseCount(aria);
  if (fromAria && fromAria > 0) {
    return fromAria;
  }
  return parseCount(findCountTextTarget(control)?.textContent ?? "") ?? 0;
}

function statsLinks(article: HTMLElement, key: MetricKey): HTMLElement[] {
  const hrefPart: Record<MetricKey, string[]> = {
    replies: [],
    reposts: ["/retweets", "/quotes"],
    likes: ["/likes"],
    bookmarks: ["/bookmarks"],
    views: ["/analytics"],
  };
  return hrefPart[key].flatMap((part) =>
    Array.from(article.querySelectorAll<HTMLElement>(`a[href*="${part}"]`)),
  );
}

function numberSpan(element: HTMLElement): HTMLElement | null {
  const spans = Array.from(element.querySelectorAll<HTMLElement>("span"));
  return (
    spans.find((span) => {
      const text = span.textContent?.trim() ?? "";
      return text !== "" && parseCount(text) !== null && span.children.length === 0;
    }) ?? null
  );
}

export function readMetrics(article: HTMLElement): MetricsState {
  const values: MetricsState = { ...EMPTY_METRICS };
  (Object.keys(values) as MetricKey[]).forEach((key) => {
    const actionCount = readControlCount(findControl(article, key));
    const statCount = statsLinks(article, key)
      .map((link) => parseCount(link.textContent ?? "") ?? 0)
      .find((count) => count > 0);
    values[key] = actionCount || statCount || 0;
  });
  return values;
}

function replaceAriaCount(aria: string, formatted: string, raw: number): string {
  if (!aria) {
    return aria;
  }
  if (raw <= 0) {
    const stripped = aria.replace(/^[\d.,]+\s*[KMB万亿]?\s+\S+\.\s*/i, "");
    return stripped || aria;
  }
  if (/[\d]/.test(aria)) {
    return aria.replace(/[\d.,]+(?:\s*[KMB万亿])?/, formatted);
  }
  return `${formatted} ${aria}`;
}

function ensureCountTarget(control: HTMLElement, article: HTMLElement): HTMLElement {
  const existing = findCountTextTarget(control);
  if (existing) {
    return existing;
  }
  const group = actionGroup(article);
  const donor = group
    ? Array.from(group.querySelectorAll<HTMLElement>('[data-testid="app-text-transition-container"]')).find(
        (node) => !control.contains(node),
      )
    : null;
  if (donor) {
    const clone = donor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("span").forEach((span) => {
      if (span.children.length === 0) {
        span.textContent = "";
      }
    });
    const row =
      control.querySelector("svg")?.closest("div")?.parentElement ??
      control.querySelector("div") ??
      control;
    row.append(clone);
    return findCountTextTarget(control) ?? clone;
  }
  const span = document.createElement("span");
  span.dataset.x2iCount = "1";
  span.style.marginLeft = "4px";
  span.style.fontSize = "13px";
  control.append(span);
  return span;
}

function setText(element: HTMLElement, value: string): void {
  if (element.childElementCount === 0) {
    element.textContent = value;
    return;
  }
  const leaf = Array.from(element.querySelectorAll<HTMLElement>("span")).find(
    (span) => span.children.length === 0,
  );
  if (leaf) {
    leaf.textContent = value;
  } else {
    element.textContent = value;
  }
}

export function writeMetrics(article: HTMLElement, values: MetricsState): void {
  const locale = pageLocale();
  (Object.keys(values) as MetricKey[]).forEach((key) => {
    const raw = Math.max(0, Math.round(values[key] || 0));
    const compact = formatCompact(raw, locale);
    const full = formatFull(raw, locale);
    const control = findControl(article, key);
    if (control) {
      const display = compact;
      if (display) {
        setText(ensureCountTarget(control, article), display);
      } else {
        const target = findCountTextTarget(control);
        if (target) {
          setText(target, "");
        }
      }
      const aria = control.getAttribute("aria-label");
      if (aria) {
        control.setAttribute("aria-label", replaceAriaCount(aria, display || String(raw), raw));
      }
    }
    for (const link of statsLinks(article, key)) {
      const target = numberSpan(link);
      if (!target) {
        continue;
      }
      const original = target.textContent ?? "";
      const next = original.includes(",") || original.length > 3 ? full : compact;
      target.textContent = raw > 0 ? next || full : "";
    }
  });
}
