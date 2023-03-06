import { StateBehavior, StateMachineData } from '../stateBehavior'
import type { Bot } from 'mineflayer'
import type { Entity } from 'prismarine-entity'

export class BehaviorFindEntity extends StateBehavior {
  public filter: (entity: Entity) => boolean

  constructor (bot: Bot, data: StateMachineData, filter: BehaviorFindEntity['filter']) {
    super(bot, data)
    this.filter = filter
  }

  onStateEntered (): void {
    this.data.entity = this.bot.nearestEntity(this.filter) ?? undefined
  }

  foundEntity (): boolean {
    return !(this.data.entity == null)
  }
}
