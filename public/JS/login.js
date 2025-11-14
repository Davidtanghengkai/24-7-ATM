document.addEventListener('DOMContentLoaded', () => {
    const faceModal = document.getElementById('face-modal');
    const videoEl = document.getElementById('video');
    const closeBtn = document.getElementById('close-face-modal') || document.querySelector('.close-face-modal');
    let mediaStream = null;

    // find the verification card whose .card-text is "Face ID"
    const faceCard = Array.from(document.querySelectorAll('.verification-card'))
        .find(card => {
            const txt = card.querySelector('.card-text');
            return txt && txt.textContent.trim().toLowerCase() === 'face id';
        });
    
    initFaceRecognition();

    async function startCamera() {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            videoEl.srcObject = mediaStream;
            await videoEl.play();
        } catch (err) {
            console.error('Unable to access camera:', err);
            alert('Cannot access camera. Please allow camera permission or use a supported device.');
            closeFaceModal();
        }
    }

    function stopCamera() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.srcObject = null;
        }
    }

    function openFaceModal() {
        if (!faceModal) return;
        // show modal (adjust depending on your CSS — using flex as a common overlay layout)
        faceModal.style.display = 'flex';
        startCamera();
    }

    function closeFaceModal() {
        if (!faceModal) return;
        faceModal.style.display = 'none';
        stopCamera();
    }

    if (faceCard) {
        faceCard.addEventListener('click', (e) => {
            e.preventDefault();
            openFaceModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeFaceModal();
        });
    }

    // close when clicking outside the modal content
    if (faceModal) {
        faceModal.addEventListener('click', (e) => {
            if (e.target === faceModal) closeFaceModal();
        });
    }

    // optional: close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeFaceModal();
    });

    // Expose important variables / functions to outer scope so the recognition code
    // (which lives outside this DOMContentLoaded handler) can access them.
    window.videoEl = videoEl;
    window.faceModal = faceModal;
    window.startCamera = startCamera;
    window.stopCamera = stopCamera;
    window.openFaceModal = openFaceModal;
    window.closeFaceModal = closeFaceModal;

    // Ensure initFaceRecognition runs now that startCamera / closeFaceModal etc are available.
    // It's safe to call twice because initFaceRecognition guards against re-starting.
    try {
        initFaceRecognition();
    } catch (e) {
        // swallow — initFaceRecognition is async and may return a rejected promise;
        // any real errors will surface in console or via the status element.
        console.warn('initFaceRecognition call deferred/executed:', e);
    }
});

// Face recognition & anti-spoofing integration for the face-modal
// This code uses the existing startCamera/stopCamera, videoEl and faceModal variables
// defined above in the same DOMContentLoaded scope.

let modelsLoaded = false;
let recognitionStarted = false;
let detectionInterval = null;
let overlayCanvas = null;
let sampleDescriptor = null;

// Call this from openFaceModal() so models/load happen on-demand
async function initFaceRecognition() {
    if (!window.faceapi) {
        console.error('face-api.js not found. Place face-api script before this file.');
        const st = document.getElementById('status');
        if (st) st.textContent = 'face-api.js not loaded.';
        return;
    }
    if (recognitionStarted) return;
    recognitionStarted = true;

    const statusText = document.getElementById('status');
    if (statusText) statusText.textContent = 'Loading models...';

    if (!modelsLoaded) {
        try {
            // adjust path if your models are in a different folder
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/cam_model'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/cam_model'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/cam_model'),
            ]);
            modelsLoaded = true;
        } catch (err) {
            console.error('Failed to load face-api models', err);
            if (statusText) statusText.textContent = 'Failed loading models.';
            recognitionStarted = false;
            return;
        }
    }

    if (statusText) statusText.textContent = 'Models loaded. Starting camera...';

    // start camera (uses the startCamera defined earlier)
    await startCamera();
    if (statusText) statusText.textContent = 'Camera started. Waiting for video...';

    // Load reference face once
    try {
        // change path to your stored sample face image if needed
        const sampleImg = await faceapi.fetchImage('/public/photos/sample_face.jpg');
        const sd = await faceapi
            .detectSingleFace(sampleImg, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!sd) {
            if (statusText) statusText.textContent = 'Could not load reference face.';
            console.warn('No descriptor from sample image.');
        } else {
            sampleDescriptor = sd;
        }
    } catch (err) {
        console.warn('No sample face loaded or error reading it:', err);
        // sampleDescriptor stays null — we can still run spoof/blurry checks
    }

    // Ensure we only attach a single playing handler
    const onPlaying = async () => {
        // remove existing overlay if any
        if (overlayCanvas && overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
        overlayCanvas = faceapi.createCanvasFromMedia(videoEl);
        // insert right after video for easier CSS positioning
        videoEl.parentNode.insertBefore(overlayCanvas, videoEl.nextSibling);

        overlayCanvas.style.position = 'absolute';
        overlayCanvas.style.pointerEvents = 'none';
        overlayCanvas.style.zIndex = '9999';

        // make parent a positioned container so absolute overlay aligns correctly
        const overlayParent = videoEl.parentNode;
        const parentStyle = window.getComputedStyle(overlayParent);
        if (parentStyle.position === 'static') {
            overlayParent.style.position = 'relative';
        }

        function updateCanvasPosition() {
            // video bounding rect in viewport
            const rect = videoEl.getBoundingClientRect();
            // parent bounding rect in viewport
            const parentRect = overlayParent.getBoundingClientRect();

            // position overlay relative to parent
            const left = rect.left - parentRect.left + overlayParent.scrollLeft;
            const top = rect.top - parentRect.top + overlayParent.scrollTop;
            overlayCanvas.style.left = left + 'px';
            overlayCanvas.style.top = top + 'px';

            // style size should match visible size of video element
            overlayCanvas.style.width = rect.width + 'px';
            overlayCanvas.style.height = rect.height + 'px';

            // use video intrinsic size when available, otherwise fall back to element size
            const displaySize = {
            width: videoEl.videoWidth || Math.round(rect.width),
            height: videoEl.videoHeight || Math.round(rect.height)
            };

            // account for devicePixelRatio for crisp rendering
            const dpr = window.devicePixelRatio || 1;
            overlayCanvas.width = Math.round(displaySize.width * dpr);
            overlayCanvas.height = Math.round(displaySize.height * dpr);

            // scale drawing context so face-api drawing matches CSS pixels
            const ctx = overlayCanvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            faceapi.matchDimensions(overlayCanvas, displaySize);
            return displaySize;
        }

        // initial sizing
        let displaySize = updateCanvasPosition();
        window.addEventListener('resize', updateCanvasPosition);
        window.addEventListener('scroll', updateCanvasPosition);

        // clear any previous interval
        if (detectionInterval) clearInterval(detectionInterval);

        detectionInterval = setInterval(async () => {
            // stop if modal hidden
            if (!faceModal || faceModal.style.display === 'none') {
                clearInterval(detectionInterval);
                detectionInterval = null;
                return;
            }

            const currentDisplay = updateCanvasPosition();

            const detections = await faceapi
                .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resized = faceapi.resizeResults(detections, currentDisplay);
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            faceapi.draw.drawDetections(overlayCanvas, resized);

            const status = document.getElementById('status');

            if (!detections || detections.length === 0) {
                if (status) status.textContent = 'No face detected.';
                return;
            }

            // use first face
            const det = resized[0];
            const box = det.detection.box;
            const estimatedMeters = estimateDistanceFromFaceBox(box.width, currentDisplay.width);

            const faceCrop = cropFaceCanvas(videoEl, box);

            // run spoof/blurry checks in parallel
            const [spoofDetected, blurry] = await Promise.all([
                isScreenSpoof(faceCrop),
                Promise.resolve(isFaceBlurry(faceCrop, 40)), // threshold adjustable
            ]);

            if (spoofDetected) {
                if (status) status.textContent = '❌ Spoof detected (screen/photo).';
                return;
            }

            if (blurry) {
                if (status) status.textContent = '❌ Face too blurry. Improve lighting or move closer. Estimated distance: ' + estimatedMeters.toFixed(2) + ' m.';
                return;
            }

            if (sampleDescriptor) {
                const distance = faceapi.euclideanDistance(detections[0].descriptor, sampleDescriptor.descriptor);
                if (distance < 0.4) {
                    // descriptor match — now check physical distance (desired range 0.4 - 0.5 m)
                    if (!isNaN(estimatedMeters)) {
                        if (estimatedMeters >= 0.4 && estimatedMeters <= 0.5) {
                            if (status) status.textContent = '✅ Match! Estimated distance: ' + estimatedMeters.toFixed(2) + ' m.';
                            // stop detection loop cleanly
                            if (detectionInterval) {
                                clearInterval(detectionInterval);
                                detectionInterval = null;
                                window.location.href = '/public/NewHomePage.html';
                            }
                            // perform next step here (e.g., proceed with authentication)
                        } else if (estimatedMeters > 0.5) {
                            if (status) status.textContent = '❌ You are too far. Please move closer (0.4 - 0.5 m). Estimated distance: ' + estimatedMeters.toFixed(2) + ' m.';
                        } else {
                            if (status) status.textContent = '❌ You are too close. Please move slightly back (0.4 - 0.5 m). Estimated distance: ' + estimatedMeters.toFixed(2) + ' m.';
                        }
                    } else {
                        // unknown physical distance but descriptor matches
                        if (status) status.textContent = 'Please adjust your distance (ideal 0.4 - 0.5 m).';
                    }
                } else {
                    if (status) status.textContent = `❌ Not same person (distance=${distance.toFixed(2)}). Face camera. Est: ${isNaN(estimatedMeters) ? 'unknown' : estimatedMeters.toFixed(2) + ' m.'}`;
                }
            } else {
                if (status) status.textContent = 'Face not detected (no reference image).';
            }
        }, 1000);
    };

    // attach only once
    videoEl.removeEventListener('playing', onPlaying); // harmless if not attached
    videoEl.addEventListener('playing', onPlaying);
}

// ensure detection stops and overlay removed when modal closed
const originalCloseFaceModal = closeFaceModal;
function closeFaceModal() {
    try {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        if (overlayCanvas && overlayCanvas.parentNode) {
            overlayCanvas.parentNode.removeChild(overlayCanvas);
            overlayCanvas = null;
        }
    } catch (e) {
        console.warn('Error cleaning up recognition:', e);
    }
    // call original close logic (stops camera etc.)
    if (typeof originalCloseFaceModal === 'function') originalCloseFaceModal();
};

// hook init to modal open so it starts models + detection
const originalOpenFaceModal = openFaceModal;
function openFaceModal() {
    if (typeof originalOpenFaceModal === 'function') originalOpenFaceModal();
    // small delay to ensure video element is in DOM and visible
    setTimeout(() => initFaceRecognition(), 200);
};


/* --------- Anti-spoofing & utility functions (copied/adjusted) --------- */

async function isScreenSpoof(faceCanvas) {
    try {
        const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);

        const [screenPatterns, hasPixelGrid, refreshArtifacts] = await Promise.all([
            detectScreenPatterns(imageData),
            checkPixelGrid(imageData),
            detectRefreshArtifacts(faceCanvas),
        ]);

        console.log('Detection Results:', { screenPatterns, hasPixelGrid, refreshArtifacts });

        return screenPatterns || hasPixelGrid || refreshArtifacts;
    } catch (err) {
        console.error('Screen detection error:', err);
        return false;
    }
}

function detectScreenPatterns(imageData) {
    const { data, width, height } = imageData;
    let moireScore = 0;
    const sampleStep = 3;

    for (let y = 2; y < height - 2; y += sampleStep) {
        for (let x = 2; x < width - 2; x += sampleStep) {
            const i = (y * width + x) * 4;

            const rightDiff =
                Math.abs(data[i] - data[i + 4]) + Math.abs(data[i + 1] - data[i + 5]) + Math.abs(data[i + 2] - data[i + 6]);

            const bottomDiff =
                Math.abs(data[i] - data[i + width * 4]) +
                Math.abs(data[i + 1] - data[i + width * 4 + 1]) +
                Math.abs(data[i + 2] - data[i + width * 4 + 2]);

            if (rightDiff > 35 && bottomDiff > 35) {
                moireScore += 1.2;
            }
        }
    }

    const threshold = (width * height) / (sampleStep * sampleStep * 10);
    console.log('Moire Score:', moireScore, 'Threshold:', threshold);

    return moireScore > threshold;
}

function checkPixelGrid(imageData) {
    const { data, width, height } = imageData;
    const gridSize = 3;
    let gridMatches = 0;

    for (let y = gridSize; y < height - gridSize; y += gridSize) {
        for (let x = gridSize; x < width - gridSize; x += gridSize) {
            const i = (y * width + x) * 4;
            const nextPixel = (y * width + (x + gridSize)) * 4;

            const rDiff = Math.abs(data[i] - data[nextPixel]);
            const gDiff = Math.abs(data[i + 1] - data[nextPixel + 1]);
            const bDiff = Math.abs(data[i + 2] - data[nextPixel + 2]);

            if (rDiff > 140 && gDiff > 140 && bDiff > 140) {
                gridMatches++;
            }
        }
    }
    console.log('Grid Matches:', gridMatches, 'Threshold:', (width * height) / (gridSize * gridSize * 3));
    return gridMatches > (width * height) / (gridSize * gridSize * 3);
}

async function detectRefreshArtifacts(canvas) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    tempCtx.drawImage(canvas, 0, 0);
    const frame1 = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    await new Promise((r) => setTimeout(r, 50));
    tempCtx.drawImage(canvas, 0, 0);
    const frame2 = tempCtx.getImageData(0, 0, canvas.width, canvas.height);

    let changedPixels = 0;
    for (let i = 0; i < frame1.data.length; i += 4) {
        if (Math.abs(frame1.data[i] - frame2.data[i]) > 20) changedPixels++;
    }

    console.log('Changed Pixels:', changedPixels, 'Threshold:', canvas.width * canvas.height * 0.2);
    return changedPixels > canvas.width * canvas.height * 0.2;
}

function isFaceBlurry(imageElement, threshold = 40) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
    }

    let laplacianSum = [];
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            const center = data[idx];
            const top = data[idx - canvas.width * 4];
            const bottom = data[idx + canvas.width * 4];
            const left = data[idx - 4];
            const right = data[idx + 4];

            const laplacian = 4 * center - top - bottom - left - right;
            laplacianSum.push(laplacian);
        }
    }

    const mean = laplacianSum.reduce((a, b) => a + b, 0) / laplacianSum.length;
    const variance = laplacianSum.reduce((a, b) => a + (b - mean) ** 2, 0) / laplacianSum.length;
    console.log('Laplacian Variance:', variance, 'Threshold:', threshold);
    return variance < threshold;
}

function cropFaceCanvas(video, box) {
    const faceCanvas = document.createElement('canvas');
    const fctx = faceCanvas.getContext('2d');

    faceCanvas.width = box.width;
    faceCanvas.height = box.height;

    fctx.drawImage(
        video,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        box.width,
        box.height
    );

    return faceCanvas;
}

function getFocalLengthFromFov(videoWidthPx, fovDeg = 60) {
    const fovRad = (fovDeg * Math.PI) / 180;
    return videoWidthPx / 2 / Math.tan(fovRad / 2);
}

function calibrateFocalLength(knownDistanceMeters, observedBoxWidthPx, knownFaceWidthMeters = 0.16) {
    return (observedBoxWidthPx * knownDistanceMeters) / knownFaceWidthMeters;
}

function estimateDistanceFromFaceBox(boxWidthPx, videoWidthPx, knownFaceWidthMeters = 0.16, fovDeg = 60, focalLengthPx = null) {
    if (!boxWidthPx || !videoWidthPx) return NaN;
    const focal = focalLengthPx || getFocalLengthFromFov(videoWidthPx, fovDeg);
    return (knownFaceWidthMeters * focal) / boxWidthPx;
}

// Surface unexpected runtime errors to status text
window.addEventListener('error', (ev) => {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Error: ' + (ev && ev.message ? ev.message : 'unknown');
});