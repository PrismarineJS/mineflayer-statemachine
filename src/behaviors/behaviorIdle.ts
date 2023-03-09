import { StateBehavior } from '../stateBehavior'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle extends StateBehavior {}

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorExit extends StateBehavior {}

/**
 * Wildcard used internally. Use this to check against all other states.
 */
export class BehaviorWildcard extends StateBehavior {}
