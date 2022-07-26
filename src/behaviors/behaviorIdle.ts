import { StateBehavior } from '../statemachine'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle implements StateBehavior {
  stateName: string = 'idle'
  active: boolean = false
  x?: number
  y?: number
}
