import type { ChatMessage } from './model-gateway.server'

/**
 * Keeps the trusted system context built for the current agent plus the current
 * objective, while dropping legacy prior-task user/assistant replay. Relevant
 * durable memory remains inside the system context; unverified historical task
 * outputs cannot silently become execution or planning evidence.
 */
export function isolateGeneralIntelligenceCurrentTaskContext(args: {
  messages: ChatMessage[]
  input: string
}): ChatMessage[] {
  const system = args.messages.find((message) => message.role === 'system')
  return [
    system ?? { role: 'system', content: '' },
    { role: 'user', content: args.input },
  ]
}
