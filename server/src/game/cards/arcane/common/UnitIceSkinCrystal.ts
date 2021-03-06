import CardType from '@shared/enums/CardType'
import ServerCard from '../../../models/ServerCard'
import ServerGame from '../../../models/ServerGame'
import CardColor from '@shared/enums/CardColor'
import CardTribe from '@shared/enums/CardTribe'
import ServerUnit from '../../../models/ServerUnit'
import ServerOwnedCard from '../../../models/ServerOwnedCard'
import BuffDecayingArmor from '../../../buffs/BuffDecayingArmor'
import CardFaction from '@shared/enums/CardFaction'
import GameEvent from '../../../models/GameEvent'
import CardLocation from '@shared/enums/CardLocation'

export default class UnitIceSkinCrystal extends ServerCard {
	charges = 0
	armorGranted = 1
	chargePerMana = 1
	chargesForArmor = 3

	constructor(game: ServerGame) {
		super(game, CardType.UNIT, CardColor.TOKEN, CardFaction.ARCANE)
		this.basePower = 4
		this.baseTribes = [CardTribe.CRYSTAL]
		this.dynamicTextVariables = {
			armorGranted: this.armorGranted,
			chargePerMana: this.chargePerMana,
			chargesForArmor: this.chargesForArmor,
			charges: () => this.charges,
			potentialArmor: () => Math.floor(this.charges / this.chargesForArmor) * this.armorGranted,
			chargesVisible: () => !!this.unit
		}

		this.createCallback(GameEvent.UNIT_DESTROYED)
			.requireLocation(CardLocation.BOARD)
			.require(({ targetUnit }) => targetUnit.card === this)
			.perform(() => this.onDestroy())
	}

	onAfterOtherCardPlayed(otherCard: ServerOwnedCard): void {
		if (otherCard.card.type === CardType.SPELL) {
			this.charges += otherCard.card.spellCost
		}
	}

	private onDestroy(): void {
		const thisUnit = this.unit
		const adjacentAllies = this.game.board.getAdjacentUnits(thisUnit).filter(unit => unit.owner === thisUnit.owner)
		adjacentAllies.forEach(unit => {
			for (let i = 0; i < Math.floor(this.charges / this.chargesForArmor) * this.armorGranted; i++) {
				unit.card.buffs.add(BuffDecayingArmor, this)
			}
		})
	}
}
