import CardType from '@shared/enums/CardType'
import CardColor from '@shared/enums/CardColor'
import ServerCard from '../../../../models/ServerCard'
import ServerGame from '../../../../models/ServerGame'
import CardFaction from '@shared/enums/CardFaction'
import SpellShadowSpark from './SpellShadowSpark'
import SpellNightmareDrain from './SpellNightmareDrain'
import SpellCrystalBarrage from './SpellCrystalBarrage'
import SpellShadowArmy from './SpellShadowArmy'

export default class LeaderNighterie extends ServerCard {
	constructor(game: ServerGame) {
		super(game, CardType.UNIT, CardColor.LEADER, CardFaction.ARCANE)
		this.basePower = 0
		this.sortPriority = 2
	}

	getDeckAddedSpellCards(): any[] {
		return [SpellShadowSpark, SpellNightmareDrain, SpellCrystalBarrage, SpellShadowArmy]
	}
}
