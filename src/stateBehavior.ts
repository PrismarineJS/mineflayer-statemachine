import type { Bot, Player } from 'mineflayer'
import type { Entity } from 'prismarine-entity'
import type { Item } from 'prismarine-item'
import type { Vec3 } from 'vec3'

/**
 * A collection of targets which the bot is currently
 * storing in memory. These are primarily used to allow
 * states to communicate with each other more effectively.
 */
export interface StateMachineData {
  entity?: Entity
  position?: Vec3
  item?: Item
  player?: Player
  blockFace?: Vec3

  entities?: Entity[]
  positions?: Vec3[]
  items?: Item[]
  players?: Player[]
}

export class StateBehavior {
  static readonly stateName: string = this.name

  /**
   * Bot the state is related to.
   */
  readonly bot: Bot

  /**
   * Data instance.
   */
  readonly data: StateMachineData

  /**
   * Gets whether or not this state is currently active.
   */
  active: boolean = false

  /**
   * Called when the bot enters this behavior state.
   */
  onStateEntered? (): void {}

  /**
   * Called each tick to update this behavior.
   */
  update? (): void {}

  /**
   * Called when the bot leaves this behavior state.
   */
  onStateExited? (): void {}

  /**
   * Called if the behavior is anonymous per tick, checks if task is complete.
   */
  isFinished (): boolean {
    return false
  }

  constructor (bot: Bot, data: StateMachineData) {
    this.bot = bot
    this.data = data
  }
}

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionParameters<Parent extends typeof StateBehavior> {
  parent: Parent
  child: typeof StateBehavior
  name?: string
  additionalArguments?: any[]
  shouldTransition?: (data: StateMachineData, state: Parent['prototype']) => boolean
  onTransition?: (data: StateMachineData) => void
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition<Parent extends typeof StateBehavior = typeof StateBehavior> {
  readonly parentState: Parent
  readonly childState: typeof StateBehavior
  readonly additionalArguments?: any[]
  private triggerState: boolean = false
  shouldTransition: (data: StateMachineData, state: Parent['prototype']) => boolean
  onTransition: (data: StateMachineData, state: Parent['prototype']) => void
  transitionName?: string

  constructor ({
    parent,
    child,
    name,
    additionalArguments,
    shouldTransition = (data) => false,
    onTransition = (data) => {}
  }: StateTransitionParameters<Parent>) {
    this.parentState = parent
    this.childState = child
    this.shouldTransition = shouldTransition
    this.onTransition = onTransition
    this.transitionName = name
    this.additionalArguments = additionalArguments
  }

  trigger (): void {
    this.triggerState = true
  }

  isTriggered (): boolean {
    return this.triggerState
  }

  resetTrigger (): void {
    this.triggerState = false
  }
}
