// --- Global Constants and State: These control how Face ID works ---
const MATCH_THRESHOLD = 0.4; // How close the face descriptor must be to the sample for a match
const OPTIMAL_DISTANCE_MIN = 0.4; // Minimum ideal distance (system optimal)
const OPTIMAL_DISTANCE_MAX = 0.5; // Maximum ideal distance (system optimal)
const MAX_NON_MATCH_COUNT = 3; // How many times we can fail a check before switching to registration

let modelsLoaded = false; // Flag to ensure models only load once
let recognitionStarted = false; // Flag to prevent multiple detection loops
let detectionInterval = null; // The main loop handler for real-time detection (for initial face check)
let overlayCanvas = null; // Canvas used to draw the detection box over the video (for initial face check)
let sampleDescriptor = null; // The known face reference for comparison
let nonMatchCount = 0; // Tracks consecutive non-matches for the transition logic

// ---------------- New: Global State for Registration ----------------
let registrationDetectionInterval = null;
let registrationOverlayCanvas = null;
let mediaStream = null; // Stores the camera stream object

// DOM Setup and Initialization: Runs when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    // Get all the essential elements from the HTML
    const faceModal = document.getElementById('face-modal');
    const registrationModal = document.getElementById('registration-modal'); 
    const videoEl = document.getElementById('video');
    const closeFaceBtn = document.getElementById('close-face-modal') || document.querySelector('.close-face-modal');
    const closeRegistrationBtn = document.getElementById('close-registration-modal'); 

    // Find the main "Face ID" card button
    const faceCard = Array.from(document.querySelectorAll('.verification-card'))
        .find(card => {
            const txt = card.querySelector('.card-text');
            return txt && txt.textContent.trim().toLowerCase() === 'face id';
        });

    // Camera and Modal Handling Functions
    window.startCamera = async function(targetVideoEl) {
        try {
            if (mediaStream) window.stopCamera(); // Ensure previous stream is stopped
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            targetVideoEl.srcObject = mediaStream;
            await targetVideoEl.play();
        } catch (err) {
            console.error('Unable to access camera:', err);
            alert('Cannot access camera. Please allow camera permission or use a supported device.');
            if (targetVideoEl === videoEl && window.closeFaceModal) window.closeFaceModal(); 
            throw err;
        }
    }

    window.stopCamera = function() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        const videos = [videoEl, document.getElementById('face-registration-video')];
        videos.forEach(v => {
            if (v) {
                v.pause();
                v.srcObject = null;
            }
        });
    }

    window.openFaceModal = function() {
        if (!faceModal) return;
        faceModal.style.display = 'flex';
    }

    window.closeFaceModal = function() {
        if (!faceModal) return;
        faceModal.style.display = 'none';
        window.stopCamera();
    }
    
    // CORRECTED: Simplified registration modal opening to rely on runRegistrationScan for start
    window.openRegistrationModal = function() {
        if (!registrationModal) return;
        if (window.closeFaceModal) window.closeFaceModal(); 
        registrationModal.style.display = 'flex';
        const regVideoEl = document.getElementById('face-registration-video');
        if (regVideoEl) {
            window.startCamera(regVideoEl).then(() => {
                // Now runRegistrationScan will start the robust checkVideoReady loop
                runRegistrationScan();
            }).catch(err => {
                console.error("Camera failed to start for registration:", err);
            });
        } else {
             console.warn('Registration video element (ID: face-registration-video) not found.');
        }
    }

    window.closeRegistrationModal = function() {
        if (!registrationModal) return;
        registrationModal.style.display = 'none';
        window.stopCamera();
    }
    
    window.videoEl = videoEl;
    window.faceModal = faceModal;
    window.registrationModal = registrationModal;

    if (faceCard) {
        faceCard.addEventListener('click', (e) => {
            e.preventDefault();
            window.openFaceModal();
        });
    }

    if (closeFaceBtn) {
        closeFaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.closeFaceModal();
        });
    }
    
    if (closeRegistrationBtn) {
        closeRegistrationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.closeRegistrationModal(); 
        });
    }

    if (faceModal) {
        faceModal.addEventListener('click', (e) => {
            if (e.target === faceModal) window.closeFaceModal();
        });
    }
    
    if (registrationModal) {
        registrationModal.addEventListener('click', (e) => {
            if (e.target === registrationModal) window.closeRegistrationModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeFaceModal();
            window.closeRegistrationModal(); 
        }
    });

    // Initial Face Check Cleanup Override
    const baseCloseFaceModal = window.closeFaceModal;
    window.closeFaceModal = function closeFaceModalWithCleanup() {
        try {
            if (detectionInterval) {
                clearInterval(detectionInterval);
                detectionInterval = null;
            }
            if (overlayCanvas && overlayCanvas.parentNode) {
                overlayCanvas.parentNode.removeChild(overlayCanvas);
                overlayCanvas = null;
            }
            recognitionStarted = false;
            nonMatchCount = 0;
            const videoEl = document.getElementById('video');
            if (videoEl) videoEl.removeEventListener('playing', initFaceRecognition); 
        } catch (e) {
            console.warn('Error cleaning up recognition:', e);
        }
        baseCloseFaceModal(); 
    };

    const baseOpenFaceModal = window.openFaceModal;
    window.openFaceModal = function openFaceModalWithInit() {
        baseOpenFaceModal();
        setTimeout(() => initFaceRecognition(), 200);
    };
    
    // Registration Check Cleanup Override
    const baseCloseRegistrationModal = window.closeRegistrationModal;
    window.closeRegistrationModal = function closeRegistrationModalWithCleanup() {
        try {
            if (registrationDetectionInterval) {
                clearInterval(registrationDetectionInterval);
                registrationDetectionInterval = null;
            }
            if (registrationOverlayCanvas && registrationOverlayCanvas.parentNode) {
                registrationOverlayCanvas.parentNode.removeChild(registrationOverlayCanvas);
                registrationOverlayCanvas = null;
            }
            const regVideoEl = document.getElementById('face-registration-video');
            // Remove the playing event listener that might be waiting
            if(regVideoEl) regVideoEl.removeEventListener('playing', startRegistrationDetection);
        } catch (e) {
            console.warn('Error cleaning up registration recognition:', e);
        }
        baseCloseRegistrationModal(); 
    };
});

// Face Recognition Core Logic (Initial Check)
async function initFaceRecognition() {
    const videoEl = window.videoEl; 
    const faceModal = window.faceModal; 
    const statusText = document.getElementById('status');
    if (!window.faceapi || !videoEl || !statusText) {
        if (statusText) statusText.textContent = 'Setup Error: Missing face-api or DOM elements.';
        return;
    }
    
    if (recognitionStarted) return;
    recognitionStarted = true;

    if (statusText) statusText.textContent = 'Loading models...';

    if (!modelsLoaded) {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/cam_model'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/cam_model'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/cam_model'),
            ]);
            modelsLoaded = true;
        } catch (err) {
            console.error('Failed to load face-api models', err);
            if (statusText) statusText.textContent = 'Failed loading models. Check /cam_model path.';
            recognitionStarted = false;
            return;
        }
    }

    if (statusText) statusText.textContent = 'Models loaded. Starting camera...';
    // Use the startCamera function which is async
    try {
        await window.startCamera(videoEl);
    } catch (e) {
        recognitionStarted = false;
        return;
    }
    
    if (statusText) statusText.textContent = 'Camera ready. Position face in the center...';

    if (!sampleDescriptor) {
        try {
            // NOTE: Ensure you have a 'sample_face.jpg' at /public/photos/
            const sampleImg = await faceapi.fetchImage('/public/photos/sample_face.jpg');
            const sd = await faceapi
                .detectSingleFace(sampleImg, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (sd) {
                sampleDescriptor = sd;
            }
        } catch (err) {
            console.warn('No sample face loaded or error reading it:', err);
        }
    }

    const onPlaying = async () => {
        if (overlayCanvas && overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
        overlayCanvas = faceapi.createCanvasFromMedia(videoEl);
        videoEl.parentNode.insertBefore(overlayCanvas, videoEl.nextSibling);
        overlayCanvas.style.position = 'absolute';
        overlayCanvas.style.pointerEvents = 'none';
        overlayCanvas.style.zIndex = '9999';
        
        const overlayParent = videoEl.parentNode;
        const parentStyle = window.getComputedStyle(overlayParent);
        if (parentStyle.position === 'static') { overlayParent.style.position = 'relative'; }

        function updateCanvasPosition() {
            const rect = videoEl.getBoundingClientRect();
            const parentRect = overlayParent.getBoundingClientRect();
            const left = rect.left - parentRect.left + overlayParent.scrollLeft;
            const top = rect.top - parentRect.top + overlayParent.scrollTop;
            overlayCanvas.style.left = left + 'px';
            overlayCanvas.style.top = top + 'px';
            overlayCanvas.style.width = rect.width + 'px';
            overlayCanvas.style.height = rect.height + 'px';
            const displaySize = {
                width: videoEl.videoWidth || Math.round(rect.width),
                height: videoEl.videoHeight || Math.round(rect.height)
            };
            const dpr = window.devicePixelRatio || 1;
            overlayCanvas.width = Math.round(displaySize.width * dpr);
            overlayCanvas.height = Math.round(displaySize.height * dpr);
            const ctx = overlayCanvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            faceapi.matchDimensions(overlayCanvas, displaySize);
            return displaySize;
        }

        let currentDisplay = updateCanvasPosition();
        window.addEventListener('resize', updateCanvasPosition);
        window.addEventListener('scroll', updateCanvasPosition);

        if (detectionInterval) clearInterval(detectionInterval);
        nonMatchCount = 0;

        detectionInterval = setInterval(async () => {
            if (!faceModal || faceModal.style.display === 'none') {
                clearInterval(detectionInterval);
                detectionInterval = null;
                recognitionStarted = false; 
                return;
            }

            currentDisplay = updateCanvasPosition();
            const detections = await faceapi
                .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resized = faceapi.resizeResults(detections, currentDisplay);
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            faceapi.draw.drawDetections(overlayCanvas, resized);

            if (!detections || detections.length === 0) {
                if (statusText) statusText.textContent = 'No face detected.';
                nonMatchCount = 0;
                return;
            }

            const det = resized[0];
            const box = det.detection.box;
            const estimatedMeters = estimateDistanceFromFaceBox(box.width, currentDisplay.width);
            const faceCrop = cropFaceCanvas(videoEl, box);

            const [spoofDetected, blurry] = await Promise.all([
                isScreenSpoof(faceCrop),
                Promise.resolve(isFaceBlurry(faceCrop, 40)),
            ]);

            if (spoofDetected) {
                if (statusText) statusText.textContent = '❌ Spoof detected (screen/photo).';
                nonMatchCount = 0;
                return;
            }

            if (blurry) {
                if (statusText) statusText.textContent = '❌ Face too blurry. Improve lighting. Est: ' + estimatedMeters.toFixed(2) + ' m.';
                nonMatchCount = 0;
                return;
            }

            if (sampleDescriptor) {
                const distance = faceapi.euclideanDistance(detections[0].descriptor, sampleDescriptor.descriptor);
                
                if (distance < MATCH_THRESHOLD) {
                    nonMatchCount = 0; 
                    if (!isNaN(estimatedMeters) && estimatedMeters >= OPTIMAL_DISTANCE_MIN && estimatedMeters <= OPTIMAL_DISTANCE_MAX) {
                        if (statusText) statusText.textContent = '✅ Existing member found! Welcome back.';
                        if (detectionInterval) {
                            clearInterval(detectionInterval);
                            detectionInterval = null;
                            recognitionStarted = false; 
                            window.closeFaceModal(); 
                            // TODO: Add redirect/login logic here
                            // window.location.href = 'ExistingUserPage.html'; 
                        }
                    } else if (statusText) {
                        const distanceMsg = isNaN(estimatedMeters) ? '' : `Estimated distance: ${estimatedMeters.toFixed(2)} m.`;
                        if (estimatedMeters > OPTIMAL_DISTANCE_MAX) {
                            statusText.textContent = `❌ Match found, but too far. Move closer. ${distanceMsg}`;
                        } else {
                            statusText.textContent = `❌ Match found, but too close. Move back. ${distanceMsg}`;
                        }
                    }
                } else {
                    nonMatchCount++;
                    if (nonMatchCount < MAX_NON_MATCH_COUNT) {
                        if (statusText) statusText.textContent = `❌ Face not recognized. Retrying (${nonMatchCount}/${MAX_NON_MATCH_COUNT}). Move closer/adjust angle.`;
                    } else {
                        if (statusText) statusText.textContent = `❌ No existing member found after multiple tries. Starting registration...`;
                        if (detectionInterval) {
                            clearInterval(detectionInterval);
                            detectionInterval = null;
                            recognitionStarted = false; 
                            window.closeFaceModal(); 
                            window.openRegistrationModal();
                        }
                    }
                }
            } else {
                if (statusText) statusText.textContent = 'Face detected. Cannot check membership (no reference image).';
                nonMatchCount = 0;
            }
        }, 1000);
    };

    videoEl.removeEventListener('playing', onPlaying); 
    videoEl.addEventListener('playing', onPlaying);
    // Fallback to start detection if 'playing' event was missed
    setTimeout(() => {
        if (videoEl.readyState >= 3 && !detectionInterval) {
            console.warn("Video 'playing' event missed. Forcing detection start.");
            onPlaying();
        }
    }, 500);
}

// ---------------- Registration Scan Logic ----------------

// Function to handle the real-time detection for the registration modal
async function startRegistrationDetection() {
    const regVideoEl = document.getElementById('face-registration-video');
    const statusText = document.getElementById('status-reg'); 
    
    if (!window.faceapi || !regVideoEl || !statusText) {
        if (statusText) statusText.textContent = 'Setup Error: Missing face-api or DOM elements.';
        return;
    }
    
    if (registrationDetectionInterval) clearInterval(registrationDetectionInterval);
    
    if (!modelsLoaded) {
        statusText.textContent = 'Loading models for registration...';
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/cam_model'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/cam_model'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/cam_model'),
            ]);
            modelsLoaded = true;
        } catch (err) {
            console.error('Failed to load face-api models for registration', err);
            if (statusText) statusText.textContent = '❌ Failed loading models. Check /cam_model path in console.';
            return;
        }
    }

    if (statusText) statusText.textContent = 'Models loaded. Please wait for camera feed...';

    // --- Core Detection Logic Function ---
    const coreDetectionLoop = async () => {
        // Setup canvas for drawing bounding box (Only run this once)
        if (!registrationOverlayCanvas) {
            if (registrationOverlayCanvas && registrationOverlayCanvas.parentNode) registrationOverlayCanvas.parentNode.removeChild(registrationOverlayCanvas);
            registrationOverlayCanvas = faceapi.createCanvasFromMedia(regVideoEl);
            // Correctly position canvas near the video element
            regVideoEl.parentNode.insertBefore(registrationOverlayCanvas, regVideoEl.nextSibling);
            registrationOverlayCanvas.style.position = 'absolute';
            registrationOverlayCanvas.style.pointerEvents = 'none';
        }

        function updateRegCanvasPosition() {
            const rect = regVideoEl.getBoundingClientRect();
            const parentRect = regVideoEl.parentNode.getBoundingClientRect();
            // Calculate relative position to parent
            const left = rect.left - parentRect.left + regVideoEl.parentNode.scrollLeft;
            const top = rect.top - parentRect.top + regVideoEl.parentNode.scrollTop;
            registrationOverlayCanvas.style.left = left + 'px';
            registrationOverlayCanvas.style.top = top + 'px';
            registrationOverlayCanvas.style.width = rect.width + 'px';
            registrationOverlayCanvas.style.height = rect.height + 'px';
            const displaySize = {
                width: regVideoEl.videoWidth || Math.round(rect.width),
                height: regVideoEl.videoHeight || Math.round(rect.height)
            };
            const dpr = window.devicePixelRatio || 1;
            registrationOverlayCanvas.width = Math.round(displaySize.width * dpr);
            registrationOverlayCanvas.height = Math.round(displaySize.height * dpr);
            const ctx = registrationOverlayCanvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            faceapi.matchDimensions(registrationOverlayCanvas, displaySize);
            return displaySize;
        }

        let currentDisplay = updateRegCanvasPosition();
        window.removeEventListener('resize', updateRegCanvasPosition);
        window.removeEventListener('scroll', updateRegCanvasPosition);
        window.addEventListener('resize', updateRegCanvasPosition);
        window.addEventListener('scroll', updateRegCanvasPosition);


        // Start the real-time detection loop
        registrationDetectionInterval = setInterval(async () => {
            if (!document.getElementById('registration-modal') || document.getElementById('registration-modal').style.display === 'none') {
                clearInterval(registrationDetectionInterval);
                registrationDetectionInterval = null;
                return;
            }

            currentDisplay = updateRegCanvasPosition();
            const detections = await faceapi
                .detectAllFaces(regVideoEl, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resized = faceapi.resizeResults(detections, currentDisplay);
            const ctx = registrationOverlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, registrationOverlayCanvas.width, registrationOverlayCanvas.height);
            faceapi.draw.drawDetections(registrationOverlayCanvas, resized); // Draw the box

            if (!detections || detections.length === 0) {
                if (statusText) statusText.textContent = '❌ No face detected. Please position your face.';
                return;
            }
            
            // --- Face Check Logic (Distance, Blur, Spoof) ---
            const det = resized[0];
            const box = det.detection.box;
            const estimatedMeters = estimateDistanceFromFaceBox(box.width, currentDisplay.width);
            const faceCrop = cropFaceCanvas(regVideoEl, box);

            const [spoofDetected, blurry] = await Promise.all([
                isScreenSpoof(faceCrop),
                Promise.resolve(isFaceBlurry(faceCrop, 40)),
            ]);

            if (spoofDetected) {
                if (statusText) statusText.textContent = '❌ Spoof detected (screen/photo). Please present a live face.';
                return;
            }

            if (blurry) {
                if (statusText) statusText.textContent = '❌ Face too blurry. Improve lighting/focus. Est: ' + estimatedMeters.toFixed(2) + ' m.';
                return;
            }

            // Check distance
            if (isNaN(estimatedMeters) || estimatedMeters < OPTIMAL_DISTANCE_MIN || estimatedMeters > OPTIMAL_DISTANCE_MAX) {
                const distanceMsg = isNaN(estimatedMeters) ? 'Check distance.' : `Estimated distance: ${estimatedMeters.toFixed(2)} m.`;
                if (estimatedMeters > OPTIMAL_DISTANCE_MAX) {
                    statusText.textContent = `❌ Too far. Move closer. ${distanceMsg}`;
                } else {
                    statusText.textContent = `❌ Too close. Move back. ${distanceMsg}`;
                }
                return;
            }
            
            // --- SUCCESS CONDITION: Face is clear, aligned, and live ---
            if (statusText) statusText.textContent = '✅ Face alignment successful! Complete the form to register.';
            clearInterval(registrationDetectionInterval);
            registrationDetectionInterval = null;
            
            // Store the new descriptor globally for future checks
            sampleDescriptor = detections[0].descriptor; 
            
            alert('Your face is successfully scanned and recorded! Please complete the form.');
            
        }, 1000); // Check every 1 second
    };
    // --- End Core Detection Logic Function ---


    // MODIFIED: Use a loop to wait for the video to be ready (Robust Check)
    const maxAttempts = 10;
    let attempts = 0;

    const checkVideoReady = () => {
        // Check if video is loaded AND has dimensions
        if (regVideoEl.readyState >= 3 && regVideoEl.videoWidth > 0) {
            if (statusText) statusText.textContent = 'Camera feed active. Align face now...';
            coreDetectionLoop();
        } else if (attempts < maxAttempts) {
            attempts++;
            if (statusText) statusText.textContent = `Camera feed loading... (Attempt ${attempts}/${maxAttempts})`;
            setTimeout(checkVideoReady, 300); // Retry every 300ms
        } else {
             if (statusText) statusText.textContent = '❌ Failed to start camera feed. Check permissions/console.';
        }
    };

    // Use event listeners and fallbacks to trigger the robust check
    regVideoEl.removeEventListener('playing', checkVideoReady); 
    regVideoEl.addEventListener('playing', checkVideoReady);

    // If already playing (sometimes happens before event is attached)
    if (regVideoEl.readyState >= 3) {
        checkVideoReady();
    }
}


// Hook registration modal to automatically start scan and handle form submission
function runRegistrationScan() {
    startRegistrationDetection();
    
    // Form submission logic
    const registrationForm = document.getElementById('registration-form');
    registrationForm.onsubmit = function(event) {
        event.preventDefault();
        
        if (registrationDetectionInterval) {
            alert("Please successfully align your face before submitting the registration form.");
            return;
        }

        if (!sampleDescriptor) {
            alert("Face data not captured. Please retry the face scan using the 'Scan Your Face Again' area.");
            return;
        }

        // --- Final Registration Success Logic ---
        const formData = new FormData(registrationForm);
        const name = formData.get('name');
        
        // This simulates a successful submission and redirect
        alert(`✅ Registration for ${name} complete! You can now log in with Face ID.`);
        window.closeRegistrationModal();
        
        // --- CORRECTED REDIRECT TO /public/LoginPage.html ---
        window.location.href = '/public/LoginPage.html'; 
    }
}


// Utility & Anti-Spoofing Functions 
async function isScreenSpoof(faceCanvas) {
    try {
        const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);
        const [screenPatterns, hasPixelGrid, refreshArtifacts] = await Promise.all([
            detectScreenPatterns(imageData),
            checkPixelGrid(imageData),
            detectRefreshArtifacts(faceCanvas),
        ]);
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
            if (rightDiff > 35 && bottomDiff > 35) moireScore += 1.2;
        }
    }
    const threshold = (width * height) / (sampleStep * sampleStep * 10);
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
            if (rDiff > 140 && gDiff > 140 && bDiff > 140) gridMatches++;
        }
    }
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
    let diffCount = 0;
    for (let i = 0; i < frame1.data.length; i += 4) {
        const dR = Math.abs(frame1.data[i] - frame2.data[i]);
        const dG = Math.abs(frame1.data[i + 1] - frame2.data[i + 1]);
        const dB = Math.abs(frame1.data[i + 2] - frame2.data[i + 2]);
        if (dR + dG + dB > 15) diffCount++;
    }
    return diffCount > (canvas.width * canvas.height * 0.03);
}

function isFaceBlurry(faceCanvas, threshold = 40) {
    const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
    const { data, width, height } = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avg = sum / (width * height);
    return avg < threshold;
}

function cropFaceCanvas(videoEl, box) {
    const canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height = box.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    return canvas;
}

function estimateDistanceFromFaceBox(faceWidthPx, videoWidthPx, faceRealWidthM = 0.16) {
    if (!faceWidthPx || !videoWidthPx) return NaN;
    const fov = 60 * (Math.PI / 180);
    const perceivedWidthRatio = faceWidthPx / videoWidthPx;
    const distance = faceRealWidthM / (2 * Math.tan(fov / 2) * perceivedWidthRatio);
    return distance;
}