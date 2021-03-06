import ServerCard from './ServerCard'
import CardDeck from '@shared/models/CardDeck'
import ServerGame from './ServerGame'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import ServerOwnedCard from './ServerOwnedCard'
import CardType from '@shared/enums/CardType'

export default class ServerGraveyard implements CardDeck {
	owner: ServerPlayerInGame
	unitCards: ServerCard[]
	spellCards: ServerCard[]
	game: ServerGame

	constructor(owner: ServerPlayerInGame) {
		this.game = owner.game
		this.owner = owner
		this.unitCards = []
		this.spellCards = []
	}

	public get allCards() {
		return this.unitCards.slice().concat(this.spellCards)
	}

	public addUnit(card: ServerCard): void {
		this.unitCards.push(card)
		OutgoingMessageHandlers.notifyAboutUnitCardInGraveyard(this.owner, card)
	}

	public addSpell(card: ServerCard): void {
		this.spellCards.push(card)
		OutgoingMessageHandlers.notifyAboutSpellCardInGraveyard(this.owner, card)
	}

	public findCardById(cardId: string): ServerCard | null {
		return this.unitCards.find(card => card.id === cardId) || this.spellCards.find(card => card.id === cardId) || null
	}

	public findCardsByConstructor(prototype: Function): ServerCard[] {
		const cardClass = prototype.name.substr(0, 1).toLowerCase() + prototype.name.substr(1)
		return this.unitCards.filter(card => card.class === cardClass).concat(this.spellCards.filter(card => card.class === cardClass))
	}

	public removeCard(card: ServerCard): void {
		this.unitCards = this.unitCards.filter(unitCard => unitCard !== card)
		this.spellCards = this.spellCards.filter(unitCard => unitCard !== card)

		OutgoingMessageHandlers.notifyAboutCardInGraveyardDestroyed(new ServerOwnedCard(card, this.owner))
	}
}
