// Wait for the document to be fully loaded before running script
document.addEventListener("DOMContentLoaded", function() {

    // Get the elements we need
    const container = document.getElementById("features-container");
    const scrollLeftBtn = document.getElementById("scroll-left");
    const scrollRightBtn = document.getElementById("scroll-right");

    if (container && scrollLeftBtn && scrollRightBtn) {
        
        // Define how far to scroll. Let's scroll by one feature-box width + margin
        const scrollAmount = 220 + 25; // 220px width + 25px margin

        // Add click event for the right button
        scrollRightBtn.addEventListener("click", function() {
            container.scrollLeft += scrollAmount;
        });

        // Add click event for the left button
        scrollLeftBtn.addEventListener("click", function() {
            container.scrollLeft -= scrollAmount;
        });
    }

});