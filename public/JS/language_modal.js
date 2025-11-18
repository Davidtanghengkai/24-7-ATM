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

    // --- 🔴 NEW: Reusable Function to Set Language ---
    function setActiveLanguage(selectedText) {
        // 1. Remove 'active' class and '✔' from ALL options
        langOptions.forEach(opt => {
            opt.classList.remove('active');
            opt.textContent = opt.textContent.replace(' ✔', '').trim();
        });

        // 2. Find and set the new active option
        langOptions.forEach(opt => {
            const optionText = opt.textContent.trim(); // Already cleaned
            if (optionText === selectedText) {
                opt.classList.add('active');
                opt.textContent = optionText + ' ✔';
            }
        });
        
        // 3. Update the main "ENG" button text
        const langCode = selectedText.substring(0, 3).toUpperCase();
        langButton.textContent = langCode;

        // 4. Save the choice to localStorage
        localStorage.setItem('selectedLanguage', selectedText);
    }

    // --- 🔴 NEW: Load Saved Language on Page Start ---
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
        setActiveLanguage(savedLanguage);
    } else {
        // Set default if nothing is saved
        setActiveLanguage('English'); 
    }

    // --- 🔴 MODIFIED: Click Handlers ---

    // 2. Attach Event Listener to the "ENG" link
    langButton.addEventListener('click', function(e) {
        e.preventDefault(); 
        modal.classList.toggle('active'); 
    });

    // 3. Close Modal handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }

    // Handle clicking on a language option
    langOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault(); // Stop the link from navigating
            
            // 1. Get the text of the clicked option
            const selectedText = this.textContent.replace(' ✔', '').trim();
            
            // 2. Call the new reusable function
            setActiveLanguage(selectedText);

            // 3. Close the modal
            modal.classList.remove('active'); 
        });
    });

    // 4. Close when clicking outside the modal/button area
    document.addEventListener('click', function(e) {
        // Check if the click is outside both the button and the modal itself
        if (modal.classList.contains('active') && !langButton.contains(e.target) && !modal.contains(e.target)) {
            modal.classList.remove('active');
        }
    });
});