export { BotStateMachine } from './stateMachineBot'
export { NestedStateMachine } from './stateMachineNested'
export { StateBehavior, StateTransition } from './stateBehavior'
export { StateMachineWebserver, WebserverBehaviorPositions } from './webserver'

export {
  buildNestedMachine,
  buildNestedMachineArgs,
  buildTransition,
  buildTransitionArgs,
  newNestedStateMachine,
  newNestedStateMachineArgs
} from './builders'

export const globalSettings = {
  debugMode: true
}
