<script lang="ts">
	import { page } from "$app/stores";
	import { env as envPublic } from "$env/dynamic/public";
	import { base } from "$app/paths";

	export let classNames = "";
</script>

{#if envPublic.PUBLIC_APP_ASSETS === "chatui"}
	<svg
		fill="currentColor"
		id="logo"
		xmlns="http://www.w3.org/2000/svg"
		class="icon h-8 w-8 flex-none"
		viewBox="0 0 56.592 36.601"
	>
		<path
			id="Trazado_259"
			data-name="Trazado 259"
			d="M477.4,370.144a18.3,18.3,0,0,0-.016,30.645,18.3,18.3,0,0,0,.016-30.645Z"
			transform="translate(-449.098 -367.166)"
		/>
		<path
			id="Trazado_260"
			data-name="Trazado 260"
			d="M382.014,374.249a20.335,20.335,0,0,1,11.239-18.233c-.288-.014-.58-.021-.867-.021a18.3,18.3,0,1,0-.019,36.592c.326,0,.661-.009,1-.026A20.314,20.314,0,0,1,382.014,374.249Z"
			transform="translate(-374.081 -355.995)"
		/>
		<path
			id="Trazado_261"
			data-name="Trazado 261"
			d="M569.488,367.226a18.281,18.281,0,0,0-16.852-11.183c-.244,0-.5,0-.759.015a20.429,20.429,0,0,1-.153,36.554c.3.015.6.022.893.022a18.308,18.308,0,0,0,16.871-25.409Z"
			transform="translate(-514.33 -356.033)"
		/>
	</svg>
{:else}
	<img
		class={classNames}
		alt="{envPublic.PUBLIC_APP_NAME} logo"
		src="{envPublic.PUBLIC_ORIGIN ||
			$page.url.origin}{base}/{envPublic.PUBLIC_APP_ASSETS}/favicon.png"
	/>
{/if}
