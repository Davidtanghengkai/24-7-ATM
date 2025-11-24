const faceModal = document.getElementById('face-modal');
const video = document.getElementById('video');
const statusText = document.getElementById('status');

document.getElementById("startFaceBtn").addEventListener("click", async () => {
    faceModal.classList.add('active');

    // Start camera
    await startCamera(video);

    // Load models
    await loadFaceModels();

    // Capture frame after camera stabilizes
    setTimeout(async () => {
        const scan = await scanUserFace(video);

        if (!scan.success) {
            if (scan.message === "No matching user found.") {
                closeFaceModal();
                await openRegistrationModal();
            } else {
                console.log(scan.message);
            }
        } else {
            // user exists → load accounts → create card normally
            const userId = scan.userId;
            console.log("Verified User ID:", userId);
            statusText.textContent = "✅ Face verified! Welcome!";
            localStorage.setItem("userId", userId);
            window.location.href = "selectAccount.html";

        }
    }, 800);
});



async function openFaceModal() {
    faceModal.classList.add('active');
    await startCamera(video);
}

function closeFaceModal() {
    faceModal.classList.remove('active');
    stopCamera();
}

// Click outside to close
faceModal.addEventListener('click', e => {
    if (e.target === faceModal) closeFaceModal();
});

// Escape key to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeFaceModal();
});


async function startCamera(videoElement) {
    if (!videoElement) {
        console.error("Video element not found!");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        videoElement.srcObject = stream;
        await videoElement.play();
    } catch (err) {
        console.error("Cannot access camera:", err);
        statusText.textContent = "❌ Cannot access camera";
    }
}

function stopCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

async function loadFaceModels() {
    await faceapi.nets.tinyFaceDetector.load("/cam_model/");
    await faceapi.nets.faceLandmark68Net.load("/cam_model/");
    await faceapi.nets.faceRecognitionNet.load("/cam_model/");
    await faceapi.nets.faceExpressionNet.load("/cam_model/");
    await faceapi.nets.faceLandmark68TinyNet.load("/cam_model/");
    await faceapi.nets.ssdMobilenetv1.load("/cam_model/");
}

async function scanUserFace(video) {
    let fullDetection = null;
    let detectionPassed = false;
    let lastError = "Unable to capture a valid face. Please adjust your position and try again.";
    const maxAttempts = 7;
    const attemptDelay = 1000; // ms between attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        fullDetection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks() // true = full 68-point landmarks
            .withFaceDescriptor();

        if (!fullDetection) {
            lastError = `No face detected (attempt ${attempt + 1}/${maxAttempts})`;
            console.log(lastError + ", retrying...");
            await new Promise(res => setTimeout(res, attemptDelay));
            continue;
        }

        // 2. Blurriness check
        if (isFaceBlurry(video)) {
            lastError = `Image too blurry (attempt ${attempt + 1}/${maxAttempts})`;
            console.log(lastError + ", retrying...");
            await new Promise(res => setTimeout(res, attemptDelay));
            continue;
        }

        // 3. Spoof check (blink + depth)
        if (await spoofCheck(fullDetection, video)) {
            lastError = `Spoof suspected (attempt ${attempt + 1}/${maxAttempts})`;
            console.log(lastError + ", retrying...");
            await new Promise(res => setTimeout(res, attemptDelay));
            continue;
        }

        // 4. Distance check
        if (await checkDistance(fullDetection)) {
            lastError = `Too close to camera (attempt ${attempt + 1}/${maxAttempts})`;
            console.log(lastError + ", retrying...");
            await new Promise(res => setTimeout(res, attemptDelay));
            continue;
        }

        // All checks passed
        detectionPassed = true;
        console.log(`Face scan attempt ${attempt + 1}/${maxAttempts}: Face detected and verified.`);
        break;
    }

    // If all attempts failed, return the last captured error message
    if (!detectionPassed) {
        console.warn("All face scan attempts failed:", lastError);
        return { success: false, message: lastError };
    }
    
    // 5. Compare with database
    const userId = await identifyUser(fullDetection.descriptor);
    if (!userId) return { success: false, message: "No matching user found." };

    return { success: true, userId };
}

async function identifyUser(descriptor) {
    try {
        
        const response = await fetch("/api/biometrics", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const dbFaces = await response.json();
        console.log("dbFaces raw:", dbFaces);

        let bestMatch = null;
        let bestDistance = 1.0;

        if (!Array.isArray(dbFaces) || dbFaces.length === 0) {
            console.log("No biometrics found. Treat as new user.");
            return false; // no user found
        }

        dbFaces.forEach(record => {
            const stored = new Float32Array(JSON.parse(record.bioData));
            const distance = faceapi.euclideanDistance(descriptor, stored);
            console.log("Descriptor length:", descriptor.length, "Stored length:", stored.length);
            console.log(`User ${record.userId} distance:`, distance);
            console.log(`Comparing with user ${record.userId}, distance: ${distance}`);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = record.userId;
            }
        });

        return bestDistance < 0.45 ? bestMatch : null; // threshold
    } catch (err) {
        console.error("Error fetching biometrics:", err);
        return null;
    }
}

// -------------------- Anti-Spoofing --------------------
async function spoofCheck(detection, video) {


    const depthOk = await checkDepth(video);
    if (!depthOk) return true;

    return false;
}

async function checkBlink(detection) {
    if (!detection || !detection.landmarks) return false;

    const left = detection.landmarks.getLeftEye();
    const right = detection.landmarks.getRightEye();

    if (!left || !right || left.length < 6 || right.length < 6) {
        console.warn("Eye landmarks incomplete");
        return false;
    }

    const eyeOpenRatio = (eye) => {
        const vertical = faceapi.euclideanDistance(eye[1], eye[5]);
        const horizontal = faceapi.euclideanDistance(eye[0], eye[3]);
        if (horizontal === 0) return 0;
        return vertical / horizontal;
    };

    const leftRatio = eyeOpenRatio(left);
    const rightRatio = eyeOpenRatio(right);

    console.log("Eye open ratios:", leftRatio.toFixed(3), rightRatio.toFixed(3));

    return leftRatio > 0.10 && rightRatio > 0.10; // slightly lower threshold
}

async function checkDepth(video) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let variance = 0;
    for (let i = 0; i < data.length - 4; i += 4) {
        variance += Math.abs(data[i] - data[i + 4]);
    }
    return variance > 150000;
}

function isFaceBlurry(video, threshold = 40) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const lap = [];
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const i = (y * canvas.width + x) * 4;
            const center = data[i];
            const top = data[i - canvas.width * 4];
            const bottom = data[i + canvas.width * 4];
            const left = data[i - 4];
            const right = data[i + 4];
            lap.push(4 * center - top - bottom - left - right);
        }
    }
    const mean = lap.reduce((a, b) => a + b, 0) / lap.length;
    const variance = lap.reduce((a, b) => a + (b - mean) ** 2, 0) / lap.length;
    console.log('Laplacian Variance:', variance, 'Threshold:', threshold);
    return variance < threshold;
}

async function checkDistance(fullDetection) {
    const box = fullDetection.detection.box;
    return box.width > 280; // too close
}

 
//#registers new user
const modal2 = document.getElementById("registration-modal");
const form = document.getElementById("registration-form");
// Open modal and start camera
const videoRes = document.getElementById("video1");
const statusTextRes = document.getElementById("status1");

async function openRegistrationModal() {
    modal2.classList.add("active");

    await startCamera(videoRes);
}

async function closeRegistrationModal() {
    modal2.classList.remove("active");
    stopCamera();
}

modal2.addEventListener('click', e => {
    if (e.target === modal2) closeRegistrationModal();
});

// Escape key to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeRegistrationModal();
});


// Form submission
form.onsubmit = async (e) => {
    e.preventDefault();

    // Collect form data
    const name = document.getElementById("name").value.trim();
    const dob = document.getElementById("dob").value;
    const ic  = document.getElementById("ic").value.trim();
    const pin = document.getElementById("pin").value;
    const accountType = document.getElementById("accountType").value;
    const email = document.getElementById("email").value.trim();
    const cardDescription = document.getElementById("card-description").value.trim() || "My Card";

    statusTextRes.textContent = "Scanning face...";

    // Detect face
    const detection = await faceapi
        .detectSingleFace(videoRes, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        statusTextRes.textContent = "Position your face within the frame and try again.";
        return;
    }

    const descriptorArray = Array.from(detection.descriptor);

    statusTextRes.textContent = "Creating user...";

    try {
        // 1. Create user
        const createUserRes = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                dob,
                nationalID: ic,
                Email: email,
                bioType: "face",
                BioData: JSON.stringify(descriptorArray)
            })
        });

        if (!createUserRes.ok) throw new Error(await createUserRes.text());

        const createdUser = await createUserRes.json();
        const userId = createdUser.userId;
        localStorage.setItem("userId", userId);

        statusTextRes.textContent = "Creating account...";

        // 2. Create account
        const accountRes = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, accountType, balance: 0 })
        });

        const accountData = await accountRes.json();
        const accountNo = accountData.accountNo;

        statusTextRes.textContent = "Creating card...";

        // 3. Create card
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 5);

        const cardRes = await fetch("/api/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                accountNo,
                expiryDate: expiry.toISOString().split("T")[0],
                pin,
                description: cardDescription
            })
        });

        const cardData = await cardRes.json();

        statusTextRes.textContent = "Registration complete!";
        modal2.style.display = "none";
        form.reset();
        closeRegistrationModal();

        if(videoRes.srcObject){
            videoRes.srcObject.getTracks().forEach(track => track.stop());
        }

        window.location.href = "Index.html";

        console.log(
            `User created!\nAccount No: ${accountNo}\nCard No: ${cardData.card.CardNo}`
        );

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
        statusTextRes.textContent = "Position your face within the frame";
    }
};
//#endregion

// Utility to display errors on the modal's status text
window.addEventListener('error', (ev) => {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Error: ' + (ev && ev.message ? ev.message : 'unknown');
});