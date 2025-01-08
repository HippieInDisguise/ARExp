// ...existing code (if any)...

// Basic structure for the AR experience
// import { Stats } from "https://alvatest.pages.dev/public/assets/stats.js";
// import { AlvaAR } from 'https://alvatest.pages.dev/public/assets/alva_ar.js';
// import { ARCamView } from "https://alvatest.pages.dev/public/assets/view.js";
import { Camera } from "https://alvatest.pages.dev/public/assets/utils.js";
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function initializeUI() {
    // Setup initial greeting message and start button
    const splash = document.getElementById('splash');
    const startButton = document.getElementById('start_button');
    // ...any UI logic goes here...
}

function initAR() {
    // Initialize AlvaAR and camera
    Camera.Initialize({
        video: { facingMode: 'environment', aspectRatio: 16 / 9, width: { ideal: 1280 } },
        audio: false
    }).then(media => {
        startExperience(media);
    }).catch(error => alert('Camera ' + error));
}

function startExperience(media) {
    const $container = document.getElementById('container');
    const $view = document.createElement('div');
    const $canvas = document.createElement('canvas');
    const $video = media.el;
    const ctx = $canvas.getContext('2d', { alpha: false, desynchronized: true });

    $container.appendChild($canvas);
    $container.appendChild($view);

    import('https://alvatest.pages.dev/public/assets/alva_ar.js').then(({ AlvaAR }) => {
        import('https://alvatest.pages.dev/public/assets/view.js').then(({ ARCamView }) => {
            import('https://alvatest.pages.dev/public/assets/utils.js').then(({ onFrame, resize2cover }) => {

                const size = resize2cover(
                    $video.videoWidth,
                    $video.videoHeight,
                    $container.clientWidth,
                    $container.clientHeight
                );
                $canvas.width = $container.clientWidth;
                $canvas.height = $container.clientHeight;
                $video.style.width = size.width + 'px';
                $video.style.height = size.height + 'px';

                AlvaAR.Initialize($canvas.width, $canvas.height).then(alva => {
                    const view = new ARCamView($view, $canvas.width, $canvas.height);

                    // Use a camera that decompose() can properly handle
                    const scene = new THREE.Scene();
                    const camera = new THREE.Camera();
                    scene.add(camera);

                    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
                    renderer.setSize($canvas.width, $canvas.height);
                    $container.appendChild(renderer.domElement);

                    const loader = new GLTFLoader();
                    let model = null;
                    let anchorPose = null;
                    let latestPose = null;
                    let anchored = false;

                    loader.setPath('./Assets/');
                    loader.load('scene.gltf', (gltf) => {
                        model = gltf.scene;
                        model.visible = false;  // Hide until user taps
                        model.scale.set(0.2, 0.2, 0.2);
                        model.rotation.y = Math.PI / 4;

                        scene.add(model);

                        // Basic lighting
                        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
                        scene.add(ambientLight);
                        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                        directionalLight.position.set(1, 2, 3);
                        scene.add(directionalLight);

                        // If there are animations in the glTF
                        const mixer = new THREE.AnimationMixer(model);
                        gltf.animations.forEach((clip) => {
                            const action = mixer.clipAction(clip);
                            action.play();
                        });
                    });

                    // On tap, set anchored = true and store current camera pose
                    document.addEventListener('click', () => {
                        if (latestPose && !anchored) {
                            anchorPose = latestPose.slice();
                            anchored = true;
                            if (model) model.visible = true;
                        }
                    });

                    const SMOOTHING_FACTOR = 0.9;
                    onFrame(() => {
                        ctx.clearRect(0, 0, $canvas.width, $canvas.height);
                        if (!document.hidden) {
                            ctx.drawImage($video, 0, 0, $video.videoWidth, $video.videoHeight, size.x, size.y, size.width, size.height);
                            const frame = ctx.getImageData(0, 0, $canvas.width, $canvas.height);
                            const pose = alva.findCameraPose(frame);

                            if (pose) {
                                latestPose = pose;
                                camera.matrix.fromArray(pose);
                                camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

                                if (anchored && anchorPose && model) {
                                    // Smooth the anchorPose to reduce jitter
                                    const anchorMatrix = new THREE.Matrix4().fromArray(anchorPose);
                                    const anchorPos = new THREE.Vector3();
                                    const anchorQuat = new THREE.Quaternion();
                                    const anchorSc = new THREE.Vector3();
                                    anchorMatrix.decompose(anchorPos, anchorQuat, anchorSc);

                                    const newMatrix = new THREE.Matrix4().fromArray(pose);
                                    const newPos = new THREE.Vector3();
                                    const newQuat = new THREE.Quaternion();
                                    const newSc = new THREE.Vector3();
                                    newMatrix.decompose(newPos, newQuat, newSc);

                                    // Simple lerp for position and slerp for quaternion
                                    anchorPos.lerp(newPos, 1 - SMOOTHING_FACTOR);
                                    anchorQuat.slerp(newQuat, 1 - SMOOTHING_FACTOR);

                                    // Adjust model scale based on distance
                                    const dist = camera.position.distanceTo(anchorPos);
                                    const dynamicScale = 0.2 + dist * 0.05;

                                    // Recompose matrix and store as new anchorPose
                                    anchorMatrix.compose(anchorPos, anchorQuat, new THREE.Vector3(1, 1, 1));
                                    anchorPose = anchorMatrix.toArray();

                                    // Apply final transform to model
                                    model.matrix.fromArray(anchorPose);
                                    model.matrix.decompose(model.position, model.quaternion, model.scale);
                                    model.scale.set(dynamicScale, dynamicScale, dynamicScale);
                                }
                            } else {
                                view.lostCamera();
                                const dots = alva.getFramePoints();
                                for (const p of dots) {
                                    ctx.fillStyle = 'white';
                                    ctx.fillRect(p.x, p.y, 2, 2);
                                }
                            }
                        }
                        renderer.render(scene, camera);
                        return true;
                    }, 30);
                });
            });
        });
    });

    console.log('AR experience started');
}

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
}
);