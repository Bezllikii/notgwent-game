import CardType from '../shared/enums/CardType'
import ServerGame from '../models/ServerGame'
import GameTurnPhase from '../shared/enums/GameTurnPhase'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import CardPlayedMessage from '../shared/models/network/CardPlayedMessage'
import AttackOrderMessage from '../shared/models/network/AttackOrderMessage'
import ConnectionEstablishedHandler from './ConnectionEstablishedHandler'
import MoveOrderMessage from '../shared/models/network/MoveOrderMessage'
import ServerUnitOrder from '../models/ServerUnitOrder'

export default {
	'post/chat': (data: string, game: ServerGame, playerInGame: ServerPlayerInGame) => {
		game.createChatEntry(playerInGame.player, data)
	},

	'post/playCard': (data: CardPlayedMessage, game: ServerGame, player: ServerPlayerInGame) => {
		const card = player.cardHand.findCardById(data.id)
		if (game.turnPhase !== GameTurnPhase.DEPLOY || !card || !player.canPlayCard(card, data.rowIndex, data.unitIndex)) {
			return
		}

		if (card.cardType === CardType.SPELL) {
			player.playSpell(card)
		} else if (card.cardType === CardType.UNIT) {
			player.playUnit(card, data.rowIndex, data.unitIndex)
		}

		if (game.isDeployPhaseFinished()) {
			game.advancePhase()
			if (game.isSkirmishPhaseFinished()) {
				game.advancePhase()
			}
		}
	},

	'post/attackOrder': (data: AttackOrderMessage, game: ServerGame, player: ServerPlayerInGame) => {
		const card = game.board.findCardById(data.attackerId)
		const target = game.board.findCardById(data.targetId)
		if (game.turnPhase !== GameTurnPhase.SKIRMISH || !card || !target || card.owner !== player || !card.canAttackTarget(target)) {
			return
		}

		game.board.queueUnitOrder(ServerUnitOrder.attack(card, target))
	},

	'post/moveOrder': (data: MoveOrderMessage, game: ServerGame, player: ServerPlayerInGame) => {
		const unit = game.board.findCardById(data.unitId)
		const target = game.board.rows[data.targetRowIndex]
		if (game.turnPhase !== GameTurnPhase.SKIRMISH || !unit || !target || unit.owner !== player || !unit.canMoveToRow(target)) {
			return
		}

		game.board.queueUnitOrder(ServerUnitOrder.move(unit, target))
	},

	'post/endTurn': (data: void, game: ServerGame, player: ServerPlayerInGame) => {
		player.endTurn()

		if ((game.turnPhase === GameTurnPhase.DEPLOY && game.isDeployPhaseFinished()) || (game.turnPhase === GameTurnPhase.SKIRMISH && game.isSkirmishPhaseFinished())) {
			game.advancePhase()
		}
	},

	'system/init': (data: void, game: ServerGame, player: ServerPlayerInGame) => {
		player.initialized = true
		ConnectionEstablishedHandler.onPlayerConnected(game, player)
	},

	'system/keepalive': (data: void, game: ServerGame, player: ServerPlayerInGame) => {
		// No action needed
	}
}