const SAFE_ACTION_PATTERN = /^[a-z][a-z0-9_.-]{0,79}$/;

export interface NativeMobileAction {
  action: string;
  arguments: Record<string, unknown>;
}

export function validateNativeMobileAction(action: NativeMobileAction): NativeMobileAction {
  if (!SAFE_ACTION_PATTERN.test(action.action)) throw new Error('Invalid mobile action identifier');
  const serialized = JSON.stringify(action.arguments);
  if (serialized.length > 16_384) throw new Error('Mobile action arguments exceed 16 KiB');
  return action;
}
