const DB_NAME = "chatbot_ui";

const dbOpen = indexedDB.open(DB_NAME, 1);
const db = dbOpen.result;
dbOpen.onupgradeneeded = () => {
  if (!db.objectStoreNames.contains("chats")) {
    db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return await new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbUpsert<T>(storeName: string, item: T): Promise<IDBValidKey> {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  return await new Promise<IDBValidKey>((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbDelete(storeName: string, item: IDBValidKey): Promise<void> {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  return await new Promise<void>((resolve, reject) => {
    const request = store.delete(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
