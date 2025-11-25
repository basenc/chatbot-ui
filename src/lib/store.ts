import "dotenv/config";
import { ChatModel } from "../../prisma/prisma/models/Chat";

export function createStore<T>(initialValue: T) {
  let state = initialValue;

  const listeners = new Set<() => void>();

  return {
    getSnapshot: (): T => state,
    getServerSnapshot: (): T => initialValue,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (value: T) => {
      state = value;
      listeners.forEach(listener => listener());
    }
  };
}

export const chatStore = createStore<number | null>(null);
export const presetStore = createStore<string | null>(null);
export const promptStore = createStore<string | null>(null);
export const messagesStore = createStore<Array<{ text: string; sender: string }>>([]);
export const chatsStore = createStore<Array<ChatModel>>([]);