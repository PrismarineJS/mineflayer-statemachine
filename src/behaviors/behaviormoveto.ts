import { StateBehavior } from "../statemachine";
import { Bot } from "mineflayer";
import { Movements, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";

/**
 * Causes the bot to follow an entity.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorMoveTo implements StateBehavior
{
    private readonly bot: Bot;
    private readonly mcData: any;
    private position?: Vec3;

    readonly movements: Movements;
    stateName: string = 'moveTo';
    active: boolean = false;

    constructor(bot: Bot)
    {
        this.bot = bot;
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
     * @param position - The position to move to.
     */
    setMoveTarget(position: Vec3): void
    {
        if (this.position == position)
            return;

        if (this.active)
            this.stopMoving();

        this.position = position;

        if (this.active)
            this.startMoving();
    }

    /**
     * Cancels the current path finding operation.
     */
    private stopMoving(): void
    {
        // @ts-ignore
        let pathfinder = this.bot.pathfinding;
        pathfinder.setGoal(null);
    }

    /**
     * Starts a new path finding operation.
     */
    private startMoving(): void
    {
        if (!this.position)
            return;

        // @ts-ignore
        let pathfinder = this.bot.pathfinding;

        // @ts-ignore
        const goal = new goals.GoalBlock(this.position.x, this.position.y, this.position.z);
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
}