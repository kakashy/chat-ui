import { json } from "@sveltejs/kit";

import { models } from "$lib/server/models";

export async function GET() {
	const stateResponse: { state: "down" | "changing" | "up" } = await (
		await fetch(`https://lunakama.magicmind.me/magic-uptime/chat-ui`)
	).json();
	return json(stateResponse);
}

export async function POST({ request }) {
	const body = await request.json();
	const { state } = body;
	try {
		const url = "https://lunakama.magicmind.me/magic-uptime/chat-ui";
		const options = {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ state }),
		};

		const response = await fetch(url, options);
		const data = await response.json();
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes in milliseconds

		try {
			// @ts-expect-error schema update
			await fetch(models[0]?.modelUrl ?? models[0].endpoints[0].url, {
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (error.name === "AbortError") {
					throw new Error("Request timed out after 3 minutes");
				}
			}
			// Handle other types of errors or rethrow
			throw error;
		}

		console.log(data);
		return json({ ok: true });
	} catch (e) {
		const url = "https://lunakama.magicmind.me/magic-uptime/chat-ui";
		const options = {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ state: "down" }),
		};

		const response = await fetch(url, options);
		await response.json();
		console.error(e);
		return json({ ok: false });
	}
}
