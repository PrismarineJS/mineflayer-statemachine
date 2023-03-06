
if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

/**
 * Set up your bot as you normally would
 */
const mineflayer = require("mineflayer");

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// Imports
const {
  BotStateMachine,
  StateMachineWebserver,
  buildTransition,
  buildTransitionArgs,
  buildNestedMachine,
} = require("mineflayer-statemachine");

const { BehaviorIdle, BehaviorFindEntity, BehaviorLookAtEntity } = require("mineflayer-statemachine/lib/behaviors");

// util function for finding nearest player.
const nearestPlayer = (e) => e.type === "player";

// This targets object is used to pass data between different states. It can be left empty.
const data = {};

const BehaviorLook = BehaviorLookAtEntity.clone("LookAt");
const transitions = [

  // This transitions from the idleState to the getClosestPlayer state
  // when someone says hi in chat.
  buildTransitionArgs("idleToClosest", BehaviorIdle, BehaviorFindEntity, [nearestPlayer])
    .setOnTransition(() => bot.chat("hello")),

  // We want to start looking at the player immediately after finding them.
  // Since getClosestPlayer finishes instantly, shouldTransition() should always return true.
  buildTransition("closestToLook", BehaviorFindEntity, BehaviorLook)
    .setShouldTransition(() => true),

  // This transitions from the lookAtPlayersState to the idleState when
  // someone says bye in chat. We also want to say bye to the player.
  buildTransition("lookToIdle", BehaviorLook, BehaviorIdle)
    .setOnTransition(() => bot.chat("goodbye")),
];

// A state machine is made from a series of layers, so let's create the root
// layer to place in our state machine. We just need the transition list and
// the starting position.
const root = buildNestedMachine("Root", transitions, BehaviorIdle);

// Let's add these settings to the state machine and start it!
const stateMachine = new BotStateMachine({ bot, root, data, autoStart: false });
const webserver = new StateMachineWebserver(stateMachine);
webserver.startServer();


bot.once("spawn", () => {
  stateMachine.start();
  console.log(
    `Started a state machine with ${stateMachine.transitions.length} transitions and ${stateMachine.states.length} states`
  );
});

// Set up some quick events to trigger transitions.
bot.on("chat", (username, message) => {
  if (message === "hi") transitions[0].trigger();
  if (message === "bye") transitions[2].trigger();
});
