import { describe, expect, it } from "vitest";
import { formatCompact, formatFull, parseCount } from "./format";

describe("formatCompact", () => {
  it("hides zero and negatives", () => {
    expect(formatCompact(0, "en")).toBe("");
    expect(formatCompact(-3, "en")).toBe("");
  });

  it("keeps small English counts exact", () => {
    expect(formatCompact(999, "en")).toBe("999");
  });

  it("compacts English thousands and millions", () => {
    expect(formatCompact(1000, "en")).toBe("1K");
    expect(formatCompact(1200, "en")).toBe("1.2K");
    expect(formatCompact(12_300, "en")).toBe("12K");
    expect(formatCompact(1_250_000, "en")).toBe("1.3M");
  });

  it("uses 万 / 亿 for Chinese", () => {
    expect(formatCompact(9999, "zh-CN")).toBe("9999");
    expect(formatCompact(12_000, "zh-CN")).toBe("1.2万");
    expect(formatCompact(120_000_000, "zh-CN")).toBe("1.2亿");
  });
});

describe("formatFull", () => {
  it("groups thousands", () => {
    expect(formatFull(1234, "en-US")).toBe("1,234");
  });
});

describe("parseCount", () => {
  it("parses empty as zero", () => {
    expect(parseCount("")).toBe(0);
    expect(parseCount("  ")).toBe(0);
  });

  it("parses compact and grouped input", () => {
    expect(parseCount("1.2K")).toBe(1200);
    expect(parseCount("48.3K views")).toBe(48_300);
    expect(parseCount("1,234")).toBe(1234);
    expect(parseCount("4.8万")).toBe(48_000);
  });

  it("returns null for non-numeric text", () => {
    expect(parseCount("Reply")).toBeNull();
  });
});
