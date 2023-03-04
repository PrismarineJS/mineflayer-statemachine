import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { StateBehavior, StateTransition, StateMachineData } from './stateBehavior'
import { isNestedStateMachine, StateBehaviorBuilder } from './util'

export interface NestedStateMachineOptions {
  stateName: string
  transitions: Array<StateTransition<any, any>>
  enter: StateBehaviorBuilder
  exit?: StateBehaviorBuilder
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
  public static readonly exit?: typeof StateBehavior
  public static readonly enterIntermediateStates: boolean

  // not correct but whatever.
  public static readonly onStartupListeners: Array<[
    key: keyof StateBehaviorEvent,
    listener: StateBehaviorEvent[keyof StateBehaviorEvent]
  ]>

  // not really needed, but helpful.
  staticRef: typeof NestedStateMachine
  activeStateType?: typeof StateBehavior
  activeState?: StateBehavior

  public readonly bot: Bot
  public readonly data: StateMachineData
  public active: boolean = false

  public constructor (bot: Bot, data: StateMachineData) {
    super()
    this.bot = bot
    this.data = data
    this.staticRef = this.constructor as typeof NestedStateMachine
    for (const listener of this.staticRef.onStartupListeners) {
      this.on(listener[0], listener[1])
    }
  }

  static addEventualListener<Key extends keyof StateBehaviorEvent>(key: Key, listener: StateBehaviorEvent[Key]): void {
    if (this.onStartupListeners.find((l) => l[0] === key) != null) return
    this.onStartupListeners.push([key, listener])
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
    this.activeStateType = this.staticRef.enter
    this.enterState(this.activeStateType, this.bot)
  }

  private enterState (EnterState: StateBehaviorBuilder, bot: Bot, ...additional: any[]): void {
    if (isNestedStateMachine(EnterState)) {
      for (const [key, func] of this.staticRef.onStartupListeners) {
        if (EnterState.onStartupListeners.find((l) => l[0] === key) == null) EnterState.addEventualListener(key, func)
      }
    }

    this.activeState = new EnterState(bot, this.data, ...additional)
    this.activeState.active = true
    this.activeState.onStateEntered?.()
    this.emit('stateEntered', this, EnterState, this.data)
  }

  private exitActiveState (): void {
    if (this.activeState == null) return
    this.activeState.active = false
    this.activeState.onStateExited?.()
    this.emit('stateExited', this, this.activeState.constructor as typeof StateBehavior, this.data)
  }

  public update (): void {
    // this will only occur when state is not active.
    if (this.activeState == null) return
    this.activeState.update?.()
    const lastState = this.activeStateType
    const transitions = this.staticRef.transitions
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      if (transition.parentState === this.activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this.data, this.activeState)) {
          transition.resetTrigger()
          i = -1
          transition.onTransition(this.data, this.activeState)
          this.exitActiveState()
          this.activeStateType = transition.childState
          if (this.staticRef.enterIntermediateStates) this.enterState(this.activeStateType, this.bot, transition.childConstructorArgs)
        }
      }
    }

    if ((this.activeStateType != null) && this.activeStateType !== lastState) this.enterState(this.activeStateType, this.bot)
  }

  /**
   * Checks whether or not this state machine layer has finished running.
   */
  isFinished (): boolean {
    if (this.active == null) return true
    if (this.staticRef.exit == null) return false
    return this.activeStateType === this.staticRef.exit
  }
}

/**
 * Creates a new Nested
 * @param param0
 * @returns
 */
export function newNestedStateMachine ({
  stateName,
  transitions,
  enter,
  exit,
  enterIntermediateStates = true
}: NestedStateMachineOptions): typeof NestedStateMachine {
  const states: Array<typeof StateBehavior> = []

  if (!states.includes(enter)) states.push(enter)

  if (!(exit == null) && !states.includes(exit)) states.push(exit)

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i]
    if (!states.includes(trans.parentState)) states.push(trans.parentState)
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }

  console.log('building machine:', stateName, states)
  return class extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
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
export function buildNewNestedMachine (
  stateName: string,
  enter: StateBehaviorBuilder,
  exit: StateBehaviorBuilder,
  transitions: Array<StateTransition<any, any>>,
  enterIntermediateStates = true
): typeof NestedStateMachine {
  const states: Array<typeof StateBehavior> = []

  if (!states.includes(enter)) states.push(enter)

  if (!(exit == null) && !states.includes(exit)) states.push(exit)

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i]
    if (!states.includes(trans.parentState)) states.push(trans.parentState)
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }

  console.log('building machine:', stateName, states)
  return class extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
    public static readonly exit? = exit
    public static readonly enterIntermediateStates = enterIntermediateStates
    public static readonly onStartupListeners = []
  }
}
