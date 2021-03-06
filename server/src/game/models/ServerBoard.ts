import ServerGame from './ServerGame'
import Constants from '@shared/Constants'
import ServerUnit from './ServerUnit'
import Board from '@shared/models/Board'
import ServerBoardRow from './ServerBoardRow'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import ServerPlayerInGame from '../players/ServerPlayerInGame'
import ServerBoardOrders from './ServerBoardOrders'
import ServerCard from './ServerCard'
import Utils from '../../utils/Utils'
import MoveDirection from '@shared/enums/MoveDirection'
import GameEvent, {UnitPlayedEventArgs} from './GameEvent'

export default class ServerBoard extends Board {
	readonly game: ServerGame
	readonly rows: ServerBoardRow[]
	readonly orders: ServerBoardOrders

	constructor(game: ServerGame) {
		super()
		this.game = game
		this.rows = []
		this.orders = new ServerBoardOrders(game)
		for (let i = 0; i < Constants.GAME_BOARD_ROW_COUNT; i++) {
			this.rows.push(new ServerBoardRow(game, i))
		}
	}

	public findUnitById(cardId: string): ServerUnit | null {
		const cards = Utils.flat(this.rows.map(row => row.cards))
		return cards.find(cardOnBoard => cardOnBoard.card.id === cardId) || null
	}

	public getRowWithUnit(targetUnit: ServerUnit): ServerBoardRow | null {
		return this.rows.find(row => !!row.cards.find(unit => unit.card.id === targetUnit.card.id)) || null
	}

	public getAdjacentRows(targetRow: ServerBoardRow): ServerBoardRow[] {
		const adjacentRows = []
		if (targetRow.index > 0) { adjacentRows.push(this.game.board.rows[targetRow.index - 1]) }
		if (targetRow.index < Constants.GAME_BOARD_ROW_COUNT - 1) { adjacentRows.push(this.game.board.rows[targetRow.index + 1]) }
		return adjacentRows
	}

	public getTotalPlayerPower(playerInGame: ServerPlayerInGame): number {
		return this.getUnitsOwnedByPlayer(playerInGame).map(unit => unit.card.power).reduce((total, value) => total + value, 0)
	}

	public getHorizontalUnitDistance(first: ServerUnit, second: ServerUnit): number {
		const firstOffsetFromCenter = first.unitIndex - ((this.rows[first.rowIndex].cards.length - 1) / 2)
		const secondOffsetFromCenter = second.unitIndex - ((this.rows[second.rowIndex].cards.length - 1) / 2)
		return Math.abs(firstOffsetFromCenter - secondOffsetFromCenter)
	}

	public getVerticalUnitDistance(firstUnit: ServerUnit, secondUnit: ServerUnit): number {
		const firstUnitRowIndex = firstUnit.rowIndex
		const secondUnitRowIndex = secondUnit.rowIndex
		const smallIndex = Math.min(firstUnitRowIndex, secondUnitRowIndex)
		const largeIndex = Math.max(firstUnitRowIndex, secondUnitRowIndex)
		if (smallIndex === largeIndex) {
			return 0
		}

		const obstacleRows = []
		for (let i = smallIndex + 1; i < largeIndex; i++) {
			const row = this.rows[i]
			if (row.cards.length > 0) {
				obstacleRows.push(row)
			}
		}

		return obstacleRows.length + 1
	}

	public getAllUnits(): ServerUnit[] {
		return Utils.flat(this.rows.map(row => row.cards))
	}

	public isUnitAdjacent(first: ServerUnit, second: ServerUnit) {
		return this.getHorizontalUnitDistance(first, second) <= 1 && Math.abs(first.rowIndex - second.rowIndex) <= 1 && first !== second
	}

	public getAdjacentUnits(centerUnit: ServerUnit) {
		return this.getAllUnits().filter(unit => this.isUnitAdjacent(centerUnit, unit))
	}

	public getUnitsOwnedByPlayer(owner: ServerPlayerInGame) {
		return this.getAllUnits().filter(unit => unit.owner === owner)
	}

	public getUnitsOwnedByOpponent(thisPlayer: ServerPlayerInGame) {
		return this.getUnitsOwnedByPlayer(this.game.getOpponent(thisPlayer))
	}

	public getMoveDirection(player: ServerPlayerInGame, from: ServerBoardRow, to: ServerBoardRow): MoveDirection {
		let direction = from.index - to.index
		if (player.isInvertedBoard()) {
			direction *= -1
		}
		if (direction > 0) return MoveDirection.FORWARD
		if (direction === 0) return MoveDirection.SIDE
		if (direction < 0) return MoveDirection.BACK
	}

	public rowMove(player: ServerPlayerInGame, fromRowIndex: number, direction: MoveDirection, distance: number): number {
		if (direction === MoveDirection.SIDE) {
			return fromRowIndex
		}

		let scalar = 1
		if (direction === MoveDirection.BACK) {
			scalar *= -1
		}
		if (!player.isInvertedBoard()) {
			scalar *= -1
		}

		return Math.max(0, Math.min(fromRowIndex + distance * scalar, Constants.GAME_BOARD_ROW_COUNT - 1))
	}

	public getDistanceToFront(rowIndex: number): number {
		const targetRow = this.rows[rowIndex]
		const player = targetRow.owner
		let playerRows = this.rows.filter(row => row.owner === player)
		if (player.isInvertedBoard()) {
			playerRows = playerRows.reverse()
		}
		return playerRows.indexOf(targetRow)
	}

	public getRowWithDistanceToFront(player: ServerPlayerInGame, distance: number): ServerBoardRow {
		let playerRows = this.rows.filter(row => row.owner === player)
		if (player.isInvertedBoard()) {
			playerRows = playerRows.reverse()
		}
		return playerRows[Math.min(playerRows.length - 1, distance)]
	}

	public createUnit(card: ServerCard, owner: ServerPlayerInGame, rowIndex: number, unitIndex: number): ServerUnit {
		const targetRow = this.rows[rowIndex]
		if (targetRow.cards.length >= Constants.MAX_CARDS_PER_ROW) {
			return
		}

		const unit = new ServerUnit(this.game, card, owner)
		targetRow.insertUnit(unit, unitIndex)

		this.game.players.forEach(playerInGame => {
			OutgoingMessageHandlers.notifyAboutUnitCreated(playerInGame.player, unit, rowIndex, unitIndex)
		})

		this.game.events.postEvent<UnitPlayedEventArgs>(GameEvent.UNIT_PLAYED, {
			playedUnit: unit
		})
		return unit
	}

	public moveUnit(unit: ServerUnit, rowIndex: number, unitIndex: number): void {
		if (unit.rowIndex === rowIndex && unit.unitIndex === unitIndex) {
			return
		}

		const currentRow = this.rows[unit.rowIndex]
		const targetRow = this.rows[rowIndex]

		if (targetRow.cards.length >= Constants.MAX_CARDS_PER_ROW) {
			return
		}

		currentRow.removeUnit(unit)
		targetRow.insertUnit(unit, unitIndex)
		this.game.players.forEach(playerInGame => {
			OutgoingMessageHandlers.notifyAboutUnitMoved(playerInGame.player, unit, rowIndex, unitIndex)
		})
	}

	public moveUnitToFarLeft(unit: ServerUnit, rowIndex: number): void {
		return this.moveUnit(unit, rowIndex, 0)
	}

	public moveUnitToFarRight(unit: ServerUnit, rowIndex: number): void {
		return this.moveUnit(unit, rowIndex, this.rows[rowIndex].cards.length)
	}

	public destroyUnit(unit: ServerUnit): void {
		const rowWithCard = this.getRowWithUnit(unit)
		if (!rowWithCard) {
			console.error(`No row includes unit ${unit.card.id}`)
			return
		}

		rowWithCard.destroyUnit(unit)
	}
}
