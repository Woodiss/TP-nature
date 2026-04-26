
function detect() {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('quality');
    if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return 'low';

    const mem = navigator.deviceMemory ?? 8;
    if (mem <= 4) return 'medium';
    return 'high';
}

export const PROFILE = detect();
