import mineflayer from "mineflayer";

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node webserver.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

import {
  BotStateMachine,
  StateMachineWebserver,
  buildTransition,
  buildTransitionArgs,
  buildNestedMachine,
} from "../../src/";

import {
  BehaviorIdle as Idle,
  BehaviorFindEntity as FindEntity,
  BehaviorFollowEntity,
  BehaviorLookAtEntity as LookAtTarget,
} from "../..//src/behaviors";

// to replicate the original mineflayer-statemachine exactly:
const LookAtPlayers = LookAtTarget.clone("LookAtPlayers");
const LookAtFollowing = LookAtTarget.clone("LookAtFollowing");
const FollowTarget = BehaviorFollowEntity.transform('FollowTarget', [{movements: undefined}])

const transitions = [
  buildTransitionArgs('player says "hi"', Idle, FindEntity, [(e) => e.type === "player"]) // 1
    .setOnTransition(() => bot.chat("hello")),

  buildTransition("closestToLook", FindEntity, LookAtPlayers) // 2
    .setShouldTransition(() => true),

  buildTransition('player says "bye"', LookAtPlayers, Idle) // 3
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "come"', LookAtPlayers, FollowTarget) // 4
    .setOnTransition(() => bot.chat("coming")),

  buildTransition('player says "stay"', FollowTarget, LookAtPlayers) // 5
    .setOnTransition(() => bot.chat("stay")),

  buildTransition('player says "bye"', FollowTarget, Idle) // 6
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition("closeToTarget", FollowTarget, LookAtFollowing) // 7
    .setShouldTransition((state) => state.distanceToTarget() < 3),

  buildTransition("farFromTarget", LookAtFollowing, FollowTarget) // 8
    .setShouldTransition((state) => state.distanceToTarget() >= 3),

  buildTransition('player says "bye"', LookAtFollowing, Idle) // 9
    .setOnTransition(() => bot.chat("goodbye")),

  buildTransition('player says "stay"', LookAtFollowing, LookAtPlayers), // 10
];

const root = buildNestedMachine("root", transitions, Idle);

const stateMachine = new BotStateMachine({ bot, root, autoStart: false });
const webserver = new StateMachineWebserver({ stateMachine });
webserver.startServer();

bot.once("spawn", () => {
  stateMachine.start();

  bot.on("chat", (username, message) => {
    if (message === "hi") {
      transitions[0].trigger();
    }

    if (message === "bye") {
      transitions[2].trigger();
      transitions[5].trigger();
      transitions[8].trigger();
    }

    if (message === "come") {
      transitions[3].trigger();
    }

    if (message === "stay") {
      transitions[4].trigger();
      transitions[9].trigger();
    }
  });
});
