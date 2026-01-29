import { writable } from 'svelte/store';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: 'USER' | 'ADMIN';
}

export const userStore = writable<User | null>(null);
