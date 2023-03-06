// Create your bot
const mineflayer = require("mineflayer");
const bot = mineflayer.createBot({ username: "Player" });

// Load your dependency plugins.
bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);

// Import required structures.
const { BotStateMachine } = require('mineflayer-statemachine')

// Import required behaviors.
const {
    BehaviorFindEntity,
    BehaviorFollowEntity,
    BehaviorLookAtEntity
} = require('mineflayer-statemachine/lib/behaviors')

// import builders for transitions and machines.
const {
    buildTransition,
    buildNestedMachineArgs
} = require('mineflayer-statemachine/lib/builders')
    

// Util function to find the nearest player.
const nearestPlayer = (e) => e.type === 'player'

const transitions = [

    // We want to start following the player immediately after finding them.
    // Since getClosestPlayer finishes instantly, shouldTransition() should always return true.
    buildTransition('closeToFollow', BehaviorFindEntity, BehaviorFollowEntity)
        .setShouldTransition(() => true),
    
    // If the distance to the player is less than two blocks, switch from the followPlayer
    // state to the lookAtPlayer state.
    buildTransition('followToLook', BehaviorFollowEntity, BehaviorLookAtEntity)
        .setShouldTransition(state => state.distanceToTarget() < 2),


    // If the distance to the player is more than two blocks, switch from the lookAtPlayer
    // state to the followPlayer state.
    buildTransition('lookToFollow', BehaviorLookAtEntity, BehaviorFindEntity)
        .setShouldTransition(state => state.distanceToTarget() >= 2)
]

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = buildNestedMachineArgs('rootLayer', transitions, BehaviorFindEntity, [nearestPlayer])

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({bot, root, autoStart: false});

// Start the machine anytime using <name>.start()
bot.once('spawn', () => machine.start())
