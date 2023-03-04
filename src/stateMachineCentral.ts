import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { StateBehavior, StateTransition, StateMachineData } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'
import { isNestedStateMachine } from './util'

export interface CentralStateMachineEvents {
  stateEntered: (cls: NestedStateMachine, newState: typeof StateBehavior) => void
  stateExited: (cls: NestedStateMachine, oldState: typeof StateBehavior) => void
}

export interface CentralStateMachineOptions {
  bot: Bot
  root: typeof NestedStateMachine
  data?: StateMachineData
  autoStart?: boolean
  autoUpdate?: boolean
}

export class CentralStateMachine extends (EventEmitter as new () => StrictEventEmitter<
EventEmitter,
CentralStateMachineEvents
>) {
  readonly bot: Bot
  readonly root: NestedStateMachine

  readonly transitions: StateTransition[]
  readonly states: Array<typeof StateBehavior>
  readonly nestedMachinesNew: { [depth: number]: Array<typeof NestedStateMachine> }
  readonly nestedMachinesHelp: Array<typeof NestedStateMachine>

  private autoUpdate: boolean

  constructor ({ bot, root: Root, data = {}, autoStart = true, autoUpdate = true }: CentralStateMachineOptions) {
    super()
    this.bot = bot
    this.states = []
    this.transitions = []
    this.nestedMachinesNew = []
    this.nestedMachinesHelp = []
    this.findStatesRecursive(Root)
    this.findTransitionsRecursive(Root)
    this.findNestedStateMachinesNew(Root)
    this.root = new Root(bot, data)
    this.autoUpdate = autoUpdate

    if (autoStart) {
      this.root.active = true
      this.root.onStateEntered()

      if (autoUpdate) {
        this.bot.on('physicsTick', this.update)
      }
    }
  }

  public start (autoUpdate = this.autoUpdate): void {
    if (this.root.active) throw Error('Root already started! No need to start again.')
    this.root.active = true
    this.root.onStateEntered()

    if (!this.bot.listeners('physicsTick').includes(this.update) && autoUpdate) {
      this.bot.on('physicsTick', this.update)
      this.autoUpdate = true
    }
  }

  public getNestedMachineDepth (nested: typeof NestedStateMachine): number {
    for (const depth in this.nestedMachinesNew) {
      if (this.nestedMachinesNew[depth].includes(nested)) return Number(depth)
    }
    return -1
  }

  // private findNestedStateMachines(nested: NestedStateMachine, depth: number = 0): void {
  //   this.nestedMachines.push(nested);
  //   nested.depth = depth;

  //   nested.on("stateEntered", (state) => this.emit("stateEntered", nested, state));
  //   nested.on("stateExited", (state) => this.emit("stateExited", nested, state));

  //   for (const state of nested.staticRef.states) {
  //     if (state instanceof NestedStateMachine) {
  //       this.findNestedStateMachines(state, depth + 1);
  //     }
  //   }
  // }

  private findNestedStateMachinesNew (nested: typeof NestedStateMachine, depth: number = 0): void {
    this.nestedMachinesHelp.push(nested)
    this.nestedMachinesNew[depth] ||= []
    this.nestedMachinesNew[depth].push(nested)

    nested.addEventualListener('stateEntered', (nested, state) => this.emit('stateEntered', nested, state))
    nested.addEventualListener('stateExited', (nested, state) => this.emit('stateExited', nested, state))

    for (const state of nested.states) {
      if (isNestedStateMachine(state)) {
        this.findNestedStateMachinesNew(state, depth + 1)
      }
    }
  }

  private findStatesRecursive (nested: typeof NestedStateMachine): void {
    for (const state of nested.states) {
      this.states.push(state)

      if (isNestedStateMachine(state)) {
        this.findStatesRecursive(state)
      }
    }
  }

  private findTransitionsRecursive (nested: typeof NestedStateMachine): void {
    for (const transition of nested.transitions) {
      this.transitions.push(transition)

      if (isNestedStateMachine(transition.parentState)) {
        this.findTransitionsRecursive(transition.parentState)
      }
    }
  }

  /**
   * Called each tick to update the root state machine.
   */
  public update = (): void => {
    this.root.update()
  }
}
