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
			body: `{"state":${state}}`,
		};

		const response = await fetch(url, options);
		const data = await response.json();
		// @ts-expect-error schema update
		await fetch(models[0]?.modelUrl ?? models[0].endpoints[0].url);

		console.log(data);

		// await fetch(`https://lunakama.magicmind.me/magic-uptime/chat-ui`, {
		// 	method: "POST",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// 	body: JSON.stringify({ state }),
		// });
		return json({ ok: true });
	} catch (e) {
		console.error(e);
		return json({ ok: false });
	}
}
