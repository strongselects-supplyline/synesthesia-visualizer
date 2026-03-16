// ============================================================
// Synesthesia Visualizer — ALL LOVE Catalog
// past.El — Key → Hex Synesthesia System
// Updated: March 16, 2026
// ============================================================

// Key → Hex lookup — Ethan Payton's Personal Synesthesia System
const synMap = {
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
    'A# Minor': '#DAA520', // alias for Bb Minor
};

// ============================================================
// ALL LOVE — 11 Tracks (April 10, 2026)
// NOTE: Tracks with key "TBD" will render as black (#000000)
// until Ethan updates BPM/key/mood data from the studio.
// ============================================================

window.allLoveCatalog = [
    {
        trackNumber: 1,
        id: 'i-like-girls',
        title: "I Like Girls",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/i-like-girls.mp3'
    },
    {
        trackNumber: 2,
        id: 'see-me',
        title: "SEE ME",
        bpm: 120,
        key: "B Minor",
        status: "single",
        moods: { sexy: 89, chill: 57, happy: 38, sad: 10 },
        audioUrl: 'audio/see-me.mp3'
    },
    {
        trackNumber: 3,
        id: 'east-side-love',
        title: "East Side Love",
        bpm: 105,
        key: "C# Minor",
        status: "single",
        moods: { sexy: 87, chill: 63, happy: 38, sad: 10 },
        audioUrl: 'audio/east-side-love.mp3'
    },
    {
        trackNumber: 4,
        id: 'want-u-bad',
        title: "Want U Bad",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/want-u-bad.mp3'
    },
    {
        trackNumber: 5,
        id: 'green-light-patient',
        title: "Green Light Patient",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/green-light-patient.mp3'
    },
    {
        trackNumber: 6,
        id: 'luxury',
        title: "Luxury",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/luxury.mp3'
    },
    {
        trackNumber: 7,
        id: 'worth-it',
        title: "Worth It",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/worth-it.mp3'
    },
    {
        trackNumber: 8,
        id: 'sweet-frustration',
        title: "Sweet Frustration",
        bpm: 124,
        key: "A# Minor",
        status: "single",
        moods: { sexy: 85, chill: 36, happy: 69, sad: 10 },
        audioUrl: 'audio/sweet-frustration.mp3'
    },
    {
        trackNumber: 9,
        id: 'like-i-did',
        title: "Like I Did",
        bpm: 0,
        key: "TBD",
        status: "single",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/like-i-did.mp3'
    },
    {
        trackNumber: 10,
        id: 'just-say-so',
        title: "Just Say So",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/just-say-so.mp3'
    },
    {
        trackNumber: 11,
        id: 'reconnect',
        title: "Reconnect",
        bpm: 0,
        key: "TBD",
        status: "album",
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/reconnect.mp3'
    },
];

// Compute derived fields
window.allLoveCatalog.forEach(track => {
    track.intensity = ((track.moods.sexy || 50) + (track.moods.chill || 50)) / 200;
    track.synHex = synMap[track.key] || '#000000';
});

// Legacy alias
const allLoveCatalog = window.allLoveCatalog;
