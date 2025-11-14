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
});