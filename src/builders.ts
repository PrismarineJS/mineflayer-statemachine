import { StateTransition } from './stateTransition'
import { clone, transform } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'
import { HasArgs, ListType, NoArgs, SpecifcNestedStateMachine, StateBehaviorBuilder, StateConstructorArgs, U2T } from './util'

/**
 * Builds a transition with no consttructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 * @param name
 * @param parents
 * @param child
 * @returns
 */
export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parent,
  child: NoArgs<Child>
): StateTransition<[Parent], Child>
export function buildTransition<Parents extends readonly StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: NoArgs<Child>
): StateTransition<U2T<ListType<Parents>>, Child>
export function buildTransition<Parents extends StateBehaviorBuilder | readonly StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: NoArgs<Child>
): StateTransition<Parents extends StateBehaviorBuilder ? readonly [Parents] : U2T<ListType<Parents>>, Child> {
  let realParents: readonly StateBehaviorBuilder[]
  if (!(parents instanceof Array)) realParents = [parents]
  else realParents = parents

  return new StateTransition<Parents extends StateBehaviorBuilder ? [Parents] : U2T<ListType<Parents>>, Child>({
    parents: realParents as any,
    child,
    name
  } as any)
}

/**
   * Builds a transition with consttructor arguments.
   *
   * This does strongly type check for classes that have any optional/required arguments besides bot and data.
   * @param name
   * @param parent
   * @param child
   * @param args
   * @returns
   */
export function buildTransitionArgs<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parent,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<[Parent], Child>
export function buildTransitionArgs<Parents extends StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<Parents, Child>
export function buildTransitionArgs<Parents extends StateBehaviorBuilder | StateBehaviorBuilder[], Child extends StateBehaviorBuilder> (
  name: string,
  parents: Parents,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<Parents extends StateBehaviorBuilder ? [Parents] : U2T<ListType<Parents>>, Child> {
  let realParents: StateBehaviorBuilder[]
  if (!(parents instanceof Array)) realParents = [parents]
  else realParents = parents

  return new StateTransition<Parents extends StateBehaviorBuilder ? [Parents] : U2T<ListType<Parents>>, Child>({
    parents: realParents as any,
    child,
    name,
    constructorArgs: args
  })
}

// Allow overloads for this class method.
// function addEntry<This extends NestedMachineBuilder, Entry extends StateBehaviorBuilder>(this: This, entry: NoArgs<Entry>): void;
// function addEntry<This extends NestedMachineBuilder, Entry extends StateBehaviorBuilder>(this: This, entry: HasArgs<Entry>, args: StateConstructorArgs<HasArgs<Entry>>): void;
// function addEntry<This extends NestedMachineBuilder, Entry extends StateBehaviorBuilder>(this: This, entry: Entry, args?: StateConstructorArgs<HasArgs<Entry>>): void {
//   this.entries[entry.name + entry.stateName] = [entry, args];
// }

export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates?: boolean
): SpecifcNestedStateMachine<Enter, [Exit]>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit?: Exits,
  enterIntermediateStates?: boolean
): SpecifcNestedStateMachine<Enter, Exits>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder | StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exits?: Exits,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exits extends StateBehaviorBuilder ? [Exits] : Exits> {
  return internalBuildNested(stateName, transitions, enter, undefined, exits, enterIntermediateStates)
}

export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates?: boolean
): SpecifcNestedStateMachine<Enter, [Exit]>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exits,
  enterIntermediateStates?: boolean
): SpecifcNestedStateMachine<Enter, Exits>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder | StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exits,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exits extends StateBehaviorBuilder ? [Exits] : Exits> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exits, enterIntermediateStates)
}

/**
 * Creates a new Nested State Machine class.
 *
 * This does NOT create an instance. This is used statically.
 *
 * @param stateName Name of state.
 * @returns {typeof NestedStateMachine} A static reference to a new NestedMachine.
 */
function internalBuildNested<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder | StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: Enter,
  enterArgs?: StateConstructorArgs<Enter>,
  exits?: Exits,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exits extends StateBehaviorBuilder ? [Exits] : Exits> {
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
    public static readonly enterArgs: StateConstructorArgs<typeof enter> = enterArgs as any
    public static readonly exits? = realExits as any
    public static readonly enterIntermediateStates = enterIntermediateStates
    public static readonly onStartupListeners = []

    public static readonly clone = clone
    public static readonly transform = transform
  }
}
