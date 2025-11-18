document.addEventListener('DOMContentLoaded', () => {
    // Chat widget toggle
    fetch("/widget.html")
        .then(r => r.text())
        .then(html => {
        document.getElementById("chat-root").innerHTML = html;

        // IMPORTANT: Load chat.js AFTER widget is inserted
        const script = document.createElement("script");
        script.src = "/JS/chat.js";
        document.body.appendChild(script);
    })
});