const mineflayer = require('mineflayer')

if (process.argv.length < 3 || process.argv.length > 6) {
  console.log('Usage : node lookatplayers.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: process.argv[3] ? parseInt(process.argv[3]) : parseInt(25565),
  username: process.argv[4] ? process.argv[4] : 'statemachine_bot',
  password: process.argv[5]
})

bot.loadPlugin(require('mineflayer-pathfinder').pathfinder)

const {
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
  NestedStateMachine
} = require('./../lib')

globalSettings.debugMode = true

bot.once('spawn', () => {
  const targets = {}

  const printServerStates = new BehaviorPrintServerStats(bot)
  printServerStates.x = 100
  printServerStates.y = 100

  const idleState = new BehaviorIdle()
  idleState.x = 400
  idleState.y = 100

  const lookAtPlayersState = new BehaviorLookAtEntity(bot, targets)
  lookAtPlayersState.x = 400
  lookAtPlayersState.y = 300

  const followPlayer = new BehaviorFollowEntity(bot, targets)
  followPlayer.x = 100
  followPlayer.y = 400

  const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly)
  getClosestPlayer.x = 700
  getClosestPlayer.y = 100

  const lookAtFollowTarget = new BehaviorLookAtEntity(bot, targets)
  lookAtFollowTarget.x = 700
  lookAtFollowTarget.y = 400

  const transitions = [

    new StateTransition({ // 0
      parent: printServerStates,
      child: idleState,
      shouldTransition: () => true
    }),

    new StateTransition({ // 1
      parent: idleState,
      child: getClosestPlayer,
      name: 'player says "hi"',
      onTransition: () => bot.chat('hello')
    }),

    new StateTransition({ // 2
      parent: getClosestPlayer,
      child: lookAtPlayersState,
      shouldTransition: () => true
    }),

    new StateTransition({ // 3
      parent: lookAtPlayersState,
      child: idleState,
      name: 'player says "bye"',
      onTransition: () => bot.chat('goodbye')
    }),

    new StateTransition({ // 4
      parent: lookAtPlayersState,
      child: followPlayer,
      name: 'player says "come"',
      onTransition: () => bot.chat('coming')
    }),

    new StateTransition({ // 5
      parent: followPlayer,
      child: lookAtPlayersState,
      name: 'player says "stay"',
      onTransition: () => bot.chat('staying')
    }),

    new StateTransition({ //  6
      parent: followPlayer,
      child: idleState,
      name: 'player says "bye"',
      onTransition: () => bot.chat('goodbye')
    }),

    new StateTransition({ // 7
      parent: followPlayer,
      child: lookAtFollowTarget,
      name: 'closeToTarget',
      shouldTransition: () => followPlayer.distanceToTarget() < 2
    }),

    new StateTransition({ // 8
      parent: lookAtFollowTarget,
      child: followPlayer,
      name: 'farFromTarget',
      shouldTransition: () => lookAtFollowTarget.distanceToTarget() >= 2
    }),

    new StateTransition({ // 9
      parent: lookAtFollowTarget,
      child: idleState,
      name: 'player says "bye"',
      onTransition: () => bot.chat('goodbye')
    }),

    new StateTransition({ // 10
      parent: lookAtFollowTarget,
      child: lookAtPlayersState,
      name: 'player says "stay"'
    })

  ]

  const root = new NestedStateMachine(transitions, printServerStates)
  root.name = 'main'

  bot.on('chat', (username, message) => {
    if (message === 'hi') { transitions[1].trigger() }

    if (message === 'bye') {
      transitions[3].trigger()
      transitions[6].trigger()
      transitions[9].trigger()
    }

    if (message === 'come') { transitions[4].trigger() }

    if (message === 'stay') {
      transitions[5].trigger()
      transitions[10].trigger()
    }
  })

  const stateMachine = new BotStateMachine(bot, root)
  const webserver = new StateMachineWebserver(bot, stateMachine)
  webserver.startServer()
})
