import { StateBehavior } from '../stateBehavior'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle extends StateBehavior {
  static stateName = this.name
}

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorExit extends StateBehavior {
  static stateName = this.name
}
