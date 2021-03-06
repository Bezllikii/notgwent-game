import CardType from '@shared/enums/CardType'
import CardColor from '@shared/enums/CardColor'
import ServerCard from '../../../../models/ServerCard'
import ServerGame from '../../../../models/ServerGame'
import CardFaction from '@shared/enums/CardFaction'
import SpellSteelSpark from './SpellSteelSpark'
import SpellFireball from './SpellFireball'
import SpellFieryEntrance from './SpellFieryEntrance'
import SpellAnEncouragement from './SpellAnEncouragement'

export default class LeaderVelElleron extends ServerCard {
	constructor(game: ServerGame) {
		super(game, CardType.UNIT, CardColor.LEADER, CardFaction.ARCANE)
		this.basePower = 0
		this.sortPriority = 0
	}

	getDeckAddedSpellCards(): any[] {
		return [SpellSteelSpark, SpellAnEncouragement, SpellFireball, SpellFieryEntrance]
	}
}
