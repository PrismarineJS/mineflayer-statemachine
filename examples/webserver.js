const mineflayer = require('mineflayer')

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node webserver.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'statemachine_bot',
  password: process.argv[5]
})

bot.loadPlugin(require('mineflayer-pathfinder').pathfinder)

const {
  BotStateMachine,
  StateMachineWebserver,
  buildTransition,
  buildTransitionArgs,
  buildNestedMachine,
} = require('@nxg-org/mineflayer-statemachine')

const {
  BehaviorIdle: Idle,
  BehaviorFindEntity: FindEntity,
  BehaviorFollowEntity: FollowTarget,
  BehaviorLookAtEntity: LookAtTarget
} = require('@nxg-org/mineflayer-statemachine/lib/behaviors')

// to replicate the original mineflayer-statemachine exactly:
const LookAtPlayers = LookAtTarget.clone("LookAtPlayers")
const LookAtFollowing = LookAtTarget.clone("LookAtFollowing")

const transitions = [
  buildTransitionArgs('player says "hi"', Idle, FindEntity, [(e) => e.type === "player"])
    .setOnTransition(() => bot.chat("hello")),

  buildTransition("closestToLook", FindEntity, LookAtPlayers)
    .setShouldTransition(() => true),

  buildTransition('player says "bye"', LookAtPlayers, Idle) 
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "come"', LookAtPlayers, FollowTarget) 
    .setOnTransition(() => bot.chat("coming")),

  buildTransition('player says "stay"', FollowTarget, LookAtPlayers) 
    .setOnTransition(() => bot.chat("stay")),

  buildTransition('player says "bye"', FollowTarget, Idle) 
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition("closeToTarget", FollowTarget, LookAtFollowing) 
    .setShouldTransition((state) => state.distanceToTarget() < 3),

  buildTransition("farFromTarget", LookAtFollowing, FollowTarget) 
    .setShouldTransition((state) => state.distanceToTarget() >= 3),

  buildTransition('player says "bye"', LookAtFollowing, Idle) 
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "stay"', LookAtFollowing, LookAtPlayers)
];

const root = buildNestedMachine('root', transitions, Idle)

const stateMachine = new BotStateMachine({bot, root, autoStart: false})
const webserver = new StateMachineWebserver({stateMachine})
webserver.startServer()

bot.once("spawn", () => {
    stateMachine.start()

    bot.on('chat', (username, message) => {
        if (message === 'hi') { transitions[0].trigger() }
    
        if (message === 'bye') {
          transitions[2].trigger()
          transitions[5].trigger()
          transitions[8].trigger()
        }
    
        if (message === 'come') { transitions[3].trigger() }
    
        if (message === 'stay') {
          transitions[4].trigger()
          transitions[9].trigger()
        }
      })   
})