/**
 * Set up your bot as you normally would
 */
const mineflayer = require('mineflayer')

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node lookatplayers.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'statemachine_bot',
  password: process.argv[5]
})

/**
 * Setting up the state machine is pretty straightforward.
 */

// Imports
const {
  StateTransition,
  BotStateMachine,
  BehaviorIdle,
  BehaviorGetClosestEntity,
  BehaviorLookAtEntity,
  EntityFilters,
  NestedStateMachine
} = require('mineflayer-statemachine')

// Wait until we spawn
bot.on('spawn', () => {
  // This targets object is used to pass data between different states. It can be left empty.
  const targets = {}
  // The idle state makes the bot well, idle.
  const idleState = new BehaviorIdle()

  // This state will set targets.entity value to be the closest player.
  const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly)

  // This state will allow the bot to look at said player.
  const lookAtPlayersState = new BehaviorLookAtEntity(bot, targets)

  // Now we create a list of all the transitions that can occur between states.
  const transitions = [

    // This transitions from the idleState to the getClosestPlayer state
    // when someone says hi in chat.
    new StateTransition({
      parent: idleState,
      child: getClosestPlayer,
      onTransition: () => bot.chat('hello')
    }),

    // We want to start looking at the player immediately after finding them.
    // Since getClosestPlayer finishes instantly, shouldTransition() should always return true.
    new StateTransition({
      parent: getClosestPlayer,
      child: lookAtPlayersState,
      shouldTransition: () => true
    }),

    // This transitions from the lookAtPlayersState to the idleState when
    // someone says bye in chat. We also want to say bye to the player.
    new StateTransition({
      parent: lookAtPlayersState,
      child: idleState,
      onTransition: () => bot.chat('goodbye')
    })

  ]

  // Set up some quick events to trigger transitions.
  bot.on('chat', (username, message) => {
    if (message === 'hi') { transitions[0].trigger() }

    if (message === 'bye') { transitions[2].trigger() }
  })

  // A state machine is made from a series of layers, so let's create the root
  // layer to place in our state machine. We just need the transition list and
  // the starting position.
  const rootLayer = new NestedStateMachine(transitions, idleState)

  // Let's add these settings to the state machine and start it!
  const stateMachine = new BotStateMachine(bot, rootLayer)
  console.log(`Started a state machine with ${stateMachine.transitions.length} transitions and ${stateMachine.states.length} states`)
})
