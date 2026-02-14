/**
 * HMIS Encryption Utility (Web Crypto API)
 * Provides AES-GCM encryption/decryption for PII (SSN, DOB etc.)
 */

const getCryptoKey = async (secret) => {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    // Ensure the key is exactly 32 bytes for AES-256
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    return await crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
};

export const encryptText = async (text, secret) => {
    if (!text || !secret) return null;
    try {
        const enc = new TextEncoder();
        const key = await getCryptoKey(secret);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(text)
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Convert to Base64 for storage
        return btoa(String.fromCharCode(...combined));
    } catch (err) {
        console.error('Encryption failed:', err);
        return null;
    }
};

export const decryptText = async (base64Data, secret) => {
    if (!base64Data || !secret) return null;
    try {
        const combined = new Uint8Array(
            atob(base64Data)
                .split('')
                .map((c) => c.charCodeAt(0))
        );
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        const key = await getCryptoKey(secret);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (err) {
        console.error('Decryption failed:', err);
        return null;
    }
};
