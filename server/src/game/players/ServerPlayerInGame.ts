import ServerPlayer from './ServerPlayer'
import ServerGame from '../models/ServerGame'
import ServerCard from '../models/ServerCard'
import PlayerInGame from '@shared/models/PlayerInGame'
import ServerHand from '../models/ServerHand'
import ServerDeck from '../models/ServerDeck'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import ServerDamageInstance from '../models/ServerDamageSource'
import ServerGraveyard from '../models/ServerGraveyard'
import ServerTemplateCardDeck from '../models/ServerTemplateCardDeck'
import Constants from '@shared/Constants'
import runCardEventHandler from '../utils/runCardEventHandler'
import BuffTutoredCard from '../buffs/BuffTutoredCard'
import BuffDuration from '@shared/enums/BuffDuration'

export default class ServerPlayerInGame implements PlayerInGame {
	initialized = false

	game: ServerGame
	player: ServerPlayer
	cardHand: ServerHand
	cardDeck: ServerDeck
	cardGraveyard: ServerGraveyard
	morale: number
	unitMana: number
	spellMana: number
	turnEnded: boolean
	roundEnded: boolean

	constructor(game: ServerGame, player: ServerPlayer) {
		this.game = game
		this.player = player
		this.cardHand = new ServerHand(game, this, [], [])
		this.cardDeck = new ServerDeck(game, this, [], [])
		this.cardGraveyard = new ServerGraveyard(this)
		this.morale = Constants.STARTING_PLAYER_MORALE
		this.unitMana = 0
		this.spellMana = 0
		this.turnEnded = false
		this.roundEnded = false
	}

	public get targetRequired(): boolean {
		return !!this.game.cardPlay.cardResolveStack.currentCard
	}

	public get opponent(): ServerPlayerInGame {
		return this.game.getOpponent(this)
	}

	public canPlaySpell(card: ServerCard, rowIndex: number): boolean {
		const gameBoardRow = this.game.board.rows[rowIndex]
		return this.spellMana >= card.spellCost && !!card.getValidPlayTargets(this).find(playTarget => playTarget.sourceCard === card && playTarget.targetRow === gameBoardRow)
	}

	public canPlayUnit(card: ServerCard, rowIndex: number): boolean {
		const gameBoardRow = this.game.board.rows[rowIndex]
		return this.unitMana >= card.unitCost && !!card.getValidPlayTargets(this).find(playTarget => playTarget.sourceCard === card && playTarget.targetRow === gameBoardRow)
	}

	public drawUnitCards(count: number): void {
		const actualCount = Math.min(count, Constants.UNIT_HAND_SIZE_LIMIT - this.cardHand.unitCards.length)
		for (let i = 0; i < actualCount; i++) {
			const card = this.cardDeck.drawTopUnit()
			if (!card) {
				// TODO: Fatigue damage?
				continue
			}

			this.cardHand.onUnitDrawn(card)
		}
	}

	public drawSpellCards(count: number): void {
		const actualCount = Math.min(count, Constants.SPELL_HAND_SIZE_LIMIT - this.cardHand.spellCards.length)
		for (let i = 0; i < actualCount; i++) {
			const card = this.cardDeck.drawTopSpell()
			if (!card) {
				// TODO: Fatigue damage?
				continue
			}

			this.cardHand.onSpellDrawn(card)
		}
	}

	public tutorCardFromUnitDeck(card: ServerCard): void {
		card.buffs.add(new BuffTutoredCard(), card, BuffDuration.INFINITY)
		this.cardDeck.removeCard(card)
		this.cardHand.onUnitDrawn(card)
	}

	public refillSpellHand(): void {
		const cardsMissing = Constants.SPELL_HAND_SIZE_MINIMUM - this.cardHand.spellCards.length
		if (cardsMissing > 0) {
			this.drawSpellCards(cardsMissing)
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

	public setUnitMana(value: number): void {
		if (this.unitMana === value) { return }

		const delta = value - this.unitMana

		this.unitMana = value
		OutgoingMessageHandlers.notifyAboutUnitManaChange(this, delta)
		OutgoingMessageHandlers.notifyAboutValidActionsChanged(this.game, this)
	}

	public addSpellMana(value: number): void {
		this.setSpellMana(this.spellMana + value)
	}

	public setSpellMana(value: number): void {
		if (this.spellMana === value) { return }

		const delta = value - this.spellMana

		this.spellMana = value
		OutgoingMessageHandlers.notifyAboutSpellManaChange(this, delta)
	}

	public startRound(): void {
		this.roundEnded = false
		OutgoingMessageHandlers.notifyAboutRoundStarted(this)
	}

	public startTurn(): void {
		this.turnEnded = false
		this.setUnitMana(1)
		this.refillSpellHand()
		OutgoingMessageHandlers.notifyAboutTurnStarted(this)
		OutgoingMessageHandlers.notifyAboutValidActionsChanged(this.game, this)
		this.onTurnStart()
	}

	public onTurnStart(): void {
		this.game.board.getUnitsOwnedByPlayer(this).forEach(unit => {
			runCardEventHandler(() => unit.card.onTurnStarted(unit))
			unit.card.buffs.onTurnStarted()
		})
	}

	public isAnyActionsAvailable(): boolean {
		return this.unitMana > 0 || this.spellMana > 0 || !!this.game.board.getUnitsOwnedByPlayer(this).find(unit => unit.getValidOrders().length > 0) || this.targetRequired
	}

	public endTurn(): void {
		this.turnEnded = true
		OutgoingMessageHandlers.notifyAboutTurnEnded(this)
		this.onTurnEnd()
	}

	public onTurnEnd(): void {
		this.game.board.getUnitsOwnedByPlayer(this).forEach(unit => {
			runCardEventHandler(() => unit.card.onTurnEnded(unit))
			unit.card.buffs.onTurnEnded()
		})
		this.cardHand.unitCards.filter(card => card.buffs.has(BuffTutoredCard)).forEach(card => {
			this.cardHand.discardUnit(card)
		})
	}

	public endRound(): void {
		this.endTurn()

		this.game.board.getUnitsOwnedByPlayer(this).forEach(unit => {
			runCardEventHandler(() => unit.card.onRoundEnded(unit))
			unit.card.buffs.onRoundEnded()
		})

		this.roundEnded = true
		OutgoingMessageHandlers.notifyAboutRoundEnded(this)
	}

	static newInstance(game: ServerGame, player: ServerPlayer, cardDeck: ServerTemplateCardDeck) {
		const playerInGame = new ServerPlayerInGame(game, player)
		playerInGame.cardDeck.instantiateFrom(cardDeck)
		return playerInGame
	}
}
