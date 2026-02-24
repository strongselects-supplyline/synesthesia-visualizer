// ============================================================
// Synesthesia Visualizer — Audio Engine v3.1 "Living Canvas"
// Beat Detection + Temporal Smoothing + Evolution Tracking
// + Chromagram Key Detection + Catalog Playback
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
let catalogAudioEl = null;
let catalogMediaSource = null;

// --- Exposed Audio Data (consumed by visualizer.js) ---
window.audioData = {
    // Smoothed frequency bands (0–1 normalized)
    subBass: 0, bass: 0, mids: 0, highs: 0,

    // Raw (unsmoothed) for immediate reactions
    rawSubBass: 0, rawBass: 0, rawMids: 0, rawHighs: 0,

    // Beat detection
    isBeat: false,
    beatIntensity: 0,
    bpm: 0,
    timeSinceBeat: 0,

    // Energy
    energy: 0,
    spectralFlux: 0,

    // --- NEW: Evolution / Delta tracking ---
    // Per-band evolution: -1 (dropping) to +1 (building)
    evolutionBass: 0,
    evolutionMids: 0,
    evolutionHighs: 0,
    energyTrend: 0,        // overall: -1 (breakdown) to +1 (buildup)
    songPhase: 0,          // 0 (calm) to 1 (peak), 30s envelope

    // --- NEW: Key detection ---
    detectedKey: '',       // e.g. "A Major"
    keyConfidence: 0,      // 0–1
    detectedHex: '',       // synesthesia hex for detected key

    isActive: false
};

// --- Tuning Constants ---
const SMOOTHING_RISE = 0.35;
const SMOOTHING_FALL = 0.06;
const BEAT_THRESHOLD = 1.35;
const BEAT_COOLDOWN_MS = 100;
const BPM_HISTORY_SIZE = 24;

// --- Beat Detection State ---
let fluxHistory = [];
const FLUX_HISTORY_SIZE = 43;
let lastBeatTime = 0;
let beatIntervals = [];

// --- Evolution State ---
// Rolling history: ~8 seconds at 60fps = ~480 frames, but we downsample to save memory
const EVOLUTION_HISTORY_SIZE = 120;  // store every 4th frame = ~8s at 60fps
const EVOLUTION_SAMPLE_RATE = 4;     // sample every N frames
let evolutionFrameCount = 0;

let bassHistory = [];
let midsHistory = [];
let highsHistory = [];
let energyHistory = [];

// Longer-term envelope for songPhase (~30s)
const PHASE_HISTORY_SIZE = 450;  // every 4th frame = ~30s
let phaseEnergyHistory = [];

// --- Key Detection State ---
const CHROMA_SMOOTH = 0.18;          // smoothing factor for chroma vector (higher = faster response)
let chromaVector = new Float32Array(12);  // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
let keyStableFrames = 0;
let lastDetectedKey = '';
const KEY_STABLE_THRESHOLD = 25;     // frames (~0.4s) key must be stable before accepting
const KEY_CONFIDENCE_MIN = 0.3;

// Krumhansl-Schmuckler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Synesthesia hex map (mirrors catalog.js)
const SYN_MAP = {
    'C Major': '#00A3A3', 'A Minor': '#00A3A3',
    'G Major': '#FFFFF0', 'E Minor': '#FFFFF0',
    'D Major': '#E2D077', 'B Minor': '#E2D077',
    'A Major': '#C4651D', 'F# Minor': '#C4651D',
    'E Major': '#DA70D6', 'C# Minor': '#DA70D6',
    'B Major': '#B0E0E6', 'G# Minor': '#B0E0E6',
    'Gb Major': '#FFFAFA', 'Eb Minor': '#FFFAFA',
    'Db Major': '#DAA520', 'Bb Minor': '#DAA520',
    'Ab Major': '#884513', 'F Minor': '#884513',
    'Eb Major': '#4B0082', 'C Minor': '#4B0082',
    'Bb Major': '#A52A2A', 'G Minor': '#A52A2A',
    'F Major': '#DC143C', 'D Minor': '#DC143C',
};

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
    analyser.smoothingTimeConstant = 0.2;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    prevSpectrum = new Float32Array(bufferLength);
    fluxHistory = [];

    // Reset evolution state
    bassHistory = [];
    midsHistory = [];
    highsHistory = [];
    energyHistory = [];
    phaseEnergyHistory = [];
    evolutionFrameCount = 0;
    chromaVector = new Float32Array(12);
    keyStableFrames = 0;
    lastDetectedKey = '';
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
// CATALOG PLAYBACK
// ============================================================

window.playCatalogTrack = function (url) {
    if (!url) return;

    ensureContext();
    teardownSource();

    catalogAudioEl = document.getElementById('catalogAudioPlayer');
    if (!catalogAudioEl) {
        catalogAudioEl = document.createElement('audio');
        catalogAudioEl.id = 'catalogAudioPlayer';
        catalogAudioEl.crossOrigin = 'anonymous';
        document.body.appendChild(catalogAudioEl);
    }

    catalogAudioEl.src = url;

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

window.stopCatalogTrack = function () {
    if (catalogAudioEl) {
        catalogAudioEl.pause();
        catalogAudioEl.currentTime = 0;
    }
    window.audioData.isActive = false;
};

// ============================================================
// FREQUENCY BAND EXTRACTION
// ============================================================

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
    return peak * 0.6 + avg * 0.4;
}

function smoothValue(current, target, rise, fall) {
    const factor = target > current ? rise : fall;
    return current + (target - current) * factor;
}

function updateBands() {
    const rawSub = bandWeightedPeak(dataArray, 1, 3);
    const rawBass = bandWeightedPeak(dataArray, 3, 12);
    const rawMids = bandWeightedPeak(dataArray, 12, 186);
    const rawHighs = bandWeightedPeak(dataArray, 186, 930);

    window.audioData.rawSubBass = rawSub;
    window.audioData.rawBass = rawBass;
    window.audioData.rawMids = rawMids;
    window.audioData.rawHighs = rawHighs;

    window.audioData.subBass = smoothValue(window.audioData.subBass, rawSub, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.bass = smoothValue(window.audioData.bass, rawBass, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.mids = smoothValue(window.audioData.mids, rawMids, SMOOTHING_RISE, SMOOTHING_FALL);
    window.audioData.highs = smoothValue(window.audioData.highs, rawHighs, SMOOTHING_RISE, SMOOTHING_FALL);

    window.audioData.energy = (rawSub * 0.3) + (rawBass * 0.35) + (rawMids * 0.25) + (rawHighs * 0.1);
}

// ============================================================
// BEAT DETECTION (Spectral Flux)
// ============================================================

function detectBeat() {
    let flux = 0;

    for (let i = 0; i < bufferLength; i++) {
        const current = dataArray[i] / 255;
        const prev = prevSpectrum[i];
        const diff = current - prev;
        if (diff > 0) flux += diff;
        prevSpectrum[i] = current;
    }

    flux = flux / bufferLength * 100;
    window.audioData.spectralFlux = flux;

    fluxHistory.push(flux);
    if (fluxHistory.length > FLUX_HISTORY_SIZE) fluxHistory.shift();

    const avgFlux = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
    const now = performance.now();
    const timeSinceLast = now - lastBeatTime;

    window.audioData.timeSinceBeat = timeSinceLast;

    if (flux > avgFlux * BEAT_THRESHOLD && timeSinceLast > BEAT_COOLDOWN_MS) {
        window.audioData.isBeat = true;
        window.audioData.beatIntensity = Math.min(Math.pow((flux / avgFlux) / 2, 1.5), 1.0);

        if (lastBeatTime > 0) {
            beatIntervals.push(timeSinceLast);
            if (beatIntervals.length > BPM_HISTORY_SIZE) beatIntervals.shift();
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
// EVOLUTION TRACKING — Per-band amplitude deltas
// ============================================================

function updateEvolution() {
    evolutionFrameCount++;
    if (evolutionFrameCount % EVOLUTION_SAMPLE_RATE !== 0) return;

    const ad = window.audioData;

    // Push current smoothed values into history
    bassHistory.push(ad.bass + ad.subBass * 0.5);
    midsHistory.push(ad.mids);
    highsHistory.push(ad.highs);
    energyHistory.push(ad.energy);
    phaseEnergyHistory.push(ad.energy);

    if (bassHistory.length > EVOLUTION_HISTORY_SIZE) bassHistory.shift();
    if (midsHistory.length > EVOLUTION_HISTORY_SIZE) midsHistory.shift();
    if (highsHistory.length > EVOLUTION_HISTORY_SIZE) highsHistory.shift();
    if (energyHistory.length > EVOLUTION_HISTORY_SIZE) energyHistory.shift();
    if (phaseEnergyHistory.length > PHASE_HISTORY_SIZE) phaseEnergyHistory.shift();

    // Need at least half the window before computing
    if (bassHistory.length < 20) return;

    // Compute evolution: compare recent average (last 25%) vs. older average (first 50%)
    ad.evolutionBass = computeEvolution(bassHistory);
    ad.evolutionMids = computeEvolution(midsHistory);
    ad.evolutionHighs = computeEvolution(highsHistory);
    ad.energyTrend = computeEvolution(energyHistory);

    // Song phase: where are we in terms of peak energy? (0 = calm, 1 = peak)
    if (phaseEnergyHistory.length > 30) {
        const maxE = Math.max(...phaseEnergyHistory);
        const currentE = energyHistory.length > 5
            ? energyHistory.slice(-5).reduce((a, b) => a + b) / 5
            : ad.energy;
        ad.songPhase = maxE > 0.01 ? Math.min(currentE / maxE, 1.0) : 0;
    }
}

function computeEvolution(history) {
    const len = history.length;
    const recentStart = Math.floor(len * 0.75);
    const olderEnd = Math.floor(len * 0.5);

    let recentAvg = 0;
    for (let i = recentStart; i < len; i++) recentAvg += history[i];
    recentAvg /= (len - recentStart);

    let olderAvg = 0;
    for (let i = 0; i < olderEnd; i++) olderAvg += history[i];
    olderAvg /= olderEnd;

    // Normalize to -1 to +1 range
    const diff = recentAvg - olderAvg;
    const scale = Math.max(olderAvg, recentAvg, 0.05); // avoid divide by zero
    return Math.max(-1, Math.min(1, diff / scale));
}

// ============================================================
// KEY DETECTION — Chromagram + Krumhansl-Schmuckler
// ============================================================

// Relative major/minor pairs share the same root (e.g., A Major = F# Minor)
const RELATIVE_MINOR_MAP = {
    'C Major': 'A Minor', 'A Minor': 'C Major',
    'G Major': 'E Minor', 'E Minor': 'G Major',
    'D Major': 'B Minor', 'B Minor': 'D Major',
    'A Major': 'F# Minor', 'F# Minor': 'A Major',
    'E Major': 'C# Minor', 'C# Minor': 'E Major',
    'B Major': 'G# Minor', 'G# Minor': 'B Major',
    'Gb Major': 'Eb Minor', 'Eb Minor': 'Gb Major',
    'Db Major': 'Bb Minor', 'Bb Minor': 'Db Major',
    'Ab Major': 'F Minor', 'F Minor': 'Ab Major',
    'Eb Major': 'C Minor', 'C Minor': 'Eb Major',
    'Bb Major': 'G Minor', 'G Minor': 'Bb Major',
    'F Major': 'D Minor', 'D Minor': 'F Major',
};

let keyDebugTimer = 0;

function updateKeyDetection() {
    if (!audioCtx || !dataArray) return;

    const sampleRate = audioCtx.sampleRate;
    const binWidth = sampleRate / analyser.fftSize;

    // Build raw chroma vector from FFT data
    const rawChroma = new Float32Array(12);
    let totalMagnitude = 0;

    for (let i = 1; i < bufferLength; i++) {
        const magnitude = dataArray[i] / 255;
        if (magnitude < 0.03) continue; // lower noise gate for better pitch capture

        const freq = i * binWidth;
        if (freq < 80 || freq > 4000) continue; // tighter range: bass + vocals + leads

        // Convert frequency to pitch class (0=C, 1=C#, ... 11=B)
        const midiNote = 12 * Math.log2(freq / 440) + 69;
        const pitchClass = Math.round(midiNote) % 12;
        const normalizedPC = pitchClass < 0 ? pitchClass + 12 : pitchClass;

        // Weight by magnitude cubed (STRONGLY emphasize dominant pitches)
        rawChroma[normalizedPC] += magnitude * magnitude * magnitude;
        totalMagnitude += magnitude;
    }

    // Skip if very little total energy
    if (totalMagnitude < 1.0) return;

    // Smooth the chroma vector over time
    for (let i = 0; i < 12; i++) {
        chromaVector[i] = chromaVector[i] * (1 - CHROMA_SMOOTH) + rawChroma[i] * CHROMA_SMOOTH;
    }

    // Normalize chroma vector
    let chromaMax = 0;
    for (let i = 0; i < 12; i++) {
        if (chromaVector[i] > chromaMax) chromaMax = chromaVector[i];
    }
    if (chromaMax < 0.0001) return;

    const normalizedChroma = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
        normalizedChroma[i] = chromaVector[i] / chromaMax;
    }

    // Correlate against all 24 keys
    let bestKey = '';
    let bestCorr = -Infinity;
    let secondBestKey = '';
    let secondBestCorr = -Infinity;

    for (let root = 0; root < 12; root++) {
        const majorCorr = correlate(normalizedChroma, MAJOR_PROFILE, root);
        const minorCorr = correlate(normalizedChroma, MINOR_PROFILE, root);

        if (majorCorr > bestCorr) {
            secondBestCorr = bestCorr;
            secondBestKey = bestKey;
            bestCorr = majorCorr;
            bestKey = KEY_NAMES[root] + ' Major';
        } else if (majorCorr > secondBestCorr) {
            secondBestCorr = majorCorr;
            secondBestKey = KEY_NAMES[root] + ' Major';
        }

        if (minorCorr > bestCorr) {
            secondBestCorr = bestCorr;
            secondBestKey = bestKey;
            bestCorr = minorCorr;
            bestKey = KEY_NAMES[root] + ' Minor';
        } else if (minorCorr > secondBestCorr) {
            secondBestCorr = minorCorr;
            secondBestKey = KEY_NAMES[root] + ' Minor';
        }
    }

    const confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2)); // map -1..1 to 0..1

    // Check if best key is the same OR relative major/minor of last detected
    const isRelated = (bestKey === lastDetectedKey) ||
        (RELATIVE_MINOR_MAP[bestKey] === lastDetectedKey) ||
        (RELATIVE_MINOR_MAP[lastDetectedKey] === bestKey);

    if (isRelated) {
        keyStableFrames++;
    } else {
        lastDetectedKey = bestKey;
        keyStableFrames = 0;
    }

    // ALWAYS update the display with the current best guess
    const keyEl = document.getElementById('detectedKeyDisplay');
    if (keyEl) {
        keyEl.textContent = `${bestKey} (${Math.round(confidence * 100)}%)`;
    }

    // Accept key when stable enough (or on first detection with any confidence)
    const accepted = keyStableFrames >= KEY_STABLE_THRESHOLD ||
        (window.audioData.detectedKey === '' && confidence > 0.4);

    if (accepted) {
        window.audioData.detectedKey = bestKey;
        window.audioData.keyConfidence = confidence;
        window.audioData.detectedHex = SYN_MAP[bestKey] || '';
    }

    // Debug logging every 2 seconds
    keyDebugTimer++;
    if (keyDebugTimer % 120 === 0) {
        console.log('[Key Detection]', bestKey, 'corr:', bestCorr.toFixed(3),
            'conf:', (confidence * 100).toFixed(0) + '%',
            'stable:', keyStableFrames, '/', KEY_STABLE_THRESHOLD,
            'accepted:', accepted,
            'hex:', SYN_MAP[bestKey] || 'none');
    }
}

function correlate(chroma, profile, rootOffset) {
    let sum = 0;
    let chromaMean = 0, profileMean = 0;

    for (let i = 0; i < 12; i++) {
        chromaMean += chroma[i];
        profileMean += profile[i];
    }
    chromaMean /= 12;
    profileMean /= 12;

    let numerator = 0, denomA = 0, denomB = 0;
    for (let i = 0; i < 12; i++) {
        const c = chroma[(i + rootOffset) % 12] - chromaMean;
        const p = profile[i] - profileMean;
        numerator += c * p;
        denomA += c * c;
        denomB += p * p;
    }

    const denom = Math.sqrt(denomA * denomB);
    return denom > 0 ? numerator / denom : 0;
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
    updateEvolution();
    updateKeyDetection();

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
    if (catalogAudioEl) {
        catalogAudioEl.pause();
        catalogAudioEl.currentTime = 0;
    }
    // Reset key detection state so we start fresh
    chromaVector = new Float32Array(12);
    keyStableFrames = 0;
    lastDetectedKey = '';
    window.audioData.detectedKey = '';
    window.audioData.detectedHex = '';
    window.audioData.keyConfidence = 0;
    const keyEl = document.getElementById('detectedKeyDisplay');
    if (keyEl) keyEl.textContent = 'Listening...';

    if (radioMic.checked && !window.audioData.isActive) {
        connectMic();
    } else if (window.audioData.isActive && !audioLoopId) {
        processAudio();
    }
});
