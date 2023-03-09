import { BotStateMachine, NestedStateMachine, StateBehavior } from './index'
import socketLoader, { Socket } from 'socket.io'
import path from 'path'
import express from 'express'
import httpLoader from 'http'
import { isNestedStateMachine, WebserverBehaviorPositionIterable } from './util'

const publicFolder = './../web'

// provide positioning for both specific-to-machine states and globally as a backup.
export class WebserverBehaviorPositions {
  protected storage: { [name: string]: { x: number, y: number } | undefined } = {}
  constructor (items?: WebserverBehaviorPositionIterable) {
    if (items != null) {
      for (const item of items) {
        this.storage[this.getName(item.state, item.parentMachine)] = { x: item.x, y: item.y }
      }
    }
  }

  private getName (state: typeof StateBehavior, parentMachine?: typeof NestedStateMachine): string {
    if (parentMachine != null) return parentMachine.name + parentMachine.stateName + state.name + state.stateName
    return state.name + state.stateName
  }
  public has (state: typeof StateBehavior, parentMachine?: typeof NestedStateMachine): boolean {
    if (parentMachine != null) {
      const flag = !(this.storage[parentMachine.name + parentMachine.stateName + state.name + state.stateName] == null)
      if (!flag) return !(this.storage[state.name + state.stateName] == null)
      return true
    }
    return !(this.storage[state.name + state.stateName] == null)
  }

  public get (
    state: typeof StateBehavior,
    parentMachine?: typeof NestedStateMachine
  ): { x: number | undefined, y: number | undefined } {
    if (!this.has(state, parentMachine)) return { x: undefined, y: undefined }
    if (parentMachine != null) {
      return (
        this.storage[parentMachine.name + parentMachine.stateName + state.name + state.stateName] ??
        this.storage[state.name + state.stateName] ?? { x: undefined, y: undefined }
      )
    } else {
      return this.storage[state.name + state.stateName] ?? { x: undefined, y: undefined }
    }
  }

  public set (state: typeof StateBehavior, x: number, y: number, parentMachine?: typeof NestedStateMachine): this {
    if (this.has(state, parentMachine)) throw Error('State has already been added!')
    const key = this.getName(state, parentMachine)
    this.storage[key] = { x, y }
    return this
  }

  public removeState (state: typeof StateBehavior, parentMachine?: typeof NestedStateMachine): this {
    const key = this.getName(state, parentMachine)
    this.storage[key] = undefined
    return this
  }

  public clear (): this {
    for (const key in this.storage) this.storage[key] = undefined
    return this
  }
}

/**
 * A web server which allows users to view the current state of the
 * bot behavior state machine.
 */
export class StateMachineWebserver {
  private serverRunning: boolean = false

  readonly stateMachine: BotStateMachine<any, any>
  readonly presetPositions?: WebserverBehaviorPositions
  readonly port: number

  private lastMachine: typeof NestedStateMachine | undefined
  private lastState: typeof StateBehavior | undefined

  /**
   * Creates and starts a new webserver.
   * @param stateMachine - The state machine being observed.
   * @param port - The port to open this server on.
   */
  constructor ({
    stateMachine,
    presetPositions,
    port = 8934
  }: {
    stateMachine: BotStateMachine<any, any>
    presetPositions?: WebserverBehaviorPositions
    port?: number
  }) {
    this.stateMachine = stateMachine
    this.port = port
    this.presetPositions = presetPositions
    this.lastMachine = undefined
    this.lastState = undefined
  }

  /**
   * Checks whether or not this server is currently running.
   */
  isServerRunning (): boolean {
    return this.serverRunning
  }

  /**
   * Configures and starts a basic static web server.
   */
  startServer (): void {
    if (this.serverRunning) {
      throw new Error('Server already running!')
    }

    this.serverRunning = true

    const app = express()
    app.use('/web', express.static(path.join(__dirname, publicFolder)))
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, publicFolder, 'index.html')))

    const http = httpLoader.createServer(app)

    // @ts-expect-error ; Why? Not sure. Probably a type-def loading issue. Either way, it's safe.
    const io = socketLoader(http)

    io.on('connection', (socket: Socket) => this.onConnected(socket))

    http.listen(this.port, () => this.onStarted())
  }

  /**
   * Called when the web server is started.
   */
  private onStarted (): void {
    console.log(`Started state machine web server at http://localhost:${this.port}.`)
  }

  /**
   * Called when a web socket connects to this server.
   */
  private onConnected (socket: Socket): void {
    console.log(`Client ${socket.handshake.address} connected to webserver.`)

    this.sendStatemachineStructure(socket)

    if (this.lastMachine != null && this.lastState != null) this.updateClient(socket, this.lastMachine, this.lastState)

    const updateClient = (
      type: typeof NestedStateMachine,
      nestedMachine: NestedStateMachine,
      state: typeof StateBehavior
    ): void => this.updateClient(socket, type, state)
    this.stateMachine.on('stateEntered', updateClient)
    this.stateMachine.on('stateExited', updateClient)

    socket.on('disconnect', () => {
      this.stateMachine.removeListener('stateEntered', updateClient)
      this.stateMachine.removeListener('stateExited', updateClient)

      console.log(`Client ${socket.handshake.address} disconnected from webserver.`)
    })
  }

  private sendStatemachineStructure (socket: Socket): void {
    const states = this.getStates()
    const transitions = this.getTransitions()
    const nestGroups = this.getNestGroups()

    const packet: StateMachineStructurePacket = {
      states,
      transitions,
      nestGroups
    }

    socket.emit('connected', packet)
  }

  private updateClient (socket: Socket, nested: typeof NestedStateMachine, state: typeof StateBehavior): void {
    const activeStates: number[] = []

    const index = this.getStateId(state, nested)

    if (index > -1) {
      activeStates.push(index)
    }

    const packet: StateMachineUpdatePacket = {
      activeStates
    }

    socket.emit('stateChanged', packet)
    this.lastMachine = nested
    this.lastState = state
  }

  /**
   * Code for finding the id of a state given its host's machine.
   * ONLY PROVIDE STATE AND TARGETMACHINE.
   *
   * Note: This may fail if there are multiple of the same nested state machine used.
   * I can fix that if people raise an issue, but that seems like extremely contrived behavior.
   *
   * @param state State we want the id for relative to its machine
   * @param targetMachine the machine we want to search.
   * @param searching The machine we are currently searching (always start at root)
   * @param data object to allow pointer passing for recursion (lol js)
   * @returns id of state.
   */
  private getStateId (
    state: typeof StateBehavior,
    targetMachine: typeof NestedStateMachine,
    searching: typeof NestedStateMachine = this.stateMachine.rootType,
    data = { offset: 0 }
  ): number {
    for (let i = 0; i < searching.states.length; i++) {
      const foundState = searching.states[i]
      if (foundState === state && searching === targetMachine) {
        return data.offset
      }
      data.offset++

      if (isNestedStateMachine(foundState)) {
        const ret = this.getStateId(state, targetMachine, foundState, data)
        if (ret !== -1) return ret
      }
    }

    return -1
  }

  // Don't mind this stupid object -> pointer hack.
  // note: this matches the pattern found locally.
  // note: slight speedup possible by passing array by pointers as well.
  private getStates (
    nested: typeof NestedStateMachine = this.stateMachine.rootType,
    data = { index: 0, offset: 0 },
    offset = 0
  ): StateMachineStatePacket[] {
    const states: StateMachineStatePacket[] = []

    for (let i = 0; i < nested.states.length; i++) {
      const state = nested.states[i]
      states.push({
        id: data.index++,
        name: state.stateName !== StateBehavior.stateName ? state.stateName : state.name,
        nestGroup: offset,
        ...this.presetPositions?.get(state, nested)
      })
      if (isNestedStateMachine(state)) {
        states.push(...this.getStates(state, data, offset + ++data.offset))
      }
    }

    return states
  }

  private getTransitions (): StateMachineTransitionPacket[] {
    const transitions: StateMachineTransitionPacket[] = []

    for (let i = 0; i < this.stateMachine.nestedMachinesHelp.length; i++) {
      const machine = this.stateMachine.nestedMachinesHelp[i]
      const foundTransitions = machine.transitions
      for (let k = 0; k < foundTransitions.length; k++) {
        const transition = foundTransitions[k]
        transitions.push({
          id: i,
          name: transition.name,
          parentState: this.getStateId(transition.parentState, machine),
          childState: this.getStateId(transition.childState, machine)
        })
      }
    }

    return transitions
  }

  private getNestGroups (): NestedStateMachinePacket[] {
    const nestGroups: NestedStateMachinePacket[] = []

    for (let i = 0; i < this.stateMachine.nestedMachinesHelp.length; i++) {
      const machine = this.stateMachine.nestedMachinesHelp[i]
      const depth = this.stateMachine.getNestedMachineDepth(machine)
      nestGroups.push({
        id: i,
        enter: this.getStateId(machine.enter, machine),
        exit: machine.exit != null ? this.getStateId(machine.exit, machine) : undefined,
        indent: depth,
        name: machine.stateName
      })
    }

    return nestGroups
  }
}

interface StateMachineStructurePacket {
  states: StateMachineStatePacket[]
  transitions: StateMachineTransitionPacket[]
  nestGroups: NestedStateMachinePacket[]
}

interface NestedStateMachinePacket {
  id: number
  enter: number
  exit?: number
  indent: number
  name?: string
}

interface StateMachineStatePacket {
  id: number
  name: string
  x?: number
  y?: number
  nestGroup: number
}

interface StateMachineTransitionPacket {
  id: number
  name?: string
  parentState: number
  childState: number
}

interface StateMachineUpdatePacket {
  activeStates: number[]
}
