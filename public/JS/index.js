// Simple hover / click animation example
const buttons = document.querySelectorAll('.feature-btn');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    alert(`You selected: ${btn.textContent.trim()}`);
  });
});
