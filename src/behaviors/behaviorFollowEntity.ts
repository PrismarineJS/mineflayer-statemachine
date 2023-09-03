import { StateBehavior, StateMachineTargets } from '../statemachine'
import { Bot } from 'mineflayer'
import { Entity } from 'prismarine-entity'
import { Movements, goals } from 'mineflayer-pathfinder'

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity implements StateBehavior {
  readonly bot: Bot
  readonly targets: StateMachineTargets
  movements: Movements

  stateName: string = 'followEntity'
  active: boolean = false
  x?: number
  y?: number

  /**
     * How close to the entity should the bot attempt to get?
     */
  followDistance: number = 0

  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
    this.movements = new Movements(this.bot)
  }

  onStateEntered (): void {
    this.startMoving()
  }

  onStateExited (): void {
    this.stopMoving()
  }

  /**
     * Sets the target entity this bot should follow. If the bot
     * is currently following another entity, it will stop following
     * that entity and follow this entity instead.
     *
     * If the bot is not currently in this behavior state, the entity
     * will still be assigned as the target entity when this state is
     * entered.
     *
     * Calling this method will update the targets object.
     *
     * @param entity - The entity to follow.
     */
  setFollowTarget (entity: Entity): void {
    if (this.targets.entity === entity) { return }

    this.targets.entity = entity
    this.restart()
  }

  /**
     * Cancels the current path finding operation.
     */
  private stopMoving (): void {
    const pathfinder = this.bot.pathfinder
    pathfinder.setGoal(null)
  }

  /**
     * Starts a new path finding operation.
     */
  private startMoving (): void {
    const entity = this.targets.entity
    if (entity == null) return

    const pathfinder = this.bot.pathfinder

    const goal = new goals.GoalFollow(entity, this.followDistance)
    pathfinder.setMovements(this.movements)
    pathfinder.setGoal(goal, true)
  }

  /**
     * Stops and restarts this movement behavior. Does nothing if
     * this behavior is not active.
     *
     * Useful if the target entity is updated while this behavior
     * is still active.
     */
  restart (): void {
    if (!this.active) { return }

    this.stopMoving()
    this.startMoving()
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
