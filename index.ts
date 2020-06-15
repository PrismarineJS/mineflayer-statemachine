import { Bot } from 'mineflayer';
import { Entity } from 'prismarine-entity';

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
     * Called when the bot enters this behavior state.
     */
    onStateEntered(): void;

    /**
     * Called when the bot leaves this behavior state.
     */
    onStateExited(): void;
}

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionParameters
{
    parent: StateBehavior;
    child: StateBehavior;
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
    readonly shouldTransition: () => boolean;
    readonly onTransition: () => void;
    private triggerState: boolean = false;
    private stateMachine?: BotStateMachine;

    /**
     * Creates a new one-way state transition between two states.
     * 
     * @param parent - The state to move from.
     * @param child - The state to move to.
     * @param shouldTransition - Runs each tick to check if this transition should be called.
     * @param onTransition - Called when this transition is run.
     * @param transitionName - The unique name of this transition.
     */
    constructor({
        parent,
        child,
        shouldTransition = () => false,
        onTransition = () => { }
    }: StateTransitionParameters)
    {
        this.parentState = parent;
        this.childState = child;

        this.shouldTransition = shouldTransition;
        this.onTransition = onTransition;
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
        if (!this.stateMachine)
            throw "This transition is not bound to a state machine!";

        if (this.stateMachine.getActiveState() !== this.parentState)
            return;

        this.triggerState = true;
    }

    /**
     * An internal function which binds this transition to a specific
     * state machine.
     * 
     * @param stateMachine - The state machine to bind to.
     * 
     * @throws Exception if this transition is already bound to another
     * state machine.
     */
    bindToStateMachine(stateMachine: BotStateMachine): void
    {
        if (this.stateMachine)
            throw "This transition already belongs to a state machine!";

        this.stateMachine = stateMachine;
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

        for (let i = 0; i < this.transitions.length; i++)
            this.transitions[i].bindToStateMachine(this);

        this.activeState.onStateEntered();
        this.bot.on('physicTick', () => this.update());
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

// ============================== { ACTUAL STATE BEHAVIORS } ===========================

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle implements StateBehavior
{
    readonly stateName: string = 'idle';

    onStateEntered(): void
    {
        // Nothing to do.
    }

    onStateExited(): void
    {
        // Nothing to do.
    }
}

/**
 * The header for the EntityFilters() function.
 */
export interface EntityFiltersHeader
{
    /**
     * Returns true for all entities.
     *
     * @param entity - The entity.
     */
    AllEntities: (entity: Entity) => boolean;

    /**
     * Returns true for all players. False for all other entities.
     *
     * @param entity - The entity.
     */
    PlayersOnly: (entity: Entity) => boolean;

    /**
     * Returns true for all mobs. False for all other entities.
     *
     * @param entity - The entity.
     */
    MobsOnly: (entity: Entity) => boolean;

    /**
     * Returns true for item drop entities and collectable arrows. False for
     * all other entities.
     *
     * @param entity - The entity.
     */
    ItemDrops: (entity: Entity) => boolean;
}

/**
 * Gets a list of many default entity filters which can be applied to
 * default state behaviors.
 */
export function EntityFilters(): object
{
    return {
        AllEntities: function (): boolean
        {
            return true;
        },

        PlayersOnly: function (entity: Entity): boolean
        {
            return entity.type === 'player';
        },

        MobsOnly: function (entity: Entity): boolean
        {
            return entity.type === 'mob';
        },

        ItemDrops: function (entity: Entity): boolean
        {
            if (entity.objectType === 'item')
                return true;

            if (entity.objectType === 'arrow')
            {
                // TODO Check if arrow can be picked up
                // Current NBT parsing is too limited to effectively check.

                return true;
            }

            return false;
        }
    };
}

/**
 * The bot will look at the nearest entity, player, or specific entity.
 */
export class BehaviorLookAtEntities implements StateBehavior
{
    private readonly bot: Bot;
    private readonly lookAtFilter: (entity: Entity) => boolean;
    private active: boolean = false;

    readonly stateName: string = 'lookAtEntities';

    constructor(bot: Bot, lookAtFilter: (entity: Entity) => boolean)
    {
        this.bot = bot;
        this.lookAtFilter = lookAtFilter;
        this.bot.on("physicTick", () => this.update());
    }

    onStateEntered(): void
    {
        this.active = true;
    }

    onStateExited(): void
    {
        this.active = false;
    }

    private update(): void
    {
        if (!this.active)
            return;

        let closest = this.getClosestEntity();

        if (closest)
            // @ts-ignore
            this.bot.lookAt(closest.position.offset(0, closest.height, 0));
    }

    /**
     * Gets the closest entity to the bot, filtering entities as needed.
     * 
     * @returns The closest entity, or null if there are none.
     */
    private getClosestEntity(): Entity | null
    {
        let closest = null;
        let distance = 0;

        for (let entityName of Object.keys(this.bot.entities))
        {
            let entity = this.bot.entities[entityName];

            if (entity === this.bot.entity)
                continue;

            if (!this.lookAtFilter(entity))
                continue;

            // @ts-ignore
            let dist = entity.position.distanceTo(this.bot.entity.position);

            if (closest === null || dist < distance)
            {
                closest = entity;
                distance = dist;
            }
        }

        return closest;
    }
}