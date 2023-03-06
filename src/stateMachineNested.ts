import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { StateBehavior, StateTransition, StateMachineData } from './stateBehavior'
import { HasArgs, NoArgs, SpecifcNestedStateMachine, StateBehaviorBuilder, StateConstructorArgs } from './util'

export interface NestedStateMachineOptions<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> {
  stateName: string
  transitions: Array<StateTransition<any, any>>
  enter: Enter
  enterArgs: HasArgs<Enter> extends Enter ? StateConstructorArgs<Enter> : never
  exit?: Exit
  enterIntermediateStates?: boolean
}

export interface StateBehaviorEvent {
  stateEntered: (cls: NestedStateMachine, newBehavior: typeof StateBehavior, data: StateMachineData) => void
  stateExited: (cls: NestedStateMachine, oldBehavior: typeof StateBehavior, data: StateMachineData) => void
}

export class NestedStateMachine
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, StateBehaviorEvent>)
  implements StateBehavior {
  public static readonly stateName: string = this.name
  public static readonly transitions: StateTransition[]
  public static readonly states: Array<typeof StateBehavior>
  public static readonly enter: typeof StateBehavior
  public static readonly enterArgs: any[] | undefined = undefined // StateConstructorArgs<typeof this.enter>; // sadly, this is always undefined (no static generics).
  public static readonly exit?: typeof StateBehavior
  public static readonly enterIntermediateStates: boolean

  // not correct but whatever.
  public static readonly onStartupListeners: Array<
  [key: keyof StateBehaviorEvent, listener: StateBehaviorEvent[keyof StateBehaviorEvent]]
  >

  protected _activeStateType?: typeof StateBehavior
  protected _activeState?: StateBehavior

  public readonly bot: Bot
  public readonly data: StateMachineData
  public active: boolean = false

  public constructor (bot: Bot, data: StateMachineData) {
    // eslint-disable-next-line constructor-super
    super()
    this.bot = bot
    this.data = data
    for (const listener of this.staticRef.onStartupListeners) {
      this.on(listener[0], listener[1])
    }
  }

  static addEventualListener<Key extends keyof StateBehaviorEvent>(key: Key, listener: StateBehaviorEvent[Key]): void {
    if (this.onStartupListeners.find((l) => l[0] === key) != null) return
    this.onStartupListeners.push([key, listener])
  }

  public get activeStateType (): typeof StateBehavior | undefined {
    return this._activeStateType
  }

  public get activeState (): StateBehavior | undefined {
    return this._activeState
  }

  /**
   * Getter
   */
  public get staticRef (): typeof NestedStateMachine {
    return this.constructor as typeof NestedStateMachine
  }

  /**
   * Getter
   */
  public get transitions (): StateTransition[] {
    return (this.constructor as typeof NestedStateMachine).transitions
  }

  /**
   * Getter
   */
  public get states (): Array<typeof StateBehavior> {
    return (this.constructor as typeof NestedStateMachine).states
  }

  /**
   * Getter
   */
  public get stateName (): string {
    return (this.constructor as typeof NestedStateMachine).stateName
  }

  public onStateEntered (): void {
    this._activeStateType = this.staticRef.enter
    this.enterState(this._activeStateType, this.bot, this.staticRef.enterArgs)
  }

  protected enterState (EnterState: StateBehaviorBuilder, bot: Bot, additional: any[] = []): void {
    this._activeState = new EnterState(bot, this.data, ...additional)
    this._activeState.active = true
    this.emit('stateEntered', this, EnterState, this.data)
    this._activeState.onStateEntered?.()
    this._activeState.update?.()
  }

  protected exitActiveState (): void {
    if (this._activeState == null) return
    this._activeState.active = false
    this.emit('stateExited', this, this._activeState.constructor as typeof StateBehavior, this.data)
    this._activeState.onStateExited?.()
  }

  public update (): void {
    // update will only occur when this is active anyway, so return if not.
    if (this._activeState == null) return
    this._activeState.update?.()
    let lastState = this._activeStateType
    const transitions = this.staticRef.transitions
    let args: any[] | undefined
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      if (transition.parentState === this._activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this._activeState)) {
          transition.resetTrigger()
          i = -1
          transition.onTransition(this.data)
          this.exitActiveState()
          this._activeStateType = transition.childState
          args = transition.constructorArgs
          if (this.staticRef.enterIntermediateStates) {
            lastState = transition.childState
            this.enterState(lastState, this.bot, args)
          }
        }
      }
    }

    if (this._activeStateType != null && this._activeStateType !== lastState) {
      this.enterState(this._activeStateType, this.bot, args)
    }
  }

  /**
   * Checks whether or not this state machine layer has finished running.
   */
  public isFinished (): boolean {
    if (this.active == null) return true
    if (this.staticRef.exit == null) return false
    return this._activeStateType === this.staticRef.exit
  }
}

/**
 * Creates a new Nested State Machine class.
 *
 * This does NOT create an instance. This is used statically.
 *
 * @param stateName Name of state.
 * @returns {typeof NestedStateMachine} A static reference to a new NestedMachine.
 */
function internalBuildNested<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: Enter,
  enterArgs?: StateConstructorArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  const states: Array<typeof StateBehavior> = []

  states.push(enter)

  if (!(exit == null) && !states.includes(exit)) states.push(exit)

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i]
    if (!states.includes(trans.parentState)) states.push(trans.parentState)
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }

  return class BuiltNestedStateMachine extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
    public static readonly enterArgs: StateConstructorArgs<typeof enter> = enterArgs as any
    public static readonly exit? = exit
    public static readonly enterIntermediateStates = enterIntermediateStates
    public static readonly onStartupListeners = []
  }
}

/**
 * Creates a new Nested
 * @param param0
 * @returns
 */
export function newNestedStateMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> ({
  stateName,
  transitions,
  enter,
  enterArgs,
  exit,
  enterIntermediateStates = true
}: NestedStateMachineOptions<Enter, Exit>): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exit, enterIntermediateStates)
}

export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, undefined, exit, enterIntermediateStates)
}

export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exit, enterIntermediateStates)
}
