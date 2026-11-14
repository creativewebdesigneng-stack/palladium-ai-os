export const TRADING_BROKER_AUTHORISATION_ENV = "TRADING_BROKER_EXECUTION_AUTHORIZED";

export type BrokerExecutionDecision = {
  mode: "paper";
  liveExecution: false;
  authorised: boolean;
  reason: string;
};

/**
 * Paper trading is the only execution mode this runtime will return.
 * An explicit authorisation flag records operator intent. It does not select a
 * broker, and it never places, amends, or cancels a live order.
 */
export function brokerExecutionDecision(
  env: Record<string, string | undefined> = {},
): BrokerExecutionDecision {
  const authorised = env[TRADING_BROKER_AUTHORISATION_ENV] === "true";
  return {
    mode: "paper",
    liveExecution: false,
    authorised,
    reason: authorised
      ? "Broker authorisation is recorded, but no broker adapter is connected. No live order was sent."
      : "Live broker execution stays off until TRADING_BROKER_EXECUTION_AUTHORIZED is explicitly true. Paper simulation remains the default.",
  };
}
