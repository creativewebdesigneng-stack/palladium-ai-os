/** Match the registration contract at every read of persisted MCP tool scope. */
export function isExplicitExternalToolScope(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 200 &&
    value.every(name => typeof name === 'string' && name.length > 0 &&
      name.length <= 160 && name === name.trim());
}
