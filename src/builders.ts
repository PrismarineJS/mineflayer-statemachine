import { StateTransition } from './stateTransition'
import { clone, StateBehavior, transform } from './stateBehavior'
import { NestedStateMachine } from './stateMachineNested'
import {
  HasConstructArgs,
  HasEnterArgs,
  ListType,
  NoConstructArgs,
  NoEnterArgs,
  OnEnterArgs,
  SpecifcNestedStateMachine,
  StateBehaviorBuilder,
  StateConstructorArgs,
  U2T
} from './util'

type ConstructorArgs<State extends StateBehaviorBuilder<StateBehavior, any[]>> = HasConstructArgs<State> extends State
  ? StateConstructorArgs<State>
  : never
type EntryArgs<State extends StateBehaviorBuilder<StateBehavior, any[]>> = HasEnterArgs<State> extends State
  ? OnEnterArgs<State>
  : never

type IgnoreConstructorArgs<State extends StateBehaviorBuilder<StateBehavior, any[]>> =
  NoConstructArgs<State> extends never ? false : true
type IgnoreEntryArgs<State extends StateBehaviorBuilder<StateBehavior, any[]>> = NoEnterArgs<State> extends never
  ? false
  : true

class StateTransitionBuilder<
  Parents extends ReadonlyArray<StateBehaviorBuilder<StateBehavior, any[]>>,
  Child extends StateBehaviorBuilder<StateBehavior, any[]>,
  ParsedParents extends U2T<ListType<Parents>> = U2T<ListType<Parents>>,
  BuildArgs = IgnoreConstructorArgs<Child>,
  EnterArgs = IgnoreEntryArgs<Child>
> {
  public readonly name: string
  public readonly parents: Parents
  public readonly child: Child
  public entryArgs?: EntryArgs<Child>
  public constructorArgs?: ConstructorArgs<Child>
  public shouldTransition?: StateTransition<ParsedParents, Child>['shouldTransition']
  public onTransition?: StateTransition<ParsedParents, Child>['onTransition']

  private _builtConstructor: BuildArgs = false as any
  private _builtEnter: EnterArgs = false as any
  constructor (name: string, parent: Parents, child: Child) {
    this.name = name
    this.parents = parent
    this.child = child
  }

  public get builtConstructor (): BuildArgs {
    return this._builtConstructor
  }

  public get builtEnter (): EnterArgs {
    return this._builtEnter
  }

  public setBuildArgs (
    ...args: ConstructorArgs<Child>
  ): StateTransitionBuilder<Parents, Child, ParsedParents, true, EnterArgs> {
    this.constructorArgs = args;
    (this as StateTransitionBuilder<Parents, Child, ParsedParents, true, EnterArgs>)._builtConstructor = true
    return this as StateTransitionBuilder<Parents, Child, ParsedParents, true, EnterArgs>
  }

  public setEntryArgs (
    ...args: EntryArgs<Child>
  ): StateTransitionBuilder<Parents, Child, ParsedParents, BuildArgs, true> {
    this.entryArgs = args;
    (this as StateTransitionBuilder<Parents, Child, ParsedParents, BuildArgs, true>)._builtEnter = true
    return this as StateTransitionBuilder<Parents, Child, ParsedParents, BuildArgs, true>
  }

  public setShouldTransition (should: StateTransition<ParsedParents, Child>['shouldTransition']): this {
    this.shouldTransition = should
    return this
  }

  public setOnTransition (on: StateTransition<ParsedParents, Child>['onTransition']): this {
    this.onTransition = on
    return this
  }

  public build = build
}

function build<This extends StateTransitionBuilder<any, any, any, true, true>> (
  this: This
): StateTransition<U2T<ListType<This['parents']>>, This['child']> {
  return new StateTransition<typeof this['parents'], typeof this['child']>({
    parents: this.parents,
    child: this.child,
    constructorArgs: this.constructorArgs as any,
    enterArgs: this.entryArgs as any,
    shouldTransition: this.shouldTransition,
    onTransition: this.onTransition
  })
}

export function getTransition<
  Parent extends StateBehaviorBuilder<any, any[]>,
  Child extends StateBehaviorBuilder<any, any[]>
> (name: string, parent: Parent, child: Child): StateTransitionBuilder<[Parent], Child>
export function getTransition<
  Parents extends readonly StateBehaviorBuilder[],
  Child extends StateBehaviorBuilder<any, any[]>
> (name: string, parents: Parents, child: Child): StateTransitionBuilder<Parents, Child>
export function getTransition<
  Parents extends readonly StateBehaviorBuilder[],
  Child extends StateBehaviorBuilder<any, any[]>
> (name: string, parents: Parents, child: Child): StateTransitionBuilder<Parents, Child> {
  let realParents: readonly StateBehaviorBuilder[]
  if (!(parents instanceof Array)) realParents = [parents]
  else realParents = parents
  return new StateTransitionBuilder<Parents, Child>(name, realParents as any, child)
}

class NestedMachineBuilder<
  Enter extends StateBehaviorBuilder<StateBehavior, any[]>,
  Exits extends ReadonlyArray<StateBehaviorBuilder<StateBehavior, any[]>>,
  ParsedExits extends U2T<ListType<Exits>> = U2T<ListType<Exits>>,
  BuildArgs = IgnoreConstructorArgs<Enter>,
  EnterArgs = true
> {
  public readonly name: string
  public readonly enter: Enter
  public readonly exits: Exits
  public readonly transitions: Array<StateTransition<any, any>>
  // public entryArgs?: EntryArgs<Enter>;
  public constructorArgs?: ConstructorArgs<Enter>

  private _builtConstructor: BuildArgs = false as any
  // private _builtEnter: EnterArgs = false as any;
  constructor (name: string, transitions: Array<StateTransition<any, any>>, enter: Enter, exits: Exits) {
    this.name = name
    this.transitions = transitions
    this.enter = enter
    this.exits = exits
  }

  public get builtConstructor (): BuildArgs {
    return this._builtConstructor
  }

  // public get builtEnter(): EnterArgs {
  //   return this._builtEnter;
  // }

  public setBuildArgs (
    ...args: ConstructorArgs<Enter>
  ): NestedMachineBuilder<Enter, Exits, ParsedExits, true, EnterArgs> {
    this.constructorArgs = args;
    (this as NestedMachineBuilder<Enter, Exits, ParsedExits, true, EnterArgs>)._builtConstructor = true
    return this as NestedMachineBuilder<Enter, Exits, ParsedExits, true, EnterArgs>
  }

  // public setEntryArgs(...args: EntryArgs<Enter>): NestedMachineBuilder<Enter, Exits, ParsedExits, BuildArgs, true> {
  //   this.entryArgs = args;
  //   (this as NestedMachineBuilder<Enter, Exits, ParsedExits, BuildArgs, true>)._builtEnter = true;
  //   return this as NestedMachineBuilder<Enter, Exits, ParsedExits, BuildArgs, true>;
  // }

  public build = build1
}

function build1<This extends NestedMachineBuilder<any, any, any, true, true>> (
  this: This
): SpecifcNestedStateMachine<This['enter'], U2T<ListType<This['exits']>>> {
  const states: StateBehaviorBuilder[] = []

  states.push(this.enter)

  for (const exit of this.exits) {
    if (!states.includes(exit)) states.push(exit)
  }

  for (let i = 0; i < this.transitions.length; i++) {
    const trans = this.transitions[i]
    for (const parentState of trans.parentStates) {
      if (!states.includes(parentState)) states.push(parentState)
    }
    if (!states.includes(trans.childState)) states.push(trans.childState)
  }
  const stateName = this.name
  const transitions = this.transitions
  const enter = this.enter
  const exits = this.exits
  const enterArgs = this.constructorArgs as any
  return class BuiltNestedStateMachine extends NestedStateMachine {
    public static readonly stateName = stateName
    public static readonly transitions = transitions
    public static readonly states = states
    public static readonly enter = enter
    public static readonly enterArgs = enterArgs
    public static readonly exits? = exits
    public static readonly onStartupListeners = []

    public static readonly clone = clone
    public static readonly transform = transform
  }
}

export function getNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  name: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoEnterArgs<Enter>,
  exit: Exit
): NestedMachineBuilder<Enter, [Exit]>
export function getNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  name: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoEnterArgs<Enter>,
  exit: Exits
): NestedMachineBuilder<Enter, Exits>
export function getNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  name: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoEnterArgs<Enter>,
  exits: Exits
): NestedMachineBuilder<Enter, Exits> {
  let realExits: StateBehaviorBuilder[] | undefined

  if (exits != null) {
    if (!(exits instanceof Array)) realExits = [exits]
    else realExits = exits
  }
  return new NestedMachineBuilder<Enter, Exits>(name, transitions, enter, realExits as any)
}

export function buildNestedMachine<Enter extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoConstructArgs<Enter>
): ReturnType<typeof internalBuildNested<Enter>>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoConstructArgs<Enter>,
  exit: Exit
): ReturnType<typeof internalBuildNested<Enter, [Exit]>>
export function buildNestedMachine<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoConstructArgs<Enter>,
  exit: Exits
): ReturnType<typeof internalBuildNested<Enter, Exits>>
export function buildNestedMachine<
  Enter extends StateBehaviorBuilder,
  Exits extends StateBehaviorBuilder[] | undefined
> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: NoConstructArgs<Enter>,
  exit?: Exits
): ReturnType<typeof internalBuildNested<Enter, Exits>> {
  return internalBuildNested(stateName, transitions, enter, undefined, exit)
}

export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasConstructArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exit
): ReturnType<typeof internalBuildNested<Enter, [Exit]>>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasConstructArgs<Enter>,
  enterArgs: StateConstructorArgs<Enter>,
  exits?: Exits
): ReturnType<typeof internalBuildNested<Enter, Exits>>
export function buildNestedMachineArgs<Enter extends StateBehaviorBuilder, Exits extends StateBehaviorBuilder[]> (
  stateName: string,
  transitions: Array<StateTransition<any, any>>,
  enter: HasConstructArgs<Enter>,
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
function internalBuildNested<
  Enter extends StateBehaviorBuilder,
  Exits extends StateBehaviorBuilder[] | undefined = undefined
> (
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

  console.log(exits);
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
