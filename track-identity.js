// ============================================================
// Synesthesia Visualizer — Per-Track Identity Profiles v1.0
// Phase 1 of v2 spec — past.El ALL LOVE catalog
// Edit this file to refine visual fingerprints per track.
// ============================================================

// Default identity — used when a track has no custom profile
window.IDENTITY_DEFAULT = {
    camera: {
        baseZ: 6,
        driftAmplitude: 0.3,
        driftSpeed: 0.02,
        bobOnBeat: true,
        tiltMax: 0.1
    },
    particles: {
        bassPalette: 'primary',
        bassMotion: 'pulse',
        midMotion: 'ocean',
        highDensity: 1.0,
        velocityCeiling: 1.0
    },
    shader: {
        bloomBoost: 1.0,
        aberrationBase: 0.0015,
        grainBase: 0.06,
        vignetteStrength: 0.55,
        lutName: null
    },
    envelope: 'standard',
    titleCardMood: 'intimate'
};

// ============================================================
// Per-track identity map (keyed by track id from catalog.js)
// Ethan: edit the vibe values here — agents don't touch these.
// Starter values derived from Cyanite mood data + track context.
// ============================================================

window.TRACK_IDENTITIES = {

    // 1 — I Like Girls
    // F# Minor → Fox Brown. Declarative, playful, R&B 74% highest on album.
    'i-like-girls': {
        camera: { baseZ: 5.5, driftAmplitude: 0.35, driftSpeed: 0.025, bobOnBeat: true, tiltMax: 0.12 },
        particles: { bassPalette: 'primary', bassMotion: 'pulse', midMotion: 'grid', highDensity: 1.2, velocityCeiling: 1.1 },
        shader: { bloomBoost: 1.1, aberrationBase: 0.002, grainBase: 0.05, vignetteStrength: 0.45, lutName: 'electric' },
        envelope: 'standard',
        titleCardMood: 'punch'
    },

    // 2 — SEE ME
    // B Minor → Muted Yellow. Heat rising, locked-in, Sexy 89% Chill 57%.
    'see-me': {
        camera: { baseZ: 6.5, driftAmplitude: 0.25, driftSpeed: 0.015, bobOnBeat: true, tiltMax: 0.08 },
        particles: { bassPalette: 'primary', bassMotion: 'drift', midMotion: 'ocean', highDensity: 0.9, velocityCeiling: 0.85 },
        shader: { bloomBoost: 0.95, aberrationBase: 0.001, grainBase: 0.09, vignetteStrength: 0.65, lutName: 'noir' },
        envelope: 'slow-burn',
        titleCardMood: 'intimate'
    },

    // 3 — East Side Love
    // C# Minor → Pink-Purple. Block-to-block, warm dusk. Romantic 62%.
    'east-side-love': {
        camera: { baseZ: 6, driftAmplitude: 0.3, driftSpeed: 0.02, bobOnBeat: true, tiltMax: 0.1 },
        particles: { bassPalette: 'primary', bassMotion: 'pulse', midMotion: 'flock', highDensity: 1.0, velocityCeiling: 1.0 },
        shader: { bloomBoost: 1.05, aberrationBase: 0.0015, grainBase: 0.07, vignetteStrength: 0.5, lutName: 'sunset' },
        envelope: 'standard',
        titleCardMood: 'cinematic'
    },

    // 4 — Want U Bad
    // G Minor → Maroon. Want signal, possibly instrumental. Chill 65% Happy 58%.
    'want-u-bad': {
        camera: { baseZ: 5.8, driftAmplitude: 0.4, driftSpeed: 0.022, bobOnBeat: true, tiltMax: 0.14 },
        particles: { bassPalette: 'primary', bassMotion: 'crash', midMotion: 'spiral', highDensity: 1.15, velocityCeiling: 1.2 },
        shader: { bloomBoost: 1.15, aberrationBase: 0.002, grainBase: 0.06, vignetteStrength: 0.48, lutName: 'sunset' },
        envelope: 'standard',
        titleCardMood: 'punch'
    },

    // 5 — Green Light Patient
    // TBD key. Waiting-room stillness. No Cyanite data — use patient/still defaults.
    'green-light-patient': {
        camera: { baseZ: 7, driftAmplitude: 0.2, driftSpeed: 0.01, bobOnBeat: false, tiltMax: 0.06 },
        particles: { bassPalette: 'primary', bassMotion: 'drift', midMotion: 'ocean', highDensity: 0.7, velocityCeiling: 0.7 },
        shader: { bloomBoost: 0.85, aberrationBase: 0.001, grainBase: 0.1, vignetteStrength: 0.7, lutName: null },
        envelope: 'slow-burn',
        titleCardMood: 'intimate'
    },

    // 6 — Luxury
    // TBD key. Flex lane, hi-gloss. No Cyanite data.
    'luxury': {
        camera: { baseZ: 5.5, driftAmplitude: 0.45, driftSpeed: 0.028, bobOnBeat: true, tiltMax: 0.15 },
        particles: { bassPalette: 'duotone', bassMotion: 'swirl', midMotion: 'flock', highDensity: 1.4, velocityCeiling: 1.3 },
        shader: { bloomBoost: 1.3, aberrationBase: 0.0025, grainBase: 0.04, vignetteStrength: 0.4, lutName: 'electric' },
        envelope: 'double-drop',
        titleCardMood: 'cinematic'
    },

    // 7 — Worth It
    // F Minor → Brown. Late-night confession, 3AM. Sexy 79% Chill 57%.
    'worth-it': {
        camera: { baseZ: 7, driftAmplitude: 0.2, driftSpeed: 0.014, bobOnBeat: true, tiltMax: 0.07 },
        particles: { bassPalette: 'primary', bassMotion: 'drift', midMotion: 'ocean', highDensity: 0.8, velocityCeiling: 0.8 },
        shader: { bloomBoost: 0.9, aberrationBase: 0.001, grainBase: 0.1, vignetteStrength: 0.7, lutName: 'sunset' },
        envelope: 'slow-burn',
        titleCardMood: 'intimate'
    },

    // 8 — Sweet Frustration
    // Bb Minor → Goldenrod. Tension/release double-drop. KAYTRANADA lane.
    'sweet-frustration': {
        camera: { baseZ: 5.5, driftAmplitude: 0.5, driftSpeed: 0.03, bobOnBeat: true, tiltMax: 0.18 },
        particles: { bassPalette: 'complement', bassMotion: 'crash', midMotion: 'spiral', highDensity: 1.3, velocityCeiling: 1.4 },
        shader: { bloomBoost: 1.4, aberrationBase: 0.003, grainBase: 0.05, vignetteStrength: 0.4, lutName: 'electric' },
        envelope: 'double-drop',
        titleCardMood: 'punch'
    },

    // 9 — Like I Did
    // D Minor → Red. Memory-lane replay. Chill 73% highest on EP.
    'like-i-did': {
        camera: { baseZ: 6.5, driftAmplitude: 0.28, driftSpeed: 0.018, bobOnBeat: true, tiltMax: 0.09 },
        particles: { bassPalette: 'primary', bassMotion: 'pulse', midMotion: 'ocean', highDensity: 0.95, velocityCeiling: 0.9 },
        shader: { bloomBoost: 0.95, aberrationBase: 0.0012, grainBase: 0.08, vignetteStrength: 0.6, lutName: 'noir' },
        envelope: 'standard',
        titleCardMood: 'intimate'
    },

    // 10 — Just Say So
    // Bb Minor → Goldenrod. Conversation, back-and-forth. Two-part structure.
    'just-say-so': {
        camera: { baseZ: 6, driftAmplitude: 0.35, driftSpeed: 0.022, bobOnBeat: true, tiltMax: 0.12 },
        particles: { bassPalette: 'primary', bassMotion: 'swirl', midMotion: 'flock', highDensity: 1.05, velocityCeiling: 1.0 },
        shader: { bloomBoost: 1.05, aberrationBase: 0.0015, grainBase: 0.07, vignetteStrength: 0.5, lutName: null },
        envelope: 'two-part',
        titleCardMood: 'cinematic'
    },

    // 11 — Reconnect
    // D Minor → Red. Minor key pull. Sexy 88%, lowest BPM (82).
    'reconnect': {
        camera: { baseZ: 7.5, driftAmplitude: 0.2, driftSpeed: 0.012, bobOnBeat: false, tiltMax: 0.07 },
        particles: { bassPalette: 'primary', bassMotion: 'drift', midMotion: 'ocean', highDensity: 0.75, velocityCeiling: 0.75 },
        shader: { bloomBoost: 0.85, aberrationBase: 0.001, grainBase: 0.11, vignetteStrength: 0.72, lutName: 'noir' },
        envelope: 'slow-burn',
        titleCardMood: 'intimate'
    }
};

// Convenience: get identity for a track id, fallback to default
window.getTrackIdentity = function(trackId) {
    return window.TRACK_IDENTITIES[trackId]
        ? Object.assign({}, window.IDENTITY_DEFAULT, window.TRACK_IDENTITIES[trackId])
        : window.IDENTITY_DEFAULT;
};
