import { dbGetAll, dbUpsert, dbDelete } from "@/lib/idb";
import { Message } from "@/types/openai";

export interface ChatData {
  id?: IDBValidKey;
  name: string;
  metadata: Record<string, unknown>;
  messages: Message[];
}

export class Chat implements ChatData {
  id!: string;
  rawId?: IDBValidKey;
  name: string;
  metadata: Record<string, unknown>;
  messages: Message[];

  constructor(data: ChatData, opts?: { onCreated?: (id: string) => void }) {
    this.name = data.name;
    this.metadata = data.metadata;
    this.messages = data.messages;
    // If caller provided an initial ID (for ephemeral local chat), set the raw/pristine ID
    if (data.id !== undefined && data.id !== null) {
      this.rawId = data.id;
      this.id = String(data.id);
      const parsed = typeof data.id === 'number' ? data.id : (typeof data.id === 'string' ? Number(data.id) : NaN);
      // treat negative numeric IDs as ephemeral and persist them to the DB to get a real id
      if (!Number.isNaN(parsed) && parsed < 0) {
        // Register ephemeral entry in cache immediately to prevent duplicates while persisting
        chatsCache.set(this.id, this);
        dbUpsert("chats", { name: data.name, metadata: data.metadata, messages: data.messages })
          .then(id => {
            const newId = id;
            if (this.id && String(this.id) !== String(newId)) chatsCache.delete(this.id);
            this.rawId = newId;
            this.id = String(newId);
            chatsCache.set(this.id, this);
            if (opts?.onCreated) opts.onCreated(this.id);
          });
      } else {
        // existing persisted record - register in cache
        chatsCache.set(this.id, this);
      }
    } else {
      // New chat with no id - persist and capture created id
      dbUpsert("chats", { name: data.name, metadata: data.metadata, messages: data.messages })
        .then(id => {
          const newId = id;
          this.rawId = newId;
          this.id = String(newId);
          chatsCache.set(this.id, this);
          if (opts?.onCreated) opts.onCreated(this.id);
        });
    }
  }

  async update(updates: Partial<Omit<ChatData, 'id'>>): Promise<void> {
    const chat = chatsCache.get(this.id);
    if (!chat) throw new Error(`Chat with id ${this.id} not found in cache`);
    if (updates.name !== undefined) chat.name = updates.name;
    if (updates.metadata !== undefined) chat.metadata = { ...chat.metadata, ...updates.metadata };
    if (updates.messages !== undefined) chat.messages = updates.messages;
    const idValue = this.rawId !== undefined ? this.rawId : (Number.isNaN(Number(this.id)) ? this.id : Number(this.id));
    await dbUpsert("chats", { id: idValue, name: chat.name, metadata: chat.metadata, messages: chat.messages });
    chatsCache.set(this.id, chat);
  }

  async delete(): Promise<void> {
    if (!chatsCache.get(this.id)) throw new Error(`Chat with id ${this.id} not found in cache`);
    const idValue = this.rawId !== undefined ? this.rawId : (Number.isNaN(Number(this.id)) ? this.id : Number(this.id));
    dbDelete("chats", idValue)
      .then(() => {
        chatsCache.delete(this.id);
      })
      .finally(() => {
        chatsCache.delete(this.id);
      });
  }
}

export interface SettingData {
  key: string;
  value: unknown;
}

export class Setting implements SettingData {
  key: string;
  value: unknown;

  constructor(key: string, value: unknown) {
    this.key = key;
    this.value = value;

    dbUpsert("settings", { key: this.key, value: this.value });
    settingsCache.set(this.key, this);
  }

  async update(updates: Omit<SettingData, 'key'>): Promise<Setting> {
    this.value = updates.value;
    await dbUpsert("settings", { key: this.key, value: this.value });
    settingsCache.set(this.key, this);
    return this;
  }

  async delete(): Promise<void> {
    if (!settingsCache.get(this.key)) throw new Error(`Setting with key ${this.key} not found`);
    dbDelete("settings", this.key)
      .finally(() => {
        settingsCache.delete(this.key);
      });
  }
}

export const chatsCache = new Map<string, Chat>();
const chatsData = await dbGetAll<ChatData>("chats");
const chats = chatsData.map(data => new Chat({
  id: data.id,
  name: data.name || "Unknown Chat",
  metadata: data.metadata || {},
  messages: data.messages || []
}));
chatsCache.clear();
chats.forEach(chat => chatsCache.set(chat.id, chat));


export const settingsCache = new Map<string, Setting>();
const settingsData = await dbGetAll<SettingData>("settings");
const settings = settingsData.map(data => new Setting(
  data.key, data.value
));
settingsCache.clear();
settings.forEach(s => settingsCache.set(s.key, s));