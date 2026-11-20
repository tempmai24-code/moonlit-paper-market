export const PAPER_STORAGE_KEY = "grok-bot-paper-session-v1";
export const INITIAL_EQUITY = 75;
export const MAX_TRADE_PERCENT = 10;
export const DEFAULT_TRADE_PERCENT = 3.5;
export const DEFAULT_TAKE_PROFIT_PERCENT = 18;
export const DEFAULT_STOP_LOSS_PERCENT = 8;

export const agents = [
  { id: "feed", name: "FEED", purpose: "New pair detection", detail: "Streams every new pair", signal: "Watching new pairs", tone: "feed" },
  { id: "rank", name: "RANK", purpose: "Momentum ranking", detail: "Ranks what is hot right now", signal: "$TOOTS · hot #4 · 1h", tone: "rank" },
  { id: "surge", name: "SURGE", purpose: "Volume spikes", detail: "Flags volume spikes in 5 minutes", signal: "$BRRRT · volume x7 / 5m", tone: "surge" },
  { id: "alpha", name: "ALPHA", purpose: "Trader discovery", detail: "Finds top traders already in", signal: "4 top traders in $TOOTS", tone: "alpha" },
  { id: "copy", name: "COPY", purpose: "Copy sizing", detail: "Mirrors size with TP / SL", signal: "Mirror size · $TOOTS", tone: "copy" },
  { id: "hold", name: "HOLD", purpose: "Holder concentration", detail: "Checks the top-10 holder share", signal: "Top-10 holders · 16%", tone: "hold" },
  { id: "whale", name: "WHALE", purpose: "Large wallet moves", detail: "Watches whale buys and sells", signal: "Whale flow · +$28k", tone: "whale" },
  { id: "dev", name: "DEV", purpose: "Developer wallet", detail: "Checks the dev wallet · never sold", signal: "Dev wallet · sold 0", tone: "dev" },
] as const;

export type AgentId = (typeof agents)[number]["id"];
export type AgentTone = (typeof agents)[number]["tone"];

export const marketPulse = [
  { symbol: "$SNAZZ", change: "+35%", tone: "copy" },
  { symbol: "$TOOTS", change: "+145%", tone: "rank" },
  { symbol: "$BRRRT", change: "+33%", tone: "feed" },
  { symbol: "$ZONKS", change: "+21%", tone: "surge" },
] as const;

export interface PaperTrade {
  id: string;
  symbol: string;
  size: number;
  pnl: number;
  changePercent: number;
  createdAt: string;
  takeProfitPercent: number;
  stopLossPercent: number;
  exitReason: "TAKE PROFIT" | "STOP LOSS" | "SIGNAL EXIT";
}

export interface PaperPortfolio {
  initialEquity: number;
  equity: number;
  totalPnl: number;
  tradePercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  wins: number;
  losses: number;
  trades: PaperTrade[];
  equityHistory: number[];
}

export function createInitialPortfolio(): PaperPortfolio {
  return {
    initialEquity: INITIAL_EQUITY,
    equity: INITIAL_EQUITY,
    totalPnl: 0,
    tradePercent: DEFAULT_TRADE_PERCENT,
    takeProfitPercent: DEFAULT_TAKE_PROFIT_PERCENT,
    stopLossPercent: DEFAULT_STOP_LOSS_PERCENT,
    wins: 0,
    losses: 0,
    trades: [],
    equityHistory: [INITIAL_EQUITY],
  };
}

export function calculateTradeSize(balance: number, requestedPercent: number): number {
  const safeBalance = Number.isFinite(balance) ? Math.max(0, balance) : 0;
  const safePercent = Number.isFinite(requestedPercent)
    ? Math.min(MAX_TRADE_PERCENT, Math.max(0, requestedPercent))
    : 0;
  return Math.round(((safeBalance * safePercent) / 100) * 100) / 100;
}

export function recordPaperTrade(
  portfolio: PaperPortfolio,
  createdAt = new Date().toISOString(),
): PaperPortfolio {
  const sequence = portfolio.trades.length;
  const scenarios = [4.6, -3.7, 9.2, -12.4, 5.1, 22.1];
  const symbols = ["$TOOTS", "$SNAZZ", "$BRRRT", "$ZONKS"];
  const requestedMove = scenarios[sequence % scenarios.length] ?? 0;
  const takeProfitPercent = Math.max(0.1, portfolio.takeProfitPercent);
  const stopLossPercent = Math.max(0.1, portfolio.stopLossPercent);
  const changePercent = Math.min(takeProfitPercent, Math.max(-stopLossPercent, requestedMove));
  const size = calculateTradeSize(portfolio.equity, portfolio.tradePercent);
  const pnl = Math.round(size * (changePercent / 100) * 100) / 100;
  const equity = Math.round((portfolio.equity + pnl) * 100) / 100;
  const trade: PaperTrade = {
    id: `${Date.now()}-${sequence}`,
    symbol: symbols[sequence % symbols.length] ?? "$TOOTS",
    size,
    pnl,
    changePercent,
    createdAt,
    takeProfitPercent,
    stopLossPercent,
    exitReason:
      requestedMove >= takeProfitPercent
        ? "TAKE PROFIT"
        : requestedMove <= -stopLossPercent
          ? "STOP LOSS"
          : "SIGNAL EXIT",
  };

  return {
    ...portfolio,
    equity,
    totalPnl: Math.round((equity - portfolio.initialEquity) * 100) / 100,
    wins: portfolio.wins + (pnl >= 0 ? 1 : 0),
    losses: portfolio.losses + (pnl < 0 ? 1 : 0),
    trades: [trade, ...portfolio.trades].slice(0, 20),
    equityHistory: [...portfolio.equityHistory, equity].slice(-24),
  };
}

export function isPaperPortfolio(value: unknown): value is PaperPortfolio {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.initialEquity === "number" &&
    typeof candidate.equity === "number" &&
    typeof candidate.totalPnl === "number" &&
    typeof candidate.tradePercent === "number" &&
    typeof candidate.takeProfitPercent === "number" &&
    typeof candidate.stopLossPercent === "number" &&
    typeof candidate.wins === "number" &&
    typeof candidate.losses === "number" &&
    Array.isArray(candidate.trades) &&
    Array.isArray(candidate.equityHistory)
  );
}