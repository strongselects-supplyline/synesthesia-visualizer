// ============================================================
// Synesthesia Visualizer — Audio Engine v2.1
// Beat Detection (Spectral Flux) + Temporal Smoothing
// + Catalog Playback via <audio> element
// ============================================================

let audioCtx = null;
let analyser = null;
let source = null;
let dataArray = null;
let prevSpectrum = null;
let bufferLength = 0;
let audioLoopId = null;
let currentStream = null;
let currentBufferSource = null;
let catalogAudioEl = null; // <audio> element for catalog playback
let catalogMediaSource = null; // MediaElementSourceNode

// --- Exposed Audio Data (consumed by visualizer.js) ---
window.audioData = {
    // Smoothed frequency bands (0–1 normalized)
    subBass: 0,
    bass: 0,
    mids: 0,
    highs: 0,

    // Raw (unsmoothed) for violent reactions
    rawSubBass: 0,
    rawBass: 0,
    rawMids: 0,
    rawHighs: 0,

    // Beat detection
    isBeat: false,
    beatIntensity: 0,    // 0–1 strength of detected beat
    bpm: 0,
    timeSinceBeat: 0,

    // Energy
    energy: 0,
    spectralFlux: 0,

    isActive: false
};

// --- Tuning Constants ---
const SMOOTHING_RISE = 0.35;     // fast attack
const SMOOTHING_FALL = 0.06;     // slow release (breathe)
const BEAT_THRESHOLD = 1.35;     // flux must exceed avg * this
const BEAT_COOLDOWN_MS = 100;    // minimum ms between beats (allows fast double-kicks)
const BPM_HISTORY_SIZE = 24;

// --- Beat Detection State ---
let fluxHistory = [];
const FLUX_HISTORY_SIZE = 43;
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
    analyser.smoothingTimeConstant = 0.2; // less hardware smoothing = more transient detail
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    prevSpectrum = new Float32Array(bufferLength);
    fluxHistory = [];
}

function teardownSource() {
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

    // Stop catalog audio element
    if (catalogAudioEl) {
        catalogAudioEl.pause();
        catalogAudioEl.currentTime = 0;
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
// CATALOG PLAYBACK (plays actual audio for catalog tracks)
// ============================================================

window.playCatalogTrack = function(url) {
    if (!url) return;

    ensureContext();
    teardownSource();

    // Get or create the hidden <audio> element
    catalogAudioEl = document.getElementById('catalogAudioPlayer');
    if (!catalogAudioEl) {
        catalogAudioEl = document.createElement('audio');
        catalogAudioEl.id = 'catalogAudioPlayer';
        catalogAudioEl.crossOrigin = 'anonymous';
        document.body.appendChild(catalogAudioEl);
    }

    catalogAudioEl.src = url;

    // Only create MediaElementSource once per element
    if (!catalogMediaSource) {
        catalogMediaSource = audioCtx.createMediaElementSource(catalogAudioEl);
    }

    catalogMediaSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    catalogAudioEl.play().then(() => {
        startProcessing();
    }).catch(err => {
        console.error('Catalog playback failed:', err);
    });

    catalogAudioEl.onended = () => {
        window.audioData.isActive = false;
    };
};

window.stopCatalogTrack = function() {
    if (catalogAudioEl) {
        catalogAudioEl.pause();
        catalogAudioEl.currentTime = 0;
    }
    window.audioData.isActive = false;
};

// ============================================================
// FREQUENCY BAND EXTRACTION
// ============================================================

function bandAverage(arr, start, end) {
    let sum = 0;
    const clamped = Math.min(end, arr.length);
    for (let i = start; i < clamped; i++) {
        sum += arr[i];
    }
    return sum / (clamped - start);
}

// Weighted band average — emphasize louder bins for punchier response
function bandWeightedPeak(arr, start, end) {
    let peak = 0;
    let sum = 0;
    const clamped = Math.min(end, arr.length);
    for (let i = start; i < clamped; i++) {
        const v = arr[i] / 255;
        sum += v;
        if (v > peak) peak = v;
    }
    const avg = sum / (clamped - start);
    // Blend: 60% peak + 40% average — transients punch through
    return peak * 0.6 + avg * 0.4;
}

function smoothValue(current, target, rise, fall) {
    const factor = target > current ? rise : fall;
    return current + (target - current) * factor;
}

function updateBands() {
    // Use peak-weighted extraction for punchier response
    const rawSub  = bandWeightedPeak(dataArray, 1, 3);
    const rawBass = bandWeightedPeak(dataArray, 3, 12);
    const rawMids = bandWeightedPeak(dataArray, 12, 186);
    const rawHighs = bandWeightedPeak(dataArray, 186, 930);

    // Store raw values for violent/immediate reactions
    window.audioData.rawSubBass = rawSub;
    window.audioData.rawBass = rawBass;
    window.audioData.rawMids = rawMids;
    window.audioData.rawHighs = rawHighs;

    // Smoothed values for fluid motion
    window.audioData.subBass = smoothValue(window.audioData.subBass, rawSub, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.bass    = smoothValue(window.audioData.bass, rawBass, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.mids    = smoothValue(window.audioData.mids, rawMids, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.highs   = smoothValue(window.audioData.highs, rawHighs, SMOOTHING_RISE, SMOOTHING_FALL);

    // Overall energy (weighted toward bass for music)
    window.audioData.energy = (rawSub * 0.3) + (rawBass * 0.35) + (rawMids * 0.25) + (rawHighs * 0.1);
}

// ============================================================
// BEAT DETECTION (Spectral Flux — onset detection)
// ============================================================

function detectBeat() {
    let flux = 0;

    for (let i = 0; i < bufferLength; i++) {
        const current = dataArray[i] / 255;
        const prev = prevSpectrum[i];
        const diff = current - prev;

        if (diff > 0) {
            flux += diff;
        }
        prevSpectrum[i] = current;
    }

    flux = flux / bufferLength * 100;
    window.audioData.spectralFlux = flux;

    fluxHistory.push(flux);
    if (fluxHistory.length > FLUX_HISTORY_SIZE) {
        fluxHistory.shift();
    }

    const avgFlux = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
    const now = performance.now();
    const timeSinceLast = now - lastBeatTime;

    window.audioData.timeSinceBeat = timeSinceLast;

    if (flux > avgFlux * BEAT_THRESHOLD && timeSinceLast > BEAT_COOLDOWN_MS) {
        window.audioData.isBeat = true;
        // Scale beat intensity more aggressively
        window.audioData.beatIntensity = Math.min(Math.pow((flux / avgFlux) / 2, 1.5), 1.0);

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
        window.audioData.beatIntensity *= 0.88;
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
            analyser.connect(audioCtx.destination);

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
// SOURCE SWITCHING
// ============================================================

radioMic.addEventListener('change', () => {
    if (radioMic.checked) connectMic();
});

radioFile.addEventListener('change', () => {
    if (radioFile.checked) {
        teardownSource();
    }
});

document.getElementById('modeLiveBtn').addEventListener('click', () => {
    ensureContext();
    // Stop catalog playback when switching to live
    if (catalogAudioEl) {
        catalogAudioEl.pause();
        catalogAudioEl.currentTime = 0;
    }
    if (radioMic.checked && !window.audioData.isActive) {
        connectMic();
    } else if (window.audioData.isActive && !audioLoopId) {
        processAudio();
    }
});
