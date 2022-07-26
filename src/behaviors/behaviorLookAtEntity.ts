import { StateBehavior, StateMachineTargets } from '../statemachine'
import { Bot } from 'mineflayer'

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity implements StateBehavior {
  private readonly bot: Bot

  readonly targets: StateMachineTargets
  stateName: string = 'lookAtEntity'
  active: boolean = false
  x?: number
  y?: number

  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
  }

  update (): void {
    const entity = this.targets.entity
    if (entity != null) {
      this.bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(err => {
        console.log(err)
      })
    }
  }

  /**
     * Gets the distance to the target entity.
     *
     * @returns The distance, or 0 if no target entity is assigned.
     */
  distanceToTarget (): number {
    const entity = this.targets.entity
    if (entity == null) return 0

    return this.bot.entity.position.distanceTo(entity.position)
  }
}
