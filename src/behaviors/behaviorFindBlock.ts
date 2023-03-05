import { StateBehavior, StateMachineTargets } from '../statemachine'
import { Bot } from 'mineflayer'
import { Block } from 'prismarine-block'

// TODO Add option to find blocks based on the distance the bot would have to move to reach it.

/**
 * This behavior will search a configurable area around the bot in order to
 * locate a block matching the given configuration. The block will be assigned
 * to targets.position.
 *
 * If no block could be found, targets.position is set to undefined.
 */
export class BehaviorFindBlock implements StateBehavior {
  readonly bot: Bot
  readonly targets: StateMachineTargets

  stateName: string = 'findBlock'
  active: boolean = false
  x?: number
  y?: number

  /**
     * The list of block ids to search for.
     */
  blocks: number[] = []

  /**
     * The maximum distance away to look for the block.
     */
  maxDistance: number = 32

  /**
     * If true, the bot will ignore blocks that could not be seen by it. Useful for encouraging
     * realistic behavior.
     */
  preventXRay: boolean = false

  /**
     * Creates a new find block behavior.
     *
     * @param bot - The bot preforming the search function.
     * @param targets - The bot targets objects.
     */
  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
  }

  onStateEntered (): void {
    this.targets.position = this.bot.findBlock({
      matching: (block: Block) => this.matchesBlock(block),
      maxDistance: this.maxDistance
    })?.position
  }

  private matchesBlock (block: Block): boolean {
    if (!this.blocks.includes(block.type)) { return false }

    if (this.preventXRay) {
      if (!this.bot.canSeeBlock(block)) { return false }
    }

    return true
  }
}
