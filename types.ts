
export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface Position {
  id: string;
  entryTime: number;
  entryPrice: number;
  quantity: number;
  usdInvested: number;
  status: PositionStatus;
  tpPrice: number;
  slPrice?: number;
  exitTime?: number;
  exitPrice?: number;
  pnlUsd?: number;
}

export interface TradingConfig {
  initialCapital: number;
  allocationRate: number; // e.g., 0.05
  dipTriggerPercent: number; // e.g., 2.0
  takeProfitPercent: number; // e.g., 2.0
  stopLossPercent: number; // e.g., 5.0
  maxDcaLevels: number;
  minNotional: number;
  symbol: string;
  enableFifoExit: boolean;
  enableDca: boolean;
  enableStopLoss: boolean;
  enableGlobalDrawdown: boolean;
  maxDrawdownPercent: number;
  pollingIntervalMs: number;
  // New dynamic DCA properties
  useDynamicDcaLevels: boolean;
  dcaLevelsEquityPercent: number; // e.g., 10% of equity = 10 max levels if equity is 100
}

export interface BotState {
  balance: number;
  positions: Position[];
  history: Position[];
  currentPrice: number;
  peakEquity: number;
  realizedPnl: number;
  isPaused: boolean;
  effectiveMaxLevels: number; // To track the calculated limit
}

export interface MarketTick {
  timestamp: number;
  price: number;
}
