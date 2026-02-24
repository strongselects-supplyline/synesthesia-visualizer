const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');
const trackSelector = document.getElementById('trackSelector');
const hexDisplay = document.getElementById('hexDisplay');
const intensitySlider = document.getElementById('intensitySlider');
const forgeSlider = document.getElementById('forgeSlider');

const modeCatalogBtn = document.getElementById('modeCatalogBtn');
const modeLiveBtn = document.getElementById('modeLiveBtn');
const catalogControls = document.getElementById('catalogControls');
const liveAudioControls = document.getElementById('liveAudioControls');

let width, height;
let particles = [];
let currentColor = '#2d3142'; // default, picks up from setTrack() on init
let targetColor = currentColor;
let intensity = 0.5;
let forgeStage = 1.0; // 0.0 to 1.0 (The Forge concept slider)

// Application Modes: 'catalog' | 'live'
let currentMode = 'catalog';

function init() {
    // Populate dynamic track selector
    if (typeof allLoveCatalog !== 'undefined') {
        allLoveCatalog.forEach((track, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${track.trackNumber}. ${track.title} [${track.key}]`;
            trackSelector.appendChild(option);
        });

        // initial state
        setTrack(0);
    }

    resize();
    createParticles();
    animate();
}

function setTrack(index) {
    const track = allLoveCatalog[index];
    targetColor = track.synHex || '#2d3142';

    // Scale intensity (dynamically changing slider too)
    intensity = track.intensity || 0.5;
    intensitySlider.value = Math.round(intensity * 100);

    hexDisplay.textContent = targetColor;
    document.documentElement.style.setProperty('--accent-color', targetColor);
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);

// --- Layer 1: Background Wash ---
function drawBackgroundWash() {
    let t = Date.now() * 0.0005;
    let pulseScale = 1 + Math.sin(t) * (0.1 * intensity);
    let baseOpacity = 0.45; // Significantly higher base visibility

    // Audio Reactivity (Sub-bass drives pulse scale heavily)
    if (currentMode === 'live' && window.audioData && window.audioData.isActive) {
        const sub = window.audioData.subBass / 255; // 0 to 1
        pulseScale = 1 + (sub * 0.85); // Up to nearly double scale heartbeat
        baseOpacity += (sub * 0.35); // Boost opacity on sub hits!
    }

    pulseScale *= forgeStage;

    ctx.fillStyle = '#061014';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    // Shake effect on heavy sub
    const xOffset = (currentMode === 'live' && window.audioData) ? (window.audioData.subBass / 255) * 12 * Math.sin(t * 15) : 0;
    const yOffset = (currentMode === 'live' && window.audioData) ? (window.audioData.subBass / 255) * 12 * Math.cos(t * 15) : 0;

    const radius = Math.max(width, height) * 0.8 * pulseScale;
    const bgGradient = ctx.createRadialGradient(cx + xOffset, cy + yOffset, 0, cx + xOffset, cy + yOffset, radius);

    // Opacity scales with pulse and audio hits
    const rawAlpha = Math.floor(Math.min(baseOpacity, 1.0) * 255);
    const alpha = rawAlpha.toString(16).padStart(2, '0');
    bgGradient.addColorStop(0, currentColor + alpha);
    bgGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
}

// --- Layer 2: Mid-Field Bokeh (Ambient Particles) ---
class BokehParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 80 + 20;
        this.baseSize = this.size;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() * -1) - 0.2;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.phi = Math.random() * Math.PI * 2;
    }

    update() {
        let speedMult = (intensity * 3 + 1);
        let sizeMult = (15 * intensity);

        if (currentMode === 'live' && window.audioData && window.audioData.isActive) {
            // Mids drive speed
            const mids = window.audioData.mids / 255;
            speedMult += (mids * 5); // Spike speed on mids

            // Bass drives size
            const bass = window.audioData.bass / 255;
            sizeMult += (bass * 50); // Inflate on bass bumps
        }

        this.x += this.vx * speedMult;
        this.y += this.vy * speedMult;

        if (this.x < -this.size) this.x = width + this.size;
        if (this.x > width + this.size) this.x = -this.size;
        if (this.y < -this.size) {
            this.y = height + this.size;
            this.x = Math.random() * width;
        }

        this.phi += 0.02;
        this.size = this.baseSize + Math.sin(this.phi) * sizeMult;
    }

    draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        const alpha = Math.floor((this.opacity * forgeStage) * 255).toString(16).padStart(2, '0');
        gradient.addColorStop(0, currentColor + alpha);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(this.size, 0.1), 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Layer 3: Foreground Sparkle (High Frequency / Static Shimmer) ---
class SparkleParticle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.baseOpacity = Math.random() * 0.5 + 0.1;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.05 + 0.01;
    }

    draw() {
        this.phase += this.speed;
        let currentOpacity = this.baseOpacity + Math.sin(this.phase) * 0.3;
        let pSize = this.size;

        if (currentMode === 'live' && window.audioData && window.audioData.isActive) {
            // Highs drive brightness and dramatic size bump of sparkles
            const highs = window.audioData.highs / 255;
            currentOpacity += (highs * 1.5); // Sparkle POP!
            pSize += (highs * 3.5);
        }

        currentOpacity *= forgeStage;

        if (currentOpacity > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = Math.min(currentOpacity, 1.0);
            ctx.beginPath();
            ctx.arc(this.x, this.y, pSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

let bokehParticles = [];
let sparkleParticles = [];

function createParticles() {
    bokehParticles = [];
    sparkleParticles = [];

    // Mid-field count depends on screen size (base 50 - 150)
    const bokehCount = Math.floor((width * height) / 25000);
    for (let i = 0; i < bokehCount; i++) {
        bokehParticles.push(new BokehParticle());
    }

    // High frequency static shimmer layer (base 200 - 400)
    const sparkleCount = Math.floor((width * height) / 8000);
    for (let i = 0; i < sparkleCount; i++) {
        sparkleParticles.push(new SparkleParticle());
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return color2; // Fallback

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function animate() {
    // 1. Draw Background Wash
    drawBackgroundWash();

    // Smooth color transition logic
    if (currentColor !== targetColor) {
        currentColor = interpolateColor(currentColor, targetColor, 0.05);
    }

    // 2. Draw Mid-field Layer (Bokeh)
    bokehParticles.forEach(p => {
        p.update();
        p.draw();
    });

    // 3. Draw Foreground Layer (Sparkle/Shimmer)
    sparkleParticles.forEach(p => {
        // We will tie density/brightness to high-frequency audio later
        p.draw();
    });

    requestAnimationFrame(animate);
}

// --- Event Listeners ---

trackSelector.addEventListener('change', (e) => {
    if (currentMode === 'catalog') setTrack(e.target.value);
});

intensitySlider.addEventListener('input', (e) => {
    intensity = e.target.value / 100;
});

forgeSlider.addEventListener('input', (e) => {
    forgeStage = e.target.value / 100;
    // Forge stage controls global opacity mix - 0 is completely dark (raw), 1 is vivid
    document.documentElement.style.setProperty('--glass-blur', `blur(${16 * forgeStage}px)`);
});

modeCatalogBtn.addEventListener('click', () => {
    currentMode = 'catalog';
    modeCatalogBtn.classList.add('active');
    modeLiveBtn.classList.remove('active');
    catalogControls.classList.remove('hidden');
    liveAudioControls.classList.add('hidden');
});

modeLiveBtn.addEventListener('click', () => {
    currentMode = 'live';
    modeLiveBtn.classList.add('active');
    modeCatalogBtn.classList.remove('active');
    liveAudioControls.classList.remove('hidden');
    catalogControls.classList.add('hidden');
});

// Stage Mode / Performance Fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
        const overlay = document.querySelector('.ui-overlay');

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            overlay.classList.add('hidden'); // Hide all UI chrome
        } else {
            document.exitFullscreen();
            overlay.classList.remove('hidden'); // Restore UI
        }
    }
});

// Also restore UI if they press ESC to exit fullscreen naturally
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.querySelector('.ui-overlay').classList.remove('hidden');
    }
});

init();
