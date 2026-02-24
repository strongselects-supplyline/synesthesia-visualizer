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
const CHROMA_SMOOTH = 0.18;
let chromaVector = new Float32Array(12);
let keyStableFrames = 0;
let lastDetectedKey = '';
const KEY_STABLE_THRESHOLD = 15;     // frames (~0.25s) before first guess
const KEY_CONFIDENCE_MIN = 0.3;

// Key VOTING system — accumulates evidence across the entire song
let keyVotes = {};           // { 'A Major': 142, 'F# Minor': 89, ... }
let totalKeyVotes = 0;
let lockedKey = '';          // once locked, this IS the song's key
let keyIsLocked = false;
const LOCK_THRESHOLD = 0.55;     // lock in when a key has 55% of all votes
const OVERTURN_THRESHOLD = 0.70; // once locked, need 70% to change (true modulation)

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

    // Build TWO chromagrams: bass-only + full range
    // The bass chromagram heavily favors the actual key root
    // (bass almost always plays the root note more than any chord tone)
    const bassChroma = new Float32Array(12);
    const fullChroma = new Float32Array(12);
    let totalMagnitude = 0;

    for (let i = 1; i < bufferLength; i++) {
        const magnitude = dataArray[i] / 255;
        if (magnitude < 0.03) continue;

        const freq = i * binWidth;
        if (freq < 60 || freq > 4000) continue;

        const midiNote = 12 * Math.log2(freq / 440) + 69;
        const pitchClass = Math.round(midiNote) % 12;
        const normalizedPC = pitchClass < 0 ? pitchClass + 12 : pitchClass;

        const mag3 = magnitude * magnitude * magnitude;

        if (freq < 350) {
            // Bass register (60-350Hz): bass guitar, bass synth, kick fundamental
            // These notes almost always outline the root of the key
            bassChroma[normalizedPC] += mag3 * 2.0; // extra weight
        }

        // Full range always gets a vote
        fullChroma[normalizedPC] += mag3;
        totalMagnitude += magnitude;
    }

    if (totalMagnitude < 1.0) return;

    // Blend: 40% bass + 60% full — bass has outsized influence on key center
    const rawChroma = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
        rawChroma[i] = bassChroma[i] * 0.4 + fullChroma[i] * 0.6;
    }

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

    const confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2));

    // --- VOTING SYSTEM ---
    // Every frame's best guess gets a vote, weighted by confidence
    // Related major/minor pairs vote together (A Major + F# Minor both count as 'A Major' group)
    const voteKey = bestKey;
    const relatedKey = RELATIVE_MINOR_MAP[bestKey] || '';

    // Cast vote (confidence-weighted)
    const voteWeight = confidence * confidence; // squared: high confidence counts way more
    if (!keyVotes[voteKey]) keyVotes[voteKey] = 0;
    keyVotes[voteKey] += voteWeight;
    // Related key gets a smaller vote too
    if (relatedKey) {
        if (!keyVotes[relatedKey]) keyVotes[relatedKey] = 0;
        keyVotes[relatedKey] += voteWeight * 0.5;
    }
    totalKeyVotes += voteWeight;

    // Find the leading key by total votes
    let leadingKey = '';
    let leadingVotes = 0;
    for (const [key, votes] of Object.entries(keyVotes)) {
        // Group related keys: combine A Major + F# Minor votes
        const related = RELATIVE_MINOR_MAP[key] || '';
        const combinedVotes = votes + (keyVotes[related] || 0);
        if (combinedVotes > leadingVotes) {
            leadingVotes = combinedVotes;
            // Pick whichever of the pair has more individual votes
            leadingKey = (keyVotes[related] || 0) > votes ? related : key;
        }
    }

    // Voting percentage (how dominant is the leading key?)
    // Count combined related-key votes vs total
    const leadingRelated = RELATIVE_MINOR_MAP[leadingKey] || '';
    const leadingCombined = (keyVotes[leadingKey] || 0) + (keyVotes[leadingRelated] || 0);
    const votePct = totalKeyVotes > 0 ? leadingCombined / totalKeyVotes : 0;

    // --- LOCK-IN LOGIC ---
    if (!keyIsLocked) {
        // Not yet locked: lock when leading key has enough vote share
        if (votePct >= LOCK_THRESHOLD && totalKeyVotes > 30) {
            lockedKey = leadingKey;
            keyIsLocked = true;
            console.log('[Key LOCKED]', lockedKey, 'with', (votePct * 100).toFixed(0) + '% of votes',
                '| hex:', SYN_MAP[lockedKey] || 'none');
        }
    } else {
        // Already locked: only overturn if a DIFFERENT key group dominates strongly
        const lockedRelated = RELATIVE_MINOR_MAP[lockedKey] || '';
        const isLeadingSameGroup = (leadingKey === lockedKey || leadingKey === lockedRelated);
        if (!isLeadingSameGroup && votePct >= OVERTURN_THRESHOLD) {
            lockedKey = leadingKey;
            console.log('[Key OVERTURNED]', lockedKey, 'with', (votePct * 100).toFixed(0) + '%');
        }
    }

    // Set the effective key: locked key if available, otherwise best current guess
    const effectiveKey = keyIsLocked ? lockedKey : leadingKey;
    const lockStatus = keyIsLocked ? '🔒' : '🔍';

    // Update UI display
    const keyEl = document.getElementById('detectedKeyDisplay');
    if (keyEl) {
        keyEl.textContent = `${lockStatus} ${effectiveKey} (${Math.round(votePct * 100)}%)`;
    }

    // Set audioData (used by visualizer for color)
    if (effectiveKey && (keyIsLocked || votePct > 0.35)) {
        window.audioData.detectedKey = effectiveKey;
        window.audioData.keyConfidence = votePct;
        window.audioData.detectedHex = SYN_MAP[effectiveKey] || '';
    }

    // Debug logging every 2 seconds
    keyDebugTimer++;
    if (keyDebugTimer % 120 === 0) {
        console.log('[Key Detection]', lockStatus, effectiveKey,
            '| votes:', (votePct * 100).toFixed(0) + '%',
            '| total:', Math.round(totalKeyVotes),
            '| raw best:', bestKey, bestCorr.toFixed(3),
            '| hex:', SYN_MAP[effectiveKey] || 'none');
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
    keyVotes = {};
    totalKeyVotes = 0;
    lockedKey = '';
    keyIsLocked = false;
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
