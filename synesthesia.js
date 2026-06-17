// ============================================================
// Ethan Payton's Personal Key -> Hex Synesthesia System
// Source of truth for the standalone visualizer.
// Do not invent or "correct" these values; they are Ethan's colors.
// ============================================================

(function initSynesthesiaSystem() {
    const SYN_MAP = Object.freeze({
        'C Major': '#00A3A3', 'A Minor': '#00A3A3',
        'G Major': '#FFFFF0', 'E Minor': '#FFFFF0',
        'D Major': '#E2D077', 'B Minor': '#E2D077',
        'A Major': '#C4651D', 'F# Minor': '#C4651D',
        'E Major': '#DA70D6', 'C# Minor': '#DA70D6',
        'B Major': '#B0E0E6', 'G# Minor': '#B0E0E6',
        'Gb Major': '#FFFAFA', 'F# Major': '#FFFAFA', 'Eb Minor': '#FFFAFA',
        'Db Major': '#DAA520', 'C# Major': '#DAA520', 'Bb Minor': '#DAA520', 'A# Minor': '#DAA520',
        'Ab Major': '#884513', 'G# Major': '#884513', 'F Minor': '#884513',
        'Eb Major': '#4B0082', 'D# Major': '#4B0082', 'C Minor': '#4B0082',
        'Bb Major': '#A52A2A', 'A# Major': '#A52A2A', 'G Minor': '#A52A2A',
        'F Major': '#DC143C', 'D Minor': '#DC143C',
    });

    const SYN_NAME = Object.freeze({
        '#00A3A3': 'Teal',
        '#FFFFF0': 'Cream',
        '#E2D077': 'Muted Yellow',
        '#C4651D': 'Fox Brown',
        '#DA70D6': 'Pink-Purple',
        '#B0E0E6': 'Baby Blue',
        '#FFFAFA': 'Snow White',
        '#DAA520': 'Goldenrod',
        '#884513': 'Brown',
        '#4B0082': 'Dark Purple',
        '#A52A2A': 'Maroon',
        '#DC143C': 'Red',
        '#2D3142': 'Unmapped',
    });

    const RELATIVE_KEY_MAP = Object.freeze({
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
    });

    const UNKNOWN_HEX = '#2D3142';

    function normalizeKey(key) {
        if (!key) return '';
        const match = String(key).trim().match(/^([A-Ga-g])([#b])?\s*(major|minor)$/i);
        if (!match) return '';
        const note = match[1].toUpperCase() + (match[2] ? match[2] : '');
        const mode = match[3][0].toUpperCase() + match[3].slice(1).toLowerCase();
        return `${note} ${mode}`;
    }

    function isKnownKey(key) {
        return Boolean(SYN_MAP[normalizeKey(key)]);
    }

    function synColor(key, fallback = UNKNOWN_HEX) {
        return SYN_MAP[normalizeKey(key)] || fallback;
    }

    function synName(hex) {
        if (!hex) return 'Unmapped';
        return SYN_NAME[String(hex).toUpperCase()] || hex;
    }

    function synLabel(key) {
        const normalized = normalizeKey(key);
        if (!normalized || !SYN_MAP[normalized]) return 'Key pending -> Unmapped';
        const hex = SYN_MAP[normalized];
        return `${normalized} -> ${synName(hex)}`;
    }

    window.Synesthesia = Object.freeze({
        SYN_MAP,
        SYN_NAME,
        RELATIVE_KEY_MAP,
        UNKNOWN_HEX,
        normalizeKey,
        isKnownKey,
        synColor,
        synName,
        synLabel,
    });
})();
