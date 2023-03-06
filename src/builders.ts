import { StateBehavior, StateTransition } from './stateBehavior'
import { NestedStateMachine, NestedStateMachineOptions } from './stateMachineNested'
import { clone, HasArgs, NoArgs, SpecifcNestedStateMachine, StateBehaviorBuilder, StateConstructorArgs } from './util'

/**
 * Builds a transition with no consttructor arguments.
 *
 * This does strongly type check for classes that have zero optional arguments besides bot and data.
 * @param name
 * @param parent
 * @param child
 * @returns
 */
export function buildTransition<Parent extends StateBehaviorBuilder, Child extends StateBehaviorBuilder> (
  name: string,
  parent: Parent,
  child: NoArgs<Child>
): StateTransition<Parent, Child> {
  return new StateTransition<Parent, Child>({
    parent,
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
  parent: Parent,
  child: HasArgs<Child>,
  args: StateConstructorArgs<Child>
): StateTransition<Parent, Child> {
  return new StateTransition<Parent, Child>({
    parent,
    child,
    name,
    constructorArgs: args
  } as any)
}

/**
 * Creates a new Nested State Machine class.
 *
 * This does NOT create an instance. This is used statically.
 *
 * @param stateName Name of state.
 * @returns {typeof NestedStateMachine} A static reference to a new NestedMachine.
 */
function internalBuildNested<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: Enter,
  enterArgs?: StateConstructorArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  const states: Array<typeof StateBehavior> = []

  states.push(enter)

  if (!(exit == null) && !states.includes(exit)) states.push(exit)

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i]
    if (!states.includes(trans.parentState)) states.push(trans.parentState)
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }

  return class BuiltNestedStateMachine extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
    public static readonly enterArgs: StateConstructorArgs<typeof enter> = enterArgs as any
    public static readonly exit? = exit
    public static readonly enterIntermediateStates = enterIntermediateStates
    public static readonly onStartupListeners = []

    public static readonly clone = clone
  }
}

/**
   * Creates a new Nested
   * @param param0
   * @returns
   */
export function newNestedStateMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> ({
  stateName,
  transitions,
  enter,
  enterArgs,
  exit,
  enterIntermediateStates = true
}: NestedStateMachineOptions<Enter, Exit>): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exit, enterIntermediateStates)
}

export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, undefined, exit, enterIntermediateStates)
}

export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exit?: Exit,
  enterIntermediateStates = true
): SpecifcNestedStateMachine<Enter, Exit> {
  return internalBuildNested(stateName, transitions, enter, enterArgs, exit, enterIntermediateStates)
}
