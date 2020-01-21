import GameTurnPhase from '@/Pixi/shared/enums/GameTurnPhase'
import Core from '@/Pixi/Core'
import OutgoingMessageHandlers from '@/Pixi/handlers/OutgoingMessageHandlers'
import UnitOrderType from '@/Pixi/shared/enums/UnitOrderType'

export default class ClientGame {
	currentTime: number
	maximumTime: number
	turnPhase: GameTurnPhase

	constructor() {
		this.currentTime = 0
		this.maximumTime = 1
		this.turnPhase = GameTurnPhase.BEFORE_GAME
	}

	public setTurnPhase(phase: GameTurnPhase): void {
		this.turnPhase = phase

		if (phase === GameTurnPhase.SKIRMISH) {
			const units = Core.board.getCardsOwnedByPlayer(Core.player).filter(unit => unit.lastOrder && unit.lastOrder.type === UnitOrderType.ATTACK)
			units.forEach(unit => {
				OutgoingMessageHandlers.sendUnitOrder(unit.lastOrder!)
			})
		}
	}
}
