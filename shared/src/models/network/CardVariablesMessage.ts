import Card from '../Card'
import RichTextVariables from '../RichTextVariables'

export default class CardVariablesMessage {
	cardId: string
	cardVariables: RichTextVariables

	constructor(card: Card, cardVariables: RichTextVariables) {
		this.cardId = card.id
		this.cardVariables = cardVariables
	}
}
