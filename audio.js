// Audio context and analysis variables
let audioCtx;
let analyser;
let source;
let dataArray;
let bufferLength;

// Frequency band data (exposed for visualizer.js)
window.audioData = {
    subBass: 0,   // 20-60Hz
    bass: 0,      // 60-250Hz
    mids: 0,      // 250-4000Hz
    highs: 0,     // 4000-20000Hz
    isActive: false
};

const fileInput = document.getElementById('audioFileUpload');
const radioMic = document.getElementById('srcMic');
const radioFile = document.getElementById('srcFile');

function initAudio() {
    if (audioCtx) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();

    // Opus spec requested 2048
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

function processAudio() {
    if (!window.audioData.isActive || currentMode !== 'live') return;

    analyser.getByteFrequencyData(dataArray);

    // Rough bins based on 44100Hz sample rate and 2048 fftSize
    // Each bin is ~21.5Hz (44100 / 2048)

    // 20-60Hz (Bins 1-3)
    window.audioData.subBass = average(dataArray, 1, 3);

    // 60-250Hz (Bins 3-12)
    window.audioData.bass = average(dataArray, 3, 12);

    // 250-4000Hz (Bins 12-186)
    window.audioData.mids = average(dataArray, 12, 186);

    // 4000-20000Hz (Bins 186-930)
    window.audioData.highs = average(dataArray, 186, 930);

    requestAnimationFrame(processAudio);
}

function average(arr, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += arr[i];
    }
    return sum / (end - start);
}

// --- Source Handlers ---

function connectMic() {
    initAudio();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                if (source) source.disconnect();
                source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                window.audioData.isActive = true;
                processAudio();
            })
            .catch(err => console.error("Mic access denied", err));
    }
}

fileInput.addEventListener('change', function () {
    initAudio();
    const files = this.files;
    if (files.length === 0) {
        document.getElementById('uploadFileName').textContent = "";
        return;
    }

    const file = files[0];
    document.getElementById('uploadFileName').textContent = file.name;
    const reader = new FileReader();

    reader.onload = function (e) {
        audioCtx.decodeAudioData(e.target.result, function (buffer) {
            if (source) source.disconnect();

            source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(analyser);
            analyser.connect(audioCtx.destination); // Play out loud

            source.start(0);
            window.audioData.isActive = true;
            processAudio();
        });
    };
    reader.readAsArrayBuffer(file);
});

radioMic.addEventListener('change', () => {
    if (radioMic.checked) {
        if (source) source.disconnect();
        connectMic();
    }
});

radioFile.addEventListener('change', () => {
    if (radioFile.checked) {
        if (source) source.disconnect();
        window.audioData.isActive = false; // Wait for file upload
    }
});

// Start loop if mode switches to live
document.getElementById('modeLiveBtn').addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // If mic is already checked upon entering live mode
    if (radioMic.checked && !window.audioData.isActive) {
        connectMic();
    } else if (window.audioData.isActive) {
        processAudio();
    }
});
