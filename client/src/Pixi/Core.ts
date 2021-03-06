import * as PIXI from 'pixi.js'
import store from '@/Vue/store'
import Input from '@/Pixi/input/Input'
import Renderer from '@/Pixi/Renderer'
import MainHandler from '@/Pixi/MainHandler'
import ClientGame from '@/Pixi/models/ClientGame'
import RenderedCard from '@/Pixi/board/RenderedCard'
import RenderedGameBoard from '@/Pixi/board/RenderedGameBoard'
import ClientPlayerInGame from '@/Pixi/models/ClientPlayerInGame'
import IncomingMessageHandlers from '@/Pixi/handlers/IncomingMessageHandlers'
import OutgoingMessageHandlers from '@/Pixi/handlers/OutgoingMessageHandlers'
import TextureAtlas from '@/Pixi/render/TextureAtlas'
import ClientCardResolveStack from '@/Pixi/models/ClientCardResolveStack'

export default class Core {
	public static isReady = false

	public static input: Input
	public static socket: WebSocket
	public static renderer: Renderer
	public static mainHandler: MainHandler
	public static keepaliveTimer: number

	public static game: ClientGame
	public static board: RenderedGameBoard
	public static player: ClientPlayerInGame
	public static opponent: ClientPlayerInGame
	public static resolveStack: ClientCardResolveStack

	public static init(gameId: string, deckId: string, container: HTMLElement): void {
		const protocol = location.protocol === 'http:' ? 'ws:' : 'wss:'
		const socket = new WebSocket(`${protocol}//${window.location.host}/api/game/${gameId}?deckId=${deckId}`)
		socket.onopen = () => this.onConnect(container)
		socket.onmessage = (event) => this.onMessage(event)
		socket.onclose = (event) => this.onDisconnect(event)
		socket.onerror = (event) => this.onError(event)
		Core.socket = socket

		Core.player = ClientPlayerInGame.fromPlayer(store.getters.player)
	}

	private static async onConnect(container: HTMLElement): Promise<void> {
		Core.keepaliveTimer = window.setInterval(() => {
			OutgoingMessageHandlers.sendKeepalive()
		}, 30000)

		await TextureAtlas.prepare()

		Core.renderer = new Renderer(container)

		Core.game = new ClientGame()
		Core.input = new Input()
		Core.board = new RenderedGameBoard()
		Core.resolveStack = new ClientCardResolveStack()
		Core.mainHandler = MainHandler.start()

		console.info('Sending init signal to server')
		this.isReady = true
		OutgoingMessageHandlers.sendInit()
	}

	private static onMessage(event: MessageEvent): void {
		const data = JSON.parse(event.data)
		const messageType = data.type as string
		const messageData = data.data as any
		const messageHighPriority = data.highPriority as boolean

		const handler = IncomingMessageHandlers[messageType]
		if (!handler) {
			console.error('Unknown message type: ' + messageType)
			return
		}

		if (messageHighPriority) {
			try {
				handler(messageData)
			} catch (e) {
				console.error(e)
			}
			return
		}

		Core.mainHandler.registerMessage({
			handler: handler,
			data: messageData
		})
	}

	private static onDisconnect(event: CloseEvent): void {
		if (!event.wasClean) {
			console.error(`Connection closed. Reason: ${event.reason}`)
		}
		clearInterval(Core.keepaliveTimer)
		Core.input.clear()
		Core.mainHandler.stop()
		Core.renderer.destroy()
		store.dispatch.leaveGame()
	}

	private static onError(event: Event): void {
		console.error('Unknown error occurred', event)
	}

	public static registerOpponent(opponent: ClientPlayerInGame): void {
		Core.opponent = opponent
	}

	public static getPlayer(playerId: string): ClientPlayerInGame {
		if (this.player && this.player.player.id === playerId) {
			return this.player
		} else if (this.opponent && this.opponent.player.id === playerId) {
			return this.opponent
		}
		throw new Error(`Player ${playerId} does not exist!`)
	}

	public static getPlayerOrNull(playerId: string): ClientPlayerInGame | null {
		if (this.player && this.player.player.id === playerId) {
			return this.player
		} else if (this.opponent && this.opponent.player.id === playerId) {
			return this.opponent
		}
		return null
	}

	public static sendMessage(type: string, data: any): void {
		Core.socket.send(JSON.stringify({
			type: type,
			data: data
		}))
	}

	public static registerCard(renderedCard: RenderedCard): void {
		Core.renderer.registerCard(renderedCard)
	}

	public static unregisterCard(renderedCard: RenderedCard): void {
		Core.renderer.unregisterCard(renderedCard)
	}

	public static reset(): void {
		if (!this.socket) { return }
		this.socket.close()
		this.isReady = false
	}
}
