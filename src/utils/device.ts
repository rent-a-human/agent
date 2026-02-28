export const isTVBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;

    const ua = window.navigator.userAgent.toLowerCase();

    const tvKeywords = [
        'smart-tv',
        'smarttv',
        'appletv',
        'tvos',
        'tizen', // Samsung
        'webos', // LG
        'netcast', // Older LG
        'googletv',
        'tsbnettv', // Toshiba
        'hbbtv',
        'viera', // Panasonic
        'smart hub',
        'sony', // Often Sony TVs identify this way
        'bravia',
        'roku',
        'firetv',
        'aftt', // Amazon Fire TV stick
        'afts',
        'aftm',
        'aftb',
        'hisense',
        'vidaa',
        'smart-tv',
        'crkey', // Chromecast
        'linux armv7l', // some smart TVs
        'tv' // Generic fallback for things like Android TV
    ];

    return tvKeywords.some(keyword => ua.includes(keyword));
};
