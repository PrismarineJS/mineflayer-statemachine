import { StateTransition } from './stateTransition'
import { clone, transform } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'
import { HasArgs, ListType, NoArgs, SpecifcNestedStateMachine, StateBehaviorBuilder, StateConstructorArgs, U2T } from './util'

/**
 * Builds a transition with no constructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 */
export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parent,
  child: NoArgs<Child>
): StateTransition<[Parent], Child>

/**
 * Builds a transition with constructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 */
export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parent,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<[Parent], Child>

/**
 * Builds a transition with no constructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 */
export function buildTransition<Parents extends readonly StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: NoArgs<Child>
): StateTransition<U2T<ListType<Parents>>, Child>

/**
 * Builds a transition with constructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 */
export function buildTransition<Parents extends readonly StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<U2T<ListType<Parents>>, Child>
export function buildTransition<Parents extends readonly StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: Child,
  args?: HasArgs<Child> extends Child ? StateConstructorArgs<Child> : undefined
): StateTransition<U2T<ListType<Parents>>, Child> {
  let realParents: readonly StateBehaviorBuilder[]
  if (!(parents instanceof Array)) realParents = [parents]
  else realParents = parents

  return new StateTransition<U2T<ListType<Parents>>, Child>({
    parents: realParents as any, // as U2T<ListType<Parents>> but already checked
    child,
    name,
    constructorArgs: args as any // only passed in when we have arguments, otherwise undefined.
  })
}

export function buildNestedMachine<Enter extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
): ReturnType<typeof internalBuildNested<Enter, undefined>>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit: Exit,
): ReturnType<typeof internalBuildNested<Enter, [Exit]>>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit: Exits,
): ReturnType<typeof internalBuildNested<Enter, Exits>>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[] | undefined> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit?: Exits
): ReturnType<typeof internalBuildNested<Enter, Exits>> {
  return internalBuildNested(stateName, transitions, enter, undefined, exit)
}

export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exit,
): ReturnType<typeof internalBuildNested<Enter, [Exit]>>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exits,
): ReturnType<typeof internalBuildNested<Enter, Exits>>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exits
): ReturnType<typeof internalBuildNested<Enter, Exits>> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exits)
}

/**
 * Creates a new Nested State Machine class.
 *
 * This does NOT create an instance. This is used statically.
 *
 * @param stateName Name of state.
 * @returns {typeof NestedStateMachine} A static reference to a new NestedMachine.
 */
function internalBuildNested<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[] | undefined> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: Enter,
  enterArgs?: StateConstructorArgs<Enter>,
  exits?: Exits
): Exits extends undefined ? SpecifcNestedStateMachine<Enter> : SpecifcNestedStateMachine<Enter, U2T<ListType<Exits>>> {
  const states: StateBehaviorBuilder[] = []

  states.push(enter)

  let realExits: StateBehaviorBuilder[] | undefined

  if (exits != null) {
    if (!(exits instanceof Array)) realExits = [exits]
    else realExits = exits
    for (const exit of realExits) {
      if (!states.includes(exit)) states.push(exit)
    }
  }

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i]
    for (const parentState of trans.parentStates) {
      if (!states.includes(parentState)) states.push(parentState)
    }
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }

  return class BuiltNestedStateMachine extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
    public static readonly enterArgs = enterArgs as any
    public static readonly exits? = realExits as any
    public static readonly onStartupListeners = []

    public static readonly clone = clone
    public static readonly transform = transform
  } as any
}
