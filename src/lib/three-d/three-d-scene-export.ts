import type { SceneDocument } from "./three-d-scene";

function ensureFileReader() {
  if (typeof globalThis.FileReader !== "undefined") return;
  class FileReaderPolyfill {
    result: ArrayBuffer | string | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      });
    }
  }
  globalThis.FileReader = FileReaderPolyfill as unknown as typeof FileReader;
}

type GeometryFactory = {
  SphereGeometry: new (radius: number, width: number, height: number) => object;
  CylinderGeometry: new (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
  ) => object;
  ConeGeometry: new (radius: number, height: number, segments: number) => object;
  TorusGeometry: new (radius: number, tube: number, radial: number, tubular: number) => object;
  PlaneGeometry: new (width: number, height: number) => object;
  BoxGeometry: new (width: number, height: number, depth: number) => object;
};

function primitiveGeometry(THREE: GeometryFactory, kind: string) {
  if (kind === "sphere") return new THREE.SphereGeometry(0.5, 32, 20);
  if (kind === "cylinder") return new THREE.CylinderGeometry(0.4, 0.4, 1, 28);
  if (kind === "cone") return new THREE.ConeGeometry(0.45, 1, 28);
  if (kind === "torus") return new THREE.TorusGeometry(0.45, 0.15, 16, 32);
  if (kind === "plane") return new THREE.PlaneGeometry(1, 1);
  return new THREE.BoxGeometry(1, 1, 1);
}

/** Builds a binary GLB from the saved scene. Missing remote models are skipped and named in `omitted`. */
export async function exportSceneGlb(document: SceneDocument) {
  ensureFileReader();
  // three is consumed as a runtime module; this project does not ship its type package.
  const THREE = await import("three" as string);
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js" as string);
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js" as string);
  const scene = new THREE.Scene();
  const omitted: string[] = [];
  const loader = new GLTFLoader();
  for (const object of document.objects) {
    if (object.visible === false) continue;
    const wrapper = new THREE.Group();
    wrapper.name = object.name;
    wrapper.position.set(object.position[0], object.position[1], object.position[2]);
    wrapper.rotation.set(
      THREE.MathUtils.degToRad(object.rotation[0]),
      THREE.MathUtils.degToRad(object.rotation[1]),
      THREE.MathUtils.degToRad(object.rotation[2]),
    );
    wrapper.scale.set(object.scale[0], object.scale[1], object.scale[2]);
    if (object.kind === "model" && object.sourceUrl) {
      try {
        const gltf = await loader.loadAsync(object.sourceUrl);
        wrapper.add(gltf.scene);
      } catch {
        omitted.push(object.name);
        continue;
      }
    } else if (object.kind === "model") {
      omitted.push(object.name);
      continue;
    } else {
      wrapper.add(
        new THREE.Mesh(
          primitiveGeometry(THREE, object.kind),
          new THREE.MeshStandardMaterial({
            color: object.color,
            metalness: object.metalness,
            roughness: object.roughness,
          }),
        ),
      );
    }
    scene.add(wrapper);
  }
  const exporter = new GLTFExporter();
  const binary = await exporter.parseAsync(scene, { binary: true });
  const bytes =
    binary instanceof ArrayBuffer ? new Uint8Array(binary) : new Uint8Array(binary.buffer);
  return { bytes, omitted };
}
