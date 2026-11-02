import {
  pgTable,
  text,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

// All data is keyed by a per-browser "deviceId" so multiple users can share a
// database while keeping their chats, memories and keys isolated.

export const settings = pgTable("settings", {
  deviceId: text("device_id").primaryKey(),
  provider: text("provider").default("OpenAI"),
  baseUrl: text("base_url").default("https://api.openai.com/v1"),
  apiKey: text("api_key"),
  model: text("model").default("gpt-4o-mini"),
  userName: text("user_name"),
  language: text("language").default("auto"),
  aboutMe: text("about_me"),
  theme: text("theme").default("dark"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  deviceId: text("device_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type ChatRow = typeof chats.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
