import { createFileRoute } from "@tanstack/react-router";
import TradingHub from "@/screens/TradingHub";

export const Route = createFileRoute("/_app/trading-hub")({
  component: TradingHubScreen,
});

function TradingHubScreen() {
  return <TradingHub />;
}
