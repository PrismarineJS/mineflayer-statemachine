import { Bot } from "mineflayer";
import { BotStateMachine } from "./statemachine";
import { Socket } from "socket.io";
import path from 'path';
import express from 'express';

const publicFolder = "./../web";


// TODO Add option to shutdown server

/**
 * A web server which allows users to view the current state of the
 * bot behavior state machine.
 */
export class StateMachineWebserver
{
    private serverRunning: boolean = false;

    readonly bot: Bot;
    readonly stateMachine: BotStateMachine;
    readonly port: number;

    /**
     * Creates and starts a new webserver.
     * @param bot - The bot being observed.
     * @param stateMachine - The state machine being observed.
     * @param port - The port to open this server on.
     */
    constructor(bot: Bot, stateMachine: BotStateMachine, port: number = 8934)
    {
        this.bot = bot;
        this.stateMachine = stateMachine;
        this.port = port;
    }

    /**
     * Checks whether or not this server is currently running.
     */
    isServerRunning(): boolean
    {
        return this.serverRunning;
    }

    /**
     * Configures and starts a basic static web server.
     */
    startServer(): void
    {
        if (this.serverRunning)
            throw "Server already running!";

        this.serverRunning = true;

        const app = express();
        app.use('/web', express.static(path.join(__dirname, publicFolder)));
        app.get('/', (req, res) => res.sendFile(path.join(__dirname, publicFolder, 'index.html')));

        const http = require('http').createServer(app);
        const io = require('socket.io')(http);
        io.on('connection', (socket: Socket) => this.onConnected(socket));

        http.listen(this.port, () => this.onStarted());
    }

    /**
     * Called when the web server is started.
     */
    private onStarted(): void
    {
        console.log(`Started state machine web server at http://localhost:${this.port}.`);
    }

    /**
     * Called when a web socket connects to this server.
     */
    private onConnected(socket: Socket): void
    {
        console.log(`Client ${socket.handshake.address} connected to webserver.`);

        this.sendStatemachineStructure(socket);

        const updateClient = () => this.updateClient(socket);
        this.stateMachine.on("stateChanged", updateClient);

        socket.on('disconnect', () =>
        {
            this.stateMachine.removeListener("stateChanged", updateClient)
            console.log(`Client ${socket.handshake.address} disconnected from webserver.`);
        });
    }

    private sendStatemachineStructure(socket: Socket): void
    {
        let states = this.stateMachine.states;
        let packetStates: StateMachineStatePacket[] = [];
        for (let i = 0; i < states.length; i++)
        {
            let state = states[i];
            let s: StateMachineStatePacket = {
                id: i,
                name: state.stateName
            };

            packetStates.push(s);
        }

        let transitions = this.stateMachine.transitions;
        let packetTransitions: StateMachineTransitionPacket[] = [];
        for (let i = 0; i < transitions.length; i++)
        {
            let transition = transitions[i];
            let s: StateMachineTransitionPacket = {
                id: i,
                parentState: states.indexOf(transition.parentState),
                childState: states.indexOf(transition.childState),
            };

            packetTransitions.push(s);
        }

        let packet: StateMachineStructurePacket = {
            states: packetStates,
            transitions: packetTransitions,
            activeState: states.indexOf(this.stateMachine.getActiveState()),
            initialState: states.indexOf(this.stateMachine.getInitialState())
        };

        socket.emit("connected", packet);
    }

    private updateClient(socket: Socket): void
    {
        let states = this.stateMachine.states;
        let packet: StateMachineUpdatePacket = {
            activeState: states.indexOf(this.stateMachine.getActiveState())
        };

        socket.emit("stateChanged", packet);
    }
}

interface StateMachineStructurePacket
{
    states: StateMachineStatePacket[];
    transitions: StateMachineTransitionPacket[];
    activeState: number;
    initialState: number;
}

interface StateMachineStatePacket
{
    id: number;
    name: string;
}

interface StateMachineTransitionPacket
{
    id: number;
    parentState: number;
    childState: number;
}

interface StateMachineUpdatePacket
{
    activeState: number;
}