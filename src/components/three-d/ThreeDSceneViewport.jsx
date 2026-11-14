import { useEffect, useRef, useState } from 'react';
import { Box, TriangleAlert } from 'lucide-react';

function disposeObject(object) {
  object?.traverse?.((child) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material?.dispose?.();
  });
}

function clearGroup(group) {
  if (!group) return;
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function primitiveGeometry(THREE, kind) {
  if (kind === 'sphere') return new THREE.SphereGeometry(0.5, 32, 20);
  if (kind === 'cylinder') return new THREE.CylinderGeometry(0.4, 0.4, 1, 28);
  if (kind === 'cone') return new THREE.ConeGeometry(0.45, 1, 28);
  if (kind === 'torus') return new THREE.TorusGeometry(0.45, 0.15, 16, 32);
  if (kind === 'plane') return new THREE.PlaneGeometry(1, 1);
  return new THREE.BoxGeometry(1, 1, 1);
}

function fitModel(THREE, model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.position.sub(center);
  model.scale.multiplyScalar(1 / maxDim);
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  model.position.y -= fitted.min.y;
}

function objectIdFrom(object) {
  let current = object;
  while (current) {
    if (current.userData?.sceneObjectId) return current.userData.sceneObjectId;
    current = current.parent;
  }
  return null;
}

export default function ThreeDSceneViewport({ objects = [], selectedId, onSelect, resetSignal = 0, thumbnailRef }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [viewportError, setViewportError] = useState('');
  const [missingIds, setMissingIds] = useState([]);
  const objectsKey = JSON.stringify(objects.map(({ name: _name, ...object }) => object));
  const selected = objects.find((object) => object.id === selectedId);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let renderer = null;
    let scene = null;
    let controls = null;
    let resizeObserver = null;
    const content = { current: null };

    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;
        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 500);
        camera.position.set(4.2, 3.1, 5.4);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        const mobile = window.matchMedia('(max-width: 767px)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.4, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 2.2));
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(4, 7, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x8b5cf6, 1.6);
        rim.position.set(-4, 2, -3);
        scene.add(rim);
        const grid = new THREE.GridHelper(12, 24, 0x4c1d95, 0x27272a);
        scene.add(grid);
        const group = new THREE.Group();
        scene.add(group);
        content.current = group;
        const pointer = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();
        let down = null;
        const onPointerDown = (event) => { down = { x: event.clientX, y: event.clientY }; };
        const onPointerUp = (event) => {
          if (!down || !content.current) return;
          const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
          down = null;
          if (moved > 4) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(content.current.children, true)[0];
          onSelect?.(hit ? objectIdFrom(hit.object) : null);
        };
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        const resize = () => {
          if (disposed || !renderer) return;
          const width = Math.max(mount.clientWidth, 1);
          const height = Math.max(mount.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(mount);
        }
        resize();
        const animate = () => {
          if (disposed || !renderer || !scene || !controls) return;
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };
        animate();
        engineRef.current = { THREE, group, camera, controls, renderer, onPointerDown, onPointerUp };
        if (thumbnailRef) thumbnailRef.current = () => renderer.domElement.toDataURL('image/jpeg', 0.62);
        if (!disposed) setEngineReady(true);
      } catch {
        if (!disposed) setViewportError('The 3D viewport could not start in this browser.');
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      const engine = engineRef.current;
      if (renderer && engine) {
        renderer.domElement.removeEventListener('pointerdown', engine.onPointerDown);
        renderer.domElement.removeEventListener('pointerup', engine.onPointerUp);
      }
      controls?.dispose?.();
      clearGroup(content.current);
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss?.();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      }
      engineRef.current = null;
      if (thumbnailRef) thumbnailRef.current = null;
      setEngineReady(false);
    };
  }, [onSelect, thumbnailRef]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engineReady || !engine) return;
    let cancelled = false;
    const { THREE, group } = engine;
    clearGroup(group);
    setMissingIds([]);
    const parsed = JSON.parse(objectsKey);
    let loaderPromise = null;

    for (const object of parsed) {
      const wrapper = new THREE.Group();
      wrapper.userData.sceneObjectId = object.id;
      wrapper.position.set(object.position[0], object.position[1], object.position[2]);
      wrapper.rotation.set(
        THREE.MathUtils.degToRad(object.rotation[0]),
        THREE.MathUtils.degToRad(object.rotation[1]),
        THREE.MathUtils.degToRad(object.rotation[2]),
      );
      wrapper.scale.set(object.scale[0], object.scale[1], object.scale[2]);
      wrapper.visible = object.visible !== false;
      const selectedObject = object.id === selectedId;
      if (object.kind === 'model' && object.sourceUrl) {
        const marker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35, 0),
          new THREE.MeshStandardMaterial({ color: '#fbbf24', wireframe: true }),
        );
        marker.position.y = 0.45;
        marker.userData.missingMarker = true;
        wrapper.add(marker);
        if (!loaderPromise) loaderPromise = import('three/examples/jsm/loaders/GLTFLoader.js');
        loaderPromise.then(({ GLTFLoader }) => {
          if (cancelled) return;
          const loader = new GLTFLoader();
          loader.load(object.sourceUrl, (gltf) => {
            if (cancelled) {
              disposeObject(gltf.scene);
              return;
            }
            fitModel(THREE, gltf.scene);
            wrapper.add(gltf.scene);
            const placeholder = wrapper.children.find((child) => child.userData?.missingMarker);
            if (placeholder) {
              wrapper.remove(placeholder);
              disposeObject(placeholder);
            }
            wrapper.updateMatrixWorld(true);
            wrapper.userData.selectionHelper?.update?.();
          }, undefined, () => {
            if (!cancelled) setMissingIds((current) => current.includes(object.id) ? current : [...current, object.id]);
          });
        }).catch(() => {
          if (!cancelled) setMissingIds((current) => current.includes(object.id) ? current : [...current, object.id]);
        });
      } else {
        const mesh = new THREE.Mesh(
          primitiveGeometry(THREE, object.kind),
          new THREE.MeshStandardMaterial({
            color: object.color || '#8b5cf6',
            roughness: Number.isFinite(object.roughness) ? object.roughness : 0.45,
            metalness: Number.isFinite(object.metalness) ? object.metalness : 0.08,
            emissive: selectedObject ? object.color || '#8b5cf6' : '#000000',
            emissiveIntensity: selectedObject ? 0.28 : 0,
            side: object.kind === 'plane' ? THREE.DoubleSide : THREE.FrontSide,
          }),
        );
        wrapper.add(mesh);
      }
      group.add(wrapper);
      wrapper.updateMatrixWorld(true);
      if (selectedObject) {
        const helper = new THREE.BoxHelper(wrapper, 0xc4b5fd);
        helper.userData.sceneObjectId = object.id;
        wrapper.userData.selectionHelper = helper;
        group.add(helper);
      }
    }

    return () => {
      cancelled = true;
      clearGroup(group);
    };
  }, [engineReady, objectsKey, selectedId]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engineReady || !engine || !resetSignal) return;
    engine.camera.position.set(4.2, 3.1, 5.4);
    engine.controls.target.set(0, 0.4, 0);
    engine.controls.update();
  }, [engineReady, resetSignal]);

  const selectedMissing = selected && missingIds.includes(selected.id);

  return <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#080910]">
    <div ref={mountRef} className="h-[420px] w-full touch-none" role="img" aria-label="3D scene viewport" />
    {viewportError && <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center text-xs text-amber-200"><span className="flex items-center gap-2"><TriangleAlert className="h-4 w-4" />{viewportError}</span></div>}
    {selectedMissing && <div className="pointer-events-none absolute left-3 right-3 top-3 rounded-lg border border-amber-400/20 bg-black/70 px-3 py-2 text-[11px] text-amber-200">This saved model did not load. The scene still points at the original file. No replacement mesh was created.</div>}
    <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-zinc-400"><Box className="h-3 w-3" />Drag to orbit · scroll to zoom · click an object to edit it</div>
  </div>;
}
