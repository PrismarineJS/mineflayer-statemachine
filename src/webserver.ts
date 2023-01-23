import { Bot } from 'mineflayer'
import { BotStateMachine, StateBehavior } from './statemachine'
import socketLoader, { Socket } from 'socket.io'
import path from 'path'
import express from 'express'
import httpLoader from 'http'
import { globalSettings } from '.'

const publicFolder = './../web'

// TODO Add option to shutdown server

/**
 * A web server which allows users to view the current state of the
 * bot behavior state machine.
 */
export class StateMachineWebserver {
  private serverRunning: boolean = false

  readonly bot: Bot
  readonly stateMachine: BotStateMachine
  readonly port: number

  /**
     * Creates and starts a new webserver.
     * @param bot - The bot being observed.
     * @param stateMachine - The state machine being observed.
     * @param port - The port to open this server on.
     */
  constructor (bot: Bot, stateMachine: BotStateMachine, port: number = 8934) {
    this.bot = bot
    this.stateMachine = stateMachine
    this.port = port
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
    if (globalSettings.debugMode) { console.log(`Started state machine web server at http://localhost:${this.port}.`) }
  }

  /**
     * Called when a web socket connects to this server.
     */
  private onConnected (socket: Socket): void {
    if (globalSettings.debugMode) { console.log(`Client ${socket.handshake.address} connected to webserver.`) }

    this.sendStatemachineStructure(socket)
    this.updateClient(socket)

    const updateClient = (): void => this.updateClient(socket)
    this.stateMachine.on('stateChanged', updateClient)

    socket.on('disconnect', () => {
      this.stateMachine.removeListener('stateChanged', updateClient)
      if (globalSettings.debugMode) { console.log(`Client ${socket.handshake.address} disconnected from webserver.`) }
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

  private updateClient (socket: Socket): void {
    const states = this.stateMachine.states
    const activeStates: number[] = []

    for (const layer of this.stateMachine.nestedStateMachines) {
      if (layer.activeState == null) continue

      const index = states.indexOf(layer.activeState)

      if (index > -1) {
        activeStates.push(index)
      }
    }

    const packet: StateMachineUpdatePacket = {
      activeStates
    }

    socket.emit('stateChanged', packet)
  }

  private getStates (): StateMachineStatePacket[] {
    const states: StateMachineStatePacket[] = []

    for (let i = 0; i < this.stateMachine.states.length; i++) {
      const state = this.stateMachine.states[i]
      states.push({
        id: i,
        name: state.stateName,
        x: state.x,
        y: state.y,
        nestGroup: this.getNestGroup(state)
      })
    }

    return states
  }

  private getNestGroup (state: StateBehavior): number {
    for (let i = 0; i < this.stateMachine.nestedStateMachines.length; i++) {
      const n = this.stateMachine.nestedStateMachines[i]

      if (n.states == null) continue
      if (n.states.includes(state)) return i
    }

    throw new Error('Unexpected state!')
  }

  private getTransitions (): StateMachineTransitionPacket[] {
    const transitions: StateMachineTransitionPacket[] = []

    for (let i = 0; i < this.stateMachine.transitions.length; i++) {
      const transition = this.stateMachine.transitions[i]
      transitions.push({
        id: i,
        name: transition.name,
        parentState: this.stateMachine.states.indexOf(transition.parentState),
        childState: this.stateMachine.states.indexOf(transition.childState)
      })
    }

    return transitions
  }

  private getNestGroups (): NestedStateMachinePacket[] {
    const nestGroups: NestedStateMachinePacket[] = []

    for (let i = 0; i < this.stateMachine.nestedStateMachines.length; i++) {
      const nest = this.stateMachine.nestedStateMachines[i]
      nestGroups.push({
        id: i,
        enter: this.stateMachine.states.indexOf(nest.enter),
        exit: nest.exit != null ? this.stateMachine.states.indexOf(nest.exit) : undefined,
        indent: nest.depth ?? -1,
        name: nest.stateName
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
