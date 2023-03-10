import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { BehaviorWildcard } from './behaviors'
import { StateBehavior, clone, transform, StateMachineData } from './stateBehavior'
import { StateTransition } from './stateTransition'
import { HasArgs, StateBehaviorBuilder, StateConstructorArgs } from './util'

export interface NestedStateMachineOptions<Enter extends StateBehaviorBuilder, Exits extends readonly StateBehaviorBuilder[] | undefined> {
  stateName: string
  readonly transitions: Array<StateTransition<any, any>>
  readonly enter: Enter
  readonly enterArgs: HasArgs<Enter> extends Enter ? StateConstructorArgs<Enter> : never
  readonly exits?: Exits extends undefined ? undefined : Exclude<Exits, undefined>
  enterIntermediateStates?: boolean
}

export interface NestedMachineEvents {
  stateEntered: (cls: NestedStateMachine, newBehavior: StateBehaviorBuilder, data: StateMachineData) => void
  stateExited: (cls: NestedStateMachine, oldBehavior: StateBehaviorBuilder, data: StateMachineData) => void
}

export class NestedStateMachine
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, NestedMachineEvents>)
  implements StateBehavior {
  public static readonly stateName: string = this.name
  public static readonly transitions: StateTransition[]
  public static readonly states: Array<StateBehaviorBuilder<StateBehavior, any[]>>
  public static readonly enter: StateBehaviorBuilder
  public static readonly enterArgs: any[] | undefined = undefined // StateConstructorArgs<typeof this.enter>; // sadly, this is always undefined (no static generics).
  public static readonly exits?: StateBehaviorBuilder[] | undefined
  public static readonly enterIntermediateStates: boolean

  public static readonly clone = clone

  public static readonly transform = transform

  // not correct but whatever.
  public static readonly onStartupListeners: Array<
  [key: keyof NestedMachineEvents, listener: NestedMachineEvents[keyof NestedMachineEvents]]
  >

  protected _activeStateType?: StateBehaviorBuilder
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

  static addEventualListener<Key extends keyof NestedMachineEvents>(key: Key, listener: NestedMachineEvents[Key]): void {
    if (this.onStartupListeners.find((l) => l[0] === key) != null) return
    this.onStartupListeners.push([key, listener])
  }

  /**
   * Getter (does not actually get specific type, so class may not match)
   */
  public get staticRef (): typeof NestedStateMachine {
    return this.constructor as typeof NestedStateMachine
  }

  /**
   * Getter
   */
  public get activeStateType (): StateBehaviorBuilder | undefined {
    return this._activeStateType
  }

  /**
   * Getter
   */
  public get activeState (): StateBehavior | undefined {
    return this._activeState
  }

  public onStateEntered (): void {
    this._activeStateType = this.staticRef.enter
    this.enterState(this._activeStateType, this.bot, this.staticRef.enterArgs)
  }

  public onStateExited (): void {
    this.exitActiveState()
    this._activeStateType = undefined
    this._activeState = undefined
  }

  protected enterState (EnterState: StateBehaviorBuilder<StateBehavior, any[]>, bot: Bot, additional: any[] = []): void {
    this._activeState = new EnterState(bot, this.data, ...additional)
    this._activeState.active = true
    this.emit('stateEntered', this, EnterState, this.data)
    this._activeState.onStateEntered?.()
    this._activeState.update?.()
  }

  protected exitActiveState (): void {
    if (this._activeStateType == null) return
    if (this._activeState == null) return
    this._activeState.active = false
    this.emit('stateExited', this, this._activeStateType, this.data)
    this._activeState.onStateExited?.()
  }

  public update (): void {
    // update will only occur when this is active anyway, so return if not.
    if (this._activeState == null) return
    this._activeState.update?.()
    const transitions = this.staticRef.transitions
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      if ((this._activeStateType != null && transition.parentStates.includes(this._activeStateType)) || transition.parentStates.includes(BehaviorWildcard)) {
        if (transition.isTriggered() || transition.shouldTransition(this._activeState as any)) {
          transition.resetTrigger()
          i = -1
          transition.onTransition(this.data)
          this.exitActiveState()
          this._activeStateType = transition.childState
          this.enterState(this._activeStateType, this.bot, transition.constructorArgs)
        }
      }
      // transition.resetTrigger() // always reset to false to avoid false positives.
    }
  }

  /**
   * Checks whether or not this state machine layer has finished running.
   */
  public isFinished (): boolean {
    if (this.active == null) return true
    if (this._activeStateType == null) return true
    if (this.staticRef.exits == null) return false
    return this.staticRef.exits.includes(this._activeStateType)
  }
}
