// --- Global Constants and State: These control how Face ID works ---
const MATCH_THRESHOLD = 0.4; // How close the face descriptor must be to the sample for a match
const OPTIMAL_DISTANCE_MIN = 0.4; // Minimum ideal distance (system optimal)
const OPTIMAL_DISTANCE_MAX = 0.5; // Maximum ideal distance (system optimal)
const MAX_NON_MATCH_COUNT = 3; // How many times we can fail a check before switching to registration

let modelsLoaded = false; // Flag to ensure models only load once
let recognitionStarted = false; // Flag to prevent multiple detection loops
let detectionInterval = null; // The main loop handler for real-time detection
let overlayCanvas = null; // Canvas used to draw the detection box over the video
let sampleDescriptor = null; // The known face reference for comparison
let nonMatchCount = 0; // Tracks consecutive non-matches for the transition logic


// DOM Setup and Initialization: Runs when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    // Get all the essential elements from the HTML
    const faceModal = document.getElementById('face-modal');
    const registrationModal = document.getElementById('registration-modal'); 
    const videoEl = document.getElementById('video');
    const closeFaceBtn = document.getElementById('close-face-modal') || document.querySelector('.close-face-modal');
    const closeRegistrationBtn = document.getElementById('close-registration-modal'); 
    let mediaStream = null; // Stores the camera stream object

    // Find the main "Face ID" card button
    const faceCard = Array.from(document.querySelectorAll('.verification-card'))
        .find(card => {
            const txt = card.querySelector('.card-text');
            return txt && txt.textContent.trim().toLowerCase() === 'face id';
        });

    // Camera and Modal Handling Functions
    // Starts the camera and pipes the video to the specified element
    window.startCamera = async function(targetVideoEl) {
        try {
            // Use 'playsinline' for iOS compatibility
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            targetVideoEl.srcObject = mediaStream;
            await targetVideoEl.play();
        } catch (err) {
            console.error('Unable to access camera:', err);
            alert('Cannot access camera. Please allow camera permission or use a supported device.');
            // Close the modal gracefully if the camera fails
            if (targetVideoEl === videoEl && window.closeFaceModal) window.closeFaceModal(); 
        }
    }

    // Stops the camera and cleans up the media stream
    window.stopCamera = function() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        // Also clean up all possible video elements
        const videos = [videoEl, document.getElementById('face-registration-video')];
        videos.forEach(v => {
            if (v) {
                v.pause();
                v.srcObject = null;
            }
        });
    }

    // Base function to show the Face Verification modal
    window.openFaceModal = function() {
        if (!faceModal) return;
        faceModal.style.display = 'flex';
    }

    // Base function to hide the Face Verification modal
    window.closeFaceModal = function() {
        if (!faceModal) return;
        faceModal.style.display = 'none';
        window.stopCamera();
    }
    
    // Opens the Registration modal (for new users)
    window.openRegistrationModal = function() {
        if (!registrationModal) return;
        // Always close the verification modal first
        if (window.closeFaceModal) window.closeFaceModal(); 
        
        registrationModal.style.display = 'flex';
        
        const regVideoEl = document.getElementById('face-registration-video');
        if (regVideoEl) {
            window.startCamera(regVideoEl); 
            // NOTE: You would typically start a separate registration loop here to capture the new face
        } else {
             console.warn('Registration video element (ID: face-registration-video) not found.');
        }
    }

    // Closes the Registration modal
    window.closeRegistrationModal = function() {
        if (!registrationModal) return;
        registrationModal.style.display = 'none';
        window.stopCamera();
    }
    
    // Make key elements accessible globally for the core logic
    window.videoEl = videoEl;
    window.faceModal = faceModal;
    window.registrationModal = registrationModal;

    // Event Listeners: Attaching functionality to buttons and clicks
    // Clicking the "Face ID" card opens the verification process
    if (faceCard) {
        faceCard.addEventListener('click', (e) => {
            e.preventDefault();
            window.openFaceModal(); // Calls the HOOKED function below
        });
    }

    // Clicking the "x" button in the verification modal
    if (closeFaceBtn) {
        closeFaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.closeFaceModal(); // Calls the HOOKED function
        });
    }
    
    // Clicking the "x" button in the registration modal
    if (closeRegistrationBtn) {
        closeRegistrationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.closeRegistrationModal(); 
        });
    }

    // Clicking outside the verification modal closes it (via CSS face-modal-overlay listener)
    if (faceModal) {
        faceModal.addEventListener('click', (e) => {
            // Check if the click target is the overlay itself (not the content)
            if (e.target === faceModal) window.closeFaceModal();
        });
    }
    
    // Clicking outside the registration modal closes it
    if (registrationModal) {
        registrationModal.addEventListener('click', (e) => {
            if (e.target === registrationModal) window.closeRegistrationModal();
        });
    }

    // Pressing 'Escape' closes any open modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeFaceModal();
            window.closeRegistrationModal(); 
        }
    });

    // Modal Hooks: Adding setup/cleanup logic to modal open/close functions
    const baseOpenFaceModal = window.openFaceModal;
    const baseCloseFaceModal = window.closeFaceModal;

    // Hook Close Face Modal (stops the loop and cleans up canvas)
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
            recognitionStarted = false; // Allow the process to start again
            nonMatchCount = 0; // Reset failed attempt counter
        } catch (e) {
            console.warn('Error cleaning up recognition:', e);
        }
        baseCloseFaceModal(); 
    };

    // Hook Open Face Modal (starts the detection process)
    window.openFaceModal = function openFaceModalWithInit() {
        baseOpenFaceModal();
        // Give the modal a slight delay to render before starting heavy tasks
        setTimeout(() => initFaceRecognition(), 200);
    };

    // Initial Load: Preload models when the script runs
    try {
        initFaceRecognition(); 
    } catch (e) {
        console.warn('initFaceRecognition call deferred/executed:', e);
    }
});


// Face Recognition Core Logic: The real-time face verification engine
async function initFaceRecognition() {
    const videoEl = window.videoEl; 
    const faceModal = window.faceModal; 
    const statusText = document.getElementById('status');
    
    // Check if the required elements are present
    if (!window.faceapi || !videoEl || !statusText) {
        if (statusText) statusText.textContent = 'Setup Error: Missing face-api or DOM elements.';
        return;
    }
    
    // Don't start if a process is already running
    if (recognitionStarted) return;
    recognitionStarted = true;

    if (statusText) statusText.textContent = 'Loading models...';

    // Load models only if they haven't been loaded before
    if (!modelsLoaded) {
        try {
            // NOTE: Ensure these paths are correct relative to where the JS is run
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

    await window.startCamera(videoEl);
    
    if (statusText) statusText.textContent = 'Camera ready. Position face in the center...';

    // Load the stored reference descriptor (the "existing member" face)
    if (!sampleDescriptor) {
        try {
            // NOTE: Ensure this sample image path is correct
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

    // Function to run once the video starts playing
    const onPlaying = async () => {
        // Setup the canvas layer for drawing the face box
        if (overlayCanvas && overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
        overlayCanvas = faceapi.createCanvasFromMedia(videoEl);
        // Insert the canvas right after the video element
        videoEl.parentNode.insertBefore(overlayCanvas, videoEl.nextSibling);

        overlayCanvas.style.position = 'absolute';
        overlayCanvas.style.pointerEvents = 'none';
        overlayCanvas.style.zIndex = '9999';
        
        const overlayParent = videoEl.parentNode;
        const parentStyle = window.getComputedStyle(overlayParent);
        if (parentStyle.position === 'static') { overlayParent.style.position = 'relative'; }
        
        // Ensures the canvas is aligned precisely over the video element
        function updateCanvasPosition() {
            const rect = videoEl.getBoundingClientRect();
            const parentRect = overlayParent.getBoundingClientRect();
            
            // Calculate relative position within the parent container
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
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Apply high-DPI scaling
            faceapi.matchDimensions(overlayCanvas, displaySize);
            return displaySize;
        }

        let currentDisplay = updateCanvasPosition();
        window.addEventListener('resize', updateCanvasPosition);
        window.addEventListener('scroll', updateCanvasPosition);

        if (detectionInterval) clearInterval(detectionInterval);
        
        nonMatchCount = 0; // Reset failed counter

        // Start the main detection loop
        detectionInterval = setInterval(async () => {
            // Check if the modal has been closed
            if (!faceModal || faceModal.style.display === 'none') {
                clearInterval(detectionInterval);
                detectionInterval = null;
                recognitionStarted = false; 
                return;
            }

            currentDisplay = updateCanvasPosition();

            // Detect face, landmarks, and descriptor
            const detections = await faceapi
                .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            // Resize and draw the detection box
            const resized = faceapi.resizeResults(detections, currentDisplay);
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            faceapi.draw.drawDetections(overlayCanvas, resized);

            if (!detections || detections.length === 0) {
                if (statusText) statusText.textContent = 'No face detected.';
                nonMatchCount = 0; // Reset counter if no face is visible
                return;
            }
            
            // Focus on the first detected face
            const det = resized[0];
            const box = det.detection.box;
            const estimatedMeters = estimateDistanceFromFaceBox(box.width, currentDisplay.width);
            const faceCrop = cropFaceCanvas(videoEl, box);

            // Run anti-spoofing and blur checks simultaneously
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

            // Check against the sample face
            if (sampleDescriptor) {
                const distance = faceapi.euclideanDistance(detections[0].descriptor, sampleDescriptor.descriptor);
                
                if (distance < MATCH_THRESHOLD) {
                    // --- MATCH FOUND: Existing Member ---
                    nonMatchCount = 0; 
                    
                    // Check if the distance is also correct (user is not too close/far, using OPTIMAL constants)
                    if (!isNaN(estimatedMeters) && estimatedMeters >= OPTIMAL_DISTANCE_MIN && estimatedMeters <= OPTIMAL_DISTANCE_MAX) {
                        if (statusText) statusText.textContent = '✅ Existing member found! Welcome back.';
                        
                        // Success! Stop detection and close modal
                        if (detectionInterval) {
                            clearInterval(detectionInterval);
                            detectionInterval = null;
                            recognitionStarted = false; 
                            window.closeFaceModal(); 
                            // TODO: Add success redirect here, e.g., window.location.href = '/public/NewHomePage.html'; 
                        }
                    } else if (statusText) {
                        // Match found, but physical distance is wrong
                        const distanceMsg = isNaN(estimatedMeters) ? '' : `Estimated distance: ${estimatedMeters.toFixed(2)} m.`;
                        if (estimatedMeters > OPTIMAL_DISTANCE_MAX) {
                            statusText.textContent = `❌ Match found, but too far. Move closer. ${distanceMsg}`;
                        } else {
                            statusText.textContent = `❌ Match found, but too close. Move back. ${distanceMsg}`;
                        }
                    }
                } else {
                    // --- NO MATCH FOUND: Potential New Member ---
                    nonMatchCount++;
                    
                    if (nonMatchCount < MAX_NON_MATCH_COUNT) {
                        // Display message and wait for next check
                        if (statusText) statusText.textContent = `❌ Face not recognized. Retrying (${nonMatchCount}/${MAX_NON_MATCH_COUNT}). Move closer/adjust angle.`;
                    } else {
                        // Max failed checks reached, transition to registration
                        if (statusText) statusText.textContent = `❌ No existing member found after multiple tries. Starting registration...`;
                        
                        // Stop verification and open registration
                        if (detectionInterval) {
                            clearInterval(detectionInterval);
                            detectionInterval = null;
                            recognitionStarted = false; 

                            window.closeFaceModal(); 
                            window.openRegistrationModal(); // Transition!
                        }
                    }
                }
            } else {
                if (statusText) statusText.textContent = 'Face detected. Cannot check membership (no reference image).';
                nonMatchCount = 0;
            }
        }, 1000); // Check every 1 second
    };

    // Attach the playing function to the video element
    videoEl.removeEventListener('playing', onPlaying); 
    videoEl.addEventListener('playing', onPlaying);
    
    // Safety check: If the 'playing' event is missed, manually start the loop
    setTimeout(() => {
        if (videoEl.readyState >= 3 && !detectionInterval) {
            console.warn("Video 'playing' event missed. Forcing detection start.");
            onPlaying();
        }
    }, 500);
}


// Anti-spoofing and Utility Functions: These keep the process secure and clean
// Main function to check for screen-based spoofing (photo/video of a face)
async function isScreenSpoof(faceCanvas) {
    try {
        const ctx = faceCanvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);
        // Check for common screen artifacts simultaneously
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

// Looks for Moire patterns common when photographing a screen
function detectScreenPatterns(imageData) {
    const { data, width, height } = imageData;
    let moireScore = 0;
    const sampleStep = 3;
    for (let y = 2; y < height - 2; y += sampleStep) {
        for (let x = 2; x < width - 2; x += sampleStep) {
            const i = (y * width + x) * 4;
            // Compare adjacent pixels for sharp, regular color shifts
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
    return moireScore > threshold;
}

// Checks for distinct pixel grids/subpixels (less reliable, but adds security)
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
    return gridMatches > (width * height) / (gridSize * gridSize * 3);
}

// Detects screen refresh artifacts by comparing two quick frames
async function detectRefreshArtifacts(canvas) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Capture Frame 1
    tempCtx.drawImage(canvas, 0, 0);
    const frame1 = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Wait a very short time (simulating a small screen refresh interval)
    await new Promise((r) => setTimeout(r, 50)); 
    
    // Capture Frame 2
    tempCtx.drawImage(canvas, 0, 0);
    const frame2 = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    
    let changedPixels = 0;
    // Compare pixel data. A real, static screen image won't change, but a live video feed might.
    for (let i = 0; i < frame1.data.length; i += 4) {
        if (Math.abs(frame1.data[i] - frame2.data[i]) > 20) changedPixels++;
    }
    // If a significant percentage of pixels changed, it's likely a live screen feed
    return changedPixels > canvas.width * canvas.height * 0.2; 
}

// Checks if the captured face image is too blurry
function isFaceBlurry(imageElement, threshold = 40) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert image to grayscale (required for Laplacian method)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
    }
    
    // Calculate the Laplacian variance (a measure of image sharpness)
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
    
    // If variance is low, the image is blurry
    return variance < threshold;
}

// Crops the face out of the video stream into its own canvas
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

// Calculates the camera's focal length (needed for distance estimation)
function getFocalLengthFromFov(videoWidthPx, fovDeg = 60) {
    const fovRad = (fovDeg * Math.PI) / 180;
    return videoWidthPx / 2 / Math.tan(fovRad / 2);
}

// Estimates the real-world distance of the user from the screen
function estimateDistanceFromFaceBox(boxWidthPx, videoWidthPx, knownFaceWidthMeters = 0.16, fovDeg = 60, focalLengthPx = null) {
    if (!boxWidthPx || !videoWidthPx) return NaN;
    const focal = focalLengthPx || getFocalLengthFromFov(videoWidthPx, fovDeg);
    // Formula: Distance = (Known Width * Focal Length) / Measured Width
    return (knownFaceWidthMeters * focal) / boxWidthPx;
}

// Utility to display errors on the modal's status text
window.addEventListener('error', (ev) => {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Error: ' + (ev && ev.message ? ev.message : 'unknown');
});