import { useEffect, useRef, useState } from 'react';
import { Box, Loader2, TriangleAlert } from 'lucide-react';

export default function GameFoundryModelViewer({ url, label = '3D asset' }) {
  const mountRef = useRef(null);
  const [state,setState] = useState('loading');

  useEffect(() => {
    if (!url || !mountRef.current) return;
    let disposed = false;
    let renderer;
    let frame = 0;
    let resizeObserver;
    const mount = mountRef.current;

    (async () => {
      try {
        const THREE = await import('three');
        const [{ GLTFLoader }, { OrbitControls }] = await Promise.all([
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);
        if (disposed) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
        camera.position.set(2.8, 2.1, 3.4);

        renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        mount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 3);
        key.position.set(4,6,4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x8b5cf6, 2);
        rim.position.set(-4,2,-3);
        scene.add(rim);

        const grid = new THREE.GridHelper(10,20,0x4c1d95,0x27272a);
        grid.position.y = -0.01;
        scene.add(grid);

        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          scene.add(model);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x,size.y,size.z) || 1;
          model.position.sub(center);
          model.position.y += size.y / 2;
          const distance = maxDim * 1.9;
          camera.position.set(distance * .9, distance * .65, distance);
          camera.near = Math.max(maxDim / 1000, 0.001);
          camera.far = Math.max(maxDim * 100, 100);
          camera.updateProjectionMatrix();
          controls.target.set(0,size.y * .35,0);
          controls.update();
          setState('ready');
        }, undefined, () => {
          if (!disposed) setState('error');
        });

        const resize = () => {
          const width = Math.max(mount.clientWidth,1);
          const height = Math.max(mount.clientHeight,1);
          renderer.setSize(width,height,false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();

        const animate = () => {
          if (disposed) return;
          controls.update();
          renderer.render(scene,camera);
          frame = requestAnimationFrame(animate);
        };
        animate();
      } catch {
        if (!disposed) setState('error');
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement?.parentNode === mount) mount.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  if (!url) return null;
  return <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#080910]">
    <div ref={mountRef} className="h-64 w-full" aria-label={label} />
    {state==='loading'&&<div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30"><span className="flex items-center gap-2 text-xs text-zinc-300"><Loader2 className="h-4 w-4 animate-spin"/>Loading 3D preview…</span></div>}
    {state==='error'&&<div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55"><span className="flex items-center gap-2 text-xs text-amber-300"><TriangleAlert className="h-4 w-4"/>Interactive preview unavailable for this asset.</span></div>}
    <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-zinc-400"><Box className="h-3 w-3"/>Drag to orbit · scroll to zoom</div>
  </div>;
}
