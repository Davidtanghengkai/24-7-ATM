// Wait for the document to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // URL of your backend server (from your server.js)
    const API_URL = 'http://localhost:3000'; 

    // Get all the elements we need to work with
    const emailStep = document.getElementById('email-step');
    const otpStep = document.getElementById('otp-step');
    
    const sendOtpBtn = document.getElementById('OTP');
    const verifyBtn = document.getElementById('verify-btn');
    
    const emailInput = document.getElementById('email-input');
    const otpInput = document.getElementById('otp-input');
    const emailDisplay = document.getElementById('user-email-display');

 
    const messageArea = document.createElement('p');
    messageArea.style.color = 'red';
    messageArea.style.textAlign = 'center';
    messageArea.style.minHeight = '1.2em';
    messageArea.style.marginTop = '1rem';
 
    emailStep.querySelector('.buttons').insertAdjacentElement('beforebegin', messageArea);

    
    // fetch API to send OTP
    sendOtpBtn.addEventListener('click', async (event) => {
        // Prevent the form from submitting and reloading the page
        event.preventDefault(); 
        
        const email = emailInput.value;
        if (!email) {
            messageArea.textContent = 'Please enter your email.';
            return;
        }

        // Show a loading state
        sendOtpBtn.textContent = 'Sending...';
        sendOtpBtn.disabled = true;
        messageArea.textContent = ''; 

        try {
            //backend call to send OTP
            const response = await fetch(`${API_URL}/api/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                //show success message
                // Update the email display text
                emailDisplay.textContent = email;
                
                // Hide the email step
                emailStep.classList.add('hidden');
                
                // Show the OTP step
                otpStep.classList.remove('hidden');

                // Move the message area to the new step
                otpStep.querySelector('.buttons').insertAdjacentElement('beforebegin', messageArea);
                messageArea.textContent = ''; // Clear any previous message
                
            } else {
                //server failure
                messageArea.textContent = data.message || 'Error sending OTP. Please try again.';
                sendOtpBtn.textContent = 'Send OTP';
                sendOtpBtn.disabled = false;
            }

        } catch (error) {
            // network or fetch error
            console.error('Fetch Error:', error);
            messageArea.textContent = 'Network error. Could not connect to server.';
            sendOtpBtn.textContent = 'Send OTP';
            sendOtpBtn.disabled = false;
        }
    });


    // fetch API to verify OTP
    verifyBtn.addEventListener('click', async (event) => {
        //  Prevent the form from submitting and reloading the page
        event.preventDefault();
        
        const otp = otpInput.value;
        if (!otp) {
            messageArea.textContent = 'Please enter the OTP.';
            return;
        }
        
        verifyBtn.textContent = 'Verifying...';
        verifyBtn.disabled = true;
        messageArea.textContent = '';  

        try {
            //verify OTP with backend
            const response = await fetch(`${API_URL}/api/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ otp: otp }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
 
                //show success message
                document.querySelector('.atm-container').innerHTML = 
                    '<main class="main-content">' +
                        '<h1 class="greeting">✅ Success!</h1>' +
                        '<p style="text-align: center; font-size: 1.2rem;">You are now verified.</p>' +
                    '</main>';
                await new Promise(resolve => setTimeout(resolve, 1500)); // Pause for 1.5 seconds
                window.location.href = "chooseCard.html";
                
            } else {
                //server failure
                messageArea.textContent = data.message || 'Invalid OTP. Please try again.';
                verifyBtn.textContent = 'Verify OTP';
                verifyBtn.disabled = false;
            }

        } catch (error) {
            // fetch error
            console.error('Fetch Error:', error);
            messageArea.textContent = 'Network error. Could not connect to server.';
            verifyBtn.textContent = 'Verify OTP';
            verifyBtn.disabled = false;
        }
    });
});