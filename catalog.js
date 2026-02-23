const allLoveCatalog = [
    {
        trackNumber: 1,
        title: "SEE ME",
        bpm: 120,
        key: "B Minor",
        moods: { sexy: 89, chill: 57, romantic: 55, happy: 38, rnb: 60 }
    },
    {
        trackNumber: 2,
        title: "ESL",
        bpm: 105,
        key: "C# Minor",
        moods: { sexy: 87, chill: 63, romantic: 62, happy: 38, rnb: 59 }
    },
    {
        trackNumber: 3,
        title: "Worth It",
        bpm: 97,
        key: "F Minor",
        moods: { sexy: 79, chill: 57, romantic: 35, happy: 35, rnb: 57 }
    },
    {
        trackNumber: 4,
        title: "Reconnect",
        bpm: 82,
        key: "D Major", // The only major key (emotional outlier/palette cleanser)
        moods: { sexy: 88, chill: 52, romantic: 35, happy: 40, rnb: 56 }
    },
    {
        trackNumber: 5,
        title: "Want U 2",
        bpm: 114,
        key: "G Minor",
        moods: { sexy: 56, chill: 65, romantic: 46, happy: 58, rnb: 52 }
    },
    {
        trackNumber: 6,
        title: "Sweet Frustration",
        bpm: 124,
        key: "A# Minor", // Cyanite output was Bb min; mapped to A# Minor for synMap matches
        moods: { sexy: 85, chill: 36, romantic: 37, happy: 69, rnb: 25 }
    },
    {
        trackNumber: 7,
        title: "Just Say So",
        bpm: 122,
        key: "A# Minor", // Bb min -> A# Minor
        moods: { sexy: 73, chill: 59, romantic: 57, happy: 56, rnb: 60 }
    },
    {
        trackNumber: 8,
        title: "I Like Girls",
        bpm: 107,
        key: "F# Minor",
        moods: { sexy: 70, chill: 44, romantic: 32, happy: 35, rnb: 74 }
    },
    {
        trackNumber: 9,
        title: "Like I Did",
        bpm: 110,
        key: "D Minor",
        moods: { sexy: 60, chill: 73, romantic: 63, happy: 69, rnb: 57 }
    }
];

// Helper to calculate average intensity based on the "Sexy" and "R&B" scores 
// (or purely based on the mood metrics to power particle intensity)
allLoveCatalog.forEach(track => {
    // Basic normalized intensity rating for the visualizer [0.0 - 1.0]
    track.intensity = (track.moods.sexy + track.moods.rnb) / 200;
});
