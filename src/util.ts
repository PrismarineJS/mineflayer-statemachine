import type { Bot } from 'mineflayer'
import type { StateBehavior, StateMachineData } from './stateBehavior'
import { NestedStateMachine, NestedStateMachineOptions } from './stateMachineNested'

export type StateBehaviorBuilder<Args extends any[] = any[]> = NonConstructor<typeof StateBehavior> &
(new (bot: Bot, data: StateMachineData, ...additonal: Args) => StateBehavior)

export type OmitTwo<T extends any[]> = T extends [first: any, second: any, ...any: infer R] ? R : never

export type HasArgs<Child extends StateBehaviorBuilder> = OmitTwo<Required<ConstructorParameters<Child>>> extends [
  first: any,
  ...any: any
]
  ? Child
  : never
export type NoArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>> extends [
  first: any,
  ...any: any
]
  ? never
  : Child

export type StateConstructorArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>>

export type SpecifcNestedStateMachine<
  Enter extends StateBehaviorBuilder = StateBehaviorBuilder,
  Exit extends StateBehaviorBuilder = StateBehaviorBuilder
> = typeof NestedStateMachine & NestedStateMachineOptions<Enter, Exit>

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
