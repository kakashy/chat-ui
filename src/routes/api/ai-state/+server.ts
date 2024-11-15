import { json } from "@sveltejs/kit";

export async function GET() {
	const stateResponse: { state: "down" | "changing" | "up" } = await (
		await fetch(`https://lunakama.magicmind.me/magic-uptime/chat-ui`)
	).json();
	return json(stateResponse);
}
