// Synesthesia Visualizer - Web MIDI API Integration

let midiAccess = null;
let midiInputs = [];

// Default AKAI Fire / Class-Compliant mappings (CC numbers)
let ccMap = {
    intensity: 1,      // CC1: Particle Intensity
    bloom: 2,          // CC2: Bloom Radius / Forge Stage 
    temperature: 3,    // CC3: Color Temp / Hue shift (TBD)
    particleCount: 4,  // CC4: Particle Density multiplier (TBD)
    pulseSpeed: 5,     // CC5: Background Pulse Speed (TBD)
    masterBright: 7    // CC7: Master Brightness/Opacity
};

function initMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.warn("Web MIDI API not supported in this browser.");
    }
}

function onMIDISuccess(access) {
    midiAccess = access;
    console.log("MIDI Ready!");

    // Attach listeners to all available inputs
    for (let input of midiAccess.inputs.values()) {
        input.onmidimessage = handleMIDIMessage;
        midiInputs.push(input);
    }

    // Handle devices plugging in and out
    midiAccess.onstatechange = (e) => {
        if (e.port.type === "input" && e.port.state === "connected") {
            e.port.onmidimessage = handleMIDIMessage;
        }
    };
}

function onMIDIFailure(err) {
    console.error("Failed to get MIDI access", err);
}

function handleMIDIMessage(message) {
    const data = message.data;
    const command = data[0] >> 4;
    const channel = data[0] & 0xf;
    const type = data[0] & 0xf0;

    const noteOrCC = data[1];
    const velocityOrValue = data[2];

    // Control Change (Knobs / Faders)
    if (type === 176) {
        handleCCMessage(noteOrCC, velocityOrValue);
    }

    // Note On (Pads)
    if (type === 144 && velocityOrValue > 0) {
        handleNoteOn(noteOrCC, velocityOrValue);
    }
}

function handleCCMessage(cc, value) {
    // Value is 0-127. Normalize it for our systems.
    const normalized = value / 127;

    switch (cc) {
        case ccMap.intensity:
            intensity = normalized * 2; // Map 0-127 to 0-2 scale for visualizer
            document.getElementById('intensitySlider').value = Math.round(intensity * 50);
            break;
        case ccMap.bloom:
            forgeStage = normalized; // Wire CC2 straight to Forge / Bloom mix
            document.getElementById('forgeSlider').value = Math.round(forgeStage * 100);
            document.documentElement.style.setProperty('--glass-blur', `blur(${16 * forgeStage}px)`);
            break;
        case ccMap.masterBright:
            document.querySelector('.ui-overlay').style.opacity = normalized;
            break;
    }
}

function handleNoteOn(note, velocity) {
    // Map Pads roughly starting around note 36 or 48 (AKAI defaults)
    // If we assume notes 36-46 trigger catalog tracks 1-11
    const baseNote = 36;
    if (note >= baseNote && note < baseNote + allLoveCatalog.length) {
        const trackIndex = note - baseNote;

        // Only trigger track changes if in catalog mode
        if (currentMode === 'catalog') {
            document.getElementById('trackSelector').value = trackIndex;
            setTrack(trackIndex);
        }
    }
}

initMIDI();
