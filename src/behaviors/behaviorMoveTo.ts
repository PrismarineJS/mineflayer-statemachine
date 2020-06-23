import { StateBehavior, StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { Movements, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";

/**
 * Causes the bot to move to the target position.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorMoveTo implements StateBehavior
{
    private readonly bot: Bot;
    private readonly mcData: any;

    readonly targets: StateMachineTargets;
    readonly movements: Movements;
    stateName: string = 'moveTo';
    active: boolean = false;

    constructor(bot: Bot, targets: StateMachineTargets)
    {
        this.bot = bot;
        this.targets = targets;
        this.mcData = require('minecraft-data')(this.bot.version);
        this.movements = new Movements(this.bot, this.mcData);
    }

    onStateEntered(): void
    {
        this.startMoving();
    }

    onStateExited(): void
    {
        this.stopMoving();
    }

    /**
     * Sets the target block position to move to. If the bot
     * is currently moving, it will stop and move to here instead.
     * 
     * If the bot is not currently in this behavior state, the entity
     * will still be assigned as the target position when this state
     * is entered.
     * 
     * This method updates the target position.
     * 
     * @param position - The position to move to.
     */
    setMoveTarget(position: Vec3): void
    {
        if (this.targets.position == position)
            return;

        this.targets.position = position;
        this.restart();
    }

    /**
     * Cancels the current path finding operation.
     */
    private stopMoving(): void
    {
        // @ts-ignore
        let pathfinder = this.bot.pathfinder;
        pathfinder.setGoal(null);
    }

    /**
     * Starts a new path finding operation.
     */
    private startMoving(): void
    {
        let position = this.targets.position;
        if (!position)
            return;

        // @ts-ignore
        let pathfinder = this.bot.pathfinder;

        // @ts-ignore
        const goal = new goals.GoalBlock(position.x, position.y, position.z);
        pathfinder.setMovements(this.movements);
        pathfinder.setGoal(goal, true);
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