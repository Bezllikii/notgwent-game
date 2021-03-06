<template>
	<div id="app" :class="rootClass" >
		<div id="app-background" />
		<div id="content">
			<the-navigation-bar v-if="!isInGame" />
			<router-view class="view" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/Vue/store'
import TheNavigationBar from '@/Vue/components/navigationbar/TheNavigationBar.vue'

export default {
	components: { TheNavigationBar },

	mounted() {
		store.dispatch.userPreferencesModule.fetchPreferences()
	},

	computed: {
		isInGame(): boolean {
			return store.getters.gameStateModule.isInGame
		},
		rootClass() {
			return {
				'in-game': this.isInGame as boolean,
				'navigation-bar-visible': !this.isInGame as boolean
			}
		}
	}
}
</script>

<style lang="scss">
@import "styles/generic";
@import '~vuejs-noty/dist/vuejs-noty.css';

body {
	background: #121212;
	padding: 0;
	margin: 0;
	overflow: hidden;
}

*::-webkit-scrollbar {
	width: 10px;
}

*::-webkit-scrollbar-thumb {
	background: #666;
	border-radius: 20px;
}

*::-webkit-scrollbar-track {
	background: #ffffff20;
	border-radius: 20px;
}

#app {
	font-family: Roboto, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: $COLOR-TEXT;
	height: 100vh;
	padding: 0;
	overflow-y: auto;

	#content {
		position: absolute;
		width: 100%;
		height: 100%;

		&.in-game {
			overflow-y: hidden;
		}

		&.navigation-bar-visible {
			padding-top: 48px;
			height: calc(100vh - 48px);
		}

		.view {
			height: 100%;
		}

		a {
			color: $COLOR-SECONDARY;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}

			&.router-link-exact-active {
				color: #42b983;
			}
		}
	}

	#app-background {
		position: absolute;
		width: 100%;
		height: 100%;
		background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('./assets/background-menu.jpg');
		background-size: cover;
		filter: blur(8px);
	}
}

.button-link {
	font-size: 1.4em;
	padding: 16px 8px;
	width: calc(100% - 16px);
	cursor: pointer;
	user-select: none;
	&:hover {
		background: $COLOR-BACKGROUND-TRANSPARENT;
	}
}

button {
	cursor: pointer;
}

button.primary, .swal-button, .button-primary {
	border-radius: 0.25em;
	width: 100%;
	padding: 0.5em 1em;
	margin: 0.25em 0;
	font-family: Roboto, sans-serif;
	font-size: 1em;
	color: $COLOR-TEXT;
	background-color: $COLOR-PRIMARY;
	border: 1px solid $COLOR-PRIMARY;
	outline: none;

	&.destructive {
		color: lighten(red, 15);
		&:hover {
			color: lighten(red, 10);
		}
		&:active {
			color: lighten(red, 5);
		}
	}

	&:hover {
		color: darken($COLOR-TEXT, 5);
		border-color: darken($COLOR-PRIMARY, 5);
		background-color: darken($COLOR-PRIMARY, 5);
	}

	&:active {
		color: darken($COLOR-TEXT, 10);
		border-color: darken($COLOR-PRIMARY, 10);
		background-color: darken($COLOR-PRIMARY, 10);
	}
}

button.secondary, .button-secondary {
	border-radius: 0.25em;
	width: 100%;
	padding: 0.5em 1em;
	margin: 0.25em 0;
	font-family: Roboto, sans-serif;
	font-size: 1em;
	color: $COLOR-TEXT;
	background-color: transparent;
	border: 1px solid $COLOR-TEXT;
	outline: none;

	&.destructive {
		color: lighten(red, 15);
		&:hover {
			color: lighten(red, 10);
		}
		&:active {
			color: lighten(red, 5);
		}
	}

	&:hover {
		background-color: rgba(white, 0.05);
	}

	&:active {
		background-color: rgba(white, 0.1) !important;
	}
}

input[type="text"], input[type="password"] {
	font-family: Roboto, sans-serif;
	color: $COLOR-TEXT;
	outline: none;
	width: calc(100% - 16px);
	height: 2em;
	margin: 4px 0;
	padding: 4px 8px;
	border: none;
	border-radius: 4px;
	background: rgba(white, 0.1);
}

span.info-text {
	font-size: 0.8em;
	color: gray;
}

.noty_body {
	font-family: 'Roboto', sans-serif;
	font-size: 1.0em !important;
}

.noty_bar {
	box-shadow: black 0 0 4px 4px;
}

.noty_type__info > .noty_body {
	background: #323232;
}

.noty_type__success > .noty_body {
	background: darkgreen;
}

.noty_type__warning > .noty_body {
	background: darken(darkorange, 10);
}

.noty_type__error > .noty_body {
	background: darkred;
}

.noty_progressbar {
	opacity: 0.75 !important;
	background-color: white !important;
	top: 0;
}

.noty_theme__mint {
	border-bottom: none !important;
}
</style>
