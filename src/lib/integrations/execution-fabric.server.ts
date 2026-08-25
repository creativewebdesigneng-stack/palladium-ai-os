import { capabilityProfile, type CapabilityFamily, type ExecutionLane } from "./capability-catalog";

export type ExecutionLaneAvailability = {
  directApi?: boolean;
  connectorTransport?: boolean;
  browser?: boolean;
  desktopWorker?: boolean;
};

export type ExecutionRoute = {
  provider: string;
  family: CapabilityFamily | null;
  lanes: ExecutionLane[];
  primary: ExecutionLane | null;
};

const AVAILABLE: Record<ExecutionLane, keyof ExecutionLaneAvailability> = {
  direct_api: "directApi",
  connector_transport: "connectorTransport",
  browser: "browser",
  desktop_worker: "desktopWorker",
};

/**
 * Choose execution by capability and live availability, not by connector vendor.
 * The returned list is ordered so callers can fail over without changing the task.
 */
export function resolveExecutionRoute(input: {
  provider: string;
  family?: CapabilityFamily;
  availability: ExecutionLaneAvailability;
}): ExecutionRoute {
  const provider = input.provider.trim().toLowerCase().replace(/^nango_/, "");
  const profile = capabilityProfile(provider);
  const preferred: ExecutionLane[] = profile?.preferredLanes ?? [
    "direct_api",
    "connector_transport",
    "browser",
    "desktop_worker",
  ];
  const lanes = preferred.filter((lane) => Boolean(input.availability[AVAILABLE[lane]]));
  return {
    provider,
    family: input.family ?? profile?.families[0] ?? null,
    lanes,
    primary: lanes[0] ?? null,
  };
}

export function canExecuteThrough(
  route: ExecutionRoute,
  lane: ExecutionLane,
): boolean {
  return route.lanes.includes(lane);
}
