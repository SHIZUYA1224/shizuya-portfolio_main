import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { VRMUtils, VRMLoaderPlugin } from '../vendor/three-vrm.module.js';

const canvas = document.getElementById('vrm-canvas');
const listEl = document.getElementById('vrm-model-list');
const loadingOverlay = document.getElementById('vrm-loading');
const modelNameEl = document.getElementById('vrm-model-name');
const modelDescriptionEl = document.getElementById('vrm-model-description');
const modelVersionEl = document.getElementById('vrm-model-version');
const modelRigEl = document.getElementById('vrm-model-rig');

if (canvas && listEl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 200);
  camera.position.set(0, 1.4, 3.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.6;
  controls.maxDistance = 6;
  controls.target.set(0, 1.4, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(1.5, 3, 2.5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-2.5, 2.2, -1.5);
  scene.add(fillLight);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  const loaderManager = new THREE.LoadingManager();
  const loader = new GLTFLoader(loaderManager);
  loader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));

  let currentVRM = null;

  const showLoading = (visible) => {
    if (loadingOverlay) {
      loadingOverlay.hidden = !visible;
    }
  };

  const disposeVRM = () => {
    if (!currentVRM) return;
    scene.remove(currentVRM.scene);
    currentVRM.scene.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m?.dispose?.());
      } else {
        child.material?.dispose?.();
      }
    });
    currentVRM = null;
  };

  const focusOnModel = (vrm) => {
    vrm.scene.updateMatrixWorld(true);

    const humanoid = vrm.humanoid;
    const hips = humanoid?.getNormalizedBoneNode?.('hips')
      ?? humanoid?.getRawBoneNode?.('hips')
      ?? humanoid?.getNormalizedBoneNode?.('spine')
      ?? humanoid?.getRawBoneNode?.('spine');

    const box = new THREE.Box3().setFromObject(vrm.scene);
    const center = new THREE.Vector3();

    if (hips) {
      hips.getWorldPosition(center);
    } else if (!box.isEmpty()) {
      box.getCenter(center);
    } else {
      center.set(0, 1.4, 0);
    }

    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const distance = Math.max(maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)), 1.8);
    const offset = new THREE.Vector3(0, Math.min(size.y * 0.1, 0.6), distance);

    controls.target.copy(center);
    camera.position.copy(center).add(offset);
    camera.near = Math.max(distance / 50, 0.01);
    camera.far = Math.max(distance * 10, 20);
    camera.updateProjectionMatrix();
    controls.update();

    ground.position.set(center.x, 0, center.z);
  };

  const resize = () => {
    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 960;
    const height = Math.max((canvas.parentElement?.clientWidth || width) * 0.5625, 480);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  const renderLoop = () => {
    requestAnimationFrame(renderLoop);
    const delta = clock.getDelta();
    controls.update();
    if (currentVRM) {
      currentVRM.update(delta);
      currentVRM.springBoneManager?.update(delta);
    }
    renderer.render(scene, camera);
  };
  renderLoop();
  window.__vrmViewer = { scene, renderer, camera, controls }

  const loadModel = async (model) => {
    showLoading(true);
    disposeVRM();
    try {
      const gltf = await loader.loadAsync(model.src);
      const vrm = gltf.userData.vrm;
      if (!vrm) {
        throw new Error('VRM data missing');
      }
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      currentVRM = vrm;
      focusOnModel(vrm);

      modelNameEl.textContent = model.name;
      modelDescriptionEl.textContent = model.description;
      modelVersionEl.textContent = model.versionLabel;
      modelRigEl.textContent = model.rig;
    } catch (error) {
      modelNameEl.textContent = 'Load error';
      modelDescriptionEl.textContent = 'Failed to load VRM model. Confirm the file exists and Content-Type metadata is correct.';
      modelVersionEl.textContent = '–';
      modelRigEl.textContent = '–';
      console.error('Failed to load VRM:', error);
    } finally {
      showLoading(false);
    }
  };

  fetch('data/models.json')
    .then((response) => response.json())
    .then((models) => {
      models.forEach((model, index) => {
        const button = document.createElement('button');
        button.className = 'vrm-list-item';
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', 'false');
        button.innerHTML = `
          <span class="vrm-thumb" aria-hidden="true">
            <img src="${model.thumbnail}" alt="" loading="lazy">
          </span>
          <span class="vrm-list-meta">
            <span class="vrm-list-title">${model.name}</span>
            <span class="vrm-list-sub">${model.versionLabel}</span>
          </span>
        `;

        button.addEventListener('click', () => {
          listEl.querySelectorAll('.vrm-list-item').forEach((item) => {
            item.classList.remove('is-active');
            item.setAttribute('aria-selected', 'false');
          });
          button.classList.add('is-active');
          button.setAttribute('aria-selected', 'true');
          loadModel(model);
        });

        button.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            button.click();
          }
        });

        if (index === 0) {
          button.classList.add('is-active');
          button.setAttribute('aria-selected', 'true');
          loadModel(model);
        }
        listEl.appendChild(button);
      });
    })
    .catch((error) => {
      listEl.innerHTML = '<p class="vrm-error">モデルリストの取得に失敗しました。</p>';
      console.error('Failed to fetch models.json', error);
    });
}
