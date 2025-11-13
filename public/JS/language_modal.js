document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Get elements using the IDs/Classes from the HTML
    const langButton = document.getElementById('language-toggle'); 
    const modal = document.getElementById('language-modal');
    const closeBtn = document.querySelector('.close-modal');
    const langOptions = document.querySelectorAll('.language-option');


    if (!langButton || !modal) {
        // Log an error if the elements aren't found, then stop.
        console.error("Error: Could not find language button or modal element.");
        return;
    }

    // 2. Attach Event Listener to the "ENG" link
    langButton.addEventListener('click', function(e) {
        e.preventDefault(); 
        // Use toggle to add/remove the 'active' class
        modal.classList.toggle('active'); 
    });

    // 3. Close Modal handlers

    // Close button (X)
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }

    // Language options close
    langOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove the 'active' class when any language is selected
            modal.classList.remove('active'); 
        });
    });

    // Close when clicking outside the modal/button area
    document.addEventListener('click', function(e) {
        // Check if the click is outside both the button and the modal itself
        if (modal.classList.contains('active') && !langButton.contains(e.target) && !modal.contains(e.target)) {
            modal.classList.remove('active');
        }
    });
});