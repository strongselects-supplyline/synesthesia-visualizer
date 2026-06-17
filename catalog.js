// ============================================================
// Synesthesia Visualizer — ALL LOVE Catalog
// past.El — Key → Hex Synesthesia System
// Updated: March 28, 2026 — Cyanite AI data populated for 9/11 tracks
// ============================================================

const Syn = window.Synesthesia;
const DEMO_AUDIO_URL = 'audio/audio.wav';

function catalogAsset(fileName, state = 'missing') {
    const intendedUrl = `audio/${fileName}.mp3`;
    if (state === 'demo') {
        return {
            state,
            intendedUrl,
            url: DEMO_AUDIO_URL,
            label: 'Demo audio',
            note: 'Local demo placeholder. Replace with the mastered track URL before release.'
        };
    }
    if (state === 'available') {
        return { state, intendedUrl, url: intendedUrl, label: 'Audio ready' };
    }
    return {
        state: 'missing',
        intendedUrl,
        url: '',
        label: 'Not bundled',
        note: 'Master audio is intentionally not bundled in this repo.'
    };
}

// ============================================================
// ALL LOVE — 11 Tracks (April 24, 2026)
// Cyanite AI analysis populated for 9/11 tracks.
// Green Light Patient + Luxury pending Cyanite run — render with neutral unmapped palette until updated.
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
        asset: catalogAsset('i-like-girls', 'demo')
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
        asset: catalogAsset('see-me')
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
        asset: catalogAsset('east-side-love')
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
        asset: catalogAsset('want-u-bad')
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
        asset: catalogAsset('green-light-patient')
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
        asset: catalogAsset('luxury')
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
        asset: catalogAsset('worth-it')
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
        asset: catalogAsset('sweet-frustration')
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
        asset: catalogAsset('like-i-did')
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
        asset: catalogAsset('just-say-so')
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
        asset: catalogAsset('reconnect')
    },
];

// Compute derived fields
window.allLoveCatalog.forEach(track => {
    // intensity: 0–1, drives default visualizer energy level per track
    // || 50 fallback keeps TBD tracks at neutral 0.5
    track.intensity = ((track.moods.sexy || 50) + (track.moods.chill || 50)) / 200;
    track.normalizedKey = Syn.normalizeKey(track.key);
    track.hasMappedKey = Syn.isKnownKey(track.key);
    track.synHex = Syn.synColor(track.key);
    track.synName = Syn.synName(track.synHex);
    track.synLabel = Syn.synLabel(track.key);
    track.audioState = track.asset.state;
    track.audioUrl = track.asset.url;
    track.intendedAudioUrl = track.asset.intendedUrl;
});

// Legacy alias
const allLoveCatalog = window.allLoveCatalog;
