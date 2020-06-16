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
    StateTransition,
    BotStateMachine,
    BehaviorIdle,
    BehaviorLookAtEntities,
    EntityFilters,
    StateMachineWebserver, 
    BehaviorPrintServerStats,
    globalSettings, 
    BehaviorFollowEntity} = require("./../lib");

globalSettings.debugMode = true;

let initialized = false;
bot.on("spawn", () =>
{
    if (initialized) return;
    initialized = true;

    const printServerStates = new BehaviorPrintServerStats(bot);
    const idleState = new BehaviorIdle(bot);
    const lookAtPlayersState = new BehaviorLookAtEntities(bot, EntityFilters().PlayersOnly);
    const followPlayer = new BehaviorFollowEntity(bot);

    followPlayer.setFollowTarget(bot.players.TheDudeFromCI.entity);

    const transitions = [

        new StateTransition({
            parent: printServerStates,
            child: idleState,
            shouldTransition: () => true,
        }),

        new StateTransition({
            parent: idleState,
            child: lookAtPlayersState,
            name: 'player says "hi"',
            onTransition: () => bot.chat("hello")
        }),

        new StateTransition({
            parent: lookAtPlayersState,
            child: idleState,
            name: 'player says "bye"',
            onTransition: () => bot.chat("goodbye")
        }),

        new StateTransition({
            parent: lookAtPlayersState,
            child: followPlayer,
            name: 'player says "come"',
            onTransition: () => bot.chat("coming")
        }),

        new StateTransition({
            parent: followPlayer,
            child: lookAtPlayersState,
            name: 'player says "stay"',
            onTransition: () => bot.chat("staying")
        }),

    ];

    bot.on("chat", (username, message) =>
    {
        if (message === "hi")
            transitions[1].trigger();

        if (message === "bye")
            transitions[2].trigger();

        if (message === "come")
            transitions[3].trigger();

        if (message === "stay")
            transitions[4].trigger();
    });

    const stateMachine = new BotStateMachine(bot, transitions, printServerStates);
    const webserver = new StateMachineWebserver(bot, stateMachine);

    webserver.startServer();
});
