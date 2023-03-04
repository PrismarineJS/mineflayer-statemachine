import { NestedStateMachine } from './stateMachineNested'

export function isNestedStateMachine (first: FunctionConstructor['prototype']): first is typeof NestedStateMachine {
  while (first !== Function.prototype) {
    if (first === NestedStateMachine) {
      return true
    }
    first = Object.getPrototypeOf(first)
  }
  return false
}
