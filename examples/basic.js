// check for correct usage at startup
if (process.argv.length < 4 || process.argv.length > 6) {
    console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}

// Create your bot
const mineflayer = require('mineflayer');
const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// Load your dependency plugins.
bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);


// Import required structures.
const { BotStateMachine, buildTransition, buildNestedMachineArgs } = require('@nxg-org/mineflayer-statemachine') 

// Import required behaviors.
// Note: Rename behaviors by import schema here.
const {
    BehaviorFindEntity: FindEntity,
    BehaviorFollowEntity: FollowTarget,
    BehaviorLookAtEntity: LookAtTarget
} = require('@nxg-org/mineflayer-statemachine/lib/behaviors')

// Util function to find the nearest player.
const nearestPlayer = (e) => e.type === 'player'

const transitions = [

    // We want to start following the player immediately after finding them.
    // Since BehaviorFindEntity finishes instantly, we will transition almost immediately.
    buildTransition('findToFollow', FindEntity, FollowTarget)
        .setShouldTransition(state => state.foundEntity()),
    
    // If the distance to the player is less than two blocks, switch from the followPlayer
    // state to the lookAtPlayer state.
    buildTransition('followToLook', FollowTarget, LookAtTarget)
        .setShouldTransition(state => state.distanceToTarget() < 2),

    // If the distance to the player is more than two blocks, switch from the lookAtPlayer
    // state to the followPlayer state.
    buildTransition('lookToFollow', LookAtTarget, FollowTarget)
        .setShouldTransition(state => state.distanceToTarget() >= 2)
]

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = buildNestedMachineArgs('rootLayer', transitions, FindEntity, [nearestPlayer])

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({bot, root, autoStart: false});

// Start the machine anytime using BotStateMachine.start()
bot.once('spawn', () => machine.start())
