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

const {
    StateTransition,
    BotStateMachine,
    BehaviorIdle,
    BehaviorLookAtEntities,
    EntityFilters,
    StateMachineWebserver, 
    BehaviorLogin} = require("./../lib");

const loginState = new BehaviorLogin(bot);
const idleState = new BehaviorIdle(bot);
const lookAtPlayersState = new BehaviorLookAtEntities(bot, EntityFilters().PlayersOnly);

const transitions = [

    new StateTransition({
        parent: loginState,
        child: idleState,
        shouldTransition: () => loginState.isLoggedIn(),
    }),

    new StateTransition({
        parent: idleState,
        child: lookAtPlayersState,
        onTransition: () => bot.chat("hello")
    }),

    new StateTransition({
        parent: lookAtPlayersState,
        child: idleState,
        onTransition: () => bot.chat("goodbye")
    })

];

bot.on("chat", (username, message) =>
{
    if (message === "hi")
        transitions[0].trigger();

    if (message === "bye")
        transitions[1].trigger();
});

const stateMachine = new BotStateMachine(bot, transitions, loginState);
const webserver = new StateMachineWebserver(bot, stateMachine);

webserver.startServer();