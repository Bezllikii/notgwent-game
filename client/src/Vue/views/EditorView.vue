<template>
	<div class="editor-view">
		<div class="card-library">
			<the-card-library />
		</div>
		<div class="deck-list">
			<router-view />
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue'
import store from '@/Vue/store'
import TheCardLibrary from '@/Vue/components/editor/TheCardLibrary.vue'
import TextureAtlas from '@/Pixi/render/TextureAtlas'
import { editorCardRenderer } from '@/utils/editor/EditorCardRenderer'

export default Vue.extend({
	components: { TheCardLibrary },

	computed: {

	},

	mounted(): void {
		setTimeout(() => {
			TextureAtlas.prepare()
		}, 500)
		store.dispatch.editor.loadCardLibrary()
		editorCardRenderer.startRenderingService()
	},

	beforeDestroy(): void {
		editorCardRenderer.stopRenderingService()
	},

	methods: {

	}
})
</script>

<style scoped lang="scss">
	@import "../styles/generic";

	.editor-view {
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;

		& > div {
			height: calc(100% - #{$NAVIGATION-BAR-HEIGHT});
			background: $COLOR-BACKGROUND-TRANSPARENT;
		}

		.card-library {
			flex: 3;
			margin: 0 16px 0 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
		}

		.deck-list {
			flex: 1;
			margin: 0 32px 0 16px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
		}
	}
</style>
