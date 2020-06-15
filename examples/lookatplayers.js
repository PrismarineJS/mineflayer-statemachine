/**
 * Set up your bot as you normally would
 */
const mineflayer = require("mineflayer");
const args = require("minimist")(process.argv.slice(2));

console.log(`Starting bot '${args.login}' on ${args.host}:${args.port || 25565}`);
const bot = mineflayer.createBot({
    username: args.login,
    password: args.password,
    host: args.host,
    port: args.port,
});

/**
 * Setting up the state machine is pretty straightforward.
 */
const { StateTransition, BotStateMachine, BehaviorIdle,
    BehaviorLookAtEntities, EntityFilters } = require("mineflayer-statemachine"); 

// The idle state makes the bot well, idle.
const idleState = new BehaviorIdle(bot);

// This state will allow the bot to look at nearby players.
const lookAtPlayersState = new BehaviorLookAtEntities(bot, EntityFilters().PlayersOnly);

// Now we create a list of all the transitions that can occur between states.
const transitions = [

    // This transitions from the idleState to the lookAtPlayersState when
    // someone says hi in chat.
    new StateTransition({
        parent: idleState,
        child: lookAtPlayersState,
        onTransition: () => bot.chat("hello")
    }),

    // This transitions from the lookAtPlayersState to the idleState when
    // someone says bye in chat. We also want to say bye to the player.
    new StateTransition({
        parent: lookAtPlayersState,
        child: idleState,
        onTransition: () => bot.chat("goodbye")
    })

];

// Set up some quick events to trigger transitions.
bot.on("chat", (username, message) =>
{
    if (message === "hi")
        transitions[0].trigger();
    
    if (message === "bye")
        transitions[1].trigger();
});

// Let's add these settings to the state machine and start it!
// We just need the bot, the transition list, and we want to start in the idle state.
new BotStateMachine(bot, transitions, idleState);
