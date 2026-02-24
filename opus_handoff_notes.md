# Current Limitations & Areas for Improvement (Opus Handoff)

While the Opus Spec features are technically implemented, the current execution has several shortcomings and areas that require advanced polish. These are the top priorities for the next development phase:

## 1. Audio Reactivity (The "Feel")
- **Basic FFT Mapping**: The current Web Audio API implementation uses very basic averaging of frequency bins. It lacks advanced beat detection, onset detection, or temporal smoothing. 
- **Loose Connection**: Because it directly translates raw bin averages to multipliers every frame, the visuals can feel "jittery" or loosely connected to the actual groove of the music, rather than locking in tight.
- **Audio Routing Limits**: Switching between file upload and microphone can sometimes leave the `AudioContext` hanging or require a hard refresh if permissions get tangled.

## 2. Rendering Engine & Performance
- **Canvas 2D Limitations**: The 3-layer engine currently relies entirely on `CanvasRenderingContext2D` using hundreds of concurrent `createRadialGradient` calls. This is computationally expensive.
- **No WebGL**: To achieve true "premium" fluid dynamics, bloom, and massive particle counts without dropping frames, the core engine needs to be migrated to WebGL (e.g., Three.js or raw WebGL shaders).
- **High-DPI Handling**: The canvas isn't currently scaling its internal resolution for Retina/High-DPI displays, which can make the particles look slightly soft on modern Macs.

## 3. "The Forge" Concept Execution
- **Superficial Implementation**: Right now, the Forge slider is just a "hack." It blindly applies a global CSS `blur()` and drops opacity.
- **Missing Depth**: A true "Production Stage" slider should dynamically alter the *behavior* of the visualizer (e.g., raw tracks map to chaotic, unorganized particles; finalized masters map to smooth, harmonious flows).

## 4. MIDI Integration
- **Hardcoded CCs**: The `midi.js` file has hardcoded mappings specifically for AKAI controllers (CC1, CC2, etc.). 
- **No MIDI Learn**: There is no UI for users to map their own controllers dynamically.

## 5. UI/UX Polish
- **Abrupt Transitions**: Switching between Catalog and Live Mode is instant and jarring.
- **Basic Inputs**: Despite the CSS glassmorphism, the underlying `<input type="range">` and `<select>` elements still feel a bit clunky and native.

---
**Next Steps for Opus**:
1. Swap the 2D Canvas engine for a lightweight WebGL implementation (or optimize the 2D math heavily).
2. Implement a proper Beat Detection algorithm rather than raw FFT averaging.
3. Build a "MIDI Learn" interface.
