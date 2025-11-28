import "dotenv/config";
import { ChatData } from "./odm";

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

export const chatIDStore = createStore<number | null>(null);
export const chatsStore = createStore<Array<ChatData>>([]);