import { StateBehavior, StateMachineTargets } from '../statemachine'
import { globalSettings } from '../index'
import { Bot } from 'mineflayer'
import { Item } from 'prismarine-item'
import { Block } from 'prismarine-block'

/**
 * This behavior will attempt to break the target block. If the target block
 * could not be mined for any reason, this behavior fails silently.
 */
export class BehaviorMineBlock implements StateBehavior {
  readonly bot: Bot
  readonly targets: StateMachineTargets

  stateName: string = 'mineBlock'
  active: boolean = false
  x?: number
  y?: number

  /**
     * Checks if the bot has finished mining the block or not.
     */
  isFinished: boolean = false

  /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
  }

  onStateEntered (): void {
    this.isFinished = false

    if (this.targets.position == null) {
      this.isFinished = true
      return
    }

    const block = this.bot.blockAt(this.targets.position)
    if (block == null || !this.bot.canDigBlock(block)) {
      if (globalSettings.debugMode) {
        console.log(`[MineBlock] Cannot mine target block '${block?.displayName ?? 'undefined'}'!. Skipping.`)
      }

      this.isFinished = true
      return
    }

    if (globalSettings.debugMode) {
      console.log(`[MineBlock] Breaking block '${block.displayName}' at ${this.targets.position.toString()}`)
    }

    const tool = this.getBestTool(block)
    if (tool != null) {
      this.bot.equip(tool, 'hand').then(() => {
        this.bot.dig(block).then(() => {
          this.isFinished = true
        }).catch(err => {
          console.log(err)
        })
      }).catch(err => {
        console.log(err)
      })
    } else {
      this.bot.dig(block).then(() => {
        this.isFinished = true
      }).catch(err => {
        console.log(err)
      })
    }
  }

  private getBestTool (block: Block): Item | undefined {
    const items = this.bot.inventory.items()
    for (const i in block.harvestTools) {
      const id = parseInt(i, 10)
      for (const item of items) {
        if (item.type === id) {
          // Ready select
          if (this.bot.heldItem != null && this.bot.heldItem.type === item.type) {
            return undefined
          }

          return item
        }
      }
    }

    return undefined
  }
}
