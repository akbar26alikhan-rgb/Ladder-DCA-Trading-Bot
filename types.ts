
export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum ExchangeProvider {
  SIMULATED = 'SIMULATED',
  BINANCE = 'BINANCE',
  BYBIT = 'BYBIT',
  KUCOIN = 'KUCOIN',
  OKX = 'OKX',
  COINBASE = 'COINBASE',
  KRAKEN = 'KRAKEN'
}

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

export interface Position {
  id: string;
  user_id: string;
  exchange_account_id: string;
  symbol: string;
  entryPrice: number;
  quantity: number;
  usdInvested: number;
  status: PositionStatus;
  tpPrice: number;
  slPrice?: number;
  entryTime: number;
  exitTime?: number;
  exitPrice?: number;
  pnlUsd?: number;
}

export interface TradeLog {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL' | 'SKIP' | 'ERROR' | 'SYSTEM';
  price: number;
  quantity: number;
  amount: number;
  message: string;
  details?: any;
}

export interface TradingConfig {
  initialCapital: number;
  allocationRate: number;
  dipTriggerPercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxDcaLevels: number;
  minNotional: number;
  symbol: string;
  enableFifoExit: boolean;
  enableDca: boolean;
  enableStopLoss: boolean;
  enableGlobalDrawdown: boolean;
  maxDrawdownPercent: number;
  pollingIntervalMs: number;
  useDynamicDcaLevels: boolean;
  dcaLevelsEquityPercent: number;
  // Exchange Settings
  exchange: ExchangeProvider;
  isLiveMode: boolean;
  credentials: ApiCredentials;
  // Safety Controls
  maxDailyLossLimit?: number;
  emergencyStop: boolean;
}

export interface BotState {
  balance: number;
  positions: Position[];
  history: Position[];
  logs: TradeLog[];
  currentPrice: number;
  peakEquity: number;
  realizedPnl: number;
  isPaused: boolean;
  effectiveMaxLevels: number;
  isConnected: boolean;
  dailyLoss: number;
}

export interface MarketTick {
  timestamp: number;
  price: number;
}
