/** Updating agent details must not reset saved approval/domain policy. */
export function personalAgentPermissionWrites(args: {
  tools: string[]; previous: Array<Record<string, any>>; domains?: string[] | undefined; budget?: number | null | undefined;
}) {
  return args.tools.flatMap(tool => {
    const existing = args.previous.find(row => row['tool'] === tool);
    const domainTool = ['browser', 'browser_task', 'shopping_search', 'checkout'].includes(tool);
    if (existing && (!domainTool || args.domains === undefined)) return [];
    const domains = args.domains ?? [];
    if (['browser', 'browser_task'].includes(tool) && !domains.length) {
      throw new Error('Set explicit allowed browser domains before assigning browser tools.');
    }
    return [{ tool, enabled: existing?.['enabled'] ?? true,
      requires_approval: existing?.['requires_approval'] ?? ['checkout', 'booking', 'email_draft'].includes(tool),
      allowed_domains: domainTool ? domains : [],
      spend_cap: existing?.['spend_cap'] ?? (tool === 'checkout' ? args.budget ?? null : null) }];
  });
}
