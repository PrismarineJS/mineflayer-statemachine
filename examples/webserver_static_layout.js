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
  CentralStateMachine,
  StateMachineWebserver,
  WebserverBehaviorPositions
} = require('mineflayer-statemachine')

const {
  BehaviorIdle,
  BehaviorFindEntity,
  BehaviorFollowEntity,
  BehaviorLookAtEntity
} = require('mineflayer-statemachine/lib/behaviors')

const {
  buildTransition,
  buildTransitionArgs,
  buildNestedMachine,
} = require('mineflayer-statemachine/lib/builders')


// to replicate the original mineflayer-statemachine exactly:
const BehaviorLookAtPlayers = BehaviorLookAtEntity.clone("LookAtPlayers")
const BehaviorLookAtFollowing = BehaviorLookAtEntity.clone("LookAtFollowing")

const transitions = [
  buildTransitionArgs('player says "hi"', BehaviorIdle, BehaviorFindEntity, [(e) => e.type === "player"]) // 1
    .setOnTransition(() => bot.chat("hello")),

  buildTransition("closestToLook", BehaviorFindEntity, BehaviorLookAtPlayers) // 2
    .setShouldTransition(() => true),

  buildTransition('player says "bye"', BehaviorLookAtPlayers, BehaviorIdle) // 3
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "come"', BehaviorLookAtPlayers, BehaviorFollowEntity) // 4
    .setOnTransition(() => bot.chat("coming")),

  buildTransition('player says "stay"', BehaviorFollowEntity, BehaviorLookAtPlayers) // 5
    .setOnTransition(() => bot.chat("stay")),

  buildTransition('player says "bye"', BehaviorFollowEntity, BehaviorIdle) // 6
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition("closeToTarget", BehaviorFollowEntity, BehaviorLookAtFollowing) // 7
    .setShouldTransition((state) => state.distanceToTarget() < 3),

  buildTransition("farFromTarget", BehaviorLookAtFollowing, BehaviorFollowEntity) // 8
    .setShouldTransition((state) => state.distanceToTarget() >= 3),

  buildTransition('player says "bye"', BehaviorLookAtFollowing, BehaviorIdle) // 9
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "stay"', BehaviorLookAtFollowing, BehaviorLookAtPlayers), // 10
];

const root = buildNestedMachine('root', transitions, BehaviorIdle)
const stateMachine = new CentralStateMachine({bot, root, autoStart: false})


const behaviorPositions = new WebserverBehaviorPositions();
behaviorPositions
  .set(BehaviorIdle, 400, 100)
  .set(BehaviorLookAtPlayers, 400, 300)
  .set(BehaviorFollowEntity, 100, 400)
  .set(BehaviorFindEntity, 700, 100)
  .set(BehaviorLookAtFollowing, 700, 400)

const webserver = new StateMachineWebserver({stateMachine, behaviorPositions})
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