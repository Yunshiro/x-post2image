import { expandShowMore } from "./x-dom";
import { inlineMedia } from "./media";
import { surfaceColor } from "./theme";
import { writeMetrics, type MetricsState } from "./metrics";

const HIDE_SELECTORS = [
  '[data-testid="caret"]',
  '[data-testid="share"]',
  'button[aria-label^="Share" i]',
  'button[aria-label*="分享"]',
  'button[aria-label*="Grok" i]',
  '[aria-label="More"]',
  '[aria-label="更多"]',
  'a[href*="/i/grok"]',
  '[data-testid="placementTracking"]',
  ".xvm-badge",
  "[class*='xvm-']",
  "[id^='xvm-']",
  "[data-velocity]",
].join(", ");

export interface CaptureBundle {
  root: HTMLElement;
  clone: HTMLElement;
  width: number;
}

function isThirdPartyOverlay(el: HTMLElement): boolean {
  if (el.tagName === "ARTICLE") {
    return false;
  }
  const className = el.getAttribute("class") ?? "";
  const id = el.id || "";
  if (className.includes("xvm-") || id.startsWith("xvm-") || el.hasAttribute("data-velocity")) {
    return true;
  }
  return [...el.attributes].some(
    (attr) => attr.name.startsWith("data-xvm") && el.tagName !== "ARTICLE",
  );
}

function hideChrome(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(HIDE_SELECTORS).forEach((el) => {
    if (el !== root) {
      el.remove();
    }
  });
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el !== root && isThirdPartyOverlay(el)) {
      el.remove();
    }
  });
}

export async function cloneTweet(article: HTMLElement): Promise<CaptureBundle> {
  await expandShowMore(article);
  const width = Math.round(Math.max(article.getBoundingClientRect().width, 320));
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script, iframe").forEach((node) => node.remove());
  hideChrome(clone);
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";
  clone.style.backgroundColor = surfaceColor(article);

  const root = document.createElement("div");
  root.className = "x2i-capture-root";
  root.style.width = `${width}px`;
  root.style.backgroundColor = surfaceColor(article);
  root.append(clone);
  await inlineMedia(clone);
  return { root, clone, width };
}

export function applyPreviewMetrics(clone: HTMLElement, values: MetricsState): void {
  writeMetrics(clone, values);
}
