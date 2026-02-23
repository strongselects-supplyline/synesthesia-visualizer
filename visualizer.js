const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');
const trackSelector = document.getElementById('trackSelector');
const hexDisplay = document.getElementById('hexDisplay');
const intensitySlider = document.getElementById('intensitySlider');

const synMap = {
    'C Major': '#7bdff2', 'C# Major': '#b2f7ef', 'D Major': '#eff7f6', 'D# Major': '#f7d6e0',
    'E Major': '#f2b5d4', 'F Major': '#b388eb', 'F# Major': '#8093f1', 'G Major': '#72ddf7',
    'G# Major': '#69fff1', 'A Major': '#5eead4', 'A# Major': '#f7c66a', 'B Major': '#ffd166',
    'C Minor': '#1f3a5f', 'C# Minor': '#1b2a41', 'D Minor': '#2d1b3d', 'D# Minor': '#3a1f2b',
    'E Minor': '#1f3a2b', 'F Minor': '#2b1f3a', 'F# Minor': '#1f2b3a', 'G Minor': '#2a2a2a',
    'G# Minor': '#23395d', 'A Minor': '#2b2d42', 'A# Minor': '#3d2c2e', 'B Minor': '#2d3142'
};

let width, height;
let particles = [];
let currentColor = synMap['B Minor']; // default
let targetColor = currentColor;
let intensity = 0.5;

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
    targetColor = synMap[track.key] || '#2d3142';

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

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 100 + 50;
        this.baseSize = this.size;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.opacity = Math.random() * 0.3 + 0.1;
        this.phi = Math.random() * Math.PI * 2;
    }

    update() {
        // Particles move faster with higher intensity
        this.x += this.vx * (intensity * 2 + 0.5);
        this.y += this.vy * (intensity * 2 + 0.5);

        // Wrap around
        if (this.x < -this.size) this.x = width + this.size;
        if (this.x > width + this.size) this.x = -this.size;
        if (this.y < -this.size) this.y = height + this.size;
        if (this.y > height + this.size) this.y = -this.size;

        this.phi += 0.01;
        this.size = this.baseSize + Math.sin(this.phi) * (20 * intensity);
    }

    draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, currentColor + '44'); // Add alpha to hex
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createParticles() {
    particles = [];
    const count = Math.floor((width * height) / 15000);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
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

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function animate() {
    ctx.fillStyle = '#061014';
    ctx.fillRect(0, 0, width, height);

    // Smooth color transition
    if (currentColor !== targetColor) {
        currentColor = interpolateColor(currentColor, targetColor, 0.05);
    }

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

trackSelector.addEventListener('change', (e) => {
    setTrack(e.target.value);
});

intensitySlider.addEventListener('input', (e) => {
    intensity = e.target.value / 100;
});

init();
