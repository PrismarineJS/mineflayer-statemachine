import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import StrictEventEmitter from 'strict-event-emitter-types'
import { StateMachineData } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'
import { StateTransition } from './stateTransition'
import { isNestedStateMachine, SpecifcNestedStateMachine, StateBehaviorBuilder } from './util'

export interface BotStateMachineEvents {
  stateEntered: (type: typeof NestedStateMachine, cls: NestedStateMachine, newState: StateBehaviorBuilder) => void
  stateExited: (type: typeof NestedStateMachine, cls: NestedStateMachine, oldState: StateBehaviorBuilder) => void
}

export interface BotStateMachineOptions<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> {
  bot: Bot
  root: SpecifcNestedStateMachine<Enter, Exits>
  data?: StateMachineData
  autoStart?: boolean
  autoUpdate?: boolean
}

export class BotStateMachine<
  Enter extends StateBehaviorBuilder,
  Exits extends StateBehaviorBuilder[]
> extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, BotStateMachineEvents>) {
  readonly bot: Bot
  readonly rootType: SpecifcNestedStateMachine<Enter, Exits>
  readonly root: InstanceType<SpecifcNestedStateMachine<Enter, Exits>>
  readonly transitions: StateTransition[]
  readonly states: StateBehaviorBuilder[]
  readonly nestedMachinesNew: { [depth: number]: Array<typeof NestedStateMachine> }
  readonly nestedMachinesHelp: Array<typeof NestedStateMachine>

  private autoUpdate: boolean
  private _activeMachine?: typeof NestedStateMachine

  constructor ({
    bot,
    root: Root,
    data = {},
    autoStart = true,
    autoUpdate = true
  }: BotStateMachineOptions<Enter, Exits>) {
    // eslint-disable-next-line constructor-super
    super()
    this.bot = bot
    this.states = []
    this.transitions = []
    this.nestedMachinesNew = []
    this.nestedMachinesHelp = []
    this.findStatesRecursive(Root)
    this.findTransitionsRecursive(Root)
    this.findNestedStateMachines(Root)
    this.rootType = Root
    this.root = new Root(bot, data)
    this.autoUpdate = autoUpdate

    if (autoStart) this.start()
  }

  public get activeMachine (): typeof NestedStateMachine | undefined {
    return this._activeMachine
  }

  public start (autoUpdate = this.autoUpdate): void {
    if (this.root.active) throw Error('Root already started! No need to start again.')
    this.root.active = true
    this._activeMachine = this.rootType
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

  private findNestedStateMachines (nested: typeof NestedStateMachine, depth: number = 0): void {
    this.nestedMachinesHelp.push(nested)
    this.nestedMachinesNew[depth] ||= []
    this.nestedMachinesNew[depth].push(nested)

    nested.addEventualListener('stateExited', (machine, state) => this.emit('stateExited', nested, machine, state))
    nested.addEventualListener('stateEntered', (machine, state) => {
      this._activeMachine = nested
      this.emit('stateEntered', nested, machine, state)
    })

    for (const state of nested.states) {
      if (isNestedStateMachine(state)) {
        this.findNestedStateMachines(state, depth + 1)
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

      for (const parentState of transition.parentStates) {
        if (isNestedStateMachine(parentState)) {
          this.findTransitionsRecursive(parentState)
        }
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
