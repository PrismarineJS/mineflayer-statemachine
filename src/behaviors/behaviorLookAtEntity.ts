import { StateBehavior } from '..'

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity extends StateBehavior {
  static stateName = 'lookAtEntity'

  onStateEntered (): void {
    console.trace('here')
  }

  update (): void {
    this.data.entity = this.bot.nearestEntity((e) => e.type === 'player') ?? undefined
    const entity = this.data.entity
    if (entity != null) {
      void this.bot.lookAt(entity.position.offset(0, entity.height, 0))
    }
  }

  /**
   * Gets the distance to the target entity.
   *
   * @returns The distance, or 0 if no target entity is assigned.
   */
  distanceToTarget (): number {
    if (this.data.entity == null) return 0

    return this.bot.entity.position.distanceTo(this.data.entity.position)
  }
}
