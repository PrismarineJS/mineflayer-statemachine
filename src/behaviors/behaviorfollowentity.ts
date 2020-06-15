import { StateBehavior } from "./../statemachine";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Movements, goals } from "mineflayer-pathfinder";

/**
 * Causes the bot to follow an entity.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity implements StateBehavior
{
    private readonly bot: Bot;
    private readonly mcData: any;
    private entity?: Entity;

    readonly stateName: string = 'followEntity';
    readonly movements: Movements;
    active: boolean = false;
    followDistance: number = 2;

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
     * Sets the target entity this bot should follow. If the bot
     * is currently following another entity, it will stop following
     * that entity and follow this entity instead.
     * 
     * If the bot is not currently in this behavior state, the entity
     * will still be assigned as the target entity when this state is
     * entered.
     * 
     * @param entity - The entity to follow.
     */
    setFollowTarget(entity: Entity): void
    {
        if (this.entity === entity)
            return;

        if (this.active)
            this.stopMoving();

        this.entity = entity;

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
        if (!this.entity)
            return;

        // @ts-ignore
        let pathfinder = this.bot.pathfinding;

        const goal = new goals.GoalFollow(this.entity, this.followDistance);
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