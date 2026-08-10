import NeuralSpace from './NeuralSpace';

// Network-emphasis background (more nodes + faint hexagons). Used behind pages
// that should feel like an active AI network — Workforce, Pricing, etc.
export default function NeuralNetworkBackground({ intensity = 'low', interactive = false, className = 'w-full h-full block' }) {
  return <NeuralSpace mode="space" intensity={intensity} interactive={interactive} hex className={className} />;
}