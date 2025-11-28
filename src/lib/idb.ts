"use client";

const DB_NAME = "chatbot_ui";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) throw new Error('IndexedDB is not available in this environment');

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const dbOpen = window.indexedDB.open(DB_NAME, 1);
    dbOpen.onupgradeneeded = () => {
      const db = dbOpen.result;
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
    dbOpen.onsuccess = () => resolve(dbOpen.result);
    dbOpen.onerror = () => reject(dbOpen.error);
  });
  return dbPromise;
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  if (!db) return [];
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return await new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbUpsert<T>(storeName: string, item: T): Promise<IDBValidKey> {
  const db = await openDB();
  if (!db) throw new Error('IndexedDB is not available in this environment');
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  return await new Promise<IDBValidKey>((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbDelete(storeName: string, item: IDBValidKey): Promise<void> {
  const db = await openDB();
  if (!db) throw new Error('IndexedDB is not available in this environment');
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  return await new Promise<void>((resolve, reject) => {
    const request = store.delete(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
