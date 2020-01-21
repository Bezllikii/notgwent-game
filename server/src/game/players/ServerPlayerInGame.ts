import ServerPlayer from './ServerPlayer'
import ServerGame from '../models/ServerGame'
import ServerCard from '../models/ServerCard'
import PlayerInGame from '../shared/models/PlayerInGame'
import ServerCardHand from '../models/ServerCardHand'
import ServerCardDeck from '../models/ServerCardDeck'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import runCardEventHandler from '../utils/runCardEventHandler'
import ServerDamageInstance from '../models/ServerDamageSource'
import Ruleset from '../Ruleset'

export default class ServerPlayerInGame extends PlayerInGame {
	initialized = false

	game: ServerGame
	player: ServerPlayer
	cardHand: ServerCardHand
	cardDeck: ServerCardDeck
	morale: number
	timeUnits: number
	turnEnded: boolean

	constructor(game: ServerGame, player: ServerPlayer, cardDeck: ServerCardDeck) {
		super(player)
		this.game = game
		this.player = player
		this.cardHand = new ServerCardHand(this.player, [])
		this.cardDeck = cardDeck
		this.morale = Ruleset.STARTING_PLAYER_MORALE
		this.timeUnits = 0
		this.turnEnded = false
	}

	public canPlayCard(card: ServerCard, rowIndex: number, unitIndex: number): boolean {
		const gameBoardRow = this.game.board.rows[rowIndex]
		if (gameBoardRow.cards.length >= Ruleset.MAX_CARDS_PER_ROW || gameBoardRow.owner !== this) {
			return false
		}

		return this.timeUnits > 0
	}

	public playUnit(card: ServerCard, rowIndex: number, unitIndex: number): void {
		const gameBoardRow = this.game.board.rows[rowIndex]

		/* Remove card from hand */
		this.cardHand.removeCard(card)

		/* Insert the card into the board */
		gameBoardRow.playCard(card, this, unitIndex)

		/* Advance the time */
		this.setTimeUnits(this.timeUnits - 1)

		/* Send notifications */
		const opponent = this.game.getOpponent(this)
		OutgoingMessageHandlers.notifyAboutPlayerCardDestroyed(this.player, card)
		OutgoingMessageHandlers.notifyAboutOpponentCardDestroyed(opponent.player, card)
	}

	public playSpell(card: ServerCard): void {
		/* Remove card from hand */
		this.cardHand.removeCard(card)

		/* Invoke the card onPlay effect */
		runCardEventHandler(() => card.onPlaySpell(this))

		/* Advance the time */
		this.setTimeUnits(this.timeUnits - 1)

		/* Send notifications */
		const opponent = this.game.getOpponent(this)
		OutgoingMessageHandlers.notifyAboutPlayerCardDestroyed(this.player, card)
		OutgoingMessageHandlers.notifyAboutOpponentCardDestroyed(opponent.player, card)
	}

	public drawCards(count: number): void {
		const actualCount = Math.min(count, Ruleset.HAND_SIZE_LIMIT - this.cardHand.cards.length)
		const cards: ServerCard[] = []
		for (let i = 0; i < actualCount; i++) {
			const card = this.cardDeck.drawCard()
			if (!card) {
				// TODO: Fatigue damage?
				continue
			}

			this.cardHand.drawCard(card)
			cards.push(card)
		}

		OutgoingMessageHandlers.notifyAboutCardsDrawn(this.player, cards)
		const opponent = this.game.getOpponent(this)
		if (opponent) {
			OutgoingMessageHandlers.notifyAboutOpponentCardsDrawn(opponent.player, cards)
		}
	}

	public dealMoraleDamage(damage: ServerDamageInstance): void {
		this.setMorale(this.morale - damage.value)
	}

	public setMorale(morale: number): void {
		this.morale = morale
		const opponent = this.game.getOpponent(this)
		OutgoingMessageHandlers.notifyAboutPlayerMoraleChange(this.player, this)
		OutgoingMessageHandlers.notifyAboutOpponentMoraleChange(opponent.player, this)
	}

	public setTimeUnits(timeUnits: number): void {
		if (this.timeUnits === timeUnits) { return }

		this.timeUnits = timeUnits
		const opponent = this.game.getOpponent(this)
		OutgoingMessageHandlers.notifyAboutPlayerTimeBankChange(this.player, this)
		OutgoingMessageHandlers.notifyAboutOpponentTimeBankChange(opponent.player, this)
		if (timeUnits === 0) {
			this.endTurn()
		}
	}

	public startTurn(): void {
		this.turnEnded = false
		OutgoingMessageHandlers.notifyAboutTurnStarted(this.player)
		const opponent = this.game.getOpponent(this)
		if (opponent) {
			OutgoingMessageHandlers.notifyAboutOpponentTurnStarted(opponent.player)
		}
	}

	public endTurn(): void {
		this.turnEnded = true

		OutgoingMessageHandlers.notifyAboutTurnEnded(this.player)
		const opponent = this.game.getOpponent(this)
		if (opponent) {
			OutgoingMessageHandlers.notifyAboutOpponentTurnEnded(opponent.player)
		}
	}

	static newInstance(game: ServerGame, player: ServerPlayer, cardDeck: ServerCardDeck) {
		return new ServerPlayerInGame(game, player, cardDeck)
	}
}
