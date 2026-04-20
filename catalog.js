// ============================================================
// Synesthesia Visualizer — ALL LOVE Catalog
// past.El — Key → Hex Synesthesia System
// Updated: March 28, 2026 — Cyanite AI data populated for 9/11 tracks
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
// ALL LOVE — 11 Tracks (April 24, 2026)
// Cyanite AI analysis populated for 9/11 tracks.
// Green Light Patient + Luxury pending Cyanite run — render black (#000000) until updated.
// ⚠️  Want U Bad: Cyanite analyzed as "Want U 2" (instrumental, Voice presence: None).
//     Verify track name + confirm vocal vs. instrumental before curator pitches.
// ⚠️  Like I Did: BPM confirmed 110 from Cyanite. Verify in DAW.
// ============================================================

window.allLoveCatalog = [
    {
        trackNumber: 1,
        id: 'i-like-girls',
        title: "I Like Girls",
        bpm: 107,
        key: "F# Minor",
        status: "album",
        // Cyanite: Sexy 70%, Chill 44%, R&B 74% (highest on album). No Happy% in analysis.
        moods: { sexy: 70, chill: 44, happy: 35, sad: 10 },
        audioUrl: 'audio/i-like-girls.mp3'
    },
    {
        trackNumber: 2,
        id: 'see-me',
        title: "SEE ME",
        bpm: 120,
        key: "B Minor",
        status: "single",
        // Cyanite: Sexy 89%, Chill 57%, Romantic 55%, R&B 60%
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
        // Cyanite: Sexy 87%, Chill 63%, Romantic 62%, R&B 59%
        // ⚠️ BPM discrepancy: campaign kit says 98 BPM, Cyanite says 105. Verify from DAW.
        moods: { sexy: 87, chill: 63, happy: 38, sad: 10 },
        audioUrl: 'audio/east-side-love.mp3'
    },
    {
        trackNumber: 4,
        id: 'want-u-bad',
        title: "Want U Bad",
        bpm: 114,
        key: "G Minor",
        status: "album",
        // Cyanite analyzed as "Want U 2": Chill 65%, Happy 58%, Hip-Hop 52%
        // ⚠️ Voice presence: None (may be instrumental). Sexy% not in Cyanite output — set 0 to flag.
        moods: { sexy: 0, chill: 65, happy: 58, sad: 10 },
        audioUrl: 'audio/want-u-bad.mp3'
    },
    {
        trackNumber: 5,
        id: 'green-light-patient',
        title: "Green Light Patient",
        bpm: 0,
        key: "TBD",
        status: "album",
        // ⛔ No Cyanite data yet. Upload to Cyanite.io to populate.
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
        // ⛔ No Cyanite data yet. Upload to Cyanite.io to populate.
        moods: { sexy: 0, chill: 0, happy: 0, sad: 0 },
        audioUrl: 'audio/luxury.mp3'
    },
    {
        trackNumber: 7,
        id: 'worth-it',
        title: "Worth It",
        bpm: 97,
        key: "F Minor",
        status: "album",
        // Cyanite: Sexy 79%, Chill 57%, R&B 57%
        moods: { sexy: 79, chill: 57, happy: 40, sad: 10 },
        audioUrl: 'audio/worth-it.mp3'
    },
    {
        trackNumber: 8,
        id: 'sweet-frustration',
        title: "Sweet Frustration",
        bpm: 124,
        key: "A# Minor",
        status: "single",
        // Cyanite: Sexy 85%, Happy 69%, Uplifting 58%, Energetic 48%, R&B 25%, Hip-Hop 27%
        // Lowest chill on EP (36%) — Electronic Soul / KAYTRANADA lane
        moods: { sexy: 85, chill: 36, happy: 69, sad: 10 },
        audioUrl: 'audio/sweet-frustration.mp3'
    },
    {
        trackNumber: 9,
        id: 'like-i-did',
        title: "Like I Did",
        bpm: 110,
        key: "D Minor",
        status: "single",
        // Cyanite: Sexy 60%, Chill 73% (highest on EP), Romantic 63%, Happy 69%, R&B 57%
        moods: { sexy: 60, chill: 73, happy: 69, sad: 10 },
        audioUrl: 'audio/like-i-did.mp3'
    },
    {
        trackNumber: 10,
        id: 'just-say-so',
        title: "Just Say So",
        bpm: 122,
        key: "Bb Minor",
        status: "album",
        // Cyanite: Sexy 73%, Chill 59%, Romantic 57%, Happy 56%, R&B 60%, Hip-Hop 43%
        moods: { sexy: 73, chill: 59, happy: 56, sad: 10 },
        audioUrl: 'audio/just-say-so.mp3'
    },
    {
        trackNumber: 11,
        id: 'reconnect',
        title: "Reconnect",
        bpm: 82,
        key: "D Minor",
        status: "album",
        // Cyanite: Sexy 88%, Chill 52%, R&B 56%.
        // ⚠️ Cyanite reported D Major — Ethan confirmed D Minor / F Major (relative pair). Key corrected.
        moods: { sexy: 88, chill: 52, happy: 40, sad: 10 },
        audioUrl: 'audio/reconnect.mp3'
    },
];

// Compute derived fields
window.allLoveCatalog.forEach(track => {
    // intensity: 0–1, drives default visualizer energy level per track
    // || 50 fallback keeps TBD tracks at neutral 0.5
    track.intensity = ((track.moods.sexy || 50) + (track.moods.chill || 50)) / 200;
    track.synHex = synMap[track.key] || '#000000';
});

// Legacy alias
const allLoveCatalog = window.allLoveCatalog;
