// ============================================================
// Synesthesia Visualizer — Audio Engine v2.0
// Beat Detection (Spectral Flux) + Temporal Smoothing + Clean Lifecycle
// ============================================================

let audioCtx = null;
let analyser = null;
let source = null;
let dataArray = null;
let prevSpectrum = null;
let bufferLength = 0;
let audioLoopId = null;
let currentStream = null; // track mic stream for clean teardown
let currentBufferSource = null; // track file playback for clean teardown

// --- Exposed Audio Data (consumed by visualizer.js) ---
window.audioData = {
    // Smoothed frequency bands (0–1 normalized)
    subBass: 0,
    bass: 0,
    mids: 0,
    highs: 0,

    // Beat detection
    isBeat: false,       // true on the frame a beat is detected
    beatIntensity: 0,    // 0–1 strength of the detected beat
    bpm: 0,              // estimated BPM (rolling average)
    timeSinceBeat: 0,    // ms since last beat

    // Energy
    energy: 0,           // overall energy 0–1
    spectralFlux: 0,     // raw spectral flux value

    isActive: false
};

// --- Tuning Constants ---
const SMOOTHING_RISE = 0.25;     // how fast bands ramp UP (lower = smoother)
const SMOOTHING_FALL = 0.08;     // how fast bands decay DOWN
const BEAT_THRESHOLD = 1.4;      // flux must exceed avg * this multiplier
const BEAT_COOLDOWN_MS = 120;    // minimum ms between beats
const BPM_HISTORY_SIZE = 24;     // number of beat intervals to average for BPM

// --- Beat Detection State ---
let fluxHistory = [];
const FLUX_HISTORY_SIZE = 43;    // ~0.7s at 60fps — local average window
let lastBeatTime = 0;
let beatIntervals = [];

// --- DOM refs ---
const fileInput = document.getElementById('audioFileUpload');
const radioMic = document.getElementById('srcMic');
const radioFile = document.getElementById('srcFile');

// ============================================================
// INIT / LIFECYCLE
// ============================================================

function initAudio() {
    if (audioCtx && audioCtx.state !== 'closed') return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3; // slight hardware smoothing
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    prevSpectrum = new Float32Array(bufferLength);
    fluxHistory = [];
}

function teardownSource() {
    // Cleanly disconnect whatever source is active
    try {
        if (currentBufferSource) {
            currentBufferSource.stop();
            currentBufferSource.disconnect();
            currentBufferSource = null;
        }
    } catch (e) { /* already stopped */ }

    try {
        if (source) {
            source.disconnect();
            source = null;
        }
    } catch (e) { /* already disconnected */ }

    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
    }

    window.audioData.isActive = false;
}

function ensureContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
        initAudio();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// ============================================================
// FREQUENCY BAND EXTRACTION (with asymmetric smoothing)
// ============================================================

function bandAverage(arr, start, end) {
    let sum = 0;
    const clamped = Math.min(end, arr.length);
    for (let i = start; i < clamped; i++) {
        sum += arr[i];
    }
    return sum / (clamped - start);
}

function smoothValue(current, target, rise, fall) {
    // Asymmetric EMA: fast attack, slow release
    const factor = target > current ? rise : fall;
    return current + (target - current) * factor;
}

function updateBands() {
    // Raw averages normalized to 0–1
    const rawSub  = bandAverage(dataArray, 1, 3) / 255;
    const rawBass = bandAverage(dataArray, 3, 12) / 255;
    const rawMids = bandAverage(dataArray, 12, 186) / 255;
    const rawHighs = bandAverage(dataArray, 186, 930) / 255;

    // Smooth with asymmetric attack/release
    window.audioData.subBass = smoothValue(window.audioData.subBass, rawSub, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.bass    = smoothValue(window.audioData.bass, rawBass, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.mids    = smoothValue(window.audioData.mids, rawMids, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.highs   = smoothValue(window.audioData.highs, rawHighs, SMOOTHING_RISE, SMOOTHING_FALL);

    // Overall energy (weighted toward bass)
    window.audioData.energy = (rawSub * 0.3) + (rawBass * 0.35) + (rawMids * 0.25) + (rawHighs * 0.1);
}

// ============================================================
// BEAT DETECTION (Spectral Flux)
// ============================================================
// Spectral flux = sum of positive frequency magnitude changes frame-to-frame.
// When flux spikes above a running average * threshold → beat detected.

function detectBeat() {
    let flux = 0;

    for (let i = 0; i < bufferLength; i++) {
        const current = dataArray[i] / 255;
        const prev = prevSpectrum[i];
        const diff = current - prev;

        // Only count INCREASES (onset energy, not decay)
        if (diff > 0) {
            flux += diff;
        }

        prevSpectrum[i] = current;
    }

    // Normalize flux by bin count for consistency across FFT sizes
    flux = flux / bufferLength * 100;
    window.audioData.spectralFlux = flux;

    // Maintain rolling average
    fluxHistory.push(flux);
    if (fluxHistory.length > FLUX_HISTORY_SIZE) {
        fluxHistory.shift();
    }

    const avgFlux = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
    const now = performance.now();
    const timeSinceLast = now - lastBeatTime;

    window.audioData.timeSinceBeat = timeSinceLast;

    // Beat condition: flux exceeds threshold AND cooldown has passed
    if (flux > avgFlux * BEAT_THRESHOLD && timeSinceLast > BEAT_COOLDOWN_MS) {
        window.audioData.isBeat = true;
        window.audioData.beatIntensity = Math.min((flux / avgFlux) / 3, 1.0); // normalize strength

        // BPM estimation from interval history
        if (lastBeatTime > 0) {
            beatIntervals.push(timeSinceLast);
            if (beatIntervals.length > BPM_HISTORY_SIZE) {
                beatIntervals.shift();
            }
            const avgInterval = beatIntervals.reduce((a, b) => a + b, 0) / beatIntervals.length;
            window.audioData.bpm = Math.round(60000 / avgInterval);
        }

        lastBeatTime = now;
    } else {
        window.audioData.isBeat = false;
        // Decay beat intensity smoothly between beats
        window.audioData.beatIntensity *= 0.92;
    }
}

// ============================================================
// MAIN AUDIO LOOP
// ============================================================

function processAudio() {
    if (!window.audioData.isActive) {
        audioLoopId = null;
        return;
    }

    analyser.getByteFrequencyData(dataArray);
    updateBands();
    detectBeat();

    audioLoopId = requestAnimationFrame(processAudio);
}

function startProcessing() {
    window.audioData.isActive = true;
    if (!audioLoopId) {
        processAudio();
    }
}

// ============================================================
// SOURCE: MICROPHONE
// ============================================================

function connectMic() {
    ensureContext();
    teardownSource();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            currentStream = stream;
            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            // Do NOT connect analyser to destination (no feedback loop)
            startProcessing();
        })
        .catch(err => console.error('Mic access denied:', err));
}

// ============================================================
// SOURCE: FILE UPLOAD
// ============================================================

fileInput.addEventListener('change', function () {
    ensureContext();
    teardownSource();

    const files = this.files;
    const nameEl = document.getElementById('uploadFileName');

    if (files.length === 0) {
        nameEl.textContent = '';
        return;
    }

    const file = files[0];
    nameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
        audioCtx.decodeAudioData(e.target.result).then(buffer => {
            currentBufferSource = audioCtx.createBufferSource();
            currentBufferSource.buffer = buffer;
            currentBufferSource.connect(analyser);
            analyser.connect(audioCtx.destination); // play through speakers

            currentBufferSource.onended = () => {
                window.audioData.isActive = false;
                nameEl.textContent += ' (ended)';
            };

            currentBufferSource.start(0);
            source = currentBufferSource;
            startProcessing();
        }).catch(err => console.error('Error decoding audio:', err));
    };
    reader.readAsArrayBuffer(file);
});

// ============================================================
// SOURCE SWITCHING (radio buttons)
// ============================================================

radioMic.addEventListener('change', () => {
    if (radioMic.checked) connectMic();
});

radioFile.addEventListener('change', () => {
    if (radioFile.checked) {
        teardownSource(); // stop mic, wait for file
    }
});

// Re-activate processing when entering Live mode
document.getElementById('modeLiveBtn').addEventListener('click', () => {
    ensureContext();
    if (radioMic.checked && !window.audioData.isActive) {
        connectMic();
    } else if (window.audioData.isActive && !audioLoopId) {
        processAudio();
    }
});
