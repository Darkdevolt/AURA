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

const L = 3.62; // longueur hors tout
const WHEEL_R = 0.3;
const FRONT_AXLE = 0.64;
const REAR_AXLE = 3.02;
const BODY_HALF = 0.825; // demi-largeur (1,65 m)

/**
 * Extrusion d'un profil latéral avec de grands arrondis : le chanfrein arrondit tous les angles
 * (face avant / flancs / capot), ce qui donne les formes « galet » de la T03.
 */
function rounded(shape: THREE.Shape, depth: number, size: number, thickness: number, mat: THREE.Material, segments = 10): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: size,
    bevelThickness: thickness,
    bevelSegments: segments,
    curveSegments: 32,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Caisse : profil intérieur (le chanfrein de 0,1 m l'agrandit jusqu'à la vraie silhouette) */
function bodyShape(): THREE.Shape {
  const s = new THREE.Shape();
  const bottom = 0.36;
  const R = 0.47;
  const a = Math.asin((bottom - WHEEL_R) / R);
  const dx = R * Math.cos(a);
  s.moveTo(0.16, bottom);
  s.quadraticCurveTo(0.1, bottom, 0.1, 0.45);
  s.lineTo(0.1, 0.7);
  s.quadraticCurveTo(0.1, 0.8, 0.27, 0.81); // nez très arrondi
  s.quadraticCurveTo(0.55, 0.86, 0.88, 0.91); // capot court et plongeant
  s.lineTo(3.3, 0.96); // ligne de caisse qui remonte légèrement
  s.quadraticCurveTo(3.52, 0.96, 3.52, 0.84);
  s.lineTo(3.52, 0.46);
  s.quadraticCurveTo(3.52, bottom, 3.5, bottom);
  s.lineTo(REAR_AXLE + dx, bottom);
  s.absarc(REAR_AXLE, WHEEL_R, R, a, Math.PI - a, false);
  s.lineTo(FRONT_AXLE + dx, bottom);
  s.absarc(FRONT_AXLE, WHEEL_R, R, a, Math.PI - a, false);
  s.lineTo(0.16, bottom);
  return s;
}

/** Vitrage : grand pare-brise incliné, toit plat, lunette presque verticale */
function glassShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.9, 0.97);
  s.quadraticCurveTo(1.26, 1.3, 1.6, 1.47);
  s.lineTo(3.24, 1.49);
  s.quadraticCurveTo(3.42, 1.49, 3.44, 1.37);
  s.lineTo(3.5, 1.0);
  s.lineTo(1.0, 0.97);
  return s;
}

/** Toit noir « flottant » */
function roofShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(1.52, 1.47);
  s.quadraticCurveTo(1.62, 1.535, 1.8, 1.535);
  s.lineTo(3.2, 1.535);
  s.quadraticCurveTo(3.42, 1.535, 3.45, 1.41);
  s.lineTo(3.4, 1.4);
  s.quadraticCurveTo(3.38, 1.5, 3.2, 1.5);
  s.lineTo(1.86, 1.5);
  s.quadraticCurveTo(1.66, 1.5, 1.56, 1.45);
  s.lineTo(1.52, 1.47);
  return s;
}

/** Custode arrière couleur carrosserie (derrière la vitre arrière) */
function cPillarShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(3.02, 1.0);
  s.lineTo(3.12, 1.45);
  s.lineTo(3.3, 1.45);
  s.quadraticCurveTo(3.44, 1.42, 3.47, 1.3);
  s.lineTo(3.53, 1.0);
  s.lineTo(3.02, 1.0);
  return s;
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
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

/** Roue : pneu, jante alliage multibranches, cache-moyeu noir */
function wheel(alloy: THREE.Material, tireMat: THREE.Material, dark: THREE.Material, side: 1 | -1): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R - 0.075, 0.075, 16, 48), tireMat);
  tire.scale.set(1, 1, 1.25);
  tire.castShadow = true;
  g.add(tire);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.17, 40, 1, true), dark);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const face = new THREE.Group();
  face.position.z = side * 0.075;
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), dark);
  back.rotation.y = side === 1 ? 0 : Math.PI;
  back.position.z = -side * 0.01;
  face.add(back);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.012, 8, 48), alloy);
  face.add(lip);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.018), alloy);
    spoke.position.set(Math.sin(ang) * 0.11, Math.cos(ang) * 0.11, 0);
    spoke.rotation.z = -ang + (i % 2 ? 0.18 : -0.18); // branches doubles en V
    face.add(spoke);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), dark);
  cap.rotation.x = Math.PI / 2;
  face.add(cap);
  g.add(face);
  return g;
}

export function buildCar(opts: CarOptions = {}): THREE.Group {
  const paint = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(opts.color ?? "#7fa7c9"), metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, metalness: 0.4, roughness: 0.18, clearcoat: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x10161d, metalness: 0.7, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.75, metalness: 0.05 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 1, roughness: 0.25 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.6, roughness: 0.4 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 });
  const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeef4ff, emissiveIntensity: 2.4 });
  const lens = new THREE.MeshPhysicalMaterial({ color: 0x1a1f26, metalness: 0.5, roughness: 0.05, clearcoat: 1 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0x9a1016, emissive: 0xff2020, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 });

  const car = new THREE.Group();

  // Carrosserie, vitrage, toit noir
  car.add(rounded(bodyShape(), 2 * BODY_HALF - 0.32, 0.1, 0.16, paint, 12));
  car.add(rounded(glassShape(), 1.2, 0.05, 0.1, glass, 8));
  car.add(rounded(roofShape(), 1.22, 0.035, 0.12, gloss, 8));

  for (const side of [1, -1] as const) {
    const z = (v: number) => side * v;
    // Custode couleur carrosserie
    const cp = rounded(cPillarShape(), 0.01, 0.02, 0.03, paint, 4);
    cp.position.z = z(0.69);
    car.add(cp);
    // Montant A et pilier B noirs
    const aPil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.66, 0.05), gloss);
    aPil.position.set(1.24, 1.22, z(0.67));
    aPil.rotation.z = -0.96;
    car.add(aPil);
    const bPil = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.03), gloss);
    bPil.position.set(2.27, 1.23, z(0.7));
    car.add(bPil);
    // Rétroviseurs noirs arrondis
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), gloss);
    mirror.scale.set(0.9, 0.7, 1.1);
    mirror.position.set(1.02, 1.06, z(0.89));
    mirror.castShadow = true;
    car.add(mirror);
    // Poignées de porte (couleur carrosserie, en relief)
    for (const x of [1.62, 2.5]) {
      const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), paint);
      h.rotation.z = Math.PI / 2;
      h.position.set(x, 0.93, z(0.835));
      car.add(h);
    }
    // Jonctions de portes
    for (const x of [1.25, 2.27, 3.02]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.58, 0.004), plastic);
      line.position.set(x, 0.67, z(0.83));
      car.add(line);
    }
    // Bas de caisse et passages de roue en plastique noir
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.13, 0.05), plastic);
    rocker.position.set((FRONT_AXLE + REAR_AXLE) / 2, 0.3, z(0.8));
    car.add(rocker);
    for (const x of [FRONT_AXLE, REAR_AXLE]) {
      const arc = 1.16 * Math.PI;
      const flare = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 10, 40, arc), plastic);
      flare.scale.set(1, 1, 0.8);
      flare.rotation.z = -(arc - Math.PI) / 2;
      flare.position.set(x, WHEEL_R, z(0.79));
      car.add(flare);
      const w = wheel(alloy, tire, darkMetal, side);
      w.position.set(x, WHEEL_R, z(0.7));
      car.add(w);
    }
    // Phares ovales avec anneau lumineux en « C »
    const lamp = new THREE.Group();
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 40), gloss);
    bezel.rotation.z = Math.PI / 2;
    lamp.add(bezel);
    const glassLens = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lens);
    glassLens.rotation.z = Math.PI / 2;
    glassLens.scale.set(1, 0.18, 1);
    glassLens.position.x = -0.012;
    lamp.add(glassLens);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.013, 10, 40, Math.PI * 1.6), led);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.x = 0.6;
    ring.position.x = -0.028;
    lamp.add(ring);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), alloy);
    core.position.x = -0.02;
    core.scale.set(0.5, 1, 1);
    lamp.add(core);
    lamp.scale.set(1, 0.8, 1.2);
    lamp.position.set(0.012, 0.76, z(0.54));
    lamp.rotation.y = side * -0.18;
    car.add(lamp);
    // Antibrouillards / réflecteurs bas
    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.14), plastic);
    fog.position.set(0.02, 0.43, z(0.62));
    fog.rotation.y = side * -0.4;
    car.add(fog);
    // Feux arrière verticaux aux angles
    const tail = rounded(roundedRect(0.13, 0.24, 0.05), 0.01, 0.01, 0.01, red, 3);
    tail.rotation.y = Math.PI / 2 + side * 0.25;
    tail.position.set(3.618, 0.9, z(0.62));
    car.add(tail);
  }

  // Face avant fermée : grand panneau arrondi, logo, fente noire en dessous
  const panel = rounded(roundedRect(0.62, 0.24, 0.07), 0.005, 0.012, 0.012, paint, 4);
  panel.rotation.y = -Math.PI / 2;
  panel.position.set(-0.012, 0.73, 0);
  car.add(panel);
  const logo = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 24), alloy);
  logo.rotation.y = Math.PI / 2;
  logo.position.set(-0.03, 0.74, 0);
  car.add(logo);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.6), gloss);
  slot.position.set(-0.012, 0.59, 0);
  car.add(slot);
  // Bouclier bas : calandre noire à lamelles
  const grille = rounded(roundedRect(1.1, 0.12, 0.04), 0.02, 0.01, 0.01, plastic, 3);
  grille.rotation.y = -Math.PI / 2;
  grille.position.set(-0.005, 0.37, 0);
  car.add(grille);
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 1.0), darkMetal);
    slat.position.set(-0.03, 0.34 + i * 0.03, 0);
    car.add(slat);
  }
  // Bouclier arrière noir
  const rearLower = rounded(roundedRect(1.2, 0.12, 0.04), 0.02, 0.01, 0.01, plastic, 3);
  rearLower.rotation.y = Math.PI / 2;
  rearLower.position.set(3.625, 0.36, 0);
  car.add(rearLower);

  // Plaques d'immatriculation
  if (opts.plate) {
    const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture(opts.plate), roughness: 0.4 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.1), plateMat);
    front.position.set(-0.045, 0.5, 0);
    front.rotation.y = -Math.PI / 2;
    car.add(front);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.1), plateMat);
    rear.position.set(3.64, 0.6, 0);
    rear.rotation.y = Math.PI / 2;
    car.add(rear);
  }

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
  camera.position.set(-3.9, 1.45, 3.9);

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
