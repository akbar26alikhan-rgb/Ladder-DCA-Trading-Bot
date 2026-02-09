
import { ExchangeProvider, ApiCredentials, Position } from '../types';

export interface ExchangeAdapter {
  name: ExchangeProvider;
  authenticate(creds: ApiCredentials): Promise<boolean>;
  getPrice(symbol: string): Promise<number>;
  getBalance(asset: string): Promise<number>;
  getMinNotional(symbol: string): Promise<number>;
  placeMarketBuy(symbol: string, quoteAmount: number, price: number): Promise<{quantity: number, price: number, id: string}>;
  placeMarketSell(symbol: string, quantity: number, price: number): Promise<{revenue: number, price: number, id: string}>;
}

export class SimulatedExchange implements ExchangeAdapter {
  name = ExchangeProvider.SIMULATED;
  private balances: Record<string, number> = { 'USDT': 1000 };
  
  async authenticate(creds: ApiCredentials): Promise<boolean> {
    return true; 
  }

  async getPrice(symbol: string): Promise<number> {
    return 50000; // Mock base
  }

  async getBalance(asset: string): Promise<number> {
    return this.balances[asset] || 0;
  }

  async getMinNotional(symbol: string): Promise<number> {
    return 5;
  }

  async placeMarketBuy(symbol: string, quoteAmount: number, price: number) {
    const quantity = quoteAmount / price;
    return { quantity, price, id: crypto.randomUUID() };
  }

  async placeMarketSell(symbol: string, quantity: number, price: number) {
    const revenue = quantity * price;
    return { revenue, price, id: crypto.randomUUID() };
  }
}

// In a real app, these would use fetch() with HMAC-SHA256 signatures for each exchange
export class BinanceAdapter extends SimulatedExchange { name = ExchangeProvider.BINANCE; }
export class BybitAdapter extends SimulatedExchange { name = ExchangeProvider.BYBIT; }
export class KuCoinAdapter extends SimulatedExchange { name = ExchangeProvider.KUCOIN; }
export class OKXAdapter extends SimulatedExchange { name = ExchangeProvider.OKX; }
export class CoinbaseAdapter extends SimulatedExchange { name = ExchangeProvider.COINBASE; }
export class KrakenAdapter extends SimulatedExchange { name = ExchangeProvider.KRAKEN; }

export const getExchangeAdapter = (provider: ExchangeProvider): ExchangeAdapter => {
  switch (provider) {
    case ExchangeProvider.BINANCE: return new BinanceAdapter();
    case ExchangeProvider.BYBIT: return new BybitAdapter();
    case ExchangeProvider.KUCOIN: return new KuCoinAdapter();
    case ExchangeProvider.OKX: return new OKXAdapter();
    case ExchangeProvider.COINBASE: return new CoinbaseAdapter();
    case ExchangeProvider.KRAKEN: return new KrakenAdapter();
    default: return new SimulatedExchange();
  }
};
