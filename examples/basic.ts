import { createBot } from "mineflayer";
import { buildTransition, CentralStateMachine, StateMachineWebserver, StateTransition, StateTransitionInfo } from "../src";
import {
  BehaviorExit,
  BehaviorFindEntity as BehaviorClosestEntity,
  BehaviorFollowEntity,
  BehaviorIdle,
  BehaviorLookAtEntity,
} from "../src/behaviors";
import { buildNewNestedMachine, newNestedStateMachine } from "../src/stateMachineNested";

/**
 * Set up your bot as you normally would
 */

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

const bot = createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// first try at a streamlined transition build process.
const firstTransitions = [
  buildTransition("closestToExit", BehaviorClosestEntity, BehaviorExit, undefined)
    .setShouldTransition((data, state) => !state.foundEntity()),
  buildTransition("closestToFollow", BehaviorClosestEntity, BehaviorFollowEntity, undefined)
    .setShouldTransition((data, state) => state.foundEntity()),
  buildTransition("followToClosest", BehaviorFollowEntity, BehaviorClosestEntity, [e=>e.type==="player"])
    .setShouldTransition((data, state) => state.isFinished()),
  buildTransition("followToExit", BehaviorFollowEntity, BehaviorExit, undefined)
    .setShouldTransition((data, state) => state.isFinished())
];

// first try at a streamlined nested machine build process.
const test = buildNewNestedMachine("good test", BehaviorClosestEntity, BehaviorExit, firstTransitions)


const secondTransitions = [
  buildTransition("idleToLook", BehaviorIdle, BehaviorLookAtEntity, undefined),
  buildTransition("lookToIdle", BehaviorLookAtEntity, BehaviorIdle, undefined),
  buildTransition("idleToTest", BehaviorIdle, test, undefined),
  buildTransition("testToIdle", test, BehaviorIdle, undefined)
    .setShouldTransition((data, state) => state.isFinished())
];

const root = newNestedStateMachine({
  stateName: "root",
  transitions: secondTransitions,
  enter: BehaviorIdle,
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

const stateMachine = new CentralStateMachine({ bot, root });
const webserver = new StateMachineWebserver(stateMachine);
webserver.startServer();

const handle = (input) => {
  const split = input.split(" ");
  let target;
  switch (split[0]) {
    case "look":
      stateMachine.root.transitions[0].trigger();
      break;
    case "lookstop":
      stateMachine.root.transitions[1].trigger();
      break;
    case "come":
      stateMachine.root.transitions[2].trigger();
      break;
    case "movestop":
      stateMachine.root.transitions[3].trigger();
      break;
  }
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
