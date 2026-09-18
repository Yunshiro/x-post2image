import { openEditor } from "./editor";
import { installShareMenu } from "./share-menu";
import { t } from "./i18n";
import { showToast } from "./toast";

installShareMenu({
  onCapture: (article) => {
    void openEditor(article).catch(() => {
      showToast(t("captureFailed"), "error");
    });
  },
});
