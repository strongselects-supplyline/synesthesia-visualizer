// ============================================================
// Synesthesia Visualizer — MIDI Engine v2.0
// MIDI Learn + Dynamic CC Mapping + AKAI Defaults
// ============================================================

let midiAccess = null;
let midiEnabled = false;

// --- Default AKAI mappings (user can override via MIDI Learn) ---
let ccMap = {
    intensity:    { cc: 1,  label: 'Intensity' },
    bloom:        { cc: 2,  label: 'Bloom / Forge' },
    temperature:  { cc: 3,  label: 'Color Warmth' },
    particleDensity: { cc: 4, label: 'Particle Density' },
    pulseSpeed:   { cc: 5,  label: 'Pulse Speed' },
    masterBright: { cc: 7,  label: 'Master Brightness' }
};

// --- MIDI Learn State ---
let midiLearnActive = false;
let midiLearnTarget = null; // which parameter key we're learning for

// Persist mappings in localStorage
function saveMappings() {
    try {
        const data = {};
        for (const [key, val] of Object.entries(ccMap)) {
            data[key] = val.cc;
        }
        localStorage.setItem('syn_midi_map', JSON.stringify(data));
    } catch (e) { /* localStorage not available */ }
}

function loadMappings() {
    try {
        const raw = localStorage.getItem('syn_midi_map');
        if (raw) {
            const data = JSON.parse(raw);
            for (const [key, cc] of Object.entries(data)) {
                if (ccMap[key]) ccMap[key].cc = cc;
            }
        }
    } catch (e) { /* fallback to defaults */ }
}

// ============================================================
// MIDI LEARN UI
// ============================================================

function buildMidiLearnUI() {
    const container = document.getElementById('midiLearnContainer');
    if (!container) return;

    container.innerHTML = '';

    for (const [key, mapping] of Object.entries(ccMap)) {
        const row = document.createElement('div');
        row.className = 'midi-learn-row';

        const label = document.createElement('span');
        label.className = 'midi-learn-label';
        label.textContent = mapping.label;

        const ccDisplay = document.createElement('span');
        ccDisplay.className = 'midi-learn-cc';
        ccDisplay.id = `midi-cc-${key}`;
        ccDisplay.textContent = `CC${mapping.cc}`;

        const learnBtn = document.createElement('button');
        learnBtn.className = 'glass-btn midi-learn-btn';
        learnBtn.textContent = 'Learn';
        learnBtn.id = `midi-learn-${key}`;
        learnBtn.disabled = true;
        learnBtn.addEventListener('click', () => startLearn(key, learnBtn));

        row.appendChild(label);
        row.appendChild(ccDisplay);
        row.appendChild(learnBtn);
        container.appendChild(row);
    }
}

function setMidiStatus(text, className = '') {
    const statusEl = document.getElementById('midiStatus');
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'midi-status' + (className ? ` ${className}` : '');
}

function setLearnButtonsEnabled(enabled) {
    document.querySelectorAll('.midi-learn-btn').forEach(btn => {
        btn.disabled = !enabled;
    });
}

function startLearn(paramKey, btnEl) {
    // Cancel any previous learn
    cancelLearn();

    midiLearnActive = true;
    midiLearnTarget = paramKey;

    btnEl.classList.add('learning');
    btnEl.textContent = '⏳ Twist a knob...';

    // Timeout after 8 seconds
    window._midiLearnTimeout = setTimeout(() => cancelLearn(), 8000);
}

function cancelLearn() {
    midiLearnActive = false;
    midiLearnTarget = null;
    clearTimeout(window._midiLearnTimeout);

    // Reset all learn buttons
    document.querySelectorAll('.midi-learn-btn').forEach(btn => {
        btn.classList.remove('learning');
        btn.textContent = 'Learn';
    });
}

function completeLearn(cc) {
    if (!midiLearnTarget) return;

    ccMap[midiLearnTarget].cc = cc;

    // Update UI
    const ccEl = document.getElementById(`midi-cc-${midiLearnTarget}`);
    if (ccEl) ccEl.textContent = `CC${cc}`;

    saveMappings();
    cancelLearn();
}

// ============================================================
// MIDI MESSAGE HANDLING
// ============================================================

function handleMIDIMessage(message) {
    const data = message.data;
    const type = data[0] & 0xf0;
    const noteOrCC = data[1];
    const value = data[2];

    // --- Control Change ---
    if (type === 0xb0) {
        // If we're in MIDI Learn mode, capture this CC
        if (midiLearnActive && midiLearnTarget) {
            completeLearn(noteOrCC);
            return;
        }

        handleCC(noteOrCC, value);
    }

    // --- Note On (pads → catalog tracks) ---
    if (type === 0x90 && value > 0) {
        handleNoteOn(noteOrCC, value);
    }
}

function handleCC(cc, value) {
    const normalized = value / 127;

    // Find which parameter this CC is mapped to
    for (const [key, mapping] of Object.entries(ccMap)) {
        if (mapping.cc !== cc) continue;

        switch (key) {
            case 'intensity':
                window.intensity = normalized;
                const intensitySlider = document.getElementById('intensitySlider');
                if (intensitySlider) intensitySlider.value = Math.round(normalized * 100);
                break;

            case 'bloom':
                window.forgeStage = normalized;
                const forgeSlider = document.getElementById('forgeSlider');
                if (forgeSlider) forgeSlider.value = Math.round(normalized * 100);
                break;

            case 'masterBright':
                const overlay = document.querySelector('.ui-overlay');
                if (overlay) overlay.style.opacity = normalized;
                break;

            case 'temperature':
                // Color temperature shift: warm (low) ↔ cool (high)
                // This shifts the hue of the current color slightly
                window._midiColorTemp = (normalized - 0.5) * 2; // -1 to 1
                break;

            case 'particleDensity':
                window._midiParticleDensity = normalized;
                break;

            case 'pulseSpeed':
                window._midiPulseSpeed = normalized;
                break;
        }

        // Visual feedback: flash the CC display
        const ccEl = document.getElementById(`midi-cc-${key}`);
        if (ccEl) {
            ccEl.style.color = '#47e6a6';
            setTimeout(() => { ccEl.style.color = ''; }, 150);
        }
    }
}

function handleNoteOn(note, velocity) {
    const baseNote = 36;
    if (typeof window.allLoveCatalog !== 'undefined' &&
        note >= baseNote &&
        note < baseNote + window.allLoveCatalog.length) {

        const trackIndex = note - baseNote;
        if (window.currentMode === 'catalog' && typeof window.setTrack === 'function') {
            const track = window.allLoveCatalog[trackIndex];
            document.getElementById('trackSelector').value = track.id;
            window.setTrack(trackIndex);
        }
    }
}

// ============================================================
// INIT
// ============================================================

function initMIDI() {
    if (midiEnabled) return;
    midiEnabled = true;

    if (!navigator.requestMIDIAccess) {
        setMidiStatus('Unavailable');
        return;
    }

    setMidiStatus('Requesting...');
    navigator.requestMIDIAccess()
        .then(access => {
            midiAccess = access;

            // Connect all existing inputs
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = handleMIDIMessage;
            }

            // Hot-plug support
            midiAccess.onstatechange = (e) => {
                if (e.port.type === 'input' && e.port.state === 'connected') {
                    e.port.onmidimessage = handleMIDIMessage;
                }
            };

            // Update status indicator
            setMidiStatus('Connected', 'connected');
            setLearnButtonsEnabled(true);
        })
        .catch(err => {
            midiEnabled = false;
            setMidiStatus(err && err.name === 'NotAllowedError' ? 'Denied' : 'Unavailable');
            setLearnButtonsEnabled(false);
        });
}

// Load saved mappings, build UI, init MIDI
loadMappings();

// Wait for DOM to be ready (this runs as a regular script before the module)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        buildMidiLearnUI();
        setMidiStatus('Disabled');
        const enableBtn = document.getElementById('enableMidiBtn');
        if (enableBtn) enableBtn.addEventListener('click', initMIDI);
    });
} else {
    buildMidiLearnUI();
    setMidiStatus('Disabled');
    const enableBtn = document.getElementById('enableMidiBtn');
    if (enableBtn) enableBtn.addEventListener('click', initMIDI);
}
