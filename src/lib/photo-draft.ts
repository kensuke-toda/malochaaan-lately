"use client";

const DB_NAME = "lately-photo-drafts";
const STORE = "files";
const memory = new Map<string, File[]>();

type StoredFile = {
  name: string;
  type: string;
  lastModified: number;
  bytes: ArrayBuffer;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export function peekPhotoDraft(key: string): File[] {
  return memory.get(key) ?? [];
}

export async function setPhotoDraftAsync(key: string, files: File[]) {
  if (!files.length) {
    memory.delete(key);
    await clearPhotoDraft(key);
    return;
  }
  memory.set(key, files);
  try {
    const payload: StoredFile[] = [];
    for (const file of files) {
      payload.push({
        name: file.name || "photo.jpg",
        type: file.type || "image/jpeg",
        lastModified: file.lastModified,
        bytes: await file.arrayBuffer(),
      });
    }
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    // Best-effort only; in-memory draft still works for same document lifetime.
  }
}

export function setPhotoDraft(key: string, files: File[]) {
  void setPhotoDraftAsync(key, files);
}

export async function loadPhotoDraft(key: string): Promise<File[]> {
  const cached = memory.get(key);
  if (cached?.length) return cached;
  try {
    const db = await openDb();
    const rows = await new Promise<StoredFile[] | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    db.close();
    if (!rows?.length) return [];
    const files = rows.map(
      (row) => new File([row.bytes], row.name || "photo.jpg", { type: row.type || "image/jpeg", lastModified: row.lastModified }),
    );
    memory.set(key, files);
    return files;
  } catch {
    return [];
  }
}

export async function clearPhotoDraft(key: string) {
  memory.delete(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
    db.close();
  } catch {
    // ignore
  }
}
