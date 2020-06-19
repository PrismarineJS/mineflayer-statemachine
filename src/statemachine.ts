import { Bot, Player } from 'mineflayer';
import { EventEmitter } from 'events';
import { globalSettings } from ".";
import { Entity } from 'prismarine-entity';
import { Vec3 } from 'vec3';

/**
 * A simple behavior state plugin for handling AI state machine
 * changes.
 */
export interface StateBehavior
{
    /**
     * The name of this behavior state.
     */
    stateName: string;

    /**
     * Gets whether or not this state is currently active.
     */
    active: boolean;

    /**
     * Called when the bot enters this behavior state.
     */
    onStateEntered?(): void;

    /**
     * Called when the bot leaves this behavior state.
     */
    onStateExited?(): void;
}

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionParameters
{
    parent: StateBehavior;
    child: StateBehavior;
    name?: string;
    shouldTransition?: () => boolean;
    onTransition?: () => void;
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition
{
    readonly parentState: StateBehavior;
    readonly childState: StateBehavior;
    private triggerState: boolean = false;

    shouldTransition: () => boolean;
    onTransition: () => void;
    name?: string;

    /**
     * Creates a new one-way state transition between two states.
     * 
     * @param parent - The state to move from.
     * @param child - The state to move to.
     * @param name - The name of this transition.
     * @param shouldTransition - Runs each tick to check if this transition should be called.
     * @param onTransition - Called when this transition is run.
     * @param transitionName - The unique name of this transition.
     */
    constructor({
        parent,
        child,
        name,
        shouldTransition = () => false,
        onTransition = () => { }
    }: StateTransitionParameters)
    {
        this.parentState = parent;
        this.childState = child;

        this.shouldTransition = shouldTransition;
        this.onTransition = onTransition;
        this.name = name;
    }

    /**
     * Triggers this transition to occur on the next Minecraft tick,
     * regardless of the "shouldTransition" function.
     * 
     * @throws Exception if this transition is not yet bound to a
     * state machine.
     */
    trigger(): void
    {
        if (!this.parentState.active)
            return;

        this.triggerState = true;
    }

    /**
     * Checks if this transition if currently triggered to run. This is
     * separate from the shouldTransition function.
     * 
     * @returns True if this transition was triggered to occur.
     */
    isTriggered(): boolean
    {
        return this.triggerState;
    }

    /**
     * Resets the triggered state to false.
     */
    resetTrigger(): void
    {
        this.triggerState = false;
    }
}

/**
 * An AI state machine which runs on a bot to help simplify complex
 * behavior trees.
 */
export class BotStateMachine extends EventEmitter
{
    private readonly bot: Bot;
    private readonly initialState: StateBehavior;
    private activeState: StateBehavior;
    
    /**
     * The root-level state machine in the behavior tree.
     */
    readonly rootStateMachine: NestedStateMachine;

    /**
     * An unrolled list of all transitions in this state machine across all layers.
     */
    readonly transitions: StateTransition[];

    /**
     * An unrolled list of all states in this state machine across all layers.
     */
    readonly states: StateBehavior[];

    /**
     * An unrolled list of all nested state machines in this state machine across
     * all layers.
     */
    readonly nestedStateMachines: NestedStateMachine[];

    /**
     * Creates a new, simple state machine for handling bot behavior.
     * 
     * @param bot - The bot being acted on.
     * @param transitions - A list of all state transitions which can occur.
     * @param start - The starting state.
     */
    constructor(bot: Bot, transitions: StateTransition[], start: StateBehavior, nestedStateMachines?: NestedStateMachine[])
    {
        super();

        this.bot = bot;
        this.activeState = start;
        this.initialState = start;

        this.rootStateMachine = {
            enter: start,
            transitions: transitions,
            nestedStateMachines: nestedStateMachines
        };
        
        this.transitions = [];
        this.states = [];
        this.nestedStateMachines = [];
        this.findTransitionsRecursive(this.rootStateMachine);
        this.findStatesRecursive(this.rootStateMachine);
        this.findNestedStateMachines(this.rootStateMachine);

        this.activeState.active = true;
        if (this.activeState.onStateEntered)
            this.activeState.onStateEntered();

        this.bot.on('physicTick', () => this.update());
    }

    private findNestedStateMachines(nested: NestedStateMachine, depth: number = 0): void
    {
        this.nestedStateMachines.push(nested);
        nested.depth = depth;

        if (nested.nestedStateMachines)
        {
            for (const n of nested.nestedStateMachines)
                this.findNestedStateMachines(n, depth + 1);
        }
    }

    private findStatesRecursive(nested: NestedStateMachine): void
    {
        if (!nested.states)
            nested.states = this.findStates(nested.transitions, nested.enter);

        for (const state of nested.states)
        {
            if (this.states.indexOf(state) === -1)
                this.states.push(state);
        }

        if (nested.nestedStateMachines)
        {
            for (const n of nested.nestedStateMachines)
                this.findStatesRecursive(n);
        }
    }

    /**
     * Creates a quick lookup list of all states in this state machine.
     */
    private findStates(transitions: StateTransition[], start: StateBehavior): StateBehavior[]
    {
        const states = [];
        states.push(start);

        for (let i = 0; i < transitions.length; i++)
        {
            if (states.indexOf(transitions[i].parentState) == -1)
                states.push(transitions[i].parentState);

            if (states.indexOf(transitions[i].childState) == -1)
                states.push(transitions[i].childState);
        }

        return states;
    }

    /**
     * Gets a list of all transitions used in the given nested state machine and all
     * child nested state machines within it, recursively.
     * 
     * @param nested - The nested state machine to iterate over.
     * @param transitions - The list of transitions to write to.
     */
    private findTransitionsRecursive(nested: NestedStateMachine): void
    {
        for (const trans of nested.transitions)
            this.transitions.push(trans);

        if (nested.nestedStateMachines)
        {
            for (const n of nested.nestedStateMachines)
            this.findTransitionsRecursive(n);
        }
    }

    /**
     * Called each tick to check if a transition should occur.
     */
    private update(): void
    {
        for (let i = 0; i < this.transitions.length; i++)
        {
            let transition = this.transitions[i];
            if (transition.parentState === this.activeState)
            {
                if (transition.isTriggered() || transition.shouldTransition())
                {
                    transition.resetTrigger();

                    this.activeState.active = false;
                    if (this.activeState.onStateExited)
                        this.activeState.onStateExited();

                    transition.onTransition();
                    this.activeState = transition.childState;

                    this.activeState.active = true;
                    if (this.activeState.onStateEntered)
                        this.activeState.onStateEntered();

                    if (globalSettings.debugMode)
                        console.log(`Switched bot behavior state to ${this.activeState.stateName}.`);

                    this.emit("stateChanged");

                    return;
                }
            }
        }
    }

    /**
     * Gets the currently active state.
     * 
     * @returns The active state.
     */
    getActiveState(): StateBehavior
    {
        return this.activeState;
    }

    /**
     * Gets the state that the state machine was initialized with.
     * 
     * @returns The initial state.
     */
    getInitialState(): StateBehavior
    {
        return this.initialState;
    }
}

/**
 * A collection of targets which the bot is currently
 * storing in memory. These are primarily used to allow
 * states to communicate with each other more effectively.
 */
export interface StateMachineTargets
{
    entity?: Entity;
    position?: Vec3;
    item?: any;
    player?: Player;

    entities?: Entity[];
    positions?: Vec3[];
    items?: any[];
    players?: Player[];
}

/**
 * A collection of state transitions which represent a smaller state machine
 * within the main state machine. These can be nested any number of times.
 */
export interface NestedStateMachine
{
    /**
     * The public state which other states are expected to transition to
     * to enter this nested state machine.
     */
    enter: StateBehavior;

    /**
     * The exit state which other states are expected to transition out
     * of to leave this nested state machine. May be undefined if nested
     * state machine should not be exited.
     */
    exit?: StateBehavior;

    /**
     * A list of all states within this nested state machine. (Including
     * the enter and exit states)
     * 
     * If not assigned, this is generated automatically.
     */
    states?: StateBehavior[];

    /**
     * A list of state transitions which make up this state machine.
     */
    transitions: StateTransition[];

    /**
     * A list of nested state machines within this state machine.
     */
    nestedStateMachines?: NestedStateMachine[];

    /**
     * The depth of this layer within the state machine. This is automatically
     * assigned by the state machine upon initialization.
     */
    depth?: number;
}