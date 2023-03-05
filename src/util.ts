import type { Bot } from 'mineflayer'
import type { StateBehavior, StateMachineData } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'

export type StateBehaviorBuilder<Args extends any[] = any[]> = NonConstructor<typeof StateBehavior> &
(
  | (new (bot: Bot, data: StateMachineData, ...additonal: Args) => StateBehavior)
// | (new (bot: Bot, data: StateMachineData, ...additonal: Args) => NestedStateMachine)
)

export type OmitTwo<T extends any[]> = T extends [first: infer R0, second: infer R1, ...any: infer R] ? R : never

type NonConstructorKeys<T> = { [P in keyof T]: T[P] extends new () => any ? never : P }[keyof T]
export type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>

export function isNestedStateMachine (first: FunctionConstructor['prototype']): first is typeof NestedStateMachine {
  while (first !== Function.prototype) {
    if (first === NestedStateMachine) {
      return true
    }
    first = Object.getPrototypeOf(first)
  }
  return false
}
