import { t } from "./i18n";
import {
  X_SELECTORS,
  findExpandedShareTweet,
  findTweetFromShareTarget,
  getTweetStatusId,
  isVisible,
  shareMarkerCount,
} from "./x-dom";

export interface ShareMenuOptions {
  onCapture: (article: HTMLElement) => void;
}

function eventElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

function createCameraIcon(document: Document): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("x2i-menu-icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M8.4 4.5 9.7 3h4.6l1.3 1.5H19A2.5 2.5 0 0 1 21.5 7v10A2.5 2.5 0 0 1 19 19.5H5A2.5 2.5 0 0 1 2.5 17V7A2.5 2.5 0 0 1 5 4.5h3.4ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z",
  );
  svg.append(path);
  return svg;
}

function findShareMenu(document: Document): HTMLElement | null {
  const items = Array.from(document.querySelectorAll<HTMLElement>(X_SELECTORS.menuItem)).filter(
    (item) => shareMarkerCount(item) > 0 && isVisible(item),
  );
  for (const item of items.reverse()) {
    const boundary = item.closest<HTMLElement>(X_SELECTORS.menu);
    let candidate = item.parentElement;
    while (candidate && candidate !== document.body) {
      if (isVisible(candidate) && shareMarkerCount(candidate) >= 2) {
        return candidate;
      }
      if (candidate === boundary) {
        break;
      }
      candidate = candidate.parentElement;
    }
  }
  const menus = Array.from(document.querySelectorAll<HTMLElement>(X_SELECTORS.menu)).filter(
    (menu) => isVisible(menu) && shareMarkerCount(menu) >= 1,
  );
  return menus.at(-1) ?? null;
}

export function installShareMenu(options: ShareMenuOptions): () => void {
  const { onCapture } = options;
  let anchor: HTMLElement | null = null;
  let scanQueued = false;
  let disposed = false;

  const rememberAnchor = (event: Event): void => {
    const target = eventElement(event);
    if (!target) {
      return;
    }
    const article = findTweetFromShareTarget(target);
    if (article) {
      anchor = article;
      queueScan();
    }
  };

  const inject = (menu: HTMLElement): void => {
    if (menu.querySelector("[data-x2i-menu-item]")) {
      return;
    }
    const article = (anchor?.isConnected ? anchor : null) ?? findExpandedShareTweet(document);
    if (!article) {
      return;
    }
    const captured = article;
    const statusId = getTweetStatusId(captured);
    const button = document.createElement("button");
    button.type = "button";
    button.role = "menuitem";
    button.dataset.x2iMenuItem = "1";
    button.className = "x2i-menu-item";
    button.append(createCameraIcon(document), document.createTextNode(t("menuItem")));
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (captured.isConnected && getTweetStatusId(captured) === statusId) {
        onCapture(captured);
      }
    });
    menu.style.setProperty("overflow-y", "auto");
    menu.prepend(button);
  };

  const scan = (): void => {
    scanQueued = false;
    if (disposed) {
      return;
    }
    const menu = findShareMenu(document);
    if (menu) {
      inject(menu);
    }
  };

  const queueScan = (): void => {
    if (scanQueued || disposed) {
      return;
    }
    scanQueued = true;
    requestAnimationFrame(scan);
  };

  document.addEventListener("pointerdown", rememberAnchor, true);
  document.addEventListener("click", rememberAnchor, true);
  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  queueScan();

  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener("pointerdown", rememberAnchor, true);
    document.removeEventListener("click", rememberAnchor, true);
    document.querySelectorAll("[data-x2i-menu-item]").forEach((node) => node.remove());
  };
}
