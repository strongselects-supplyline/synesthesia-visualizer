// Key → Hex lookup (for auto-fill logic) - Based on Ethan Payton's Personal System
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

const allLoveCatalog = [
    {
        trackNumber: 1,
        title: "SEE ME",
        bpm: 120, // TBD - default fallback
        key: "B Minor", // TBD - default fallback
        status: "single",
        moods: { sexy: 89, chill: 57, happy: 38, sad: 10 } // normalized
    },
    {
        trackNumber: 2,
        title: "ESL",
        bpm: 105, // TBD
        key: "C# Minor", // TBD
        status: "single",
        moods: { sexy: 87, chill: 63, happy: 38, sad: 10 }
    },
    {
        trackNumber: 3,
        title: "Sweet Frustration",
        bpm: 124, // TBD
        key: "A# Minor", // Cyanite output was Bb min. Mapped for now. TBD.
        status: "single",
        moods: { sexy: 85, chill: 36, happy: 69, sad: 10 }
    },
    {
        trackNumber: 4,
        id: 'hollywood-fever',
        title: 'Hollywood Fever',
        key: 'F Major', // Cyanite: F Major / Musicstax: C Major - treating as F Major
        bpm: 122,
        status: 'released',
        moods: { sexy: 76, chill: 58, happy: 71, sad: 4 } // 0-100 scale from cyanite
    },
    {
        trackNumber: 5,
        id: 'roll-with-it',
        title: 'Roll With It',
        key: 'Ab Major', // F minor relative
        bpm: 105,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 6,
        id: 'on-the-move',
        title: 'On The Move',
        key: 'A Major',
        bpm: 115,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 7,
        id: 'advance',
        title: 'Advance',
        key: 'Bb Major', // G minor relative
        bpm: 118,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 8,
        id: 'supposed-to-know',
        title: 'Supposed To Know',
        key: 'A Major', // F# minor relative
        bpm: 105,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 9,
        id: 'dance-with-him',
        title: 'Dance With Him',
        key: 'E Major', // C# minor relative
        bpm: 208,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 10,
        id: 'ride-with-me',
        title: 'Ride With Me',
        key: 'Eb Major', // C minor relative
        bpm: 107,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    },
    {
        trackNumber: 11,
        id: 'origami',
        title: 'Origami',
        key: 'C Major', // A minor relative
        bpm: 120,
        status: 'released',
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 } // confirm
    }
];

// Helper to calculate average intensity based on the moods to power particles
allLoveCatalog.forEach(track => {
    // Basic normalized intensity rating for the visualizer [0.0 - 1.0]
    track.intensity = ((track.moods.sexy || 50) + (track.moods.chill || 50)) / 200;

    // Auto-map color using the new synMap logic
    track.synHex = synMap[track.key] || '#000000';
});
