const OFFLINE_DB_NAME = 'SocietyAppOffline';
const OFFLINE_DB_VERSION = 1;
const DB_STORE_NAME = 'userData';

class OfflineStorage {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
                    db.createObjectStore(DB_STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async setItem(key, value) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(DB_STORE_NAME);
            const request = store.put({ id: key, value, timestamp: Date.now() });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getItem(key) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_STORE_NAME], 'readonly');
            const store = transaction.objectStore(DB_STORE_NAME);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result?.value ?? null);
        });
    }

    async removeItem(key) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(DB_STORE_NAME);
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clear() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(DB_STORE_NAME);
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

const offlineStorage = new OfflineStorage();

async function saveUserData(user, profile) {
    try {
        await offlineStorage.setItem('user', user);
        await offlineStorage.setItem('profile', profile);
        const timestamp = new Date().toISOString();
        await offlineStorage.setItem('lastSync', timestamp);
        localStorage.setItem('lastSync', timestamp);
    } catch (error) {
        console.error('Failed to save user data offline:', error);
    }
}

async function getOfflineUserData() {
    try {
        const user = await offlineStorage.getItem('user');
        const profile = await offlineStorage.getItem('profile');
        const lastSync = await offlineStorage.getItem('lastSync');
        return { user, profile, lastSync };
    } catch (error) {
        console.error('Failed to get offline user data:', error);
        return null;
    }
}

async function clearOfflineData() {
    try {
        await offlineStorage.clear();
        localStorage.removeItem('pinHash');
        localStorage.removeItem('lastSync');
    } catch (error) {
        console.error('Failed to clear offline data:', error);
    }
}

function isOnline() {
    return navigator.onLine;
}

function showOnlineStatus() {
    const statusEl = document.getElementById('online-status');
    if (statusEl) {
        statusEl.classList.toggle('hidden', isOnline());
    }
}

window.addEventListener('online', showOnlineStatus);
window.addEventListener('offline', showOnlineStatus);

const PIN_KEY = 'pinHash';
const SALT = 'SocietyAppSalt2024';

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function savePin(pin) {
    const hashedPin = await hashPin(pin);
    localStorage.setItem(PIN_KEY, hashedPin);
    await offlineStorage.setItem(PIN_KEY, hashedPin);
}

async function verifyPin(pin) {
    const storedHash = localStorage.getItem(PIN_KEY) || await offlineStorage.getItem(PIN_KEY);
    if (!storedHash) return false;
    
    const inputHash = await hashPin(pin);
    return storedHash === inputHash;
}

async function hasPin() {
    const stored = localStorage.getItem(PIN_KEY) || await offlineStorage.getItem(PIN_KEY);
    return !!stored;
}

async function removePin() {
    localStorage.removeItem(PIN_KEY);
    await offlineStorage.removeItem(PIN_KEY);
}

async function syncDataWhenOnline() {
    if (!isOnline()) return;
    
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const lastSync = localStorage.getItem('lastSync');
            console.log('Online sync available. Last sync:', lastSync);
        }
    } catch (error) {
        console.log('Sync failed, will retry when online');
    }
}

window.addEventListener('online', syncDataWhenOnline);
