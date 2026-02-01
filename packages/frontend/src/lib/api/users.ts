import { api } from '../config/environment';
import { apiRequest } from './api-client';

const API_BASE_URL = api.baseUrl;

export interface UserSummary {
    id: string;
    name: string;
    email: string;
}

class UserApi {
    async searchUsers(query: string): Promise<UserSummary[]> {
        if (!query || query.length < 1) return [];

        const response = await apiRequest(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Failed to search users');
        }
        return response.json();
    }
}

export const userApi = new UserApi();
