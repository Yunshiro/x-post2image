export const X_SELECTORS = {
  tweet: [
    'article[data-testid="tweet"]',
    'article[itemtype="https://schema.org/SocialMediaPosting"]',
  ].join(", "),
  share: [
    '[data-testid="share"]',
    '[data-slot="xds-menu-trigger"][aria-label="Share" i]',
    '[data-slot="xds-menu-trigger"][aria-label="分享"]',
    'button[aria-label*="Share" i]',
    '[role="button"][aria-label*="Share" i]',
    'button[aria-label*="分享"]',
    '[role="button"][aria-label*="分享"]',
    'button[aria-label*="共有"]',
    '[role="button"][aria-label*="共有"]',
  ].join(", "),
  menu: [
    '[role="menu"]',
    '[data-testid="Dropdown"]',
    '[data-slot="menu-content"]',
    '[data-slot="xds-menu-content"]',
  ].join(", "),
  menuItem: 'button, a, [role="menuitem"], [data-slot*="menu-item"]',
  showMore: [
    '[data-testid="tweet-text-show-more-link"]',
    'button[data-testid="tweet-text-show-more-link"]',
  ].join(", "),
} as const;

const SHARE_MARKERS = [
  /^(?:copy link|复制链接|複製連結|リンクをコピー|링크 복사)$/i,
  /^(?:send via direct message|send through chat|通过聊天发送|透過聊天傳送|ダイレクトメッセージで送信)$/i,
  /^(?:share post via(?:…|\.\.\.)?|帖子分享途径|分享帖子的方式|ポストを共有する方法)$/i,
  /^(?:bookmark to folder|收藏到文件夹|儲存至書籤資料夾)$/i,
];

export function normalizedText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function shareMarkerCount(element: Element): number {
  const items = [
    ...(element.matches(X_SELECTORS.menuItem) ? [element] : []),
    ...element.querySelectorAll(X_SELECTORS.menuItem),
  ];
  const matched = new Set<number>();
  for (const item of items) {
    const text = normalizedText(item);
    SHARE_MARKERS.forEach((marker, index) => {
      if (marker.test(text)) {
        matched.add(index);
      }
    });
  }
  return matched.size;
}

export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const view = element.ownerDocument.defaultView;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = view?.getComputedStyle(current);
    if (
      style?.display === "none" ||
      style?.visibility === "hidden" ||
      style?.visibility === "collapse" ||
      style?.opacity === "0"
    ) {
      return false;
    }
  }
  return true;
}

export function findTweetFromShareTarget(target: Element): HTMLElement | null {
  const share = target.closest<HTMLElement>(X_SELECTORS.share);
  return (
    share?.closest<HTMLElement>(X_SELECTORS.tweet) ??
    share?.closest("article") ??
    target.closest<HTMLElement>(X_SELECTORS.tweet)
  );
}

export function getTweetStatusId(article: HTMLElement): string | null {
  const timeLink = article.querySelector('a[href*="/status/"] time')?.closest("a");
  const href =
    timeLink?.getAttribute("href") ??
    article.querySelector('a[href*="/status/"]')?.getAttribute("href") ??
    "";
  return href.match(/\/status\/(\d+)/)?.[1] ?? null;
}

export function findExpandedShareTweet(document: Document): HTMLElement | null {
  const expanded = Array.from(document.querySelectorAll<HTMLElement>(X_SELECTORS.share)).filter(
    (control) => control.getAttribute("aria-expanded") === "true" && isVisible(control),
  );
  for (const control of expanded.reverse()) {
    const article = findTweetFromShareTarget(control);
    if (article?.isConnected) {
      return article;
    }
  }
  return null;
}

export async function expandShowMore(article: HTMLElement): Promise<void> {
  const buttons = Array.from(article.querySelectorAll<HTMLElement>(X_SELECTORS.showMore));
  for (const button of buttons) {
    button.click();
  }
  if (buttons.length > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
}

export function dismissOpenMenus(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
  );
}
