import type { Bot, Player } from 'mineflayer'
import type { Entity } from 'prismarine-entity'
import type { Item } from 'prismarine-item'
import type { Vec3 } from 'vec3'
import { OmitTwo, StateBehaviorBuilder } from './util'

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
export type StateTransitionInfo<
  Parent extends StateBehaviorBuilder = StateBehaviorBuilder,
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> = {
  parent: Parent
  child: Child
  transitionName?: string

  shouldTransition?: (data: StateMachineData, state: Parent['prototype']) => boolean
  onTransition?: (data: StateMachineData) => void
} & (OmitTwo<ConstructorParameters<Child>> extends [first: any, ...any: any]
  ? {
      childConstructorArgs: OmitTwo<ConstructorParameters<Child>>
    }
  : { childConstructorArgs?: never })

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition<
  Parent extends StateBehaviorBuilder = typeof StateBehavior,
  Child extends StateBehaviorBuilder = typeof StateBehavior
> {
  readonly parentState: Parent
  readonly childState: Child
  readonly childConstructorArgs: StateTransitionInfo<Parent, Child>['childConstructorArgs']
  private triggerState: boolean = false
  shouldTransition: (data: StateMachineData, state: Parent['prototype']) => boolean
  onTransition: (data: StateMachineData, state: Parent['prototype']) => void
  transitionName?: string

  constructor ({
    parent,
    child,
    transitionName,
    childConstructorArgs,
    shouldTransition = (data) => false,
    onTransition = (data) => {}
  }: StateTransitionInfo<Parent, Child>) {
    this.parentState = parent
    this.childState = child
    this.shouldTransition = shouldTransition
    this.onTransition = onTransition
    this.transitionName = transitionName
    this.childConstructorArgs = childConstructorArgs
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

  setShouldTransition (should: (data: StateMachineData, state: Parent['prototype']) => boolean): this {
    this.shouldTransition = should
    return this
  }

  setOnTransition (onTrans: (data: StateMachineData, state: Parent['prototype']) => boolean): this {
    this.onTransition = onTrans
    return this
  }
}

// export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder>(
//   name: string,
//   parent: Parent,
//   child: Child,
//   args: OmitTwo<ConstructorParameters<Child>>
// ): StateTransition<Parent, Child>;

// export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder>(
//   name: string,
//   parent: Parent,
//   child: Child,
// ): StateTransition<Parent, Child>;

export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parent: Parent,
  child: Child,
  args: OmitTwo<ConstructorParameters<Child>> extends [first: any, ...any: any] ? OmitTwo<ConstructorParameters<Child>> : undefined
): StateTransition<Parent, Child> {
  return new StateTransition<Parent, Child>({
    transitionName: name,
    parent,
    child,
    childConstructorArgs: args
  } as any)
}
