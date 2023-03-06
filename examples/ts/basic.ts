// Create your bot
import mineflayer from 'mineflayer'
const bot = mineflayer.createBot({ username: "Player" });

// Load your dependency plugins.
bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);

// Import required structures.
import { BotStateMachine } from 'mineflayer-statemachine'

// Import required behaviors.
import {
    BehaviorExit,
    BehaviorFindEntity,
    BehaviorFollowEntity,
    BehaviorLookAtEntity
} from 'mineflayer-statemachine/lib/behaviors'

// import builders for transitions and machines.
import {
    buildTransition,
    buildNestedMachineArgs
} from 'mineflayer-statemachine/lib/builders'
    

// Util function to find the nearest player.
const nearestPlayer = (e) => e.type === 'player'

const transitions = [

    // If we do not find an entity, we should exit this machine.
    // We will transition if we have not found an entity.
    // On our transition, say a message that other players can see.
    buildTransition('findToFollow', BehaviorFindEntity, BehaviorExit)
        .setShouldTransition(state => !state.foundEntity())
        .setOnTransition(() => bot.chat('Could not find entity!')),
    
    // We want to start following the player immediately after finding them.
    // Since BehaviorFindEntity finishes instantly, we will transition almost immediately.
    buildTransition('findToFollow', BehaviorFindEntity, BehaviorFollowEntity)
        .setShouldTransition(state => state.foundEntity()),
    

    // If the distance to the player is less than two blocks, switch from the followPlayer
    // state to the lookAtPlayer state.
    buildTransition('followToLook', BehaviorFollowEntity, BehaviorLookAtEntity)
        .setShouldTransition(state => state.distanceToTarget() < 2),

    // If the distance to the player is more than two blocks, switch from the lookAtPlayer
    // state to the followPlayer state.
    buildTransition('lookToFollow', BehaviorLookAtEntity, BehaviorFollowEntity)
        .setShouldTransition(state => state.distanceToTarget() >= 2)
]

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = buildNestedMachineArgs('rootLayer', transitions, BehaviorFindEntity, [nearestPlayer], BehaviorExit)

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({bot, root, autoStart: false});

// Start the machine anytime using <name>.start()
bot.once('spawn', () => machine.start())
