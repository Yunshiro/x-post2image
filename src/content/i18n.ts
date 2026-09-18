import { isZhLocale } from "./format";

const en = {
  menuItem: "Copy as screenshot",
  title: "Tweet screenshot",
  replies: "Replies",
  reposts: "Reposts",
  likes: "Likes",
  views: "Views",
  copy: "Copy image",
  copied: "Copied",
  download: "Download",
  close: "Close",
  missingTweet: "Could not find that post. Try again.",
  captureFailed: "Could not capture the image.",
  copyFailed: "Could not copy. Try download instead.",
  copiedToast: "Screenshot copied",
  downloadedToast: "Screenshot saved",
};

const zh = {
  menuItem: "复制成推文截图",
  title: "推文截图",
  replies: "评论",
  reposts: "转发",
  likes: "点赞",
  views: "曝光",
  copy: "复制图片",
  copied: "已复制",
  download: "下载",
  close: "关闭",
  missingTweet: "找不到这条帖子，请再试一次。",
  captureFailed: "截图失败。",
  copyFailed: "复制失败，请改用下载。",
  copiedToast: "已复制截图",
  downloadedToast: "已保存截图",
};

export type MessageKey = keyof typeof en;

export function t(key: MessageKey): string {
  return (isZhLocale() ? zh : en)[key];
}
