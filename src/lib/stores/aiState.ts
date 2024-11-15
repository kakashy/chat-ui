import { writable } from "svelte/store";

export const aiAPIState = writable<"down" | "changing" | "up">("down");
