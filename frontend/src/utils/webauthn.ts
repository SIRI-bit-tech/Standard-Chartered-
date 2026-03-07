/**
 * WebAuthn Helper Utilities
 * Handles conversion between Base64URL and ArrayBuffer
 */

/**
 * Converts a base64url string to an ArrayBuffer
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/') + padding;
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a base64url string
 */
export function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Prepares options received from the server for navigator.credentials.create
 */
export function parseRegistrationOptions(optionsJson: string): PublicKeyCredentialCreationOptions {
    const options = JSON.parse(optionsJson);

    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: {
            ...options.user,
            id: base64urlToBuffer(options.user.id)
        },
        excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
            ...cred,
            id: base64urlToBuffer(cred.id)
        }))
    };
}

/**
 * Prepares options received from the server for navigator.credentials.get
 */
export function parseAuthenticationOptions(optionsJson: string): PublicKeyCredentialRequestOptions {
    const options = JSON.parse(optionsJson);

    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
            ...cred,
            id: base64urlToBuffer(cred.id)
        }))
    };
}

/**
 * Encodes the credential object for sending to the server
 */
export function encodeCredential(credential: any): string {
    if (!credential) return "";

    const encoded: any = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {}
    };

    if (credential.response.attestationObject) {
        encoded.response.attestationObject = bufferToBase64url(credential.response.attestationObject);
    }

    if (credential.response.clientDataJSON) {
        encoded.response.clientDataJSON = bufferToBase64url(credential.response.clientDataJSON);
    }

    if (credential.response.authenticatorData) {
        encoded.response.authenticatorData = bufferToBase64url(credential.response.authenticatorData);
    }

    if (credential.response.signature) {
        encoded.response.signature = bufferToBase64url(credential.response.signature);
    }

    if (credential.response.userHandle) {
        encoded.response.userHandle = bufferToBase64url(credential.response.userHandle);
    }

    return JSON.stringify(encoded);
}
