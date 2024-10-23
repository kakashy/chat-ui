import { base } from "$app/paths";
import { redirect } from "@sveltejs/kit";

export async function load({ parent, params }) {
	const data = await parent();
	console.log(data);

	const assistant = data.settings.assistants.find((id) => id === params.assistantId);

	if (!assistant) {
		redirect(302, `${base}/assistant/${params.assistantId}`);
	}

	return data;
}
