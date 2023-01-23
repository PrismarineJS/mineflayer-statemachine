import mineflayer, { Bot } from 'mineflayer'
import {
    globalSettings,
    StateTransition,
    BotStateMachine,
    StateMachineWebserver,
    EntityFilters,
    BehaviorIdle,
    BehaviorPrintServerStats,
    BehaviorFollowEntity,
    BehaviorLookAtEntity,
    BehaviorGetClosestEntity,
    NestedStateMachine,
    StateMachineTargets
} from './../src'

if (process.argv.length < 3 || process.argv.length > 6) {
    console.log('Usage : node lookatplayers.js <host> <port> [<name>] [<password>]')
    process.exit(1)
}

const bot = mineflayer.createBot({
    host: process.argv[2],
    port: process.argv[3] ? parseInt(process.argv[3]) : 25565,
    username: process.argv[4] ? process.argv[4] : 'statemachine_bot',
    password: process.argv[5]
})

bot.loadPlugin(require('mineflayer-pathfinder').pathfinder)

globalSettings.debugMode = true

bot.once('spawn', () => {
    const targets = {}

    const printServerStates = new BehaviorPrintServerStats(bot)
    printServerStates.x = 100
    printServerStates.y = 100

    const idleState = new BehaviorIdle()
    idleState.x = 400
    idleState.y = 100

    const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly)
    getClosestPlayer.x = 700
    getClosestPlayer.y = 100

    const followingUser = followUser(bot, targets)
    followingUser.x = 550
    followingUser.y = 210

    const transitions = [

        new StateTransition({
            parent: printServerStates,
            child: idleState,
            shouldTransition: () => true
        }),

        new StateTransition({
            parent: idleState,
            child: getClosestPlayer,
            name: 'player says "hi"',
            onTransition: () => bot.chat('hello')
        }),

        new StateTransition({
            parent: followingUser,
            child: idleState,
            name: 'player says "bye"',
            onTransition: () => bot.chat('goodbye')
        }),

        new StateTransition({
            parent: getClosestPlayer,
            child: followingUser,
            shouldTransition: () => true
        }),
    ]

    const root = new NestedStateMachine(transitions, printServerStates)
    root.stateName = "Main"

    bot.on('chat', (username, message) => {
        if (message === 'hi') {
            transitions.find(t => t.name === 'player says "hi"')?.trigger()
        }

        if (message === 'bye') {
            transitions.find(t => t.name === 'player says "bye"')?.trigger()
        }
    })

    // This function can be in another file
    function followUser(bot: Bot, targets: StateMachineTargets) {

        const lookAtPlayersState = new BehaviorLookAtEntity(bot, targets)
        lookAtPlayersState.x = 400
        lookAtPlayersState.y = 25

        const followPlayer = new BehaviorFollowEntity(bot, targets)
        followPlayer.x = 200
        followPlayer.y = 200

        const lookAtFollowTarget = new BehaviorLookAtEntity(bot, targets)
        lookAtFollowTarget.x = 600
        lookAtFollowTarget.y = 200

        const transitions = [
            new StateTransition({
                parent: lookAtPlayersState,
                child: followPlayer,
                name: 'player says "come"',
            }),

            new StateTransition({
                parent: followPlayer,
                child: lookAtFollowTarget,
                name: 'closeToTarget',
                shouldTransition: () => followPlayer.distanceToTarget() < 2
            }),

            new StateTransition({
                parent: lookAtFollowTarget,
                child: followPlayer,
                name: 'farFromTarget',
                shouldTransition: () => lookAtFollowTarget.distanceToTarget() >= 2
            }),

            new StateTransition({
                parent: followPlayer,
                child: lookAtPlayersState,
                name: 'player says "stay"',
                onTransition: () => bot.chat('staying')
            }),

            new StateTransition({
                parent: lookAtFollowTarget,
                child: lookAtPlayersState,
                name: 'player says "stay"'
            }),
        ]

        bot.on('chat', (username, message) => {
            if (message === 'come') {
                transitions.find(t => t.name === 'player says "come"')?.trigger()
            }

            if (message === 'stay') {
                transitions.filter(t => t.name === 'player says "stay"')
                    .forEach(t => t.trigger())
            }
        })

        const nestedState = new NestedStateMachine(transitions, lookAtPlayersState)
        nestedState.stateName = 'Follow the entity'
        return nestedState
    }

    const stateMachine = new BotStateMachine(bot, root)
    const webserver = new StateMachineWebserver(bot, stateMachine)
    webserver.startServer()
})
