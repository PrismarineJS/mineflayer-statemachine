import mineflayer from "mineflayer";
import {
  BotStateMachine,
  StateMachineWebserver,
  buildTransition,
  buildTransitionArgs,
  newNestedStateMachineArgs,
} from "@nxg-org/mineflayer-statemachine/src";
import {
  BehaviorIdle as Idle,
  BehaviorExit as Exit,
  BehaviorFindEntity as FindEntity,
  BehaviorFollowEntity as FollowEntity,
  BehaviorLookAtEntity as LookAtTarget,
} from "@nxg-org/mineflayer-statemachine/src/behaviors";

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

const playerFilter = (e) => e.type === "player";
const isFinished = (state) => state.isFinished();

const findAndFollowTransitions = [
  buildTransition("findToFollow", FindEntity, FollowEntity)
    .setShouldTransition((state) => state.foundEntity()),

  buildTransition("followToExit", FollowEntity, Exit)
    .setShouldTransition(isFinished),
];

const FollowMachine = newNestedStateMachineArgs({
  stateName: "findAndFollow",
  transitions: findAndFollowTransitions,
  enter: FindEntity,
  exit: Exit,
  enterArgs: [playerFilter],
});

const secondTransitions = [
  buildTransitionArgs("idleToFind", Idle, FindEntity, [playerFilter])
    .setShouldTransition(() => true),
  buildTransition("findToLook", FindEntity, LookAtTarget),
  buildTransition("lookToIdle", LookAtTarget, Idle),
  buildTransition("findToTest", FindEntity, FollowMachine),
  buildTransition("testToIdle", FollowMachine, Idle)
    .setShouldTransition(isFinished),
];

const root = newNestedStateMachineArgs({
  stateName: "root",
  transitions: secondTransitions,
  enter: FindEntity,
  enterArgs: [playerFilter],
});

const stateMachine = new BotStateMachine({ bot, root, autoStart: false });
const webserver = new StateMachineWebserver({ stateMachine });
webserver.startServer();

// added functionality to delay starting machine until bot spawns.
bot.on("spawn", () => stateMachine.start());

const handle = (input) => {
  const split = input.split(" ");
  if (split[0] === "find") stateMachine.root.transitions[0].trigger();
  if (split[0] === "look") stateMachine.root.transitions[1].trigger();
  if (split[0] === "come") stateMachine.root.transitions[3].trigger();
  if (split[0] === "lookstop") stateMachine.root.transitions[2].trigger();
  if (split[0] === "movestop") stateMachine.root.transitions[4].trigger();
};

bot.on("chat", (username, message) => handle(message));