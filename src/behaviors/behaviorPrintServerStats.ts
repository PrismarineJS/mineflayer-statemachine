import { Bot } from 'mineflayer'
import { StateBehavior } from '../statemachine'

/**
 * A simple state which represents a bot that is waiting to
 * finish logging in.
 */
export class BehaviorPrintServerStats implements StateBehavior {
  private readonly bot: Bot

  stateName: string = 'printServerStats'
  active: boolean = false
  x?: number
  y?: number

  /**
     * Creates a new login behavior state.
     *
     * @param bot - The bot this behavior is acting on.
     */
  constructor (bot: Bot) {
    this.bot = bot
  }

  onStateEntered (): void {
    this.logStats()
  }

  /**
     * Logs debug information about the server when first connecting to
     * the server.
     */
  private logStats (): void {
    console.log('Joined server.')
    console.log(`Username: ${this.bot.username}`)
    console.log(`Game Mode: ${this.bot.game.gameMode}`)
    console.log(`World: ${this.bot.game.dimension}`)
    console.log(`Difficulty: ${this.bot.game.difficulty}`)
    console.log(`Version: ${this.bot.version}`)

    const playerNames = Object.keys(this.bot.players)
    console.log(`Online Players: ${playerNames.length}`)

    for (const playerName of playerNames) { console.log(`  - ${playerName}`) }
  }
}
