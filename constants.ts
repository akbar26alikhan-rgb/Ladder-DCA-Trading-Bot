
import { TradingConfig, ExchangeProvider } from './types';

export const DEFAULT_CONFIG: TradingConfig = {
  initialCapital: 100,
  allocationRate: 0.05,
  dipTriggerPercent: 2.0,
  takeProfitPercent: 2.0,
  stopLossPercent: 10.0,
  maxDcaLevels: 20,
  minNotional: 5,
  symbol: 'BTCUSDT',
  enableFifoExit: true,
  enableDca: true,
  enableStopLoss: true,
  enableGlobalDrawdown: true,
  maxDrawdownPercent: 20,
  pollingIntervalMs: 1000,
  useDynamicDcaLevels: false,
  dcaLevelsEquityPercent: 20,
  // Exchange Defaults
  exchange: ExchangeProvider.SIMULATED,
  isLiveMode: false,
  credentials: {
    apiKey: '',
    apiSecret: '',
  },
  // Added missing required property
  emergencyStop: false
};

export const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 
  'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'UNIUSDT', 
  'LTCUSDT', 'BCHUSDT', 'NEARUSDT', 'ATOMUSDT', 'ETCUSDT', 'ALGOUSDT',
  'FETUSDT', 'RENDERUSDT', 'TAOUSDT', 'INJUSDT', 'PEPEUSDT', 'WIFUSDT'
];