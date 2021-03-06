import ServerGame from '../models/ServerGame'
import ServerPlayer from '../players/ServerPlayer'
import OutgoingMessageHandlers from '../handlers/OutgoingMessageHandlers'
import {colorize, colorizeConsoleText, colorizeId, colorizePlayer} from '../../utils/Utils'
import AsciiColor from '../../enums/AsciiColor'

class GameLibrary {
	games: ServerGame[]

	constructor() {
		this.games = []
	}

	public createOwnedGame(owner: ServerPlayer, name: string): ServerGame {
		const game = ServerGame.newOwnedInstance(owner, name)
		console.info(`Player ${colorizePlayer(owner.username)} created game ${colorizeId(game.id)}`)

		this.games.push(game)
		return game
	}

	public destroyGame(game: ServerGame, reason: string): void {
		console.info(`Destroying game ${colorizeId(game.id)}. Reason: ${colorizeConsoleText(reason)}`)

		game.players.forEach(playerInGame => OutgoingMessageHandlers.notifyAboutGameShutdown(playerInGame.player))
		this.games.splice(this.games.indexOf(game), 1)
	}

	public destroyOwnedGame(id: string, player: ServerPlayer, reason: string): void {
		if (!id) { throw 'Missing game ID' }

		const game = this.games.find(game => game.id === id)
		if (!game || game.owner.id !== player.id) { throw 'Invalid game ID' }

		this.destroyGame(game, reason)
	}
}

export default new GameLibrary()
