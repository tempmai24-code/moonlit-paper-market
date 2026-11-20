import { describe, expect, it } from "vitest";

import {
  calculateTradeSize,
  createInitialPortfolio,
  recordPaperTrade,
} from "./model";

describe("paper-trading risk controls", () => {
  it("caps every requested position at 10% of the available equity", () => {
    expect(calculateTradeSize(75, 20)).toBe(7.5);
  });

  it("records both take-profit and stop-loss limits on every simulated trade", () => {
    const trade = recordPaperTrade(createInitialPortfolio(), "2026-11-20T21:30:00.000Z").trades[0];

    expect(trade?.takeProfitPercent).toBe(18);
    expect(trade?.stopLossPercent).toBe(8);
  });
});