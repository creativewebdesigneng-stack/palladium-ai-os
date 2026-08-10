import NeuralSpace from './NeuralSpace';

// Subtle deep-space / network background for the global app shell, auth pages
// and other surfaces. Non-interactive (no global mouse listeners) for perf.
export default function SpaceBackground({ intensity = 'subtle', interactive = false, className = 'w-full h-full block' }) {
  return <NeuralSpace mode="space" intensity={intensity} interactive={interactive} hex className={className} />;
}