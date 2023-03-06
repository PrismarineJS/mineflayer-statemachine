const mineflayer = require("mineflayer");
const { BotStateMachine, StateMachineWebserver } = require("../lib");
const {
  BehaviorExit,
  BehaviorFollowEntity,
  BehaviorIdle,
  BehaviorLookAtEntity,
  BehaviorFindEntity,
} = require("../lib/behaviors");
const {
  buildTransition,
  buildTransitionArgs,
  buildNestedMachineArgs,
  buildNestedMachine
} = require("../lib/builders");
/**
 * Set up your bot as you normally would
 */

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

// some utils to shorten.
const playerFilter = (e) => e.type === "player";
const isFinished = (state) => state.isFinished();

const findAndFollowTransitions = [
  buildTransition("findToFollow", BehaviorFindEntity, BehaviorFollowEntity).setShouldTransition((state) => state.foundEntity()),
  buildTransition("followToExit", BehaviorFollowEntity, BehaviorExit).setShouldTransition(isFinished),
];

const FollowMachine = buildNestedMachineArgs("findAndFollow", findAndFollowTransitions, BehaviorFindEntity, [playerFilter], BehaviorExit)

const rootTransitions = [
  buildTransitionArgs("idleToFind", BehaviorIdle, BehaviorFindEntity, [playerFilter]).setShouldTransition(() => true),
  buildTransition("findToLook", BehaviorFindEntity, BehaviorLookAtEntity),
  buildTransition("lookToIdle", BehaviorLookAtEntity, BehaviorIdle),
  buildTransition("findToTest", BehaviorFindEntity, FollowMachine),
  buildTransition("testToIdle", FollowMachine, BehaviorIdle).setShouldTransition(isFinished),
];

const RootMachine = buildNestedMachine("root", rootTransitions, BehaviorIdle);

const stateMachine = new BotStateMachine({ bot, root: RootMachine, autoStart: false });
const webserver = new StateMachineWebserver(stateMachine);
webserver.startServer();


bot.on("chat", (username, input) => {
  const split = input.split(" ");
  if (split[0] === "find") stateMachine.root.transitions[0].trigger();
  if (split[0] === "look") stateMachine.root.transitions[1].trigger();
  if (split[0] === "come") stateMachine.root.transitions[3].trigger();
  if (split[0] === "lookstop") stateMachine.root.transitions[2].trigger();
  if (split[0] === "movestop") stateMachine.root.transitions[4].trigger();
});

// added functionality to delay starting machine until bot spawns.
bot.on("spawn", async () => {
  stateMachine.start();
});
