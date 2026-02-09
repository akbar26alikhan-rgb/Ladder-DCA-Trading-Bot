
import { 
  BotState, TradingConfig, Position, PositionStatus, 
  ExchangeProvider, TradeLog 
} from '../types';
import { ExchangeAdapter, getExchangeAdapter } from './exchangeAdapters';

export class TradingEngine {
  private config: TradingConfig;
  private state: BotState;
  private adapter: ExchangeAdapter;

  constructor(config: TradingConfig) {
    this.config = config;
    this.adapter = getExchangeAdapter(config.exchange);
    
    // Load state from local storage or initialize
    const saved = localStorage.getItem(`bot_state_${config.symbol}`);
    if (saved) {
      this.state = JSON.parse(saved);
      // Ensure UI state like price starts fresh
      this.state.currentPrice = 0;
    } else {
      this.state = {
        balance: config.initialCapital,
        positions: [],
        history: [],
        logs: [],
        currentPrice: 0,
        peakEquity: config.initialCapital,
        realizedPnl: 0,
        isPaused: true,
        effectiveMaxLevels: config.maxDcaLevels,
        isConnected: config.exchange === ExchangeProvider.SIMULATED,
        dailyLoss: 0,
      };
    }
  }

  public async updateConfig(newConfig: TradingConfig) {
    this.config = newConfig;
    if (this.config.exchange !== this.adapter.name) {
      this.adapter = getExchangeAdapter(this.config.exchange);
    }
    
    if (this.config.exchange !== ExchangeProvider.SIMULATED) {
      this.state.isConnected = await this.adapter.authenticate(this.config.credentials);
    } else {
      this.state.isConnected = true;
    }
    this.save();
  }

  public getState(): BotState {
    return { ...this.state };
  }

  public setPaused(paused: boolean) {
    this.state.isPaused = paused;
    this.addLog('SYSTEM', 0, 0, 0, `Bot ${paused ? 'Paused' : 'Resumed'}`);
    this.save();
  }

  public async tick(price: number): Promise<BotState> {
    if (this.state.isPaused || this.config.emergencyStop) return this.state;
    
    if (this.config.isLiveMode && !this.state.isConnected) {
      this.state.isPaused = true;
      this.addLog('ERROR', 0, 0, 0, 'Live mode connection lost. Bot paused.');
      return this.state;
    }

    this.state.currentPrice = price;
    const currentEquity = this.calculateEquity();
    
    // Max Levels Calculation
    if (this.config.useDynamicDcaLevels) {
      this.state.effectiveMaxLevels = Math.max(1, Math.floor(currentEquity * (this.config.dcaLevelsEquityPercent / 100)));
    } else {
      this.state.effectiveMaxLevels = this.config.maxDcaLevels;
    }

    // Risk: Peak Equity & Global Drawdown
    if (currentEquity > this.state.peakEquity) this.state.peakEquity = currentEquity;
    if (this.config.enableGlobalDrawdown) {
      const drawdown = (this.state.peakEquity - currentEquity) / this.state.peakEquity;
      if (drawdown >= this.config.maxDrawdownPercent / 100) {
        await this.closeAllPositions("GLOBAL_DRAWDOWN_TRIGGERED");
        this.state.isPaused = true;
        return this.state;
      }
    }

    // Risk: Daily Loss
    if (this.config.maxDailyLossLimit && this.state.dailyLoss >= this.config.maxDailyLossLimit) {
      await this.closeAllPositions("DAILY_LOSS_LIMIT_REACHED");
      this.state.isPaused = true;
      return this.state;
    }

    await this.processExits(price);
    await this.processEntries(price);

    this.save();
    return this.state;
  }

  private calculateEquity(): number {
    const openValue = this.state.positions.reduce((sum, p) => sum + (p.quantity * this.state.currentPrice), 0);
    return this.state.balance + openValue;
  }

  private async processExits(price: number) {
    // FIFO Rule: Oldest positions first (sorted by entryTime)
    const openPositions = [...this.state.positions].sort((a, b) => a.entryTime - b.entryTime);
    const remainingPositions: Position[] = [];

    for (const pos of openPositions) {
      let shouldClose = false;
      if (price >= pos.tpPrice) shouldClose = true;
      if (this.config.enableStopLoss && pos.slPrice && price <= pos.slPrice) shouldClose = true;

      if (shouldClose) {
        await this.executeSell(pos, price);
      } else {
        remainingPositions.push(pos);
      }
    }
    this.state.positions = remainingPositions;
  }

  private async processEntries(price: number) {
    if (!this.config.enableDca) return;
    if (this.state.positions.length >= this.state.effectiveMaxLevels) return;

    let shouldBuy = false;
    if (this.state.positions.length === 0) {
      shouldBuy = true;
    } else {
      const lastBuy = this.state.positions.reduce((latest, curr) => 
        curr.entryTime > latest.entryTime ? curr : latest
      , this.state.positions[0]);

      const dipThreshold = lastBuy.entryPrice * (1 - (this.config.dipTriggerPercent / 100));
      if (price <= dipThreshold) shouldBuy = true;
    }

    if (shouldBuy) {
      const orderAmount = this.state.balance * this.config.allocationRate;
      const minNotional = await this.adapter.getMinNotional(this.config.symbol);
      
      if (orderAmount >= minNotional && this.state.balance >= orderAmount) {
        await this.executeBuy(price, orderAmount);
      } else if (orderAmount < minNotional) {
        this.addLog('SKIP', price, 0, orderAmount, `Order below min notional (${minNotional})`);
      }
    }
  }

  private async executeBuy(price: number, amount: number) {
    try {
      const result = await this.adapter.placeMarketBuy(this.config.symbol, amount, price);
      const newPosition: Position = {
        id: result.id,
        user_id: 'user_1',
        exchange_account_id: this.config.exchange,
        symbol: this.config.symbol,
        entryTime: Date.now(),
        entryPrice: result.price,
        quantity: result.quantity,
        usdInvested: amount,
        status: PositionStatus.OPEN,
        tpPrice: result.price * (1 + this.config.takeProfitPercent / 100),
        slPrice: this.config.enableStopLoss ? result.price * (1 - this.config.stopLossPercent / 100) : undefined,
      };
      this.state.balance -= amount;
      this.state.positions.push(newPosition);
      this.addLog('BUY', result.price, result.quantity, amount, 'DCA Buy Executed');
    } catch (e: any) {
      this.addLog('ERROR', price, 0, amount, `Buy failed: ${e.message}`);
    }
  }

  private async executeSell(pos: Position, price: number) {
    try {
      const result = await this.adapter.placeMarketSell(this.config.symbol, pos.quantity, price);
      const pnl = result.revenue - pos.usdInvested;
      const closedPos: Position = {
        ...pos,
        status: PositionStatus.CLOSED,
        exitTime: Date.now(),
        exitPrice: result.price,
        pnlUsd: pnl,
      };
      this.state.balance += result.revenue;
      this.state.realizedPnl += pnl;
      if (pnl < 0) this.state.dailyLoss += Math.abs(pnl);
      this.state.history.unshift(closedPos);
      this.addLog('SELL', result.price, pos.quantity, result.revenue, `Position Closed (PnL: $${pnl.toFixed(2)})`);
    } catch (e: any) {
      this.addLog('ERROR', price, pos.quantity, 0, `Sell failed: ${e.message}`);
    }
  }

  public async closeAllPositions(reason: string) {
    this.addLog('SYSTEM', 0, 0, 0, `Emergency Closure: ${reason}`);
    for (const pos of this.state.positions) {
      await this.executeSell(pos, this.state.currentPrice);
    }
    this.state.positions = [];
    this.save();
  }

  private addLog(action: TradeLog['action'], price: number, quantity: number, amount: number, message: string) {
    const log: TradeLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      symbol: this.config.symbol,
      action,
      price,
      quantity,
      amount,
      message
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > 200) this.state.logs.pop();
  }

  private save() {
    localStorage.setItem(`bot_state_${this.config.symbol}`, JSON.stringify(this.state));
  }
}
