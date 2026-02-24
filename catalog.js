// Key → Hex lookup — Ethan Payton's Personal Synesthesia System
const synMap = {
    'C Major': '#00A3A3', 'A Minor': '#00A3A3', // Teal
    'G Major': '#FFFFF0', 'E Minor': '#FFFFF0', // Cream
    'D Major': '#E2D077', 'B Minor': '#E2D077', // Muted Yellow
    'A Major': '#C4651D', 'F# Minor': '#C4651D', // Fox Brown
    'E Major': '#DA70D6', 'C# Minor': '#DA70D6', // Pink-Purple
    'B Major': '#B0E0E6', 'G# Minor': '#B0E0E6', // Baby Blue / Powder
    'Gb Major': '#FFFAFA', 'Eb Minor': '#FFFAFA', // Snow White
    'Db Major': '#DAA520', 'Bb Minor': '#DAA520', // Goldenrod
    'Ab Major': '#884513', 'F Minor': '#884513', // Brown
    'Eb Major': '#4B0082', 'C Minor': '#4B0082', // Dark Purple
    'Bb Major': '#A52A2A', 'G Minor': '#A52A2A', // Maroon
    'F Major': '#DC143C', 'D Minor': '#DC143C', // Red
};

// Window-expose for module access
window.allLoveCatalog = [
    {
        trackNumber: 1,
        id: 'see-me',
        title: "SEE ME",
        bpm: 120,
        key: "B Minor",
        status: "single",
        moods: { sexy: 89, chill: 57, happy: 38, sad: 10 },
        audioUrl: 'audio/see-me.mp3'
    },
    {
        trackNumber: 2,
        id: 'esl',
        title: "ESL",
        bpm: 105,
        key: "C# Minor",
        status: "single",
        moods: { sexy: 87, chill: 63, happy: 38, sad: 10 },
        audioUrl: 'audio/esl.mp3'
    },
    {
        trackNumber: 3,
        id: 'sweet-frustration',
        title: "Sweet Frustration",
        bpm: 124,
        key: "A# Minor",
        status: "single",
        moods: { sexy: 85, chill: 36, happy: 69, sad: 10 },
        audioUrl: 'audio/sweet-frustration.mp3'
    },
    {
        trackNumber: 4,
        id: 'hollywood-fever',
        title: 'Hollywood Fever',
        key: 'F Major',
        bpm: 122,
        status: 'released',
        moods: { sexy: 76, chill: 58, happy: 71, sad: 4 },
        audioUrl: 'audio/hollywood-fever.mp3'
    },
    {
        trackNumber: 5,
        id: 'roll-with-it',
        title: 'Roll With It',
        key: 'Ab Major',
        bpm: 105,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/roll-with-it.mp3'
    },
    {
        trackNumber: 6,
        id: 'on-the-move',
        title: 'On The Move',
        key: 'A Major',
        bpm: 115,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/on-the-move.mp3'
    },
    {
        trackNumber: 7,
        id: 'advance',
        title: 'Advance',
        key: 'Bb Major',
        bpm: 118,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/advance.mp3'
    },
    {
        trackNumber: 8,
        id: 'supposed-to-know',
        title: 'Supposed To Know',
        key: 'A Major',
        bpm: 105,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/supposed-to-know.mp3'
    },
    {
        trackNumber: 9,
        id: 'dance-with-him',
        title: 'Dance With Him',
        key: 'E Major',
        bpm: 208,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/dance-with-him.mp3'
    },
    {
        trackNumber: 10,
        id: 'ride-with-me',
        title: 'Ride With Me',
        key: 'Eb Major',
        bpm: 107,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/ride-with-me.mp3'
    },
    {
        trackNumber: 11,
        id: 'origami',
        title: 'Origami',
        key: 'C Major',
        bpm: 120,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/origami.mp3'
    }
];

// Compute derived fields
window.allLoveCatalog.forEach(track => {
    track.intensity = ((track.moods.sexy || 50) + (track.moods.chill || 50)) / 200;
    track.synHex = synMap[track.key] || '#000000';
});

// Legacy alias
const allLoveCatalog = window.allLoveCatalog;
