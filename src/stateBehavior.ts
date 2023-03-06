import type { Bot, Player } from 'mineflayer'
import type { Entity } from 'prismarine-entity'
import type { Item } from 'prismarine-item'
import type { Vec3 } from 'vec3'
import { clone, HasArgs, StateBehaviorBuilder, StateConstructorArgs } from './util'

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
  /**
   * Name displayed on the webserver.
   */
  static readonly stateName: string = this.name

  /**
   * Method to clone the behavior, see util.ts
   */
  static clone = clone
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
  onStateEntered (): void {}

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

  /**
   * Args is a compatibility hack here. Don't like it, but whatever.
   */
  constructor (bot: Bot, data: StateMachineData) {
    this.bot = bot
    this.data = data
  }
}

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionInfo<
  Parent extends StateBehaviorBuilder = StateBehaviorBuilder,
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  parent: Parent
  child: Child
  constructorArgs: HasArgs<Child> extends Child ? StateConstructorArgs<Child> : never
  name?: string
  shouldTransition?: (state: Parent['prototype']) => boolean
  onTransition?: (data: StateMachineData) => void
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition<
  Parent extends StateBehaviorBuilder = StateBehaviorBuilder,
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  readonly parentState: Parent
  readonly childState: Child
  public readonly constructorArgs: StateTransitionInfo<Parent, Child>['constructorArgs']
  private triggerState: boolean = false
  shouldTransition: (state: Parent['prototype']) => boolean
  onTransition: (data: StateMachineData) => void
  name?: string

  constructor ({
    parent,
    child,
    name,
    constructorArgs,
    shouldTransition = (data) => false,
    onTransition = (data) => {}
  }: StateTransitionInfo<Parent, Child>) {
    this.parentState = parent
    this.childState = child
    this.shouldTransition = shouldTransition
    this.onTransition = onTransition
    this.constructorArgs = constructorArgs
    this.name = name
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

  setShouldTransition (should: (state: Parent['prototype']) => boolean): this {
    this.shouldTransition = should
    return this
  }

  setOnTransition (onTrans: (data: StateMachineData) => void): this {
    this.onTransition = onTrans
    return this
  }
}
