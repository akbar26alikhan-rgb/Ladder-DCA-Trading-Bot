
import { BotState, TradingConfig, Position, PositionStatus, MarketTick } from '../types';

export class TradingEngine {
  private config: TradingConfig;
  private state: BotState;

  constructor(config: TradingConfig) {
    this.config = config;
    this.state = {
      balance: config.initialCapital,
      positions: [],
      history: [],
      currentPrice: 0,
      peakEquity: config.initialCapital,
      realizedPnl: 0,
      isPaused: false,
      effectiveMaxLevels: config.maxDcaLevels,
    };
  }

  public updateConfig(newConfig: TradingConfig) {
    this.config = newConfig;
  }

  public getState(): BotState {
    return { ...this.state };
  }

  public setPaused(paused: boolean) {
    this.state.isPaused = paused;
  }

  public tick(price: number): BotState {
    if (this.state.isPaused) return this.state;
    
    this.state.currentPrice = price;
    const currentEquity = this.calculateEquity();
    
    // Update Effective Max Levels
    if (this.config.useDynamicDcaLevels) {
      this.state.effectiveMaxLevels = Math.max(1, Math.floor(currentEquity * (this.config.dcaLevelsEquityPercent / 100)));
    } else {
      this.state.effectiveMaxLevels = this.config.maxDcaLevels;
    }

    // Update Peak Equity for Drawdown calculation
    if (currentEquity > this.state.peakEquity) {
      this.state.peakEquity = currentEquity;
    }

    // Check Global Drawdown
    if (this.config.enableGlobalDrawdown) {
      const drawdown = (this.state.peakEquity - currentEquity) / this.state.peakEquity;
      if (drawdown >= this.config.maxDrawdownPercent / 100) {
        this.closeAllPositions("GLOBAL_DRAWDOWN_TRIGGERED");
        this.state.isPaused = true;
        return this.state;
      }
    }

    // Step 1: Handle Exits (FIFO)
    this.processExits(price);

    // Step 2: Handle Entries (DCA)
    this.processEntries(price);

    return this.state;
  }

  private calculateEquity(): number {
    const openValue = this.state.positions.reduce((sum, p) => sum + (p.quantity * this.state.currentPrice), 0);
    return this.state.balance + openValue;
  }

  private processExits(price: number) {
    // Sort by entry time for strict FIFO
    const openPositions = [...this.state.positions].sort((a, b) => a.entryTime - b.entryTime);
    
    const remainingPositions: Position[] = [];

    for (const pos of openPositions) {
      let shouldClose = false;

      // Check Take Profit
      if (price >= pos.tpPrice) {
        shouldClose = true;
      }

      // Check Stop Loss
      if (this.config.enableStopLoss && pos.slPrice && price <= pos.slPrice) {
        shouldClose = true;
      }

      if (shouldClose) {
        this.executeSell(pos, price);
      } else {
        remainingPositions.push(pos);
      }
    }

    this.state.positions = remainingPositions;
  }

  private processEntries(price: number) {
    if (!this.config.enableDca) return;
    
    // Use effectiveMaxLevels which is either static or dynamic
    if (this.state.positions.length >= this.state.effectiveMaxLevels) return;

    let shouldBuy = false;

    if (this.state.positions.length === 0) {
      // Initial Entry
      shouldBuy = true;
    } else {
      // Find the most recent buy
      const lastBuy = this.state.positions.reduce((latest, curr) => 
        curr.entryTime > latest.entryTime ? curr : latest
      , this.state.positions[0]);

      const dipThreshold = lastBuy.entryPrice * (1 - (this.config.dipTriggerPercent / 100));
      if (price <= dipThreshold) {
        shouldBuy = true;
      }
    }

    if (shouldBuy) {
      const orderAmount = this.state.balance * this.config.allocationRate;
      
      if (orderAmount >= this.config.minNotional && this.state.balance >= orderAmount) {
        this.executeBuy(price, orderAmount);
      }
    }
  }

  private executeBuy(price: number, amount: number) {
    const quantity = amount / price;
    const newPosition: Position = {
      id: crypto.randomUUID(),
      entryTime: Date.now(),
      entryPrice: price,
      quantity: quantity,
      usdInvested: amount,
      status: PositionStatus.OPEN,
      tpPrice: price * (1 + this.config.takeProfitPercent / 100),
      slPrice: this.config.enableStopLoss ? price * (1 - this.config.stopLossPercent / 100) : undefined,
    };

    this.state.balance -= amount;
    this.state.positions.push(newPosition);
  }

  private executeSell(pos: Position, price: number) {
    const revenue = pos.quantity * price;
    const pnl = revenue - pos.usdInvested;

    const closedPos: Position = {
      ...pos,
      status: PositionStatus.CLOSED,
      exitTime: Date.now(),
      exitPrice: price,
      pnlUsd: pnl,
    };

    this.state.balance += revenue;
    this.state.realizedPnl += pnl;
    this.state.history.unshift(closedPos); // Keep latest at top
  }

  private closeAllPositions(reason: string) {
    this.state.positions.forEach(pos => this.executeSell(pos, this.state.currentPrice));
    this.state.positions = [];
    console.log(`Closing all positions: ${reason}`);
  }
}
