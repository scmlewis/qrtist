export function encodeConfigHash(configObj) {
    return btoa(encodeURIComponent(JSON.stringify(configObj)));
}

export function decodeConfigHash(hash) {
    try {
        const rawHash = hash.startsWith('settings=') ? hash.slice('settings='.length) : hash;
        return JSON.parse(decodeURIComponent(atob(rawHash)));
    } catch (e) {
        return null;
    }
}
