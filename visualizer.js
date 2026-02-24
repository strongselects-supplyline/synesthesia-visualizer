// ============================================================
// Synesthesia Visualizer — WebGL Render Engine v2.0
// Three.js + Bloom Post-Processing + Beat-Reactive 3-Layer System
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- DOM Refs ---
const trackSelector = document.getElementById('trackSelector');
const hexDisplay = document.getElementById('hexDisplay');
const intensitySlider = document.getElementById('intensitySlider');
const forgeSlider = document.getElementById('forgeSlider');
const modeCatalogBtn = document.getElementById('modeCatalogBtn');
const modeLiveBtn = document.getElementById('modeLiveBtn');
const catalogControls = document.getElementById('catalogControls');
const liveAudioControls = document.getElementById('liveAudioControls');

// --- State ---
let currentColor = new THREE.Color('#2d3142');
let targetColor = new THREE.Color('#2d3142');
let intensity = 0.5;
let forgeStage = 1.0;
let currentMode = 'catalog'; // 'catalog' | 'live'
// Expose for midi.js / audio.js
window.currentMode = currentMode;
window.setTrack = setTrack;
window.intensity = intensity;
window.forgeStage = forgeStage;

// --- Three.js Core ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High-DPI, capped at 2x
renderer.setClearColor(0x061014, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Replace the old canvas
const oldCanvas = document.getElementById('visualizerCanvas');
renderer.domElement.id = 'visualizerCanvas';
renderer.domElement.style.cssText = oldCanvas.style.cssText || 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';
oldCanvas.parentNode.replaceChild(renderer.domElement, oldCanvas);

// --- Bloom Post-Processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,   // bloom strength
    0.4,   // radius
    0.7    // threshold
);
composer.addPass(bloomPass);

// ============================================================
// LAYER 1: Background Wash (Full-screen shader quad)
// ============================================================

const washUniforms = {
    uTime: { value: 0 },
    uColor: { value: currentColor.clone() },
    uPulse: { value: 0.0 },
    uShake: { value: new THREE.Vector2(0, 0) },
    uForge: { value: 1.0 },
    uBeatFlash: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const washMaterial = new THREE.ShaderMaterial({
    uniforms: washUniforms,
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uPulse;
        uniform vec2 uShake;
        uniform float uForge;
        uniform float uBeatFlash;
        uniform vec2 uResolution;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5) + uShake;
            float dist = distance(vUv, center);

            // Breathing radius
            float radius = 0.6 + uPulse * 0.3;

            // Radial gradient falloff
            float grad = 1.0 - smoothstep(0.0, radius, dist);
            grad = pow(grad, 1.8); // tighter center

            // Beat flash overlay
            float flash = uBeatFlash * (1.0 - dist) * 0.4;

            // Base color mixed with dark background
            vec3 bg = vec3(0.024, 0.063, 0.078); // #061014
            vec3 col = mix(bg, uColor, grad * uForge * 0.55 + flash);

            gl_FragColor = vec4(col, 1.0);
        }
    `,
    depthTest: false,
    depthWrite: false
});

// Full-screen quad rendered BEHIND everything
const washGeom = new THREE.PlaneGeometry(2, 2);
const washMesh = new THREE.Mesh(washGeom, washMaterial);
washMesh.renderOrder = -1;
washMesh.frustumCulled = false;
scene.add(washMesh);

// ============================================================
// LAYER 2: Mid-Field Bokeh (GPU Particle Points)
// ============================================================

const BOKEH_COUNT = 300;

const bokehGeometry = new THREE.BufferGeometry();
const bokehPositions = new Float32Array(BOKEH_COUNT * 3);
const bokehSizes = new Float32Array(BOKEH_COUNT);
const bokehPhases = new Float32Array(BOKEH_COUNT);
const bokehSpeeds = new Float32Array(BOKEH_COUNT * 2); // vx, vy per particle

function initBokehParticles() {
    for (let i = 0; i < BOKEH_COUNT; i++) {
        bokehPositions[i * 3]     = (Math.random() - 0.5) * 120; // x
        bokehPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;  // y
        bokehPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;  // z depth variation
        bokehSizes[i] = Math.random() * 4.0 + 1.0;
        bokehPhases[i] = Math.random() * Math.PI * 2;
        bokehSpeeds[i * 2]     = (Math.random() - 0.5) * 0.04;   // vx
        bokehSpeeds[i * 2 + 1] = -(Math.random() * 0.06 + 0.01); // vy (drift up)
    }
}
initBokehParticles();

bokehGeometry.setAttribute('position', new THREE.BufferAttribute(bokehPositions, 3));
bokehGeometry.setAttribute('aSize', new THREE.BufferAttribute(bokehSizes, 1));
bokehGeometry.setAttribute('aPhase', new THREE.BufferAttribute(bokehPhases, 1));

const bokehUniforms = {
    uTime: { value: 0 },
    uColor: { value: currentColor.clone() },
    uIntensity: { value: 0.5 },
    uForge: { value: 1.0 },
    uBassHit: { value: 0.0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
};

const bokehMaterial = new THREE.ShaderMaterial({
    uniforms: bokehUniforms,
    vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uBassHit;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying float vDist;

        void main() {
            vec3 pos = position;

            // Gentle oscillation
            float phase = aPhase + uTime * 0.5;
            pos.x += sin(phase) * 1.5;
            pos.y += cos(phase * 0.7) * 0.8;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            // Size: base + intensity + bass reactive
            float size = aSize * (1.0 + uIntensity * 2.0 + uBassHit * 3.0);
            gl_PointSize = size * uPixelRatio * (50.0 / -mvPosition.z);

            vAlpha = 0.15 + uIntensity * 0.25;
            vDist = length(pos.xy) / 60.0;

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uForge;
        varying float vAlpha;
        varying float vDist;

        void main() {
            // Soft circle falloff
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;

            float alpha = (1.0 - d * d) * vAlpha * uForge;
            alpha *= smoothstep(1.0, 0.3, vDist); // fade at edges

            gl_FragColor = vec4(uColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const bokehPoints = new THREE.Points(bokehGeometry, bokehMaterial);
bokehPoints.renderOrder = 1;
scene.add(bokehPoints);

// ============================================================
// LAYER 3: Foreground Sparkle (high-freq reactive)
// ============================================================

const SPARKLE_COUNT = 600;

const sparkleGeometry = new THREE.BufferGeometry();
const sparklePositions = new Float32Array(SPARKLE_COUNT * 3);
const sparkleSizes = new Float32Array(SPARKLE_COUNT);
const sparklePhases = new Float32Array(SPARKLE_COUNT);

function initSparkleParticles() {
    for (let i = 0; i < SPARKLE_COUNT; i++) {
        sparklePositions[i * 3]     = (Math.random() - 0.5) * 140;
        sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 20 + 5; // slightly forward
        sparkleSizes[i] = Math.random() * 1.2 + 0.3;
        sparklePhases[i] = Math.random() * Math.PI * 2;
    }
}
initSparkleParticles();

sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
sparkleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sparkleSizes, 1));
sparkleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(sparklePhases, 1));

const sparkleUniforms = {
    uTime: { value: 0 },
    uHighs: { value: 0.0 },
    uForge: { value: 1.0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
};

const sparkleMaterial = new THREE.ShaderMaterial({
    uniforms: sparkleUniforms,
    vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uHighs;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

            // Twinkle
            float twinkle = sin(aPhase + uTime * 2.0) * 0.5 + 0.5;

            // Highs boost both size and brightness
            float size = aSize * (1.0 + uHighs * 4.0) * (0.5 + twinkle * 0.5);
            gl_PointSize = size * uPixelRatio * (40.0 / -mvPosition.z);

            vAlpha = twinkle * (0.3 + uHighs * 1.5);

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform float uForge;
        varying float vAlpha;

        void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;

            float alpha = (1.0 - d) * vAlpha * uForge;
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const sparklePoints = new THREE.Points(sparkleGeometry, sparkleMaterial);
sparklePoints.renderOrder = 2;
scene.add(sparklePoints);

// ============================================================
// PARTICLE MOTION (CPU-side position updates for bokeh drift)
// ============================================================

function updateBokehPositions(dt) {
    const positions = bokehGeometry.attributes.position.array;
    const audio = window.audioData;

    // Forge behavior: low forge = chaotic / high forge = harmonious
    const chaosMultiplier = 1.0 + (1.0 - forgeStage) * 3.0; // more chaos when raw
    const speedBase = intensity * 2.5 + 0.3;

    // Audio-reactive speed boost
    let speedMult = speedBase;
    if (currentMode === 'live' && audio.isActive) {
        speedMult += audio.mids * 4.0;
    }

    for (let i = 0; i < BOKEH_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;

        positions[ix]     += bokehSpeeds[i * 2] * speedMult * chaosMultiplier;
        positions[iy] += bokehSpeeds[i * 2 + 1] * speedMult;

        // Wrap around
        if (positions[ix] < -65) positions[ix] = 65;
        if (positions[ix] > 65) positions[ix] = -65;
        if (positions[iy] < -45) {
            positions[iy] = 45;
            positions[ix] = (Math.random() - 0.5) * 120;
        }
    }

    bokehGeometry.attributes.position.needsUpdate = true;
}

// ============================================================
// CATALOG INIT
// ============================================================

function setTrack(index) {
    const track = window.allLoveCatalog[index];
    if (!track) return;

    targetColor.set(track.synHex || '#2d3142');
    intensity = track.intensity || 0.5;
    intensitySlider.value = Math.round(intensity * 100);
    hexDisplay.textContent = track.synHex || '#2d3142';
    document.documentElement.style.setProperty('--accent-color', track.synHex || '#47e6a6');
}
window.setTrack = setTrack;

function populateCatalog() {
    if (typeof window.allLoveCatalog === 'undefined') return;
    window.allLoveCatalog.forEach((track, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${track.trackNumber}. ${track.title} [${track.key}]`;
        trackSelector.appendChild(option);
    });
    setTrack(0);
}

// ============================================================
// ANIMATION LOOP
// ============================================================

const clock = new THREE.Clock();
let beatFlashDecay = 0;

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    const audio = window.audioData;

    // --- Color interpolation ---
    currentColor.lerp(targetColor, 0.04);

    // --- Audio-reactive values ---
    let pulse = Math.sin(elapsed * 0.5) * 0.15 * intensity;
    let shakeX = 0, shakeY = 0;
    let bassHit = 0;
    let highsVal = 0;

    if (currentMode === 'live' && audio.isActive) {
        pulse = audio.subBass * 0.8;
        shakeX = audio.subBass * 0.015 * Math.sin(elapsed * 15);
        shakeY = audio.subBass * 0.015 * Math.cos(elapsed * 15);
        bassHit = audio.bass;
        highsVal = audio.highs;

        // Beat flash
        if (audio.isBeat) {
            beatFlashDecay = audio.beatIntensity;
        }
    }

    beatFlashDecay *= 0.88; // quick decay

    // --- Update Bloom based on energy + forge ---
    bloomPass.strength = 0.5 + (audio.isActive ? audio.energy * 1.5 : intensity * 0.5);
    bloomPass.strength *= forgeStage;

    // --- Update Layer 1: Wash ---
    washUniforms.uTime.value = elapsed;
    washUniforms.uColor.value.copy(currentColor);
    washUniforms.uPulse.value = pulse;
    washUniforms.uShake.value.set(shakeX, shakeY);
    washUniforms.uForge.value = forgeStage;
    washUniforms.uBeatFlash.value = beatFlashDecay;

    // --- Update Layer 2: Bokeh ---
    updateBokehPositions(dt);
    bokehUniforms.uTime.value = elapsed;
    bokehUniforms.uColor.value.copy(currentColor);
    bokehUniforms.uIntensity.value = intensity;
    bokehUniforms.uForge.value = forgeStage;
    bokehUniforms.uBassHit.value = bassHit;

    // --- Update Layer 3: Sparkle ---
    sparkleUniforms.uTime.value = elapsed;
    sparkleUniforms.uHighs.value = highsVal;
    sparkleUniforms.uForge.value = forgeStage;

    // --- Render with bloom ---
    composer.render();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

trackSelector.addEventListener('change', (e) => {
    if (currentMode === 'catalog') setTrack(e.target.value);
});

intensitySlider.addEventListener('input', (e) => {
    intensity = e.target.value / 100;
    window.intensity = intensity;
});

forgeSlider.addEventListener('input', (e) => {
    forgeStage = e.target.value / 100;
    window.forgeStage = forgeStage;
});

modeCatalogBtn.addEventListener('click', () => {
    currentMode = 'catalog';
    window.currentMode = 'catalog';
    modeCatalogBtn.classList.add('active');
    modeLiveBtn.classList.remove('active');

    // Smooth transition: fade controls
    catalogControls.style.opacity = '0';
    liveAudioControls.classList.add('hidden');
    catalogControls.classList.remove('hidden');
    requestAnimationFrame(() => {
        catalogControls.style.transition = 'opacity 0.4s ease';
        catalogControls.style.opacity = '1';
    });
});

modeLiveBtn.addEventListener('click', () => {
    currentMode = 'live';
    window.currentMode = 'live';
    modeLiveBtn.classList.add('active');
    modeCatalogBtn.classList.remove('active');

    liveAudioControls.style.opacity = '0';
    catalogControls.classList.add('hidden');
    liveAudioControls.classList.remove('hidden');
    requestAnimationFrame(() => {
        liveAudioControls.style.transition = 'opacity 0.4s ease';
        liveAudioControls.style.opacity = '1';
    });
});

// Stage Mode / Fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
        const overlay = document.querySelector('.ui-overlay');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err.message);
            });
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 500);
        } else {
            document.exitFullscreen();
        }
    }
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        const overlay = document.querySelector('.ui-overlay');
        overlay.classList.remove('hidden');
        overlay.style.opacity = '0';
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '1';
        });
    }
});

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    washUniforms.uResolution.value.set(w, h);
});

// ============================================================
// INIT
// ============================================================

populateCatalog();
animate();
