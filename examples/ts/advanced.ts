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
import { BotStateMachine, getTransition, buildNestedMachine, StateMachineWebserver } from "../../src";

// Import required behaviors.
import {
  BehaviorWildcard as Wildcard,
  BehaviorIdle as Idle,
  BehaviorExit as Exit,
  BehaviorFindEntity as FindEntity,
  BehaviorLookAtEntity as LookAtTarget,
  BehaviorFollowEntity as FollowEntity,
  BehaviorEquipItem,
} from "../../src/behaviors";
import { getNestedMachine } from "../../src/builders";

const FindPlayer = FindEntity.transform("FindPlayer", [e=>e.type === "player"]);
const CustomFollowEntity = FollowEntity.transform("FollowPlayer", [{ followDistance: 2 }]);

const comeToMeTransitions = [
  getTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition((state) => !state.foundEntity())
    .setOnTransition(() => bot.chat("Failed to find entity!"))
    .build(),

  getTransition("findToFollow", FindPlayer, CustomFollowEntity)
    .setShouldTransition((state) => state.foundEntity())
    .setOnTransition(() => bot.chat("Found entity!"))
    .build(),

  getTransition("followToExit", CustomFollowEntity, Exit)
    .setShouldTransition((state) => state.isFinished())
    .setOnTransition(() => bot.chat("Reached goal, finishing!"))
    .build(),
];
const comeMachine = getNestedMachine('comeToMe', comeToMeTransitions, FindPlayer, Exit).build();

const followAndLookTransitions = [
  // trigger this to exit the state machine.
  getTransition("wildcardExit", Wildcard, Exit).build(),

  getTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition((state) => !state.foundEntity())
    .setOnTransition(() => bot.chat("Failed to find entity!"))
    .build(),

  getTransition("findToLook", FindPlayer, LookAtTarget)
    .setShouldTransition((state) => state.foundEntity())
    .setOnTransition(() => bot.chat("Found entity!"))
    .build(),

  getTransition("lookToFollow", LookAtTarget, CustomFollowEntity)
    .setShouldTransition((state) => state.distanceToTarget() > 2)
    .setOnTransition(() => bot.chat("Found entity!"))
    .build(),

  getTransition("followToLook", CustomFollowEntity, LookAtTarget)
    .setShouldTransition((state) => state.distanceToTarget() <= 2)
    .setOnTransition(() => bot.chat("Found entity!"))
    .build(),

  // new multiple transitions, strongly typed!
  getTransition("followingTooFar", [CustomFollowEntity, LookAtTarget], Exit)
    .setShouldTransition((state) => state.distanceToTarget() > 32)
    .build(),
];

const followMachine = getNestedMachine("followAndLook", followAndLookTransitions, FindPlayer).build()

const rootTransitions = [
  getTransition("wildcard", Wildcard, Idle)
    .setShouldTransition((state) => state.isFinished())
    .build(),

  getTransition("come", Idle, comeMachine)
    .setOnTransition(() => bot.chat("coming"))
    .build(),

  getTransition("follow", Idle, followMachine)
    .setOnTransition(() => bot.chat("Following"))
    .build(),

  getTransition("equip", Idle, BehaviorEquipItem).setEntryArgs("sword", "hand").build(),
];

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = getNestedMachine("rootLayer", rootTransitions, Idle).build();

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({
  bot,
  root,
  autoStart: false,
});

const webserver = new StateMachineWebserver({ stateMachine: machine });
webserver.startServer();

// Start the machine anytime using <name>.start()
bot.once("spawn", () => {
  machine.start();

  bot.on("chat", (user, message) => {
    const [cmd] = message.trim().split(" ");
    if (cmd === "come") rootTransitions[1].trigger();
    if (cmd === "follow") rootTransitions[2].trigger();
    if (cmd === "equip") rootTransitions[3].trigger();
  });
});
