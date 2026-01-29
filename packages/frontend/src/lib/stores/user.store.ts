import { writable } from 'svelte/store';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: 'USER' | 'ADMIN';
    avatarUrl?: string;
}

export const userStore = writable<User | null>(null);
