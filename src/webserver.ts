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
        app.use('/', express.static(path.join(__dirname, publicFolder)));

        const http = require('http').createServer(app);
        const io = require('socket.io')(http);
        io.on('connection', (socket: Socket) =>
        {
            this.onConnected(socket);
            socket.on('disconnect', () => this.onDisconnected());
        });

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

    }

    /**
     * Called when a web socket disconnects from this server.
     */
    private onDisconnected(): void
    {

    }
}
