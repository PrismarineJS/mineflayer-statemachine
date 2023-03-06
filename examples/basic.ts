import mineflayer from "mineflayer";
import { Movements } from "mineflayer-pathfinder";
import { NestedStateMachineOptions } from "../src";
import {
  buildTransition,
  buildTransitionArgs,
  CentralStateMachine,
  StateMachineWebserver,
  StateTransition,
} from "../src";
import {
  BehaviorExit,
  BehaviorFollowEntity,
  BehaviorIdle,
  BehaviorLookAtEntity,
  BehaviorFindEntity,
} from "../src/behaviors";
import {
  newNestedStateMachineArgs,
  buildNestedMachine,
  NestedStateMachine,
  buildNestedMachineArgs,
} from "../src/stateMachineNested";
import { HasArgs, OmitTwo, StateBehaviorBuilder, StateConstructorArgs } from "../src/util";

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
  buildTransition("findToFollow", BehaviorFindEntity, BehaviorFollowEntity)
    .setShouldTransition((state) => state.foundEntity()),

  buildTransition("followToExit", BehaviorFollowEntity, BehaviorExit)
    .setShouldTransition(isFinished),
];

const FollowMachine = newNestedStateMachineArgs({
  stateName: "findAndFollow",
  transitions: findAndFollowTransitions,
  enter: BehaviorFindEntity,
  exit: BehaviorExit,
  enterArgs: [playerFilter],
});

const secondTransitions = [
  buildTransitionArgs("idleToFind", BehaviorIdle, BehaviorFindEntity, [playerFilter])
    .setShouldTransition(() => true),

  buildTransition("findToLook", BehaviorFindEntity, BehaviorLookAtEntity),
  buildTransition("lookToIdle", BehaviorLookAtEntity, BehaviorIdle),
  buildTransition("findToTest", BehaviorFindEntity, FollowMachine),
  buildTransition("testToIdle", FollowMachine, BehaviorIdle)
    .setShouldTransition(isFinished),
];

const RootMachine = newNestedStateMachineArgs({
  stateName: "root",
  transitions: secondTransitions,
  enter: BehaviorFindEntity,
  enterArgs: [playerFilter],
});

const stateMachine = new CentralStateMachine({ bot, root: RootMachine, autoStart: false });
const webserver = new StateMachineWebserver(stateMachine);
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

// (async () => {
//   while (true) {
//     const state = stateMachine.root.activeState;
//     if (isNestedStateMachine(state.constructor)) {
//       console.log("in nested:", { ...state.activeState, bot: {} }, state.activeStateType);
//     } else {
//       console.log("in root:", { ...state, bot: {} }, state.constructor);
//     }

//     await new Promise((res, rej) => setTimeout(res, 1000));
//   }
// })();

// stateMachine.on("stateEntered", (nested,state) => console.log("ENTERED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
// stateMachine.on("stateExited", (nested, state) => console.log("EXITED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
