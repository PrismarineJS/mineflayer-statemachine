import type { Entity } from 'prismarine-entity'
import { Movements, goals } from 'mineflayer-pathfinder'
import { StateBehavior } from '../stateBehavior'

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity extends StateBehavior {
  static stateName = 'followEntity'
  movements?: Movements
  followDistance: number = 0

  onStateEntered = (): void => {
    if (!this.bot.pathfinder) throw Error('Pathfinder is not loaded!')

    const mcData = this.bot.registry
    this.movements = new Movements(this.bot, mcData)
    this.data.entity = this.bot.nearestEntity((e) => e.type === 'player') ?? undefined
    this.startMoving(this.data.entity)
  }

  onStateExited (): void {
    this.stopMoving()
    this.data.entity = undefined
  }

  isFinished (): boolean {
    const distances = this.distanceToTarget()
    return distances < 3
  }

  setFollowTarget (entity: Entity): void {
    if (this.data === entity) {
      return
    }

    this.data.entity = entity
    this.restart()
  }

  private stopMoving (): void {
    this.bot.pathfinder.stop()
  }

  private startMoving (entity?: Entity): void {
    if (entity == null) return
    if (entity === this.data.entity && this.bot.pathfinder.isMoving()) return
    const pathfinder = this.bot.pathfinder
    const goal = new goals.GoalFollow(entity, this.followDistance)
    if (this.movements != null) pathfinder.setMovements(this.movements)
    pathfinder.setGoal(goal, true)
  }

  restart (): void {
    if (!this.active) {
      return
    }

    this.stopMoving()
    this.startMoving(this.data.entity)
  }

  distanceToTarget (): number {
    if (this.data.entity == null) return Infinity
    return this.bot.entity.position.distanceTo(this.data.entity.position)
  }
}
