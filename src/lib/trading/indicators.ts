export type TradingCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

export type EnrichedTradingCandle = TradingCandle & {
  sma20: number | null;
  ema20: number | null;
  rsi14: number | null;
  atr14: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
};

const finite = (value: number) => Number.isFinite(value);

export function simpleMovingAverage(values: number[], period: number): Array<number | null> {
  const size = Math.max(1, Math.floor(period));
  const output: Array<number | null> = Array(values.length).fill(null);
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index] ?? 0;
    if (index >= size) sum -= values[index - size] ?? 0;
    if (index >= size - 1) output[index] = sum / size;
  }
  return output;
}

export function exponentialMovingAverage(values: number[], period: number): Array<number | null> {
  const size = Math.max(1, Math.floor(period));
  const output: Array<number | null> = Array(values.length).fill(null);
  if (values.length < size) return output;
  const seed = values.slice(0, size).reduce((sum, value) => sum + value, 0) / size;
  output[size - 1] = seed;
  const multiplier = 2 / (size + 1);
  for (let index = size; index < values.length; index += 1) {
    const previous = output[index - 1] ?? seed;
    output[index] = ((values[index] ?? previous) - previous) * multiplier + previous;
  }
  return output;
}

export function relativeStrengthIndex(values: number[], period = 14): Array<number | null> {
  const size = Math.max(1, Math.floor(period));
  const output: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= size) return output;
  let gain = 0;
  let loss = 0;
  for (let index = 1; index <= size; index += 1) {
    const change = (values[index] ?? 0) - (values[index - 1] ?? 0);
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  let averageGain = gain / size;
  let averageLoss = loss / size;
  const valueFrom = () => averageLoss === 0 ? 100 : 100 - (100 / (1 + (averageGain / averageLoss)));
  output[size] = valueFrom();
  for (let index = size + 1; index < values.length; index += 1) {
    const change = (values[index] ?? 0) - (values[index - 1] ?? 0);
    averageGain = ((averageGain * (size - 1)) + Math.max(change, 0)) / size;
    averageLoss = ((averageLoss * (size - 1)) + Math.max(-change, 0)) / size;
    output[index] = valueFrom();
  }
  return output;
}

export function averageTrueRange(candles: TradingCandle[], period = 14): Array<number | null> {
  const size = Math.max(1, Math.floor(period));
  const output: Array<number | null> = Array(candles.length).fill(null);
  if (candles.length < size) return output;
  const ranges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previousClose = candles[index - 1]?.close ?? candle.close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  let atr = ranges.slice(0, size).reduce((sum, value) => sum + value, 0) / size;
  output[size - 1] = atr;
  for (let index = size; index < ranges.length; index += 1) {
    atr = ((atr * (size - 1)) + (ranges[index] ?? 0)) / size;
    output[index] = atr;
  }
  return output;
}

export function bollingerBands(values: number[], period = 20, deviations = 2) {
  const middle = simpleMovingAverage(values, period);
  const upper: Array<number | null> = Array(values.length).fill(null);
  const lower: Array<number | null> = Array(values.length).fill(null);
  const size = Math.max(1, Math.floor(period));
  for (let index = size - 1; index < values.length; index += 1) {
    const window = values.slice(index - size + 1, index + 1);
    const mean = middle[index] ?? 0;
    const variance = window.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / size;
    const sigma = Math.sqrt(variance) * deviations;
    upper[index] = mean + sigma;
    lower[index] = mean - sigma;
  }
  return { middle, upper, lower };
}

export function enrichTradingCandles(candles: TradingCandle[]): EnrichedTradingCandle[] {
  const clean = candles.filter((candle) =>
    finite(candle.open) && finite(candle.high) && finite(candle.low) && finite(candle.close),
  );
  const closes = clean.map((candle) => candle.close);
  const sma20 = simpleMovingAverage(closes, 20);
  const ema20 = exponentialMovingAverage(closes, 20);
  const rsi14 = relativeStrengthIndex(closes, 14);
  const atr14 = averageTrueRange(clean, 14);
  const bands = bollingerBands(closes, 20, 2);
  return clean.map((candle, index) => ({
    ...candle,
    sma20: sma20[index] ?? null,
    ema20: ema20[index] ?? null,
    rsi14: rsi14[index] ?? null,
    atr14: atr14[index] ?? null,
    bollingerUpper: bands.upper[index] ?? null,
    bollingerLower: bands.lower[index] ?? null,
  }));
}
