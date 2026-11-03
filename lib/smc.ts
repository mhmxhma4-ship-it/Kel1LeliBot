
export type SMCCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketStructure = "BULLISH" | "BEARISH" | "RANGE";
export type SMCEventType =
  | "BOS"
  | "CHOCH"
  | "LIQUIDITY_SWEEP_HIGH"
  | "LIQUIDITY_SWEEP_LOW";

export type SMCEvent = {
  type: SMCEventType;
  direction: "BULLISH" | "BEARISH";
  price: number;
  candleTime: number;
  description: string;
};

export type SMCZone = {
  type: "BULLISH_OB" | "BEARISH_OB" | "BULLISH_FVG" | "BEARISH_FVG";
  high: number;
  low: number;
  time: number;
  mitigated: boolean;
};

export type SMCAnalysis = {
  structure: MarketStructure;
  events: SMCEvent[];
  orderBlocks: SMCZone[];
  fairValueGaps: SMCZone[];
  swingHighs: number[];
  swingLows: number[];
};

const DEFAULT_SWING_LENGTH = 3;
const MAX_ZONES = 20;

function isValidCandle(c: SMCCandle): boolean {
  return (
    Number.isFinite(c.time) &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close) &&
    c.high >= Math.max(c.open, c.close, c.low) &&
    c.low <= Math.min(c.open, c.close, c.high)
  );
}

function isSwingHigh(
  candles: SMCCandle[],
  index: number,
  length: number
): boolean {
  const price = candles[index].high;

  for (let i = index - length; i <= index + length; i++) {
    if (i === index) continue;
    if (candles[i].high >= price) return false;
  }

  return true;
}

function isSwingLow(
  candles: SMCCandle[],
  index: number,
  length: number
): boolean {
  const price = candles[index].low;

  for (let i = index - length; i <= index + length; i++) {
    if (i === index) continue;
    if (candles[i].low <= price) return false;
  }

  return true;
}

function findSwings(candles: SMCCandle[], length: number) {
  const highs: number[] = [];
  const lows: number[] = [];

  for (
    let i = length;
    i < candles.length - length;
    i++
  ) {
    if (isSwingHigh(candles, i, length)) highs.push(i);
    if (isSwingLow(candles, i, length)) lows.push(i);
  }

  return { highs, lows };
}

function detectStructure(
  candles: SMCCandle[],
  swingHighs: number[],
  swingLows: number[]
): {
  structure: MarketStructure;
  events: SMCEvent[];
} {
  const events: SMCEvent[] = [];
  let structure: MarketStructure = "RANGE";

  const brokenHighs = new Set<number>();
  const brokenLows = new Set<number>();

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const previousHigh = [...swingHighs]
      .reverse()
      .find((index) => index < i && !brokenHighs.has(index));

    const previousLow = [...swingLows]
      .reverse()
      .find((index) => index < i && !brokenLows.has(index));

    if (
      previousHigh !== undefined &&
      candle.close > candles[previousHigh].high
    ) {
      const type = structure === "BEARISH" ? "CHOCH" : "BOS";

      events.push({
        type,
        direction: "BULLISH",
        price: candles[previousHigh].high,
        candleTime: candle.time,
        description:
          type === "CHOCH"
            ? "Bullish change of character"
            : "Bullish break of structure",
      });

      structure = "BULLISH";
      brokenHighs.add(previousHigh);
    }

    if (
      previousLow !== undefined &&
      candle.close < candles[previousLow].low
    ) {
      const type = structure === "BULLISH" ? "CHOCH" : "BOS";

      events.push({
        type,
        direction: "BEARISH",
        price: candles[previousLow].low,
        candleTime: candle.time,
        description:
          type === "CHOCH"
            ? "Bearish change of character"
            : "Bearish break of structure",
      });

      structure = "BEARISH";
      brokenLows.add(previousLow);
    }
  }

  return { structure, events };
}

function detectLiquiditySweeps(
  candles: SMCCandle[],
  swingHighs: number[],
  swingLows: number[]
): SMCEvent[] {
  const events: SMCEvent[] = [];

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    const highIndex = [...swingHighs]
      .reverse()
      .find((index) => index < i);

    const lowIndex = [...swingLows]
      .reverse()
      .find((index) => index < i);

    if (highIndex !== undefined) {
      const level = candles[highIndex].high;

      if (candle.high > level && candle.close < level) {
        events.push({
          type: "LIQUIDITY_SWEEP_HIGH",
          direction: "BEARISH",
          price: level,
          candleTime: candle.time,
          description: "Price swept liquidity above a swing high",
        });
      }
    }

    if (lowIndex !== undefined) {
      const level = candles[lowIndex].low;

      if (candle.low < level && candle.close > level) {
        events.push({
          type: "LIQUIDITY_SWEEP_LOW",
          direction: "BULLISH",
          price: level,
          candleTime: candle.time,
          description: "Price swept liquidity below a swing low",
        });
      }
    }
  }

  return events;
}

function detectFVG(candles: SMCCandle[]): SMCZone[] {
  const zones: SMCZone[] = [];

  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const middle = candles[i - 1];
    const third = candles[i];

    if (first.high < third.low) {
      zones.push({
        type: "BULLISH_FVG",
        low: first.high,
        high: third.low,
        time: middle.time,
        mitigated: false,
      });
    }

    if (first.low > third.high) {
      zones.push({
        type: "BEARISH_FVG",
        low: third.high,
        high: first.low,
        time: middle.time,
        mitigated: false,
      });
    }
  }

  return zones.slice(-MAX_ZONES);
}

function detectOrderBlocks(
  candles: SMCCandle[],
  events: SMCEvent[]
): SMCZone[] {
  const zones: SMCZone[] = [];

  for (const event of events) {
    if (event.type !== "BOS" && event.type !== "CHOCH") continue;

    const eventIndex = candles.findIndex(
      (c) => c.time === event.candleTime
    );

    if (eventIndex <= 0) continue;

    const bullish = event.direction === "BULLISH";

    for (let i = eventIndex - 1; i >= Math.max(0, eventIndex - 10); i--) {
      const candle = candles[i];

      const oppositeCandle = bullish
        ? candle.close < candle.open
        : candle.close > candle.open;

      if (!oppositeCandle) continue;

      zones.push({
        type: bullish ? "BULLISH_OB" : "BEARISH_OB",
        high: candle.high,
        low: candle.low,
        time: candle.time,
        mitigated: false,
      });

      break;
    }
  }

  return zones.slice(-MAX_ZONES);
}

function markMitigatedZones(
  zones: SMCZone[],
  candles: SMCCandle[]
): SMCZone[] {
  return zones.map((zone) => {
    const laterCandles = candles.filter((c) => c.time > zone.time);

    const mitigated = laterCandles.some(
      (c) => c.low <= zone.high && c.high >= zone.low
    );

    return { ...zone, mitigated };
  });
}

export function analyzeSMC(
  input: SMCCandle[],
  swingLength = DEFAULT_SWING_LENGTH
): SMCAnalysis {
  if (
    !Array.isArray(input) ||
    input.length < swingLength * 2 + 5 ||
    !Number.isInteger(swingLength) ||
    swingLength < 1
  ) {
    return {
      structure: "RANGE",
      events: [],
      orderBlocks: [],
      fairValueGaps: [],
      swingHighs: [],
      swingLows: [],
    };
  }

  const candles = [...input].sort((a, b) => a.time - b.time);

  if (!candles.every(isValidCandle)) {
    throw new Error("SMC: Invalid candle data");
  }

  const swings = findSwings(candles, swingLength);

  const structureResult = detectStructure(
    candles,
    swings.highs,
    swings.lows
  );

  const sweepEvents = detectLiquiditySweeps(
    candles,
    swings.highs,
    swings.lows
  );

  const events = [
    ...structureResult.events,
    ...sweepEvents,
  ].sort((a, b) => a.candleTime - b.candleTime);

  const rawFVGs = detectFVG(candles);
  const rawOrderBlocks = detectOrderBlocks(
    candles,
    structureResult.events
  );

  return {
    structure: structureResult.structure,
    events: events.slice(-50),
    orderBlocks: markMitigatedZones(rawOrderBlocks, candles),
    fairValueGaps: markMitigatedZones(rawFVGs, candles),
    swingHighs: swings.highs.map((i) => candles[i].high),
    swingLows: swings.lows.map((i) => candles[i].low),
  };
}
