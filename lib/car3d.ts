/**
 * Maquette 3D de la Leapmotor T03 (citadine électrique 5 portes, 3,62 m), modélisée en code avec three.js.
 * Aucune ressource externe : tout est généré dans le navigateur, gratuit et léger.
 * Repère : x = longueur (avant en x = 0), y = hauteur, z = largeur. Unités en mètres.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface CarViewer {
  setVisible: (v: boolean) => void;
  dispose: () => void;
}

export interface CarOptions {
  color?: string;
  plate?: string;
  autoRotate?: boolean;
}

const L = 3.62; // longueur
const WHEEL_R = 0.31;
const FRONT_AXLE = 0.66;
const REAR_AXLE = 3.06;

function extrude(shape: THREE.Shape, depth: number, bevel: number, mat: THREE.Material, segments = 24): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel * 1.2,
    bevelSegments: 5,
    curveSegments: segments,
  });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Bas de caisse avec passages de roues */
function bodyShape(): THREE.Shape {
  const s = new THREE.Shape();
  const bottom = 0.25;
  const archR = 0.38;
  const a = Math.asin((bottom - WHEEL_R) / archR); // angle où l'arche rejoint le bas de caisse
  const dx = archR * Math.cos(a);
  s.moveTo(0.14, bottom);
  s.quadraticCurveTo(0.02, 0.27, 0.01, 0.42);
  s.lineTo(0.0, 0.6);
  s.quadraticCurveTo(0.0, 0.77, 0.14, 0.8); // nez arrondi
  s.quadraticCurveTo(0.55, 0.88, 1.0, 0.96); // capot court
  s.lineTo(3.4, 1.0); // ligne de caisse
  s.quadraticCurveTo(3.59, 1.0, 3.6, 0.9);
  s.lineTo(3.62, 0.46);
  s.quadraticCurveTo(3.62, 0.27, 3.5, bottom);
  s.lineTo(REAR_AXLE + dx, bottom);
  s.absarc(REAR_AXLE, WHEEL_R, archR, a, Math.PI - a, false);
  s.lineTo(FRONT_AXLE + dx, bottom);
  s.absarc(FRONT_AXLE, WHEEL_R, archR, a, Math.PI - a, false);
  s.lineTo(0.14, bottom);
  return s;
}

/** Habitacle (vitrage) */
function cabinShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(1.02, 0.95);
  s.quadraticCurveTo(1.38, 1.24, 1.74, 1.5); // pare-brise
  s.quadraticCurveTo(1.83, 1.565, 1.98, 1.565);
  s.lineTo(3.18, 1.565);
  s.quadraticCurveTo(3.4, 1.56, 3.44, 1.42);
  s.lineTo(3.53, 0.98); // hayon presque vertical
  s.lineTo(1.02, 0.95);
  return s;
}

/** Pavillon (toit) */
function roofShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(1.72, 1.505);
  s.quadraticCurveTo(1.83, 1.585, 1.98, 1.585);
  s.lineTo(3.2, 1.585);
  s.quadraticCurveTo(3.42, 1.58, 3.46, 1.43);
  s.lineTo(3.41, 1.42);
  s.quadraticCurveTo(3.37, 1.545, 3.18, 1.55);
  s.lineTo(1.98, 1.55);
  s.quadraticCurveTo(1.85, 1.55, 1.76, 1.49);
  s.lineTo(1.72, 1.505);
  return s;
}

/** Montant arrière (custode) plein, côté caisse */
function cPillarShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(2.98, 0.98);
  s.lineTo(3.12, 1.55);
  s.lineTo(3.3, 1.54);
  s.quadraticCurveTo(3.42, 1.5, 3.45, 1.4);
  s.lineTo(3.54, 0.98);
  s.lineTo(2.98, 0.98);
  return s;
}

function plateTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 112;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 512, 112);
  g.fillStyle = "#1d3f8f";
  g.fillRect(0, 0, 56, 112);
  g.fillStyle = "#ffffff";
  g.font = "bold 30px Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("SN", 28, 72);
  g.fillStyle = "#111111";
  g.font = "bold 70px Arial, sans-serif";
  g.fillText(text, 284, 82);
  g.strokeStyle = "#111111";
  g.lineWidth = 6;
  g.strokeRect(3, 3, 506, 106);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function wheel(rimMat: THREE.Material, tireMat: THREE.Material, side: 1 | -1): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.2, 40), tireMat);
  tire.rotation.x = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.205, 40), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  // Jante 5 branches, côté extérieur
  const face = new THREE.Group();
  face.position.z = side * 0.105;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), rimMat);
  hub.rotation.x = Math.PI / 2;
  face.add(hub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 10, 48), rimMat);
  face.add(ring);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.17, 0.02), rimMat);
    const ang = (i / 5) * Math.PI * 2;
    spoke.position.set(Math.sin(ang) * 0.1, Math.cos(ang) * 0.1, 0);
    spoke.rotation.z = -ang;
    face.add(spoke);
  }
  g.add(face);
  return g;
}

export function buildCar(opts: CarOptions = {}): THREE.Group {
  const color = new THREE.Color(opts.color ?? "#1f5fb4");
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1118, metalness: 0.85, roughness: 0.06, clearcoat: 1 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55, metalness: 0.2 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.18 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 2.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a0d12, emissive: 0xff1a1a, emissiveIntensity: 1.4, roughness: 0.3 });

  const car = new THREE.Group();
  const W = 1.56;

  car.add(extrude(bodyShape(), W, 0.045, paint));
  car.add(extrude(cabinShape(), 1.32, 0.06, glass));
  car.add(extrude(roofShape(), 1.36, 0.05, paint));

  // Montants : A (fins, noirs), B (noir), C (couleur caisse)
  for (const side of [1, -1] as const) {
    const cp = extrude(cPillarShape(), 0.02, 0.01, paint, 8);
    cp.position.z = side * 0.715;
    car.add(cp);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.04), trim);
    a.position.set(1.38, 1.23, side * 0.705);
    a.rotation.z = -0.85;
    car.add(a);
    // Rétroviseur
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), paint);
    mirror.position.set(1.12, 1.03, side * 0.86);
    mirror.castShadow = true;
    car.add(mirror);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.1), trim);
    mirrorArm.position.set(1.12, 1.0, side * 0.78);
    car.add(mirrorArm);
    // Poignées de portes
    for (const x of [1.75, 2.62]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.015), trim);
      h.position.set(x, 0.9, side * 0.842);
      car.add(h);
    }
    // Lignes de portes
    for (const x of [1.3, 2.3, 3.0]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.6, 0.004), trim);
      line.position.set(x, 0.66, side * 0.838);
      car.add(line);
    }
    // Phares avant (fins, en haut de la face avant) et feux arrière
    // Phare : boîtier noir + LED, aux coins de la face avant
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), trim);
    housing.position.set(-0.03, 0.7, side * 0.55);
    car.add(housing);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.3), led);
    head.position.set(-0.062, 0.72, side * 0.55);
    car.add(head);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.3), led);
    drl.position.set(-0.062, 0.665, side * 0.55);
    car.add(drl);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.28), red);
    tail.position.set(3.672, 0.86, side * 0.6);
    car.add(tail);
    // Roues
    for (const x of [FRONT_AXLE, REAR_AXLE]) {
      const w = wheel(chrome, tire, side);
      w.position.set(x, WHEEL_R, side * 0.69);
      car.add(w);
    }
  }
  // B pilier noir (vitrage séparé)
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.47), trim);
  b.position.set(2.3, 1.25, 0);
  car.add(b);

  // Face avant fermée (véhicule électrique) : bandeau lumineux + entrée d'air basse
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.72), trim);
  panel.position.set(-0.05, 0.68, 0);
  car.add(panel);
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 1.04), trim);
  intake.position.set(-0.03, 0.36, 0);
  car.add(intake);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 1.4), trim);
  rearBumper.position.set(3.665, 0.33, 0);
  car.add(rearBumper);
  // Bandeau arrière entre les feux
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.92), red);
  tailBar.position.set(3.678, 0.9, 0);
  car.add(tailBar);

  // Plaques d'immatriculation
  if (opts.plate) {
    const tex = plateTexture(opts.plate);
    const plateMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), plateMat);
    front.position.set(-0.058, 0.52, 0);
    front.rotation.y = -Math.PI / 2;
    car.add(front);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), plateMat);
    rear.position.set(3.688, 0.6, 0);
    rear.rotation.y = Math.PI / 2;
    car.add(rear);
  }

  // Centre la voiture sur l'origine
  car.position.x = -L / 2;
  const root = new THREE.Group();
  root.add(car);
  return root;
}

/** Monte la visionneuse dans un conteneur : rotation au doigt (horizontale), sans bloquer le défilement de la page. */
export function mountCarViewer(container: HTMLElement, opts: CarOptions = {}): CarViewer {
  const width = () => container.clientWidth || 1;
  const height = () => container.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width(), height());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(32, width() / height(), 0.1, 50);
  camera.position.set(-3.7, 1.65, 4.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3;
  sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 3;
  sun.shadow.camera.bottom = -3;
  sun.shadow.radius = 4;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const car = buildCar(opts);
  scene.add(car);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.45;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotate = (opts.autoRotate ?? true) && !reduce;
  controls.autoRotateSpeed = 1.6;
  controls.update();
  // Le défilement vertical de la page reste possible au doigt ; le glissement horizontal fait tourner la voiture
  renderer.domElement.style.touchAction = "pan-y";
  let resume: ReturnType<typeof setTimeout> | undefined;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    if (resume) clearTimeout(resume);
  });
  controls.addEventListener("end", () => {
    if (reduce || opts.autoRotate === false) return;
    resume = setTimeout(() => (controls.autoRotate = true), 4000);
  });

  let visible = true;
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

  const ro = new ResizeObserver(() => {
    renderer.setSize(width(), height());
    camera.aspect = width() / height();
    // Écran étroit : on recule un peu pour voir toute la voiture
    camera.zoom = Math.min(1, camera.aspect / 1.9);
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  return {
    setVisible: (v) => (visible = v),
    dispose: () => {
      cancelAnimationFrame(raf);
      if (resume) clearTimeout(resume);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
