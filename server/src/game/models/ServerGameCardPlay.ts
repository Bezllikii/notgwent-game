import ServerGame from './ServerGame'
import ServerOwnedCard from './ServerOwnedCard'
import ServerCardTarget from './ServerCardTarget'
import TargetMode from '../shared/enums/TargetMode'
import TargetType from '../shared/enums/TargetType'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import ServerAnimation from './ServerAnimation'
import runCardEventHandler from '../utils/runCardEventHandler'
import CardType from '../shared/enums/CardType'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import ServerCardResolveStack from './ServerCardResolveStack'

export default class ServerGameCardPlay {
	game: ServerGame
	cardResolveStack: ServerCardResolveStack

	constructor(game: ServerGame) {
		this.game = game
		this.cardResolveStack = new ServerCardResolveStack(game)
	}

	public playCard(ownedCard: ServerOwnedCard, rowIndex: number, unitIndex: number): void {
		/* Resolve card */
		this.forcedPlayCardFromHand(ownedCard, rowIndex, unitIndex)

		/* Deduct mana */
		if (ownedCard.card.cardType === CardType.UNIT) {
			ownedCard.owner.setUnitMana(ownedCard.owner.unitMana - 1)
		} else if (ownedCard.card.cardType === CardType.SPELL) {
			ownedCard.owner.setSpellMana(ownedCard.owner.spellMana - ownedCard.card.spellCost)
		}
	}

	public forcedPlayCardFromHand(ownedCard: ServerOwnedCard, rowIndex: number, unitIndex: number): void {
		this.forcedPlayCard(ownedCard, rowIndex, unitIndex, 'hand')
	}

	public forcedPlayCardFromDeck(ownedCard: ServerOwnedCard, rowIndex: number, unitIndex: number): void {
		this.forcedPlayCard(ownedCard, rowIndex, unitIndex, 'deck')
	}

	private forcedPlayCard(ownedCard: ServerOwnedCard, rowIndex: number, unitIndex: number, source: 'hand' | 'deck'): void {
		const card = ownedCard.card
		const owner = ownedCard.owner

		/* Announce card to opponent */
		card.reveal(owner, owner.opponent)
		OutgoingMessageHandlers.triggerAnimationForPlayer(owner.opponent.player, ServerAnimation.cardPlay(card))

		/* Remove card from source */
		if (source === 'hand' && owner.cardHand.findCardById(card.id)) {
			owner.cardHand.removeCard(card)
		} else if (source === 'deck' && owner.cardDeck.findCardById(card.id)) {
			owner.cardDeck.removeCard(card)
		}

		/* Resolve card */
		if (card.cardType === CardType.UNIT) {
			this.playUnit(ownedCard, rowIndex, unitIndex)
		} else if (card.cardType === CardType.SPELL) {
			this.playSpell(ownedCard)
		}

		/* Play animation */
		OutgoingMessageHandlers.triggerAnimationForPlayer(owner.opponent.player, ServerAnimation.delay())
	}

	private playUnit(ownedCard: ServerOwnedCard, rowIndex: number, unitIndex: number): void {
		const card = ownedCard.card
		const owner = ownedCard.owner

		/* Start resolving */
		this.cardResolveStack.startResolving(ownedCard)

		/* Insert the card into the board */
		const unit = this.game.board.createUnit(card, owner, rowIndex, unitIndex)

		/* Invoke the card onPlay effect */
		runCardEventHandler(() => card.onPlayedAsUnit(unit, this.game.board.rows[rowIndex]))

		/* Another card has been played and requires targeting. Continue execution later */
		if (this.cardResolveStack.currentCard !== ownedCard) {
			return
		}

		/* Require targets */
		this.checkCardTargeting(ownedCard)
	}

	private playSpell(ownedCard: ServerOwnedCard): void {
		const card = ownedCard.card
		const owner = ownedCard.owner

		/* Start resolving */
		this.cardResolveStack.startResolving(ownedCard)

		/* Invoke the card onPlay effect */
		runCardEventHandler(() => card.onPlayedAsSpell(owner))

		/* Another card has been played and requires targeting. Continue execution later */
		if (this.cardResolveStack.currentCard !== ownedCard) {
			return
		}

		this.checkCardTargeting(ownedCard)
	}

	private checkCardTargeting(ownedCard: ServerOwnedCard): void {
		let validTargets = this.getValidTargets()

		if (validTargets.length === 0) {
			this.cardResolveStack.finishResolving()
		} else {
			OutgoingMessageHandlers.notifyAboutResolvingCardTargets(ownedCard.owner.player, validTargets)
		}
	}

	public getValidTargets(): ServerCardTarget[] {
		if (!this.cardResolveStack.hasCards()) {
			return []
		}
		const currentCard = this.cardResolveStack.currentCard
		const card = currentCard.card

		const targetDefinition = card.getPostPlayRequiredTargetDefinition()
		if (targetDefinition.getTargetCount() === 0) {
			return []
		}

		const unit = this.game.board.findUnitById(card.id)
		const args = {
			thisUnit: unit,
			thisCardOwner: currentCard.owner
		}

		return []
			.concat(card.getValidTargets(TargetMode.POST_PLAY_REQUIRED_TARGET, TargetType.UNIT, targetDefinition, args, this.cardResolveStack.currentTargets))
			.concat(card.getValidTargets(TargetMode.POST_PLAY_REQUIRED_TARGET, TargetType.BOARD_ROW, targetDefinition, args, this.cardResolveStack.currentTargets))
	}

	public selectCardTarget(playerInGame: ServerPlayerInGame, target: ServerCardTarget): void {
		if (playerInGame !== this.cardResolveStack.currentCard.owner) {
			return
		}

		let validTargets = this.getValidTargets()
		const isValidTarget = !!validTargets.find(validTarget => validTarget.isEqual(target))
		if (!isValidTarget) {
			OutgoingMessageHandlers.notifyAboutResolvingCardTargets(playerInGame.player, validTargets)
			return
		}

		const sourceUnit = target.sourceUnit
		const sourceCard = target.sourceCard || sourceUnit.card

		if (sourceCard.cardType === CardType.UNIT && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetCard) {
			sourceCard.onUnitPlayTargetCardSelected(sourceUnit, target.targetCard)
		}
		if (sourceCard.cardType === CardType.UNIT && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetUnit) {
			sourceCard.onUnitPlayTargetUnitSelected(sourceUnit, target.targetUnit)
		}
		if (sourceCard.cardType === CardType.UNIT && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetRow) {
			sourceCard.onUnitPlayTargetRowSelected(sourceUnit, target.targetRow)
		}
		if (sourceCard.cardType === CardType.SPELL && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetCard) {
			sourceCard.onSpellPlayTargetCardSelected(playerInGame, target.targetCard)
		}
		if (sourceCard.cardType === CardType.SPELL && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetUnit) {
			sourceCard.onSpellPlayTargetUnitSelected(playerInGame, target.targetUnit)
		}
		if (sourceCard.cardType === CardType.SPELL && target.targetMode === TargetMode.POST_PLAY_REQUIRED_TARGET && target.targetRow) {
			sourceCard.onSpellPlayTargetRowSelected(playerInGame, target.targetRow)
		}
		this.cardResolveStack.pushTarget(target)

		validTargets = this.getValidTargets()

		if (validTargets.length > 0) {
			OutgoingMessageHandlers.notifyAboutResolvingCardTargets(playerInGame.player, validTargets)
			return
		}

		if (sourceCard.cardType === CardType.UNIT) {
			sourceCard.onUnitPlayTargetsConfirmed(sourceUnit)
		} else if (sourceCard.cardType === CardType.SPELL) {
			sourceCard.onSpellPlayTargetsConfirmed(playerInGame)
		}
		this.cardResolveStack.finishResolving()

		if (this.cardResolveStack.currentCard) {
			this.checkCardTargeting(this.cardResolveStack.currentCard)
		}
	}
}