import { applyPreviewMetrics, cloneTweet, type CaptureBundle } from "./clone-tweet";
import { capturePng, copyPng, downloadPng } from "./capture";
import { t } from "./i18n";
import { parseCount } from "./format";
import { readMetrics, type MetricKey, type MetricsState } from "./metrics";
import { detectTheme } from "./theme";
import { showToast } from "./toast";
import { dismissOpenMenus, getTweetStatusId } from "./x-dom";

const FIELD_ORDER: MetricKey[] = ["replies", "reposts", "likes", "views"];

let openRoot: HTMLElement | null = null;

function fieldValue(input: HTMLInputElement): number {
  return parseCount(input.value) ?? 0;
}

function collectValues(form: HTMLElement): MetricsState {
  const values: MetricsState = { replies: 0, reposts: 0, likes: 0, views: 0 };
  FIELD_ORDER.forEach((key) => {
    const input = form.querySelector<HTMLInputElement>(`[data-x2i-field="${key}"]`);
    if (input) {
      values[key] = Math.max(0, fieldValue(input));
    }
  });
  return values;
}

export async function openEditor(article: HTMLElement): Promise<void> {
  dismissOpenMenus();
  openRoot?.remove();

  if (!article.isConnected) {
    showToast(t("missingTweet"), "error");
    return;
  }

  const theme = detectTheme(article);
  const initial = readMetrics(article);
  const statusId = getTweetStatusId(article) ?? "tweet";

  const root = document.createElement("div");
  root.className = "x2i-root";
  root.dataset.theme = theme;
  root.innerHTML = `
    <div class="x2i-backdrop" data-x2i-close="1"></div>
    <div class="x2i-dialog" role="dialog" aria-modal="true" aria-label="${t("title")}">
      <header class="x2i-header">
        <h2>${t("title")}</h2>
        <button type="button" class="x2i-icon-btn" data-x2i-close="1" aria-label="${t("close")}">×</button>
      </header>
      <div class="x2i-body">
        <div class="x2i-preview-wrap">
          <div class="x2i-preview" data-x2i-preview></div>
        </div>
        <form class="x2i-form" data-x2i-form>
          <label>
            <span>${t("replies")}</span>
            <input data-x2i-field="replies" inputmode="numeric" value="${initial.replies}">
          </label>
          <label>
            <span>${t("reposts")}</span>
            <input data-x2i-field="reposts" inputmode="numeric" value="${initial.reposts}">
          </label>
          <label>
            <span>${t("likes")}</span>
            <input data-x2i-field="likes" inputmode="numeric" value="${initial.likes}">
          </label>
          <label>
            <span>${t("views")}</span>
            <input data-x2i-field="views" inputmode="numeric" value="${initial.views}">
          </label>
        </form>
      </div>
      <footer class="x2i-footer">
        <button type="button" class="x2i-btn ghost" data-x2i-download>${t("download")}</button>
        <button type="button" class="x2i-btn primary" data-x2i-copy>${t("copy")}</button>
      </footer>
    </div>
  `;

  document.body.append(root);
  openRoot = root;

  const preview = root.querySelector<HTMLElement>("[data-x2i-preview]");
  const form = root.querySelector<HTMLElement>("[data-x2i-form]");
  const copyBtn = root.querySelector<HTMLButtonElement>("[data-x2i-copy]");
  const downloadBtn = root.querySelector<HTMLButtonElement>("[data-x2i-download]");
  if (!preview || !form || !copyBtn || !downloadBtn) {
    root.remove();
    return;
  }

  const close = (): void => {
    document.removeEventListener("keydown", onKey);
    root.remove();
    if (openRoot === root) {
      openRoot = null;
    }
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      close();
    }
  };
  document.addEventListener("keydown", onKey);
  root.querySelectorAll("[data-x2i-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  let bundle: CaptureBundle;
  try {
    bundle = await cloneTweet(article);
  } catch {
    showToast(t("captureFailed"), "error");
    close();
    return;
  }

  applyPreviewMetrics(bundle.clone, initial);
  preview.append(bundle.root);

  const sync = (): void => {
    applyPreviewMetrics(bundle.clone, collectValues(form));
  };
  form.addEventListener("input", sync);

  const runCapture = async (): Promise<Blob> => {
    applyPreviewMetrics(bundle.clone, collectValues(form));
    return capturePng(bundle.root);
  };

  copyBtn.addEventListener("click", async () => {
    copyBtn.disabled = true;
    try {
      const blob = await runCapture();
      await copyPng(blob);
      copyBtn.textContent = t("copied");
      showToast(t("copiedToast"), "success");
      window.setTimeout(() => {
        copyBtn.textContent = t("copy");
      }, 1600);
    } catch {
      showToast(t("copyFailed"), "error");
    } finally {
      copyBtn.disabled = false;
    }
  });

  downloadBtn.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    try {
      const blob = await runCapture();
      downloadPng(blob, `x-post-${statusId}.png`);
      showToast(t("downloadedToast"), "success");
    } catch {
      showToast(t("captureFailed"), "error");
    } finally {
      downloadBtn.disabled = false;
    }
  });
}
