import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Import three.ar.js here if needed

let xrSession = null;
let xrRefSpace = null;
let arView, vrControls, scene, camera, renderer;
let model = null;

function initializeUI() {
  const splash = document.getElementById('splash');
  const startButton = document.getElementById('start_button');
  // ...UI logic goes here (styles, etc.)...
}

function initAR() {
  if (navigator.xr) {
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local', 'hit-test'],
    }).then((session) => {
      onSessionStarted(session);
    }).catch((error) => {
      alert('Unable to start AR session: ' + error.message);
    });
  } else {
    alert('WebXR not supported');
  }
}

function onSessionStarted(session) {
  xrSession = session;
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 20.0);

  arView = new THREE.ARView(xrSession, renderer); // Use ARView from three.ar.js
  xrSession.addEventListener('end', onSessionEnded);
  xrSession.requestReferenceSpace('local').then((refSpace) => {
    xrRefSpace = refSpace;
    xrSession.requestAnimationFrame(onXRFrame);
  });

  // Example mesh (replace with GLTFLoader if desired)
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshNormalMaterial();
  model = new THREE.Mesh(geometry, material);
  model.visible = false;
  scene.add(model);

  document.addEventListener('click', () => {
    if (camera) {
      const viewerPose = xrSession.viewerSpace;
      const xrHitTestSource = xrSession.requestHitTestSource({
        space: xrRefSpace,
        offsetRay: new XRRay(viewerPose.transform)
      });

      xrHitTestSource.then((hitTestSource) => {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hitPose = hitTestResults[0].getPose(xrRefSpace);
          model.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
          model.quaternion.setFromEuler(hitPose.transform.orientation);
          model.visible = true;
        }
      }).catch(console.error);
    }
  });

  console.log('AR experience started');
}

function onSessionEnded() {
  xrSession = null;
  if (renderer.domElement) {
    renderer.domElement.remove();
  }
}

function onXRFrame(time, frame) {
  const session = frame.session;
  session.requestAnimationFrame(onXRFrame);

  const pose = frame.getViewerPose(xrRefSpace);
  if (pose) {
    const view = pose.views[0];
    camera.matrix.fromArray(view.transform.matrix);
    camera.updateMatrixWorld(true);

    arView.render(frame); // Render using ARView from three.ar.js
    renderer.clear();
    renderer.render(scene, camera);
  }
}

// Initialize UI and set up the AR start flow
window.addEventListener('load', () => {
  initializeUI();
  setTimeout(() => {
    document.getElementById('splash').remove();
    document.getElementById('start_button').addEventListener(
      'click',
      () => {
        document.getElementById('overlay').remove();
        initAR();
      },
      { once: true }
    );
  }, 800);
});
