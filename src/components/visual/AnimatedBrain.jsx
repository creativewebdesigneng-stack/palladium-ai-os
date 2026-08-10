import NeuralSpace from './NeuralSpace';

// Animated artificial-neural-network "brain". Nodes form two lobes that breathe
// and fire pulses; pulse frequency/brightness tracks `agentStates` so the visual
// reflects real agent activity (online/working/thinking/offline…). Drop-in
// behind the AI Agents interface. Pass agentStates from real data when ready.
export default function AnimatedBrain({ agentStates, intensity = 'medium', className = 'w-full h-full block' }) {
  return <NeuralSpace mode="brain" intensity={intensity} agentStates={agentStates} interactive={false} hex={false} className={className} />;
}