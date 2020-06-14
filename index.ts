import { Bot } from 'mineflayer';

/**
 * A simple behavior state plugin for handling AI state machine
 * changes.
 */
export interface StateBehavior
{
    /**
     * The name of this behavior state.
     */
    readonly stateName: string;

    /**
     * Called when the state machine is first initialized.
     * 
     * @param bot - The bot this state behavior is acting on.
     */
    init(bot: Bot): void;

    /**
     * Called when the bot enters this behavior state.
     */
    onStateEntered(): void;

    /**
     * Called when the bot leaves this behavior state.
     */
    onStateExited(): void;
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition
{
    readonly parentState: StateBehavior;
    readonly childState: StateBehavior;
    readonly shouldTransition: () => boolean;
    readonly onTransition: () => void;

    /**
     * Creates a new one-way state transition between two states.
     * 
     * @param parent - The state to move from.
     * @param child - The state to move to.
     * @param shouldTransition - Runs each tick to check if this transition should be called.
     * @param onTransition - Called when this transition is run.
     * @param transitionName - The unique name of this transition.
     */
    constructor(parent: StateBehavior, child: StateBehavior, shouldTransition: () => boolean,
        onTransition: () => void)
    {
        this.parentState = parent;
        this.childState = child;

        this.shouldTransition = shouldTransition;
        this.onTransition = onTransition;
    }
}

/**
 * An AI state machine which runs on a bot to help simplify complex
 * behavior trees.
 */
export class BotStateMachine
{
    private readonly bot: Bot;
    private readonly transitions: StateTransition[];
    private activeState: StateBehavior;

    /**
     * Creates a new, simple state machine for handling bot behavior.
     * 
     * @param bot - The bot being acted on.
     * @param transitions - A list of all state transitions which can occur.
     * @param start - The starting state.
     */
    constructor(bot: Bot, transitions: StateTransition[], start: StateBehavior)
    {
        this.bot = bot;
        this.transitions = transitions;
        this.activeState = start;

        this.activateStates();
        this.activeState.onStateEntered();

        this.bot.on('physicTick', () => this.update());
    }

    /**
     * Called to initialize each possible state.
     */
    private activateStates(): void
    {
        let states = [];

        for (let i = 0; i < this.transitions.length; i++)
        {
            let state;

            state = this.transitions[i].parentState;
            if (states.indexOf(state) == -1)
            {
                state.init(this.bot);
                states.push(state);
            }

            state = this.transitions[i].childState;
            if (states.indexOf(state) == -1)
            {
                state.init(this.bot);
                states.push(state);
            }
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
                if (transition.shouldTransition())
                {
                    this.activeState.onStateExited();
                    transition.onTransition();

                    this.activeState = transition.childState;
                    this.activeState.onStateEntered();
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
}