import { dbGetAll, dbUpsert, dbDelete } from "@/lib/idb";
import { Message } from "@/types/openai";

export interface ChatData {
  id?: string;
  name: string;
  metadata: Record<string, unknown>;
  messages: Message[];
}

export class Chat implements ChatData {
  id!: string;
  name: string;
  metadata: Record<string, unknown>;
  messages: Message[];

  constructor(data: ChatData) {
    this.name = data.name;
    this.metadata = data.metadata;
    this.messages = data.messages;

    dbUpsert("chats", { name: data.name, metadata: data.metadata, messages: data.messages })
      .then(id => {
        this.id = String(id);
        chatsCache.set(this.id, this);
      })
  }

  async update(updates: Partial<Omit<ChatData, 'id'>>): Promise<void> {
    const chat = chatsCache.get(this.id);
    if (!chat) throw new Error(`Chat with id ${this.id} not found in cache`);
    if (updates.name !== undefined) chat.name = updates.name;
    if (updates.metadata !== undefined) chat.metadata = { ...chat.metadata, ...updates.metadata };
    if (updates.messages !== undefined) chat.messages = updates.messages;
    await dbUpsert("chats", { id: this.id, name: chat.name, metadata: chat.metadata, messages: chat.messages });
    chatsCache.set(this.id, chat);
  }

  async delete(): Promise<void> {
    if (!chatsCache.get(this.id)) throw new Error(`Chat with id ${this.id} not found in cache`);
    dbDelete("chats", this.id)
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