export const initScrollObserver = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 1.0,
        rootMargin: '-25% 0px -25% 0px'
    });

    // Observe all track and artist items
    document.querySelectorAll('.track-item, .artist-item').forEach(item => {
        observer.observe(item);
    });

    return observer;
}; 