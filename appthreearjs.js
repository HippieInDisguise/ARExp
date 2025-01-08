import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let vrDisplay, arView, vrControls, scene, camera, renderer;
let model = null;

function initializeUI() {
    // Setup initial greeting message and start button
    const splash = document.getElementById('splash');
    const startButton = document.getElementById('start_button');
    // ...UI logic goes here (styles, etc.)...
}

function initAR() {
    // Ensure AR display is available before initializing
    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then((displays) => {
            if (displays.length > 0) {
                startExperience(displays[0]);
            } else {
                alert('No AR displays found');
            }
        }).catch((error) => alert('Unable to get AR display: ' + error));
    } else {
        alert('getVRDisplays not supported');
    }
}

function startExperience(display) {
    vrDisplay = display;
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create a scene
    scene = new THREE.Scene();

    // Initialize AR
    arView = new THREE.ARView(vrDisplay, renderer);
    camera = new THREE.ARPerspectiveCamera(
        vrDisplay,
        60,
        window.innerWidth / window.innerHeight,
        vrDisplay.depthNear,
        vrDisplay.depthFar
    );
    vrControls = new THREE.VRControls(camera);

    // Example mesh (replace with GLTFLoader if desired)
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshNormalMaterial();
    model = new THREE.Mesh(geometry, material);
    model.visible = false;
    scene.add(model);

    // On tap, anchor the model at the camera pose
    document.addEventListener('click', () => {
        model.position.setFromMatrixPosition(camera.matrixWorld);
        model.quaternion.setFromRotationMatrix(camera.matrixWorld);
        model.visible = true;
    });

    console.log('AR experience started');
    update();
}

function update() {
    vrControls.update();
    arView.render();
    renderer.clearDepth();
    renderer.render(scene, camera);
    vrDisplay.requestAnimationFrame(update);
}

// Initialize UI and set up the AR start flow (similar to appalvaar.js)
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
