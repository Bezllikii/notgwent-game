import Core from '@/Pixi/Core'
import store from '@/Vue/store'
import Player from '@shared/models/Player'
import PlayerInGame from '@shared/models/PlayerInGame'
import RenderedCardHand from '@/Pixi/models/RenderedCardHand'
import PlayerInGameMessage from '@shared/models/network/PlayerInGameMessage'
import ClientCardDeck from '@/Pixi/models/ClientCardDeck'
import ClientCardGraveyard from '@/Pixi/models/ClientCardGraveyard'
import Card from '@shared/models/Card'

export default class ClientPlayerInGame implements PlayerInGame {
	player: Player
	leader: Card
	cardHand: RenderedCardHand
	cardDeck: ClientCardDeck
	cardGraveyard: ClientCardGraveyard

	morale = 0
	unitMana = 0
	spellMana = 0
	isTurnActive = false

	constructor(player: Player) {
		this.player = player
		this.cardHand = new RenderedCardHand([], [])
		this.cardDeck = new ClientCardDeck([], [])
		this.cardGraveyard = new ClientCardGraveyard()
	}

	public setUnitMana(value: number): void {
		this.unitMana = value
		if (this === Core.player) {
			store.commit.gameStateModule.setPlayerUnitMana(value)
		}
	}

	public setSpellMana(value: number): void {
		this.spellMana = value
	}

	public startTurn(): void {
		this.isTurnActive = true
		if (this === Core.player) {
			store.commit.gameStateModule.setIsPlayersTurn(true)
		}
	}

	public endTurn(): void {
		this.isTurnActive = false
		if (this === Core.player) {
			store.commit.gameStateModule.setIsPlayersTurn(false)
		}
	}

	public static fromPlayer(player: Player): ClientPlayerInGame {
		return new ClientPlayerInGame(player)
	}

	public static fromMessage(message: PlayerInGameMessage): ClientPlayerInGame {
		const player = Player.fromPlayerMessage(message.player)
		const clientPlayerInGame = new ClientPlayerInGame(player)
		clientPlayerInGame.cardHand = RenderedCardHand.fromMessage(message.cardHand)
		clientPlayerInGame.cardDeck = ClientCardDeck.fromMessage(message.cardDeck)
		clientPlayerInGame.morale = message.morale
		clientPlayerInGame.unitMana = message.unitMana
		return clientPlayerInGame
	}
}
