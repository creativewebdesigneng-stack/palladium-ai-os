import { Bot } from 'lucide-react';
import { SectionHead, EmptyState } from './shared';

export default function AgentAssignments() {
  return (
    <div>
      <SectionHead icon={Bot} title="AI Agent Assignments" grad="from-violet-500 to-fuchsia-500" />
      <EmptyState icon={Bot} title="Not available yet" desc="Assigning AI agents to teams or members isn't wired to the backend yet. Manage agents from the Agents screen." />
    </div>
  );
}
