export interface ApiErrorDetail {
    success: boolean;
    message: string;
    error_code: string;
    details?: {
        field?: string;
        [key: string]: any;
    };
}

export function parseApiError(err: any): { message: string; errorFields: string[] } {
    let message = 'An unexpected error occurred. Please try again.';
    let errorFields: string[] = [];

    if (err.response?.data) {
        let data = err.response.data;

        // Handle case where data might be a JSON string
        if (typeof data === 'string' && data.startsWith('{')) {
            try {
                data = JSON.parse(data);
            } catch {
                // Not JSON, continue with string data
            }
        }

        console.log('Parsing Error Data:', data);

        // Case 1: data.detail is an object (standard nested format)
        if (data.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)) {
            const detail = data.detail as ApiErrorDetail;
            message = detail.message || message;
            if (detail.details?.field) {
                errorFields.push(detail.details.field);
            }
        }
        // Case 2: data.detail is an array (FastAPI validation error)
        else if (Array.isArray(data.detail)) {
            message = data.detail[0]?.msg || message;
            data.detail.forEach((e: any) => {
                if (e.loc && e.loc.length > 1) {
                    errorFields.push(e.loc[e.loc.length - 1]);
                }
            });
        }
        // Case 3: data.message or data itself has content (flattened format)
        else if (data.message && typeof data.message === 'string') {
            message = data.message;
            if (data.details?.field) {
                errorFields.push(data.details.field);
            }
        }
        // Case 4: data.detail is a string
        else if (data.detail && typeof data.detail === 'string') {
            message = data.detail;
        }
        // Case 5: data itself is a string
        else if (typeof data === 'string') {
            message = data;
        }
    } else if (err.message) {
        message = err.message;
    }

    // Security: Ensure message is never a raw object string if we didn't explicitly map it
    if (typeof message === 'string' && (message.startsWith('{') || message.startsWith('['))) {
        try {
            const parsed = JSON.parse(message);
            if (parsed.message) {
                message = parsed.message;
            } else if (parsed.detail && typeof parsed.detail === 'string') {
                message = parsed.detail;
            } else {
                message = 'An unexpected error occurred. Please try again.';
            }
        } catch {
            // If it's not valid JSON despite starting with {/[, it's probably safe-ish, 
            // but for a banking app let's be strict.
            message = 'An error occurred. Please try again.';
        }
    } else if (typeof message !== 'string') {
        message = String(message);
    }

    return { message, errorFields };
}
