// ============================================================
// Synesthesia Visualizer — WebGL Engine v3.0 "Front of House"
// Spatial Frequency Mapping + Immersive Default + Zone Textures
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- State ---
let currentColor = new THREE.Color('#2d3142');
let targetColor = new THREE.Color('#2d3142');
let intensity = 0.5;
let forgeStage = 1.0;
let currentMode = 'catalog';
window.currentMode = currentMode;
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030810, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const oldCanvas = document.getElementById('visualizerCanvas');
renderer.domElement.id = 'visualizerCanvas';
renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;';
oldCanvas.parentNode.replaceChild(renderer.domElement, oldCanvas);

// --- Bloom ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.3, 0.6
);
composer.addPass(bloomPass);

// ============================================================
// BACKGROUND WASH — Zonal (bass warmth bottom, cool shimmer top)
// ============================================================

const washUniforms = {
    uTime: { value: 0 },
    uColor: { value: currentColor.clone() },
    uSubBass: { value: 0.0 },
    uBass: { value: 0.0 },
    uMids: { value: 0.0 },
    uHighs: { value: 0.0 },
    uBeatFlash: { value: 0.0 },
    uForge: { value: 1.0 },
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
        uniform float uSubBass;
        uniform float uBass;
        uniform float uMids;
        uniform float uHighs;
        uniform float uBeatFlash;
        uniform float uForge;
        varying vec2 vUv;

        void main() {
            vec3 bg = vec3(0.012, 0.031, 0.063);

            // Vertical position: 0 = bottom, 1 = top
            float y = vUv.y;
            float x = vUv.x;
            float centerX = abs(x - 0.5) * 2.0; // 0 at center, 1 at edges

            // === BASS ZONE (bottom center) ===
            // Warm glow anchored to bottom center, expands with sub-bass
            // Organic wobble so the glow breathes rather than snapping
            float bassWobble = sin(uTime * 0.8 + x * 3.0) * 0.04;
            float bassRadius = 0.35 + pow(uSubBass, 1.5) * 0.55 + bassWobble;
            float bassDist = length(vec2(x - 0.5, y * 1.8)); // squashed vertically, centered low
            float bassGlow = 1.0 - smoothstep(0.0, bassRadius, bassDist);
            bassGlow = pow(bassGlow, 1.8); // slightly softer falloff

            // Bass color: warmer, more saturated version of the key color
            vec3 bassColor = uColor * 1.2 + vec3(0.08, 0.02, 0.0);

            // === MID ZONE (center field) ===
            float midY = abs(y - 0.5); // distance from vertical center
            float midWave = sin(uTime * 0.6 + x * 4.0) * 0.03; // gentle wave
            float midGlow = (1.0 - smoothstep(0.0, 0.55 + midWave, midY)) * uMids * 0.35;

            // === HIGH ZONE (top + edges) ===
            float highGlow = y * uHighs * 0.12; // brighter toward top
            highGlow += centerX * uHighs * 0.06; // shimmer at edges

            // === BEAT FLASH (softened — warm pulse, not strobe) ===
            float flashDist = length(vec2(x - 0.5, (y - 0.3) * 1.5));
            float flash = uBeatFlash * (1.0 - smoothstep(0.0, 0.75, flashDist));
            flash = pow(flash, 1.5);

            // Compose
            vec3 col = bg;
            col += bassColor * bassGlow * uForge * 0.55;
            col += uColor * midGlow * uForge;
            col += vec3(0.7, 0.8, 1.0) * highGlow * uForge;
            col += vec3(1.0, 0.97, 0.92) * flash * 0.5; // gentler flash

            // Vignette
            float vignette = 1.0 - pow(length(vUv - 0.5) * 1.3, 2.5);
            col *= max(vignette, 0.15);

            gl_FragColor = vec4(col, 1.0);
        }
    `,
    depthTest: false,
    depthWrite: false
});

const washMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), washMaterial);
washMesh.renderOrder = -1;
washMesh.frustumCulled = false;
scene.add(washMesh);

// ============================================================
// ZONE 1: BASS PARTICLES — Bottom Center, Heavy, Gravitational
// Large orbs that pulse and expand on kicks, anchored low/center
// ============================================================

const BASS_COUNT = 120;
const bassGeo = new THREE.BufferGeometry();
const bassPos = new Float32Array(BASS_COUNT * 3);
const bassSizes = new Float32Array(BASS_COUNT);
const bassPhases = new Float32Array(BASS_COUNT);
const bassSpeeds = new Float32Array(BASS_COUNT * 3);

for (let i = 0; i < BASS_COUNT; i++) {
    // Anchored bottom-center: narrow X spread, low Y
    bassPos[i * 3] = (Math.random() - 0.5) * 50;  // x: centered
    bassPos[i * 3 + 1] = Math.random() * -25 - 5;      // y: bottom third
    bassPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    bassSizes[i] = Math.random() * 6.0 + 3.0;          // LARGE
    bassPhases[i] = Math.random() * Math.PI * 2;
    bassSpeeds[i * 3] = (Math.random() - 0.5) * 0.02;
    bassSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
    bassSpeeds[i * 3 + 2] = 0;
}

bassGeo.setAttribute('position', new THREE.BufferAttribute(bassPos, 3));
bassGeo.setAttribute('aSize', new THREE.BufferAttribute(bassSizes, 1));
bassGeo.setAttribute('aPhase', new THREE.BufferAttribute(bassPhases, 1));

const bassUniforms = {
    uTime: { value: 0 },
    uColor: { value: currentColor.clone() },
    uSubBass: { value: 0.0 },
    uBass: { value: 0.0 },
    uBeatPunch: { value: 0.0 },
    uForge: { value: 1.0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
};

const bassMat = new THREE.ShaderMaterial({
    uniforms: bassUniforms,
    vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uSubBass;
        uniform float uBass;
        uniform float uBeatPunch;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
            vec3 pos = position;

            // Slow, heavy, curvy oscillation — organic feel
            float phase = aPhase + uTime * 0.25;
            pos.x += sin(phase) * 3.0 + sin(phase * 0.4 + 1.0) * 1.5;
            pos.y += cos(phase * 0.5) * 1.5 + sin(phase * 0.3) * 0.8;

            // Gentle Z-sway on beats (not harsh punch)
            pos.z += uBeatPunch * 12.0 * sin(aPhase * 2.0 + uTime * 0.5);

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            // Size scaling on bass (slightly tamed)
            float bassScale = pow(uBass, 1.3) * 7.0;
            float subScale = pow(uSubBass, 1.5) * 4.0;
            float beatScale = uBeatPunch * 5.0;
            float size = aSize * (1.0 + bassScale + subScale + beatScale);
            gl_PointSize = size * uPixelRatio * (55.0 / -mvPosition.z);

            vAlpha = 0.12 + uBass * 0.45 + uBeatPunch * 0.25;

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uForge;
        varying float vAlpha;

        void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;

            // Soft, thick falloff — heavy feel
            float alpha = pow(1.0 - d, 2.0) * vAlpha * uForge;

            // Warmer tint for bass
            vec3 col = uColor * 1.2 + vec3(0.08, 0.02, 0.0);
            gl_FragColor = vec4(col, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const bassPoints = new THREE.Points(bassGeo, bassMat);
bassPoints.renderOrder = 1;
scene.add(bassPoints);

// ============================================================
// ZONE 2: MID PARTICLES — Center Field, Flowing Bokeh
// Medium orbs, wider spread, driven by mids + vocals
// ============================================================

const MID_COUNT = 250;
const midGeo = new THREE.BufferGeometry();
const midPos = new Float32Array(MID_COUNT * 3);
const midSizes = new Float32Array(MID_COUNT);
const midPhases = new Float32Array(MID_COUNT);
const midSpeeds = new Float32Array(MID_COUNT * 3);

for (let i = 0; i < MID_COUNT; i++) {
    midPos[i * 3] = (Math.random() - 0.5) * 110;   // wide x
    midPos[i * 3 + 1] = (Math.random() - 0.5) * 50;    // centered y
    midPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    midSizes[i] = Math.random() * 3.0 + 1.0;
    midPhases[i] = Math.random() * Math.PI * 2;
    midSpeeds[i * 3] = (Math.random() - 0.5) * 0.04;
    midSpeeds[i * 3 + 1] = -(Math.random() * 0.03 + 0.005); // gentle upward drift
    midSpeeds[i * 3 + 2] = 0;
}

midGeo.setAttribute('position', new THREE.BufferAttribute(midPos, 3));
midGeo.setAttribute('aSize', new THREE.BufferAttribute(midSizes, 1));
midGeo.setAttribute('aPhase', new THREE.BufferAttribute(midPhases, 1));

const midUniforms = {
    uTime: { value: 0 },
    uColor: { value: currentColor.clone() },
    uMids: { value: 0.0 },
    uBeatPunch: { value: 0.0 },
    uForge: { value: 1.0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
};

const midMat = new THREE.ShaderMaterial({
    uniforms: midUniforms,
    vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uMids;
        uniform float uBeatPunch;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
            vec3 pos = position;

            // Flowing, curvy, organic motion — multiple sine layers
            float phase = aPhase + uTime * 0.45;
            pos.x += sin(phase * 1.1) * 3.5 + cos(phase * 0.3 + 2.0) * 2.0;
            pos.y += cos(phase * 0.7) * 2.5 + sin(phase * 0.4) * 1.2;
            pos.x += sin(uTime * 0.15 + aPhase * 1.5) * 2.0; // slow drift

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            float midScale = pow(uMids, 1.2) * 4.0;
            float size = aSize * (1.0 + midScale + uBeatPunch * 1.5);
            gl_PointSize = size * uPixelRatio * (48.0 / -mvPosition.z);

            vAlpha = 0.1 + uMids * 0.45;

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uForge;
        varying float vAlpha;

        void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;

            float alpha = (1.0 - d * d) * vAlpha * uForge;
            gl_FragColor = vec4(uColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const midPoints = new THREE.Points(midGeo, midMat);
midPoints.renderOrder = 2;
scene.add(midPoints);

// ============================================================
// ZONE 3: HIGH PARTICLES — Upper Field + Edges, Crystalline Sparkle
// Tiny, sharp, shimmering — hi-hats, air, brightness
// ============================================================

const HIGH_COUNT = 500;
const highGeo = new THREE.BufferGeometry();
const highPos = new Float32Array(HIGH_COUNT * 3);
const highSizes = new Float32Array(HIGH_COUNT);
const highPhases = new Float32Array(HIGH_COUNT);

for (let i = 0; i < HIGH_COUNT; i++) {
    // Biased toward top half and edges
    const edge = Math.random() < 0.4;
    if (edge) {
        // Edge sparkle
        highPos[i * 3] = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 20);
        highPos[i * 3 + 1] = (Math.random() - 0.3) * 70;
    } else {
        // Upper field
        highPos[i * 3] = (Math.random() - 0.5) * 130;
        highPos[i * 3 + 1] = Math.random() * 35 + 5; // upper half
    }
    highPos[i * 3 + 2] = (Math.random() - 0.5) * 15 + 8;
    highSizes[i] = Math.random() * 1.0 + 0.2;
    highPhases[i] = Math.random() * Math.PI * 2;
}

highGeo.setAttribute('position', new THREE.BufferAttribute(highPos, 3));
highGeo.setAttribute('aSize', new THREE.BufferAttribute(highSizes, 1));
highGeo.setAttribute('aPhase', new THREE.BufferAttribute(highPhases, 1));

const highUniforms = {
    uTime: { value: 0 },
    uHighs: { value: 0.0 },
    uBeatPunch: { value: 0.0 },
    uForge: { value: 1.0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
};

const highMat = new THREE.ShaderMaterial({
    uniforms: highUniforms,
    vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uHighs;
        uniform float uBeatPunch;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

            // Gentle twinkle — slower, smoother
            float twinkle = sin(aPhase + uTime * 2.0) * 0.5 + 0.5;
            float twinkle2 = sin(aPhase * 1.3 + uTime * 1.4) * 0.5 + 0.5;
            float combinedTwinkle = twinkle * 0.6 + twinkle2 * 0.4; // layered, less binary

            // Sparkle responds to highs (tamed)
            float highsPow = pow(uHighs, 1.3);
            float size = aSize * (0.6 + combinedTwinkle * 0.4) * (1.0 + highsPow * 5.0 + uBeatPunch * 1.0);
            gl_PointSize = size * uPixelRatio * (35.0 / -mvPosition.z);

            // Softer alpha — no harsh on/off
            vAlpha = pow(combinedTwinkle, 1.5) * (0.12 + highsPow * 1.5);

            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform float uForge;
        varying float vAlpha;

        void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;

            // Sharp falloff — crystalline, not soft
            float alpha = pow(1.0 - d, 3.0) * vAlpha * uForge;

            // Cool white with slight blue tint
            vec3 col = vec3(0.9, 0.93, 1.0);
            gl_FragColor = vec4(col, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const highPoints = new THREE.Points(highGeo, highMat);
highPoints.renderOrder = 3;
scene.add(highPoints);

// ============================================================
// PARTICLE CPU MOTION
// ============================================================

function updateBassParticles() {
    const p = bassGeo.attributes.position.array;
    const audio = window.audioData;
    const chaos = 1.0 + (1.0 - forgeStage) * 2.0;

    for (let i = 0; i < BASS_COUNT; i++) {
        const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

        // Slow, heavy movement
        p[ix] += bassSpeeds[ix] * (1.0 + (audio.bass || 0) * 3.0) * chaos;
        p[iy] += bassSpeeds[iy] * (1.0 + (audio.subBass || 0) * 2.0);

        // Z decay
        p[iz] *= 0.93;

        // Beat punch: random particles blast forward
        if (audio.isBeat && Math.random() < 0.35) {
            p[iz] += (audio.beatIntensity || 0) * 10.0;
        }

        // Keep anchored to bottom center
        if (p[ix] < -30) p[ix] = 30;
        if (p[ix] > 30) p[ix] = -30;
        if (p[iy] < -35) p[iy] = -5;
        if (p[iy] > 0) p[iy] = -25;
    }
    bassGeo.attributes.position.needsUpdate = true;
}

function updateMidParticles() {
    const p = midGeo.attributes.position.array;
    const audio = window.audioData;
    const chaos = 1.0 + (1.0 - forgeStage) * 3.0;
    const speed = intensity * 2.0 + 0.3 + (audio.mids || 0) * 4.0;

    for (let i = 0; i < MID_COUNT; i++) {
        const ix = i * 3, iy = i * 3 + 1;

        p[ix] += midSpeeds[ix] * speed * chaos;
        p[iy] += midSpeeds[iy] * speed;

        // Wrap
        if (p[ix] < -60) p[ix] = 60;
        if (p[ix] > 60) p[ix] = -60;
        if (p[iy] < -30) {
            p[iy] = 30;
            p[ix] = (Math.random() - 0.5) * 110;
        }
    }
    midGeo.attributes.position.needsUpdate = true;
}

// ============================================================
// CATALOG
// ============================================================

function setTrack(index) {
    const track = window.allLoveCatalog[index];
    if (!track) return;
    targetColor.set(track.synHex || '#2d3142');
    intensity = track.intensity || 0.5;

    const el = document.getElementById('intensitySlider');
    if (el) el.value = Math.round(intensity * 100);

    const hex = document.getElementById('hexDisplay');
    if (hex) hex.textContent = track.synHex || '#2d3142';
    document.documentElement.style.setProperty('--accent-color', track.synHex || '#47e6a6');

    if (track.audioUrl && typeof window.playCatalogTrack === 'function') {
        window.playCatalogTrack(track.audioUrl);
    }
}
window.setTrack = setTrack;

function populateCatalog() {
    const sel = document.getElementById('trackSelector');
    if (!sel || typeof window.allLoveCatalog === 'undefined') return;
    window.allLoveCatalog.forEach((track, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = `${track.trackNumber}. ${track.title} [${track.key}]`;
        sel.appendChild(opt);
    });
    setTrack(0);
}

// ============================================================
// ANIMATION LOOP
// ============================================================

const clock = new THREE.Clock();
let beatFlashDecay = 0;
let beatPunchDecay = 0;

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    const audio = window.audioData || {};

    // Color lerp
    currentColor.lerp(targetColor, 0.04);

    // Audio values (default to idle breathing)
    let subBass = 0, bass = 0, mids = 0, highs = 0;

    if (audio.isActive) {
        subBass = audio.rawSubBass || 0;
        bass = audio.rawBass || 0;
        mids = audio.mids || 0;
        highs = audio.highs || 0;

        if (audio.isBeat) {
            beatFlashDecay = audio.beatIntensity;
            beatPunchDecay = audio.beatIntensity;
        }
    } else {
        // Idle breathing
        subBass = Math.sin(elapsed * 0.5) * 0.08 * intensity;
        mids = Math.sin(elapsed * 0.7) * 0.05 * intensity;
    }

    // Slower decay = smoother transitions, less stroboscopic
    beatFlashDecay *= 0.72;
    beatPunchDecay *= 0.78;

    // --- Bloom: beat-driven but capped for eye safety ---
    bloomPass.strength = audio.isActive
        ? Math.min((0.3 + beatPunchDecay * 1.8 + bass * 0.4) * forgeStage, 2.5)
        : (0.3 + intensity * 0.3) * forgeStage;

    // --- Wash ---
    washUniforms.uTime.value = elapsed;
    washUniforms.uColor.value.copy(currentColor);
    washUniforms.uSubBass.value = subBass;
    washUniforms.uBass.value = bass;
    washUniforms.uMids.value = mids;
    washUniforms.uHighs.value = highs;
    washUniforms.uBeatFlash.value = beatFlashDecay;
    washUniforms.uForge.value = forgeStage;

    // --- Bass zone ---
    updateBassParticles();
    bassUniforms.uTime.value = elapsed;
    bassUniforms.uColor.value.copy(currentColor);
    bassUniforms.uSubBass.value = subBass;
    bassUniforms.uBass.value = bass;
    bassUniforms.uBeatPunch.value = beatPunchDecay;
    bassUniforms.uForge.value = forgeStage;

    // --- Mid zone ---
    updateMidParticles();
    midUniforms.uTime.value = elapsed;
    midUniforms.uColor.value.copy(currentColor);
    midUniforms.uMids.value = mids;
    midUniforms.uBeatPunch.value = beatPunchDecay;
    midUniforms.uForge.value = forgeStage;

    // --- High zone ---
    highUniforms.uTime.value = elapsed;
    highUniforms.uHighs.value = highs;
    highUniforms.uBeatPunch.value = beatPunchDecay;
    highUniforms.uForge.value = forgeStage;

    // Render
    composer.render();
}

// ============================================================
// PANEL CONTROL (hidden by default, slide-in)
// ============================================================

function setupPanel() {
    const panel = document.getElementById('controlPanel');
    const hint = document.getElementById('panelHint');
    if (!panel) return;

    let panelOpen = false;

    function togglePanel(open) {
        panelOpen = typeof open === 'boolean' ? open : !panelOpen;
        panel.classList.toggle('panel-visible', panelOpen);
        if (hint) hint.style.opacity = panelOpen ? '0' : '';
    }

    // Tab key toggles
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            togglePanel();
        }
        // F for true fullscreen
        if (e.key.toLowerCase() === 'f' && !panelOpen) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => { });
            } else {
                document.exitFullscreen();
            }
        }
        // Escape closes panel
        if (e.key === 'Escape' && panelOpen) {
            togglePanel(false);
        }
    });

    // Mouse hover left edge opens
    document.addEventListener('mousemove', (e) => {
        if (e.clientX < 8 && !panelOpen) {
            togglePanel(true);
        }
    });

    // Click outside closes
    document.addEventListener('click', (e) => {
        if (panelOpen && !panel.contains(e.target) && e.target !== hint) {
            togglePanel(false);
        }
    });

    // Fade hint after 4 seconds
    if (hint) {
        setTimeout(() => {
            hint.classList.add('hint-fade');
        }, 4000);
    }

    // Wire up controls
    const trackSel = document.getElementById('trackSelector');
    const intensityEl = document.getElementById('intensitySlider');
    const forgeEl = document.getElementById('forgeSlider');
    const catBtn = document.getElementById('modeCatalogBtn');
    const liveBtn = document.getElementById('modeLiveBtn');
    const catControls = document.getElementById('catalogControls');
    const liveControls = document.getElementById('liveAudioControls');

    if (trackSel) trackSel.addEventListener('change', (e) => {
        if (currentMode === 'catalog') setTrack(e.target.value);
    });

    if (intensityEl) intensityEl.addEventListener('input', (e) => {
        intensity = e.target.value / 100;
        window.intensity = intensity;
    });

    if (forgeEl) forgeEl.addEventListener('input', (e) => {
        forgeStage = e.target.value / 100;
        window.forgeStage = forgeStage;
    });

    if (catBtn) catBtn.addEventListener('click', () => {
        currentMode = 'catalog';
        window.currentMode = 'catalog';
        catBtn.classList.add('active');
        if (liveBtn) liveBtn.classList.remove('active');
        if (catControls) catControls.classList.remove('hidden');
        if (liveControls) liveControls.classList.add('hidden');
    });

    if (liveBtn) liveBtn.addEventListener('click', () => {
        currentMode = 'live';
        window.currentMode = 'live';
        liveBtn.classList.add('active');
        if (catBtn) catBtn.classList.remove('active');
        if (liveControls) liveControls.classList.remove('hidden');
        if (catControls) catControls.classList.add('hidden');
        if (typeof window.stopCatalogTrack === 'function') window.stopCatalogTrack();
    });
}

// ============================================================
// RESIZE
// ============================================================

window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
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
setupPanel();
animate();
