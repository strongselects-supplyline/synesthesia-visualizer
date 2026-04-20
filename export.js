// ============================================================
// Synesthesia Visualizer — Export Engine v1.0
// One-click MP4/WebM + still-frame PNG for Content Factory
// past.El — Phase 4 of v2 spec
// ============================================================

(function initExporter() {
    let isRecording = false;
    let recorder = null;
    let chunks = [];
    let countdownInterval = null;
    let selectedDuration = 30;
    let includeAudio = true;

    // --- Preferred MIME type ---
    function getSupportedMime() {
        const candidates = [
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
        ];
        for (const mime of candidates) {
            if (MediaRecorder.isTypeSupported(mime)) return mime;
        }
        return '';
    }

    function getExtension(mime) {
        return mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    }

    // --- Get the Three.js renderer canvas ---
    function getCanvas() {
        return document.getElementById('visualizerCanvas');
    }

    // --- Get audio context from global ---
    function getAudioContext() {
        // audio.js exposes via window scope after connection
        return window._exportAudioCtx || null;
    }

    // --- Start a capture ---
    function startCapture(durationSec) {
        if (isRecording) return;

        const canvas = getCanvas();
        if (!canvas) {
            console.error('[Export] No canvas found.');
            return;
        }

        const mime = getSupportedMime();
        if (!mime) {
            alert('Your browser does not support video recording. Try Chrome or Safari.');
            return;
        }

        chunks = [];
        isRecording = true;
        updateCaptureBtn(true);
        setStatus('● REC ' + durationSec + 's');

        // Build stream
        let stream;
        try {
            const videoStream = canvas.captureStream(60);

            if (includeAudio) {
                // Try to get the audio destination stream
                const audioEl = document.getElementById('catalogAudioPlayer');
                if (audioEl && audioEl.captureStream) {
                    const audioStream = audioEl.captureStream();
                    const audioTracks = audioStream.getAudioTracks();
                    stream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
                } else {
                    // No audio available — video only
                    stream = videoStream;
                }
            } else {
                stream = videoStream;
            }
        } catch (e) {
            console.warn('[Export] captureStream failed:', e);
            stream = canvas.captureStream ? canvas.captureStream(30) : null;
            if (!stream) {
                isRecording = false;
                updateCaptureBtn(false);
                setStatus('Error: captureStream not supported');
                return;
            }
        }

        try {
            recorder = new MediaRecorder(stream, {
                mimeType: mime,
                videoBitsPerSecond: 8_000_000
            });
        } catch (e) {
            // Fallback without explicit mime
            try {
                recorder = new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 });
            } catch (e2) {
                console.error('[Export] MediaRecorder failed:', e2);
                isRecording = false;
                updateCaptureBtn(false);
                setStatus('Recording not supported');
                return;
            }
        }

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const actualMime = recorder.mimeType || mime;
            const ext = getExtension(actualMime);
            const blob = new Blob(chunks, { type: actualMime });
            const trackId = getCurrentTrackId();
            const mode = window.currentMode || 'catalog';
            const filename = `pastEl_${trackId}_${mode}_${durationSec}s_${Date.now()}.${ext}`;
            downloadBlob(blob, filename);
            setLastFile(filename);
            isRecording = false;
            updateCaptureBtn(false);
            setStatus('Saved: ' + filename.substring(0, 36) + '…');
        };

        recorder.start(250); // collect data every 250ms

        // Countdown
        let remaining = durationSec;
        setStatus('● REC ' + remaining + 's');
        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                setStatus('● REC ' + remaining + 's');
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(countdownInterval);
            if (recorder && recorder.state !== 'inactive') {
                recorder.stop();
            }
        }, durationSec * 1000);
    }

    function stopCapture() {
        if (!isRecording) return;
        clearInterval(countdownInterval);
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    }

    // --- Still frame ---
    function captureStill() {
        const canvas = getCanvas();
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (!blob) { setStatus('Still capture failed'); return; }
            const trackId = getCurrentTrackId();
            const filename = `pastEl_${trackId}_${Date.now()}.png`;
            downloadBlob(blob, filename);
            setLastFile(filename);
            setStatus('PNG: ' + filename);
        }, 'image/png');
    }

    // --- Helpers ---
    function getCurrentTrackId() {
        const sel = document.getElementById('trackSelector');
        if (sel && sel.value !== undefined) {
            const catalog = window.allLoveCatalog;
            if (catalog && catalog[sel.value]) return catalog[sel.value].id;
        }
        return 'live';
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function setStatus(text) {
        const el = document.getElementById('exportStatus');
        if (el) el.textContent = text;
    }

    function setLastFile(name) {
        const el = document.getElementById('exportLastFile');
        if (el) el.textContent = name.length > 38 ? name.substring(0, 38) + '…' : name;
    }

    function updateCaptureBtn(recording) {
        const btn = document.getElementById('exportCaptureBtn');
        if (!btn) return;
        if (recording) {
            btn.textContent = 'STOP';
            btn.classList.add('recording');
        } else {
            btn.textContent = 'CAPTURE';
            btn.classList.remove('recording');
        }
    }

    // --- Wire UI after DOM ready ---
    function wireUI() {
        // Duration buttons
        document.querySelectorAll('.export-dur-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.export-dur-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDuration = parseInt(btn.dataset.dur, 10);
            });
        });

        // Audio toggle
        const audioToggle = document.getElementById('exportAudioToggle');
        if (audioToggle) {
            audioToggle.addEventListener('change', () => {
                includeAudio = audioToggle.checked;
            });
        }

        // Capture button
        const captureBtn = document.getElementById('exportCaptureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                if (isRecording) {
                    stopCapture();
                } else {
                    startCapture(selectedDuration);
                }
            });
        }

        // Still frame
        const stillBtn = document.getElementById('exportStillBtn');
        if (stillBtn) {
            stillBtn.addEventListener('click', captureStill);
        }
    }

    // --- Keyboard: R = 30s capture with audio ---
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key.toLowerCase() === 'r') {
            if (isRecording) {
                stopCapture();
            } else {
                startCapture(30);
            }
        }
    });

    // Wire up once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireUI);
    } else {
        wireUI();
    }

    // Expose for external calls
    window.exportVisualizer = { startCapture, stopCapture, captureStill };
})();
