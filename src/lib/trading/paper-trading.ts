export type PaperOrderSide = "buy" | "sell";
export type PaperOrderType = "market" | "limit";

export type PaperOrderInput = {
  symbol: string;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  quantity: number;
  referencePrice: number;
  limitPrice?: number | null;
};

export type PaperFill = {
  symbol: string;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  quantity: number;
  fillPrice: number;
  notional: number;
  status: "filled" | "pending";
  reason: string;
};

const round = (value: number, precision = 8) => Number(value.toFixed(precision));

export function validatePaperOrder(input: PaperOrderInput) {
  const symbol = String(input.symbol ?? "").trim().toUpperCase().slice(0, 30);
  if (!symbol) throw new Error("Enter a symbol before simulating an order.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
  if (!Number.isFinite(input.referencePrice) || input.referencePrice <= 0) throw new Error("Reference price must be greater than zero.");
  if (input.orderType === "limit" && (!Number.isFinite(input.limitPrice) || Number(input.limitPrice) <= 0)) {
    throw new Error("Limit orders require a positive limit price.");
  }
  return {
    ...input,
    symbol,
    quantity: round(input.quantity),
    referencePrice: round(input.referencePrice),
    limitPrice: input.orderType === "limit" ? round(Number(input.limitPrice)) : null,
  };
}

export function simulatePaperOrder(input: PaperOrderInput): PaperFill {
  const order = validatePaperOrder(input);
  if (order.orderType === "market") {
    return {
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      fillPrice: order.referencePrice,
      notional: round(order.quantity * order.referencePrice, 2),
      status: "filled",
      reason: "Paper market order filled at the user-supplied reference price; no broker or venue was contacted.",
    };
  }

  const limit = order.limitPrice ?? order.referencePrice;
  const executable = order.side === "buy"
    ? order.referencePrice <= limit
    : order.referencePrice >= limit;
  return {
    symbol: order.symbol,
    side: order.side,
    orderType: order.orderType,
    quantity: order.quantity,
    fillPrice: executable ? order.referencePrice : limit,
    notional: round(order.quantity * (executable ? order.referencePrice : limit), 2),
    status: executable ? "filled" : "pending",
    reason: executable
      ? "Paper limit condition is satisfied by the user-supplied reference price."
      : "Paper limit condition is not satisfied; the simulated order remains pending.",
  };
}

export function paperPositionPnl(args: {
  side: PaperOrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
}) {
  if (![args.quantity, args.entryPrice, args.currentPrice].every(Number.isFinite)) return 0;
  const direction = args.side === "buy" ? 1 : -1;
  return round((args.currentPrice - args.entryPrice) * args.quantity * direction, 2);
}
