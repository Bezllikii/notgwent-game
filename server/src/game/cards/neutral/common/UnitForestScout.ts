import CardType from '@shared/enums/CardType'
import ServerCard from '../../../models/ServerCard'
import ServerGame from '../../../models/ServerGame'
import CardColor from '@shared/enums/CardColor'
import CardTribe from '@shared/enums/CardTribe'
import CardFaction from '@shared/enums/CardFaction'
import GameEvent from '../../../models/GameEvent'

export default class UnitForestScout extends ServerCard {
	boardPowerBonus = 7
	moralePowerBonus = 3

	constructor(game: ServerGame) {
		super(game, CardType.UNIT, CardColor.BRONZE, CardFaction.NEUTRAL)
		this.basePower = 4
		this.baseTribes = [CardTribe.HUMAN]
		this.dynamicTextVariables = {
			boardPowerBonus: this.boardPowerBonus,
			moralePowerBonus: this.moralePowerBonus
		}

		this.createCallback(GameEvent.EFFECT_UNIT_DEPLOY)
			.perform(() => this.onDeploy())
	}

	onDeploy() {
		const unit = this.unit
		const owner = unit.owner
		const ownPower = this.game.board.getTotalPlayerPower(owner)
		const opponentsPower = this.game.board.getTotalPlayerPower(owner.opponent)
		if (ownPower < opponentsPower) {
			unit.addPower(this.boardPowerBonus)
		}
		if (owner.morale < owner.opponent.morale) {
			unit.addPower(this.moralePowerBonus)
		}
	}
}
