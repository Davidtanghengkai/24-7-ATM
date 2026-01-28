const socket = io(window.location.origin);
async function submitLogin() {
    const accessCode = document.getElementById('accessCode').value;
    const loginPin = document.getElementById('loginPin').value;

    try {
        const response = await fetch('/api/users/verifyMobLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode, LoginPin: loginPin })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('userId', result.userId);
            localStorage.setItem('userName', result.userName);

            // Redirect to the mobile home page
            window.location.href = 'MobHome.html';
        } else {
            alert(result.message || 'Login Failed');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Cannot connect to server');
    }
}