// Create your bot

if (process.argv.length < 4 || process.argv.length > 6) {
    console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}

import mineflayer from "mineflayer";

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// Load your dependency plugins.
bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

// Import required structures.
import {
  BotStateMachine,
  buildTransition,
  buildNestedMachine,
} from "../../src";

// Import required behaviors.
import {
  BehaviorWildcard as Wildcard,
  BehaviorIdle as Idle,
  BehaviorExit as Exit,
  BehaviorFindEntity as FindEntity,
  BehaviorLookAtEntity as LookAtTarget,
  BehaviorFollowEntity as FollowEntity,
} from "../../src/behaviors";

const FindPlayer = FindEntity.transform("FindPlayer", [e => e.type === "player"])
const CustomFollowEntity = FollowEntity.transform("FollowPlayer", [{followDistance: 2}])


const comeToMeTransitions = [
  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  buildTransition("findToFollow", FindPlayer, CustomFollowEntity)
    .setShouldTransition(state => state.foundEntity())
    .setOnTransition(() => bot.chat('Found entity!')),

  buildTransition('followToExit', CustomFollowEntity, Exit)
    .setShouldTransition(state => state.isFinished())
    .setOnTransition(() => bot.chat('Reached goal, finishing!'))
]

const comeMachine = buildNestedMachine('comeToMe', comeToMeTransitions, FindPlayer, Exit);

const followAndLookTransitions = [
  // trigger this to exit the state machine.
  buildTransition('wildcardExit', Wildcard, Exit),

  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  buildTransition("findToLook", FindPlayer, LookAtTarget)
    .setShouldTransition(state => state.foundEntity())
    .setOnTransition(() => bot.chat('Found entity!')),

  buildTransition("lookToFollow", LookAtTarget, CustomFollowEntity)
    .setShouldTransition(state => state.distanceToTarget() > 2)
    .setOnTransition(() => bot.chat('Found entity!')),

  buildTransition("followToLook", CustomFollowEntity, LookAtTarget)
    .setShouldTransition(state => state.distanceToTarget() <= 2)
    .setOnTransition(() => bot.chat('Found entity!')),

  // new multiple transitions, strongly typed!
  buildTransition('followingTooFar', [CustomFollowEntity, LookAtTarget], Exit)
    .setShouldTransition(state => state.distanceToTarget() > 32)

]

const followMachine = buildNestedMachine('followAndLook', followAndLookTransitions, FindPlayer);


const rootTransitions = [
  buildTransition('come', Idle, comeMachine)
    .setOnTransition(() => bot.chat('coming')),

  buildTransition('follow', Idle, followMachine)
    .setOnTransition(() => bot.chat('Following'))
]



// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = buildNestedMachine("rootLayer", rootTransitions, Idle);

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({ 
  bot, 
  data: {test: "hey"},
  root, 
  autoStart: false 
});

// Start the machine anytime using <name>.start()
bot.once("spawn", () => {
  machine.start()

  bot.on('chat', (user, message) => {
    const [cmd] = message.trim().split(' ')
    if (cmd === 'come') rootTransitions[0].trigger()
    if (cmd === 'follow') rootTransitions[1].trigger()
  })
});



