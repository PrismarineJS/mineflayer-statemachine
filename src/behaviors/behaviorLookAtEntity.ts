import { StateBehavior } from '..'

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity extends StateBehavior {
  static stateName = 'lookAtEntity'

  update (): void {
    if (this.data.entity == null) throw Error('No target to look at')

    void this.bot.lookAt(this.data.entity.position.offset(0, this.data.entity.height, 0));
  }


  /**
   * Gets the distance to the target entity.
   *
   * @returns The distance, or 0 if no target entity is assigned.
   */
  distanceToTarget (): number {
    if (this.data.entity == null) return -1

    return this.bot.entity.position.distanceTo(this.data.entity.position)
  }
}
