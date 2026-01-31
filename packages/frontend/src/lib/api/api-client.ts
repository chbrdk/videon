/**
 * Centralized API client with automatic credential handling
 * 
 * This wrapper ensures all API requests include credentials (cookies)
 * and provides consistent error handling across the application.
 */

import { goto } from '$app/navigation';
import { browser } from '$app/environment';

export interface ApiRequestOptions extends RequestInit {
    skipAuthRedirect?: boolean;
}

/**
 * Make an authenticated API request
 * Automatically includes credentials and handles common error cases
 */
export async function apiRequest(
    url: string,
    options: ApiRequestOptions = {}
): Promise<Response> {
    const { skipAuthRedirect = false, ...fetchOptions } = options;

    // Ensure credentials are always included for cookie-based auth
    const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401 && !skipAuthRedirect && browser) {
        // Only redirect if we're in the browser and not already on login page
        if (!window.location.pathname.includes('/login')) {
            goto('/login');
        }
    }

    return response;
}

/**
 * Helper for GET requests
 */
export async function apiGet(url: string, options?: ApiRequestOptions): Promise<Response> {
    return apiRequest(url, { ...options, method: 'GET' });
}

/**
 * Helper for POST requests
 */
export async function apiPost(
    url: string,
    data?: any,
    options?: ApiRequestOptions
): Promise<Response> {
    return apiRequest(url, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Helper for PUT requests
 */
export async function apiPut(
    url: string,
    data?: any,
    options?: ApiRequestOptions
): Promise<Response> {
    return apiRequest(url, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(url: string, options?: ApiRequestOptions): Promise<Response> {
    return apiRequest(url, { ...options, method: 'DELETE' });
}

/**
 * Helper for PATCH requests
 */
export async function apiPatch(
    url: string,
    data?: any,
    options?: ApiRequestOptions
): Promise<Response> {
    return apiRequest(url, {
        ...options,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
    });
}
