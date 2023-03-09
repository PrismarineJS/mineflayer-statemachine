// check for correct usage at startup
if (process.argv.length < 4 || process.argv.length > 6) {
    console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}

// Create your bot
const mineflayer = require('mineflayer');
const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// Load your dependency plugins.
bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

// Import required structures.
const {
  BotStateMachine,
  buildTransition,
  buildNestedMachine,
  StateMachineWebserver,
  WebserverBehaviorPositions
} = require("../");

// Import required behaviors.
// Note: Behavior renaming happens here.
const {
  BehaviorWildcard: Wildcard,
  BehaviorIdle : Idle,
  BehaviorExit : Exit,
  BehaviorFindEntity : FindEntity,
  BehaviorLookAtEntity : LookAtTarget,
  BehaviorFollowEntity : FollowEntity,
} = require("../lib/behaviors")

// Have a class that requires arguments and you're too lazy to provide them every time?
// No worries, now you can transform this class into a new one using these provided arguments!
// Yes, it's strongly typed. Don't ask how, it took a while.
// For those interested, you can see what remaining arguments you need to pass by hovering the variable.
const FindPlayer = FindEntity.transform("FindPlayer", [e=>e.type === "player"])
const CustomFollowEntity = FollowEntity.transform("FollowPlayer", [{followDistance: 2}])

// create an array storing all of the transitions we will build.
const comeToMeTransitions = [

  // Transitions occur in order inside of this array.
  // We first want to check whether or not we have found an entity.
  // If we do not find an entity, go to exit class of this machine.
  // We should also inform our user that there was no nearby player.
  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  // This transition will only run if the previous one was not met.
  // So, if we find an entity, transition into our follow entity method!
  // We should also tell our user that we found an entity.
  buildTransition("findToFollow", FindPlayer, CustomFollowEntity)
    .setShouldTransition(state => state.foundEntity())
    .setOnTransition(() => bot.chat('Found entity!')),

  // We have entered the follow state IFF we have found an entity.
  // We will stay in this state until it completes, then transition to exit.
  // We should tell our user that we reach our goal, when we do.
  buildTransition('followToExit', CustomFollowEntity, Exit)
    .setShouldTransition(state => state.isFinished())
    .setOnTransition(() => bot.chat('Reached goal, finishing!'))
]

// This machine will store all of of the transitions and provide usecases for them.
// This machine will start on the Enter state (provided)
// and will signal being finished IFF an Exit state is provided.
const comeMachine = buildNestedMachine('comeToMe', comeToMeTransitions, FindPlayer, Exit)


// Same logic as above except for a new machine.
const followAndLookTransitions = [

  // Here is our first newly added feature: the wildcard.
  // The Wildcard class is provided by mineflayer-statemachine, you have to use it.
  // This transition will always be checked, regardless of what is currently running.
  // In this example, this is used to immediately terminate this statemachine regardless of current state.
  buildTransition('wildcardExit', Wildcard, Exit),

  // We have entered this machine, looked for a player, and didn't find one.
  // We will exit this statemachine.
  // We should report to user that we did not find an entity.
  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  // We're looking for a player, and now we found one!
  // We should move to the LookAtTarget state.
  buildTransition("findToLook", FindPlayer, LookAtTarget)
    .setShouldTransition(state => state.foundEntity()),

  // We are looking at a player, but he's moving away!
  // We should start following them if they get too far away (2 blocks)
  buildTransition("lookToFollow", LookAtTarget, CustomFollowEntity)
    .setShouldTransition(state => state.distanceToTarget() > 2),

  // We were following a player, but now they're really close!
  // We should stop following and simply look at them if they're so close.
  buildTransition("followToLook", CustomFollowEntity, LookAtTarget)
    .setShouldTransition(state => state.distanceToTarget() <= 2),

  // Another new feature! Multiple parents for transitions.
  // In this example, both of these classes have the method `distanceToTarget`
  // So it's safe to call this method! (in typescript, this is strongly checked)
  // If this state is in either of these parent states, this transition will trigger
  //
  // In this example, we will exit the program if the player gets too far away.
  buildTransition('followingTooFar', [CustomFollowEntity, LookAtTarget], Exit)
    .setShouldTransition(state => state.distanceToTarget() > 32)
]

// Another creation of the machine.
// However, notice the Array of Behaviors for exit.
// That's right, we can have multiple exit states now! Why? I have no idea yet. But you can!
// NOTE: I *may* make it so machines have easy access to one another's active states. Maybe.
const followMachine = buildNestedMachine('followAndLook', followAndLookTransitions, FindPlayer, [Exit])


// Yet more transitions, except these encompass the previous state machines!
const rootTransitions = [

  // wildcard!
  // In this example, why bother writing "return to idle" statements for every machine?
  // Use one wildcard to handle them all! :grin:
  buildTransition('wildcardRevert', Wildcard, Idle)
    .setShouldTransition(state => state.isFinished()),

  // Switch to comeMachine
  buildTransition('come', Idle, comeMachine)
    .setOnTransition(() => bot.chat('coming')),

  // Switch to followMachine
  buildTransition('follow', Idle, followMachine)
    .setOnTransition(() => bot.chat('Following'))
]

// We've made it! 
// Build the root machine and we're done (mostly)
const root = buildNestedMachine("rootLayer", rootTransitions, Idle);


// simply make a new machine!
// NOTE: autoStart: false is used because I don't want to wrap everything in bot.spawn
// up to you, default is true.
// Congrats! All statemachine functionality is done.
const machine = new BotStateMachine({ bot, root, autoStart: false });

// might as well provide some functionality to commands.
bot.once("spawn", () => {
  machine.start()

  // todo: add better manual transition switching.
  bot.on('chat', (user, message) => {
    const [cmd] = message.trim().split(' ')
    if (cmd === 'come') root.transitions[1].trigger()
    if (cmd === 'follow') root.transitions[2].trigger()
    if (cmd === 'stop') {
      if (machine.activeMachine === followMachine) {
        followMachine.transitions[0].trigger();
      } else {
        bot.chat('We are currently not following!')
      }
    }
  })
});

// EVERYTHING AFTER THIS IS OPTIONAL.

// We can set up static state offsets (x, y) based on their parent machine
// Usage is obvious, so have fun reading.
const offsets = new WebserverBehaviorPositions()
  // comeMachine
  .set(FindPlayer, 100, 350, comeMachine)
  .set(CustomFollowEntity, 350, 350, comeMachine)
  .set(Exit, 600, 350, comeMachine)
  // followMachine
  .set(Wildcard, 350, 650, followMachine)
  .set(Exit, 350, 350, followMachine)
  .set(FindPlayer, 350, 50, followMachine)
  .set(LookAtTarget, 100, 200, followMachine)
  .set(CustomFollowEntity, 100, 500, followMachine)
  // rootMachine
  .set(Idle, 350, 350, root)
  .set(Wildcard, 350, 50, root)
  .set(followMachine, 100, 600, root)
  .set(comeMachine, 600, 600, root)
 

// create a debug server using the root machine and its presetPositions.
const webserver = new StateMachineWebserver({stateMachine: machine, presetPositions: offsets})

// this can be started whenever, so have at it!
webserver.startServer();


// debug, displaying 0ms switching of states.
let time = performance.now()
machine.on('stateEntered', (type, nested, state) => {
  const now = performance.now();
  console.log(type.stateName, state.stateName, now - time);

  time = now;
})
