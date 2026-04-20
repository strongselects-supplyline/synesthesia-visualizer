// ============================================================
// Synesthesia Visualizer — Event Mode Controller
// "The Portal" — Cinematic Album Listening Experience
// past.El — ALL LOVE (April 24, 2026)
// ============================================================

class EventMode {
    constructor() {
        this.state = 'IDLE';        // IDLE → INTRO → PLAYING_TRACK → TRANSITION → ... → FINALE → END
        this.trackIndex = 0;
        this.catalog = [];
        this.audioEl = null;
        this.isActive = false;
        this.animFrameId = null;
        this._initialized = false;  // guard: prevent duplicate listener registration on repeated init() calls

        // DOM refs (set in init)
        this.overlay = null;
        this.endOverlay = null;
        this.albumTitle = null;
        this.artistName = null;
        this.trackNumber = null;
        this.trackTitle = null;
        this.startBtn = null;
        this.endText = null;
        this.progressBar = null;
        this.progressFill = null;
        this.progressTime = null;

        // Config from URL params
        this.autostart = false;
        this.controlsHidden = false;
        this.endTextContent = 'the love continues...';

        this._parseParams();
    }

    // --- URL PARAMS ---
    _parseParams() {
        const params = new URLSearchParams(window.location.search);
        this.autostart = params.get('autostart') === 'true';
        this.controlsHidden = params.get('controls') === 'hidden';
        if (params.get('endtext')) {
            this.endTextContent = decodeURIComponent(params.get('endtext')).replace(/\+/g, ' ');
        }
    }

    // --- INIT ---
    init() {
        // Guard: DOM refs and event listeners are wired once only.
        // visualizer.js calls init() at startup AND on each Event button click —
        // without this guard each click adds another 'ended' listener → double-fires transitions.
        if (this._initialized) {
            console.log('[EventMode] Already initialized — skipping re-init.');
            return;
        }
        this._initialized = true;

        this.catalog = window.allLoveCatalog || [];
        this.audioEl = document.getElementById('catalogAudioPlayer');

        // DOM refs
        this.overlay = document.getElementById('eventOverlay');
        this.endOverlay = document.getElementById('eventEndOverlay');
        this.albumTitle = document.querySelector('.event-album-title');
        this.artistName = document.querySelector('.event-artist');
        this.trackNumber = document.querySelector('.event-track-number');
        this.trackTitle = document.querySelector('.event-track-title');
        this.startBtn = document.getElementById('eventStartBtn');
        this.endText = document.querySelector('.event-end-text');
        this.progressBar = document.getElementById('eventProgressBar');
        this.progressFill = document.getElementById('eventProgressFill');
        this.progressTime = document.getElementById('eventProgressTime');

        if (!this.overlay || !this.audioEl) {
            console.warn('[EventMode] Missing DOM elements, cannot init.');
            return;
        }

        // Wire start button
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.start());
        }

        // Wire audio ended event
        this.audioEl.addEventListener('ended', () => this._onTrackEnd());

        // Progress update loop
        this.audioEl.addEventListener('timeupdate', () => this._updateProgress());

        // Set end text
        if (this.endText) {
            this.endText.textContent = this.endTextContent;
        }

        // Hide panel hint if controls hidden
        if (this.controlsHidden) {
            const hint = document.getElementById('panelHint');
            if (hint) hint.style.display = 'none';
        }

        console.log('[EventMode] Initialized. Tracks:', this.catalog.length);
    }

    // --- ACTIVATE ---
    // Called when user switches to Event mode tab
    activate() {
        this.isActive = true;
        this.state = 'IDLE';
        this.trackIndex = 0;

        // Stop any catalog playback
        if (typeof window.stopCatalogTrack === 'function') {
            window.stopCatalogTrack();
        }

        // Show overlay with intro state
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('active');
        this._showIntroState();

        // Hide progress bar initially
        if (this.progressBar) this.progressBar.classList.remove('visible');

        // Autostart if param set
        if (this.autostart) {
            setTimeout(() => this.start(), 2000);
        }
    }

    // --- DEACTIVATE ---
    deactivate() {
        this.isActive = false;
        this.state = 'IDLE';
        this.trackIndex = 0;

        // Stop audio
        if (this.audioEl) {
            this.audioEl.pause();
            this.audioEl.currentTime = 0;
        }

        // Hide overlays
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.overlay.classList.remove('active');
        }
        if (this.endOverlay) {
            this.endOverlay.classList.add('hidden');
            this.endOverlay.classList.remove('visible');
        }

        // Reset portal
        window.portalProgress = 0;
        if (window.washUniforms && window.washUniforms.uPortalProgress) {
            window.washUniforms.uPortalProgress.value = 0;
        }

        // Hide progress
        if (this.progressBar) this.progressBar.classList.remove('visible');

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }

    // --- INTRO STATE (waiting for click) ---
    _showIntroState() {
        const card = document.querySelector('.event-title-card');
        if (!card) return;

        // Show album title + artist + start button
        if (this.albumTitle) this.albumTitle.style.opacity = '1';
        if (this.artistName) this.artistName.style.opacity = '1';
        if (this.startBtn) {
            this.startBtn.style.display = 'inline-block';
            this.startBtn.style.opacity = '1';
        }
        if (this.trackNumber) this.trackNumber.style.opacity = '0';
        if (this.trackTitle) this.trackTitle.style.opacity = '0';

        card.classList.add('visible');
    }

    // --- START ---
    start() {
        if (this.state !== 'IDLE') return;
        this.state = 'INTRO';
        console.log('[EventMode] Starting experience...');

        // Fade out start button
        if (this.startBtn) {
            this.startBtn.style.opacity = '0';
            this.startBtn.style.pointerEvents = 'none';
        }

        // Brief intro hold, then start first track
        setTimeout(() => {
            // Fade out album title
            if (this.albumTitle) this.albumTitle.style.opacity = '0';
            if (this.artistName) this.artistName.style.opacity = '0';

            setTimeout(() => {
                this._playTrack(0);
            }, 1200);
        }, 2000);
    }

    // --- PLAY TRACK ---
    _playTrack(index) {
        if (!this.isActive) return;

        this.state = 'PLAYING_TRACK';
        this.trackIndex = index;
        const track = this.catalog[index];

        if (!track) {
            console.error('[EventMode] No track at index', index);
            this.finale();
            return;
        }

        console.log(`[EventMode] Playing track ${index + 1}/${this.catalog.length}: ${track.title}`);

        // Set visualizer color via existing function
        if (typeof window.setTrackById === 'function') {
            window.setTrackById(track.id);
        } else {
            // Fallback: directly set target color
            if (track.synHex && window.targetColor) {
                window.targetColor.set(track.synHex);
            }
        }

        // Show track card
        this._showTrackCard(track, index + 1);

        // Show progress bar
        if (this.progressBar) {
            this.progressBar.classList.add('visible');
        }

        // Play audio
        this.audioEl.volume = 0;
        this.audioEl.src = track.audioUrl;
        this.audioEl.play().then(() => {
            this._fadeAudio(1, 1500);
        }).catch(err => {
            console.warn('[EventMode] Audio play failed:', err.message);
            // If audio fails (no file), simulate track duration and move on
            console.log('[EventMode] Simulating 10s track (no audio file)');
            setTimeout(() => this._onTrackEnd(), 10000);
        });
    }

    // --- TRACK CARD ---
    _showTrackCard(track, number) {
        const numStr = String(number).padStart(2, '0');

        if (this.trackNumber) {
            this.trackNumber.textContent = numStr;
            this.trackNumber.style.opacity = '0';
        }
        if (this.trackTitle) {
            this.trackTitle.textContent = track.title;
            this.trackTitle.style.opacity = '0';
        }

        // Hide album title / start btn
        if (this.albumTitle) this.albumTitle.style.opacity = '0';
        if (this.artistName) this.artistName.style.opacity = '0';
        if (this.startBtn) this.startBtn.style.display = 'none';

        // Fade in track info
        requestAnimationFrame(() => {
            if (this.trackNumber) this.trackNumber.style.opacity = '0.4';
            if (this.trackTitle) this.trackTitle.style.opacity = '1';
        });

        // Fade out track info after 3.5s
        setTimeout(() => {
            if (this.trackNumber) this.trackNumber.style.opacity = '0';
            if (this.trackTitle) this.trackTitle.style.opacity = '0';
            // Also disable pointer events on overlay so visualizer is interactive
            if (this.overlay) this.overlay.classList.remove('active');
        }, 3500);
    }

    // --- PROGRESS BAR ---
    _updateProgress() {
        if (this.state !== 'PLAYING_TRACK' || !this.audioEl) return;

        const current = this.audioEl.currentTime;
        const duration = this.audioEl.duration || 1;
        const pct = (current / duration) * 100;

        if (this.progressFill) {
            this.progressFill.style.width = pct + '%';
        }

        if (this.progressTime) {
            const mins = Math.floor(current / 60);
            const secs = Math.floor(current % 60);
            const totalMins = Math.floor(duration / 60);
            const totalSecs = Math.floor(duration % 60);
            this.progressTime.textContent =
                `${mins}:${String(secs).padStart(2, '0')} / ${totalMins}:${String(totalSecs).padStart(2, '0')}`;
        }
    }

    // --- TRACK END HANDLER ---
    _onTrackEnd() {
        if (this.state !== 'PLAYING_TRACK' || !this.isActive) return;

        if (this.trackIndex < this.catalog.length - 1) {
            this._transition(this.trackIndex + 1);
        } else {
            this.finale();
        }
    }

    // --- TRANSITION ---
    _transition(nextIndex) {
        if (!this.isActive) return;
        this.state = 'TRANSITION';
        const nextTrack = this.catalog[nextIndex];

        console.log(`[EventMode] Transition → ${nextTrack.title}`);

        // Hide progress during transition
        if (this.progressBar) this.progressBar.classList.remove('visible');

        // 1. Fade audio out
        this._fadeAudio(0, 1500);

        // 2. Dim the visualizer (reduce intensity temporarily)
        const origIntensity = window.intensity || 0.5;
        window.intensity = 0.08;

        // 3. After fade, brief silence, show next track card
        setTimeout(() => {
            // Re-enable overlay for track card
            if (this.overlay) {
                this.overlay.classList.remove('hidden');
                this.overlay.classList.add('active');
            }

            // Brief dark moment
            setTimeout(() => {
                // Restore intensity and play next
                window.intensity = origIntensity;
                this._playTrack(nextIndex);
            }, 1000);
        }, 1800);
    }

    // --- FINALE (THE PORTAL) ---
    finale() {
        this.state = 'FINALE';
        console.log('[EventMode] FINALE — Portal sequence initiated');

        // Hide progress and overlay
        if (this.progressBar) this.progressBar.classList.remove('visible');
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.overlay.classList.remove('active');
        }

        // Begin portal animation
        window.portalProgress = 0;
        const startTime = performance.now();
        const duration = 8000;

        const animatePortal = (now) => {
            if (!this.isActive) return;

            const elapsed = now - startTime;
            let rawProgress = Math.min(elapsed / duration, 1);

            // Easing: slow build → dramatic acceleration
            let progress;
            if (rawProgress < 0.6) {
                progress = rawProgress * 0.5;
            } else {
                progress = 0.3 + (rawProgress - 0.6) * 1.75;
            }
            progress = Math.min(progress, 1);

            window.portalProgress = progress;

            // Update wash shader uniform
            if (window.washUniforms && window.washUniforms.uPortalProgress) {
                window.washUniforms.uPortalProgress.value = progress;
            }

            if (rawProgress < 1) {
                this.animFrameId = requestAnimationFrame(animatePortal);
            } else {
                // Portal complete → end screen
                setTimeout(() => this._end(), 600);
            }
        };

        this.animFrameId = requestAnimationFrame(animatePortal);

        // Also fade audio if still playing
        if (this.audioEl && !this.audioEl.paused) {
            this._fadeAudio(0, 6000);
        }
    }

    // --- END SCREEN ---
    _end() {
        this.state = 'END';
        console.log('[EventMode] End screen');

        // Reset portal
        window.portalProgress = 0;
        if (window.washUniforms && window.washUniforms.uPortalProgress) {
            window.washUniforms.uPortalProgress.value = 0;
        }

        // Show end overlay with black screen + text
        if (this.endOverlay) {
            this.endOverlay.classList.remove('hidden');
            // Trigger fade in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.endOverlay.classList.add('visible');
                });
            });
        }
    }

    // --- AUDIO FADE ---
    _fadeAudio(targetVolume, durationMs) {
        if (!this.audioEl) return;

        const startVol = this.audioEl.volume;
        const startTime = performance.now();

        const ramp = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            // Ease out for fades
            const eased = 1 - Math.pow(1 - progress, 2);
            this.audioEl.volume = Math.max(0, Math.min(1,
                startVol + (targetVolume - startVol) * eased
            ));

            if (progress < 1) {
                requestAnimationFrame(ramp);
            } else if (targetVolume === 0) {
                this.audioEl.pause();
            }
        };

        requestAnimationFrame(ramp);
    }
}

// --- EXPOSE GLOBALLY ---
window.EventMode = EventMode;
window.eventMode = new EventMode();
