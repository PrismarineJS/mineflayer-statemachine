const mineflayer = require('mineflayer')
const { CentralStateMachine, StateMachineWebserver, StateTransition } = require('../lib')
const { BehaviorExit, BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } = require('../lib/behaviors')
const { newNestedStateMachine } = require('../lib/stateMachineNested')

/**
 * Set up your bot as you normally would
 */

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

const firstTransitions = [
  new StateTransition({
    parent: BehaviorFollowEntity,
    child: BehaviorExit,
    name: 'followToExit',
    shouldTransition: (data, state) => state.isFinished()
  })
]

const test = newNestedStateMachine({
  stateName: 'good test',
  transitions: firstTransitions,
  enter: BehaviorFollowEntity,
  exit: BehaviorExit
})

const secondTransitions = [
  new StateTransition({
    parent: BehaviorIdle,
    child: BehaviorLookAtEntity,
    name: 'idleToLook'
  }),

  new StateTransition({
    parent: BehaviorLookAtEntity,
    child: BehaviorIdle,
    name: 'lookToIdle'
  }),

  new StateTransition({
    parent: BehaviorIdle,
    child: test,
    name: 'idleToTest'
  }),

  new StateTransition({
    parent: test,
    child: BehaviorIdle,
    name: 'testToIdle',
    shouldTransition: (data, state) => state.isFinished()
  })
]

const root = newNestedStateMachine({
  stateName: 'root',
  transitions: secondTransitions,
  enter: BehaviorIdle
})

bot.loadPlugin(require('mineflayer-pathfinder').pathfinder)

const stateMachine = new CentralStateMachine({ bot, root })
const webserver = new StateMachineWebserver(stateMachine)
webserver.startServer()

const handle = (input) => {
  const split = input.split(' ')
  let target
  switch (split[0]) {
    case 'look':
      target = bot.nearestEntity((e) => e.type === 'player' && e.id !== bot.entity.id)
      if (!target) return
      stateMachine.root.data.entity = target
      stateMachine.root.transitions[0].trigger()
      break
    case 'lookstop':
      delete stateMachine.root.data.target
      stateMachine.root.transitions[1].trigger()
      break
    case 'come':
      target = bot.nearestEntity((e) => e.type === 'player' && e.id !== bot.entity.id)
      if (!target) return
      stateMachine.root.data.entity = target
      stateMachine.root.transitions[2].trigger()
      break
  }
}

bot.on('chat', (username, message) => handle(message))

// (async () => {
//   while (true) {
//     const state = stateMachine.root.activeState;
//     if (isNestedStateMachine(state.constructor)) {
//       console.log("in nested:", { ...state.activeState, bot: {} }, state.activeStateType);
//     } else {
//       console.log("in root:", { ...state, bot: {} }, state.constructor);
//     }

//     await new Promise((res, rej) => setTimeout(res, 1000));
//   }
// })();

// stateMachine.on("stateEntered", (nested,state) => console.log("ENTERED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
// stateMachine.on("stateExited", (nested, state) => console.log("EXITED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
