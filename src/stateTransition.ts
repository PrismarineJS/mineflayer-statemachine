import { StateMachineData } from './stateBehavior'
import { HasConstructArgs, MergeStates, OnEnterArgs, StateBehaviorBuilder, StateConstructorArgs } from './util'

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionInfo<
  Parents extends readonly StateBehaviorBuilder[] = readonly StateBehaviorBuilder[],
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  parents: Parents
  child: Child
  constructorArgs: HasConstructArgs<Child> extends Child ? StateConstructorArgs<Child> : undefined
  enterArgs: OnEnterArgs<Child> extends [] ? never : OnEnterArgs<Child>
  name?: string
  shouldTransition?: (state: MergeStates<Parents>) => boolean
  onTransition?: (data: StateMachineData) => void
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition<
  Parents extends readonly any[] = readonly StateBehaviorBuilder[],
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  readonly parentStates: Parents
  readonly childState: Child
  public readonly constructorArgs: StateTransitionInfo<Parents, Child>['constructorArgs']
  public readonly enterArgs: StateTransitionInfo<Parents, Child>['enterArgs']
  private triggerState: boolean = false
  shouldTransition: (state: MergeStates<Parents>) => boolean
  onTransition: (data: StateMachineData) => void
  name?: string

  constructor ({
    parents,
    child,
    name,
    constructorArgs,
    enterArgs,
    shouldTransition = (data) => false,
    onTransition = (data) => {}
  }: StateTransitionInfo<Parents, Child>) {
    this.parentStates = parents
    this.childState = child
    this.shouldTransition = shouldTransition
    this.onTransition = onTransition
    this.constructorArgs = constructorArgs
    this.enterArgs = enterArgs
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

  setShouldTransition (should: (state: MergeStates<Parents>) => boolean): this {
    this.shouldTransition = should
    return this
  }

  setOnTransition (onTrans: (data: StateMachineData) => void): this {
    this.onTransition = onTrans
    return this
  }
}
