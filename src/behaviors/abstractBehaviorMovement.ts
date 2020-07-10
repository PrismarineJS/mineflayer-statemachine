import { StateBehavior, StateMachineTargets } from "../statemachine";
import { globalSettings } from "../index";
import { Bot } from "mineflayer";
import { Movements, goals } from "mineflayer-pathfinder";

/**
 * Causes the bot to move to the target position.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export abstract class AbstractBehaviorMovement implements StateBehavior
{
    /**
     * The bot this behavior is acting on.
     */
    readonly bot: Bot;

    /**
     * The targets container for the bot.
     */
    readonly targets: StateMachineTargets;

    /**
     * Movement specifications for configuring pathfinder.
     */
    readonly movements: Movements;

    /**
     * @inheritdoc
     */
    stateName: string = 'movement';

    /**
     * @inheritdoc
     */
    active: boolean = false;

    /**
     * How close the bot should attempt to get to this location before
     * considering the goal reached. A value of 0 will mean the bot must
     * be inside the target position.
     */
    distance: number = 0;

    /**
     * Creates a new movement based behavior.
     * 
     * @param bot - The bot being handled.
     * @param targets - The bot targets.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        this.bot = bot;
        this.targets = targets;

        const mcData = require('minecraft-data')(bot.version);
        this.movements = new Movements(bot, mcData);

        // @ts-ignore
        bot.on('path_update', (r) =>
        {
            if (r.status === 'noPath')
                console.log("[MoveTo] No path to target!");
        });

        // @ts-ignore
        bot.on('goal_reached', () =>
        {
            if (globalSettings.debugMode)
                console.log("[MoveTo] Target reached.");
        });
    }

    /**
     * @inheritdoc
     * 
     * Starts the bot's movement if possible.
     */
    onStateEntered(): void
    {
        this.startMoving();
    }

    /**
     * @inheritdoc
     * 
     * Stops the bot's movement.
     */
    onStateExited(): void
    {
        this.stopMoving();
    }

    /**
     * Creates a new goal instance for the bot movement to pass to pathfinder.
     * 
     * @returns A tuple containing the new goal instance, or undefined if no
     *      goal is defined,
     *      with the second argument being whether the goal is dynamic or not.
     */
    abstract getGoal(): [goals.Goal | undefined, boolean];

    /**
     * Cancels the current path finding operation.
     */
    private stopMoving(): void
    {
        // @ts-ignore
        const pathfinder = this.bot.pathfinder;
        pathfinder.setGoal(null);
    }

    /**
     * Starts a new path finding operation.
     */
    private startMoving(): void
    {
        const [goal, dynamic] = this.getGoal();

        if (!goal)
        {
            if (globalSettings.debugMode)
                console.log("[MoveTo] Target not defined. Skipping.");

            return;
        }

        // @ts-ignore
        const pathfinder = this.bot.pathfinder;

        pathfinder.setMovements(this.movements);
        pathfinder.setGoal(goal, dynamic);
    }

    /**
     * Stops and restarts this movement behavior. Does nothing if
     * this behavior is not active.
     */
    restart(): void
    {
        if (!this.active)
            return;

        this.stopMoving();
        this.startMoving();
    }

    /**
     * Checks if the bot has finished moving or not.
     */
    isFinished(): boolean
    {
        // @ts-ignore
        const pathfinder = this.bot.pathfinder;
        return !pathfinder.isMoving();
    }
}