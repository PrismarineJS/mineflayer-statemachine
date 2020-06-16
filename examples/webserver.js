const mineflayer = require("mineflayer");
const args = require("minimist")(process.argv.slice(2));

const login = args.login;
const password = args.password;
const host = args.host || "localhost";
const port = args.port || 25565;

console.log(`Starting bot '${login}' on ${host}:${port}`);
const bot = mineflayer.createBot({
    username: login,
    password: password,
    host: host,
    port: port,
});

bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);

const {
    globalSettings, 
    StateTransition,
    BotStateMachine,
    StateMachineWebserver, 
    EntityFilters,
    BehaviorIdle,
    BehaviorPrintServerStats,
    BehaviorFollowEntity,
    BehaviorLookAtEntity,
    BehaviorGetClosestEntity } = require("./../lib");

globalSettings.debugMode = true;

let initialized = false;
bot.on("spawn", () =>
{
    if (initialized) return;
    initialized = true;

    const targets = {};

    const printServerStates = new BehaviorPrintServerStats(bot);
    const idleState = new BehaviorIdle(bot);
    const lookAtPlayersState = new BehaviorLookAtEntity(bot, targets);
    const followPlayer = new BehaviorFollowEntity(bot, targets);
    const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly);
    const lookAtFollowTarget = new BehaviorLookAtEntity(bot, targets);

    const transitions = [

        new StateTransition({ // 0
            parent: printServerStates,
            child: idleState,
            shouldTransition: () => true,
        }),

        new StateTransition({ // 1
            parent: idleState,
            child: getClosestPlayer,
            name: 'player says "hi"',
            onTransition: () => bot.chat("hello")
        }),

        new StateTransition({ // 2
            parent: getClosestPlayer,
            child: lookAtPlayersState,
            shouldTransition: () => true,
        }),

        new StateTransition({ // 3
            parent: lookAtPlayersState,
            child: idleState,
            name: 'player says "bye"',
            onTransition: () => bot.chat("goodbye")
        }),

        new StateTransition({ // 4
            parent: lookAtPlayersState,
            child: followPlayer,
            name: 'player says "come"',
            onTransition: () => bot.chat("coming")
        }),

        new StateTransition({ // 5
            parent: followPlayer,
            child: lookAtPlayersState,
            name: 'player says "stay"',
            onTransition: () => bot.chat("staying")
        }),

        new StateTransition({ //  6
            parent: followPlayer,
            child: idleState,
            name: 'player says "bye"',
            onTransition: () => bot.chat("goodbye")
        }),

        new StateTransition({ // 7
            parent: followPlayer,
            child: lookAtFollowTarget,
            name: 'closeToTarget',
            shouldTransition: () => followPlayer.distanceToTarget() < 2,
        }),

        new StateTransition({ // 8
            parent: lookAtFollowTarget,
            child: followPlayer,
            name: 'farFromTarget',
            shouldTransition: () => lookAtFollowTarget.distanceToTarget() >= 2,
        }),

        new StateTransition({ // 9
            parent: lookAtFollowTarget,
            child: idleState,
            name: 'player says "bye"',
            onTransition: () => bot.chat("goodbye")
        }),

        new StateTransition({ // 10
            parent: lookAtFollowTarget,
            child: lookAtPlayersState,
            name: 'player says "stay"',
        }),

    ];

    bot.on("chat", (username, message) =>
    {
        if (message === "hi")
            transitions[1].trigger();

        if (message === "bye")
        {
            transitions[3].trigger();
            transitions[6].trigger();
            transitions[9].trigger();
        }

        if (message === "come")
            transitions[4].trigger();

        if (message === "stay")
        {
            transitions[5].trigger();
            transitions[10].trigger();
        }
    });

    const stateMachine = new BotStateMachine(bot, transitions, printServerStates);
    const webserver = new StateMachineWebserver(bot, stateMachine);

    webserver.startServer();
});
