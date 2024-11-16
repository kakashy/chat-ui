<script lang="ts">
	import type { Message, MessageFile } from "$lib/types/Message";
	import { createEventDispatcher, onDestroy, tick } from "svelte";

	import CarbonSendAltFilled from "~icons/carbon/send-alt-filled";
	import CarbonExport from "~icons/carbon/export";
	import CarbonStopFilledAlt from "~icons/carbon/stop-filled-alt";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonCaretDown from "~icons/carbon/caret-down";

	import EosIconsLoading from "~icons/eos-icons/loading";

	import ChatInput from "./ChatInput.svelte";
	import StopGeneratingBtn from "../StopGeneratingBtn.svelte";
	import type { Model } from "$lib/types/Model";
	import WebSearchToggle from "../WebSearchToggle.svelte";
	import ToolsMenu from "../ToolsMenu.svelte";
	import LoginModal from "../LoginModal.svelte";
	import { page } from "$app/stores";
	import FileDropzone from "./FileDropzone.svelte";
	import RetryBtn from "../RetryBtn.svelte";
	import UploadBtn from "../UploadBtn.svelte";
	import file2base64 from "$lib/utils/file2base64";
	import type { Assistant } from "$lib/types/Assistant";
	import { base } from "$app/paths";
	import ContinueBtn from "../ContinueBtn.svelte";
	import AssistantIntroduction from "./AssistantIntroduction.svelte";
	import ChatMessage from "./ChatMessage.svelte";
	import ScrollToBottomBtn from "../ScrollToBottomBtn.svelte";
	import ScrollToPreviousBtn from "../ScrollToPreviousBtn.svelte";
	import { browser } from "$app/environment";
	import { snapScrollToBottom } from "$lib/actions/snapScrollToBottom";
	import SystemPromptModal from "../SystemPromptModal.svelte";
	import ChatIntroduction from "./ChatIntroduction.svelte";
	import { useConvTreeStore } from "$lib/stores/convTree";
	import UploadedFile from "./UploadedFile.svelte";
	import { useSettingsStore } from "$lib/stores/settings";
	import type { ToolFront } from "$lib/types/Tool";
	import ModelSwitch from "./ModelSwitch.svelte";
	import { aiAPIState } from "$lib/stores/aiState";
	import { fly } from "svelte/transition";
	import { spanLeadingZeroes } from "ip-address/dist/v6/helpers";

	export let messages: Message[] = [];
	export let loading = false;
	export let pending = false;

	export let shared = false;
	export let currentModel: Model;
	export let models: Model[];
	export let assistant: Assistant | undefined = undefined;
	export let preprompt: string | undefined = undefined;
	export let files: File[] = [];

	$: isReadOnly = !models.some((model) => model.id === currentModel.id);

	let loginModalOpen = false;
	let message: string;
	let timeout: ReturnType<typeof setTimeout>;
	let isSharedRecently = false;
	$: $page.params.id && (isSharedRecently = false);

	const dispatch = createEventDispatcher<{
		message: string;
		share: void;
		stop: void;
		retry: { id: Message["id"]; content?: string };
		continue: { id: Message["id"] };
	}>();

	const handleSubmit = () => {
		if (loading) return;
		dispatch("message", message);
		message = "";
	};

	let lastTarget: EventTarget | null = null;

	let onDrag = false;

	const onDragEnter = (e: DragEvent) => {
		lastTarget = e.target;
		onDrag = true;
	};
	const onDragLeave = (e: DragEvent) => {
		if (e.target === lastTarget) {
			onDrag = false;
		}
	};

	const onPaste = (e: ClipboardEvent) => {
		if (!e.clipboardData) {
			return;
		}

		// paste of files
		const pastedFiles = Array.from(e.clipboardData.files);
		if (pastedFiles.length !== 0) {
			e.preventDefault();

			// filter based on activeMimeTypes, including wildcards
			const filteredFiles = pastedFiles.filter((file) => {
				return activeMimeTypes.some((mimeType: string) => {
					const [type, subtype] = mimeType.split("/");
					const [fileType, fileSubtype] = file.type.split("/");
					return type === fileType && (subtype === "*" || fileSubtype === subtype);
				});
			});

			files = [...files, ...filteredFiles];
		}
	};

	const convTreeStore = useConvTreeStore();

	const updateCurrentIndex = () => {
		const url = new URL($page.url);
		let leafId = url.searchParams.get("leafId");

		// Ensure the function is only run in the browser.
		if (!browser) return;

		if (leafId) {
			// Remove the 'leafId' from the URL to clean up after retrieving it.
			url.searchParams.delete("leafId");
			history.replaceState(null, "", url.toString());
		} else {
			// Retrieve the 'leafId' from localStorage if it's not in the URL.
			leafId = localStorage.getItem("leafId");
		}

		// If a 'leafId' exists, find the corresponding message and update indices.
		if (leafId) {
			let leafMessage = messages.find((m) => m.id == leafId);
			if (!leafMessage?.ancestors) return; // Exit if the message has no ancestors.

			let ancestors = leafMessage.ancestors;

			// Loop through all ancestors to update the current child index.
			for (let i = 0; i < ancestors.length; i++) {
				let curMessage = messages.find((m) => m.id == ancestors[i]);
				if (curMessage?.children) {
					for (let j = 0; j < curMessage.children.length; j++) {
						// Check if the current message's child matches the next ancestor
						// or the leaf itself, and update the currentChildIndex accordingly.
						if (i + 1 < ancestors.length) {
							if (curMessage.children[j] == ancestors[i + 1]) {
								curMessage.currentChildIndex = j;
								break;
							}
						} else {
							if (curMessage.children[j] == leafId) {
								curMessage.currentChildIndex = j;
								break;
							}
						}
					}
				}
			}
		}
	};

	updateCurrentIndex();

	$: lastMessage = browser && (messages.find((m) => m.id == $convTreeStore.leaf) as Message);
	$: lastIsError =
		lastMessage &&
		!loading &&
		(lastMessage.from === "user" ||
			lastMessage.updates?.findIndex((u) => u.type === "status" && u.status === "error") !== -1);

	$: sources = files?.map<Promise<MessageFile>>((file) =>
		file2base64(file).then((value) => ({ type: "base64", value, mime: file.type, name: file.name }))
	);

	function onShare() {
		if (!confirm("Are you sure you want to share this conversation? This cannot be undone.")) {
			return;
		}

		dispatch("share");
		isSharedRecently = true;
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => {
			isSharedRecently = false;
		}, 2000);
	}

	onDestroy(() => {
		if (timeout) {
			clearTimeout(timeout);
		}
	});

	let chatContainer: HTMLElement;

	async function scrollToBottom() {
		await tick();
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// If last message is from user, scroll to bottom
	$: if (lastMessage && lastMessage.from === "user") {
		scrollToBottom();
	}

	const settings = useSettingsStore();

	// active tools are all the checked tools, either from settings or on by default
	$: activeTools = $page.data.tools.filter((tool: ToolFront) => {
		if ($page.data?.assistant) {
			return $page.data.assistant.tools?.includes(tool._id);
		}
		return $settings?.tools?.includes(tool._id) ?? tool.isOnByDefault;
	});
	$: activeMimeTypes = [
		...(currentModel.tools ? activeTools.flatMap((tool: ToolFront) => tool.mimeTypes ?? []) : []),
		...(currentModel.multimodal ? currentModel.multimodalAcceptedMimetypes ?? ["image/*"] : []),
	];

	$: isFileUploadEnabled = activeMimeTypes.length > 0;

	async function wakeAIup() {
		$aiAPIState = "changing";
		const r = await fetch(`${base}/api/ai-state`, {
			method: "POST",
			body: JSON.stringify({ state: "changing" }),
		});
	}
</script>

<svelte:window
	on:dragenter={onDragEnter}
	on:dragleave={onDragLeave}
	on:dragover|preventDefault
	on:drop|preventDefault={() => (onDrag = false)}
/>

<div class="relative min-h-0 min-w-0">
	{#if loginModalOpen}
		<LoginModal
			on:close={() => {
				loginModalOpen = false;
			}}
		/>
	{/if}
	<aside
		class="mx-auto my-2 flex w-1/2 max-w-xl items-center justify-center gap-3 rounded-2xl border border-gray-500/50 p-2"
	>
		<span class="relative"
			><img
				src="https://www.countryandtownhouse.com/wp-content/uploads/2022/05/377329.jpg"
				alt="Magicmind"
				class="h-16 w-16 rounded-full object-cover"
			/>
			{#key $aiAPIState}
				<div
					class="absolute -right-1 top-12 h-5 w-5 rounded-full border-4 border-[rgb(249,250,251)] bg-red-500 dark:border-[rgb(26,36,50)] {$aiAPIState ==
					'up'
						? 'bg-green-500'
						: $aiAPIState == 'changing'
						? 'bg-amber-500'
						: 'bg-red-500'}"
				/>
			{/key}
		</span>
		<span class="flex flex-col">
			<h2 class="text-center text-xl font-semibold">Wimbot</h2>
			{#key $aiAPIState}
				{#if $aiAPIState === "up"}
					<p in:fly={{ duration: 300, y: 10 }} class="text-xs opacity-70">Let's chat</p>
				{:else if $aiAPIState === "changing"}
					<p in:fly={{ duration: 300, y: 10 }} class="text-xs opacity-70">
						I'm getting ready. Please allow me 2 - 3 minutes.
					</p>
				{:else}
					<p in:fly={{ duration: 300, y: 10 }} class="text-xs opacity-70">
						I'm in deep ice meditation, you wanna chat?
					</p>
					<button
						on:click={async () => {
							console.log("wtf");
							await wakeAIup();
						}}
						class="mx-auto mt-1 w-fit rounded bg-black p-1 text-xs text-white outline-none hover:bg-black/70 dark:bg-white dark:text-black dark:hover:bg-white/70"
						>Yeah, sure.</button
					>
				{/if}
			{/key}
		</span>
	</aside>

	{#if $aiAPIState === "down"}
		<aside
			class="mx-auto mt-6 flex w-1/2 max-w-xl flex-col items-center justify-center gap-3 rounded-2xl border border-gray-500/50 p-5 font-serif"
		>
			<p>Hey there, legend!</p>
			<span>
				It's me, Wim – well, Wimbot, but close enough! I’m just catching my breath and channeling
				some icy vibes to get <i>fully present</i> for you. Give me 2-3 minutes, and I’ll be ready to
				dive in, deep and strong, just like a good cold plunge.
			</span>
			<p>
				Use this time to take a couple of deep breaths, in through the nose, out through the
				mouth... YEAHHH, that’s the spirit! Stay cool, we’ll crush it together in no time! 🧊💪
			</p>
		</aside>
	{/if}

	<div
		class="dark:via-gray-80 pointer-events-none absolute inset-x-0 bottom-0 z-0 mx-auto flex w-full max-w-3xl flex-col items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/0 px-3.5 py-4 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/0 max-md:border-t max-md:bg-white max-md:dark:bg-gray-900 sm:px-5 md:py-8 xl:max-w-4xl [&>*]:pointer-events-auto"
	>
		{#if sources?.length && !loading}
			<div class="flex flex-row flex-wrap justify-center gap-2.5 max-md:pb-3">
				{#each sources as source, index}
					{#await source then src}
						<UploadedFile
							file={src}
							on:close={() => {
								files = files.filter((_, i) => i !== index);
							}}
						/>
					{/await}
				{/each}
			</div>
		{/if}

		<div class="w-full">
			<div class="flex w-full pb-3">
				{#if !assistant}
					{#if currentModel.tools}
						<ToolsMenu {loading} />
					{:else if $page.data.settings?.searchEnabled}
						<WebSearchToggle />
					{/if}
				{/if}
				{#if loading}
					<StopGeneratingBtn classNames="ml-auto" on:click={() => dispatch("stop")} />
				{:else if lastIsError}
					<RetryBtn
						classNames="ml-auto"
						on:click={() => {
							if (lastMessage && lastMessage.ancestors) {
								dispatch("retry", {
									id: lastMessage.id,
								});
							}
						}}
					/>
				{:else}
					<div class="ml-auto gap-2">
						{#if isFileUploadEnabled}
							<UploadBtn bind:files mimeTypes={activeMimeTypes} classNames="ml-auto" />
						{/if}
						{#if messages && lastMessage && lastMessage.interrupted && !isReadOnly}
							<ContinueBtn
								on:click={() => {
									if (lastMessage && lastMessage.ancestors) {
										dispatch("continue", {
											id: lastMessage?.id,
										});
									}
								}}
							/>
						{/if}
					</div>
				{/if}
			</div>
			<form
				tabindex="-1"
				aria-label={isFileUploadEnabled ? "file dropzone" : undefined}
				on:submit|preventDefault={handleSubmit}
				class="relative flex w-full max-w-4xl flex-1 items-center rounded-xl border bg-gray-100 focus-within:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-gray-500
            {isReadOnly ? 'opacity-30' : ''}"
			>
				{#if onDrag && isFileUploadEnabled}
					<FileDropzone bind:files bind:onDrag mimeTypes={activeMimeTypes} />
				{:else}
					<div class="flex w-full flex-1 border-none bg-transparent">
						{#if lastIsError}
							<ChatInput value="Sorry, something went wrong. Please try again." disabled={true} />
						{:else}
							<ChatInput
								placeholder={isReadOnly ? "This conversation is read-only." : "Ask anything"}
								bind:value={message}
								on:submit={handleSubmit}
								on:beforeinput={(ev) => {
									if ($page.data.loginRequired) {
										ev.preventDefault();
										loginModalOpen = true;
									}
								}}
								on:paste={onPaste}
								maxRows={6}
								disabled={isReadOnly || lastIsError}
							/>
						{/if}

						{#if loading}
							<button
								class="btn mx-1 my-1 inline-block h-[2.4rem] self-end rounded-lg bg-transparent p-1 px-[0.7rem] text-gray-400 enabled:hover:text-gray-700 disabled:opacity-60 enabled:dark:hover:text-gray-100 dark:disabled:opacity-40 md:hidden"
								on:click={() => dispatch("stop")}
							>
								<CarbonStopFilledAlt />
							</button>
							<div
								class="mx-1 my-1 hidden h-[2.4rem] items-center p-1 px-[0.7rem] text-gray-400 enabled:hover:text-gray-700 disabled:opacity-60 enabled:dark:hover:text-gray-100 dark:disabled:opacity-40 md:flex"
							>
								<EosIconsLoading />
							</div>
						{:else}
							<button
								class="btn mx-1 my-1 h-[2.4rem] self-end rounded-lg bg-transparent p-1 px-[0.7rem] text-gray-400 enabled:hover:text-gray-700 disabled:opacity-60 enabled:dark:hover:text-gray-100 dark:disabled:opacity-40"
								disabled={isReadOnly}
								type="submit"
							>
								<CarbonSendAltFilled />
							</button>
						{/if}
					</div>
				{/if}
			</form>
			<div
				class="mt-2 flex justify-between self-stretch px-1 text-xs text-gray-400/90 max-md:mb-2 max-sm:gap-2"
			>
				<p>The first message might take longer to generate a response.</p>
				{#if messages.length}
					<button
						class="flex flex-none items-center hover:text-gray-400 max-sm:rounded-lg max-sm:bg-gray-50 max-sm:px-2.5 dark:max-sm:bg-gray-800"
						type="button"
						class:hover:underline={!isSharedRecently}
						on:click={onShare}
						disabled={isSharedRecently}
					>
						{#if isSharedRecently}
							<CarbonCheckmark class="text-[.6rem] sm:mr-1.5 sm:text-green-600" />
							<div class="text-green-600 max-sm:hidden">Link copied to clipboard</div>
						{:else}
							<CarbonExport class="sm:text-primary-500 text-[.6rem] sm:mr-1.5" />
							<div class="max-sm:hidden">Share this conversation</div>
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
