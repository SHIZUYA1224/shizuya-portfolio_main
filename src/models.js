import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const canvas = document.getElementById('gltf-canvas');
const listEl = document.getElementById('gltf-model-list');
const loadingOverlay = document.getElementById('gltf-loading');
const titleEl = document.getElementById('gltf-title');
const descriptionEl = document.getElementById('gltf-description');
const categoryEl = document.getElementById('gltf-meta-category');
const formatEl = document.getElementById('gltf-meta-format');
const polycountEl = document.getElementById('gltf-meta-polycount');

if (canvas && listEl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8faf9);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
  camera.position.set(2.2, 1.6, 2.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.6, 0);
  controls.update();

  const hemi = new THREE.HemisphereLight(0xf2f8ff, 0xcfd8d4, 0.7);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(2.6, 4.2, 3.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
  rimLight.position.set(-2.8, 2.4, -3.2);
  scene.add(rimLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xf0f3f2 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  const loader = new GLTFLoader();
  let currentObject = null;
  let currentMeta = null;

  const showLoading = (visible) => {
    if (loadingOverlay) {
      loadingOverlay.hidden = !visible;
    }
  };

  const disposeCurrent = () => {
    if (!currentObject) return;
    scene.remove(currentObject);
    currentObject.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat?.dispose?.());
      } else {
        child.material?.dispose?.();
      }
    });
    currentObject = null;
  };

  const focusCamera = (meta, object, initialBox) => {
    // recentre by translating the root so that the bounding box sits around the origin
    const worldCenter = initialBox.getCenter(new THREE.Vector3());
    object.position.sub(worldCenter);
    object.updateMatrixWorld(true);

    // recalc after translation to ensure precise centre
    const box = new THREE.Box3().setFromObject(object);
    const localCenter = box.getCenter(new THREE.Vector3());
    object.position.sub(localCenter);
    object.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(object);
    const size = finalBox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.6 || 1;

    if (meta?.camera?.target && Array.isArray(meta.camera.target)) {
      controls.target.fromArray(meta.camera.target);
    } else {
      controls.target.set(0, Math.max(size.y * 0.25, 0), 0);
    }

    if (meta?.camera?.position && Array.isArray(meta.camera.position)) {
      camera.position.fromArray(meta.camera.position);
    } else {
      const distance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(distance, radius * 0.85, distance);
    }

    camera.near = Math.max(radius / 100, 0.05);
    camera.far = Math.max(radius * 40, 30);
    camera.updateProjectionMatrix();
    controls.update();

    const minY = finalBox.min.y;
    ground.position.set(controls.target.x, minY - 0.02, controls.target.z);
  };

  const resize = () => {
    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 960;
    const height = Math.max(width * 0.58, 400);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  // Quick recenter via double click
  canvas?.addEventListener('dblclick', () => {
    if (!currentObject) return;
    const box = new THREE.Box3().setFromObject(currentObject);
    focusCamera(currentMeta || {}, currentObject, box);
  });

  const renderLoop = () => {
    requestAnimationFrame(renderLoop);
    controls.update();
    renderer.render(scene, camera);
  };
  renderLoop();

  const updateMeta = (meta) => {
    if (titleEl) titleEl.textContent = meta.name || 'Unnamed model';
    if (descriptionEl) {
      descriptionEl.textContent = meta.description || 'メタデータが読み込めませんでした。';
    }
    if (categoryEl) {
      categoryEl.textContent = meta.category || '—';
    }
    if (formatEl) {
      formatEl.textContent = meta.format || 'glTF 2.0';
    }
    if (polycountEl) {
      polycountEl.textContent = meta.polycount || '—';
    }
  };

  const loadModel = async (meta) => {
    showLoading(true);
    disposeCurrent();
    try {
      const gltf = await loader.loadAsync(meta.src);
      const object = gltf.scene || gltf.scenes?.[0];
      if (!object) {
        throw new Error('gltf scene missing');
      }
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.material?.side && (child.material.side = THREE.DoubleSide);
        }
      });
      scene.add(object);
      currentObject = object;
      currentMeta = meta;

      const box = new THREE.Box3().setFromObject(object);
      focusCamera(meta, object, box);
      updateMeta(meta);
    } catch (error) {
      console.error('Failed to load glTF model', error);
      if (titleEl) titleEl.textContent = '読み込みに失敗しました';
      if (descriptionEl) {
        descriptionEl.textContent = 'ファイルパスとフォーマットを確認してください。';
      }
      if (categoryEl) categoryEl.textContent = '—';
      if (polycountEl) polycountEl.textContent = '—';
    } finally {
      showLoading(false);
    }
  };

  fetch('data/gltf-models.json')
    .then((response) => response.json())
    .then((models) => {
      if (!Array.isArray(models) || models.length === 0) {
        listEl.innerHTML = '<p>モデル情報を読み込めませんでした。</p>';
        return;
      }
      models.forEach((meta, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'models-list-item';
        button.setAttribute('role', 'listitem');
        button.innerHTML = `
          <span class="models-thumb" aria-hidden="true">
            <img src="${meta.preview}" alt="" loading="lazy">
          </span>
          <span class="models-list-meta">
            <span class="models-list-title">${meta.name}</span>
            <span class="models-list-sub">${meta.category || 'Asset'}</span>
          </span>
        `;

        const activate = () => {
          listEl.querySelectorAll('.models-list-item').forEach((item) => {
            item.classList.remove('is-active');
          });
          button.classList.add('is-active');
          loadModel(meta);
        };

        button.addEventListener('click', activate);
        button.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
          }
        });

        listEl.appendChild(button);
        if (index === 0) {
          activate();
        }
      });
    })
    .catch((error) => {
      console.error('Failed to fetch gltf-models.json', error);
      listEl.innerHTML = '<p>モデル情報を読み込めませんでした。</p>';
    });
}
