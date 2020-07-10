import { StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { AbstractBehaviorMovement } from "./abstractBehaviorMovement";

/**
 * Causes the bot to move to the target position.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorMoveTo extends AbstractBehaviorMovement
{
    /**
     * @inheritdoc
     */
    stateName: string = 'moveTo';

    /**
     * How close the bot should attempt to get to this location before
     * considering the goal reached. A value of 0 will mean the bot must
     * be inside the target position.
     */
    distance: number = 0;

    /**
     * Creates a new MoveTo behavior.
     * 
     * @param bot - The bot being handled.
     * @param targets - The bot targets container.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        super(bot, targets);
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
     * @inheritdoc
     */
    getGoal(): [goals.Goal | undefined, boolean]
    {
        const position = this.targets.position;
        if (!position)
            return [undefined, false];

        if (this.distance === 0)
            return [new goals.GoalBlock(position.x, position.y, position.z), false];
        else
            return [new goals.GoalNear(position.x, position.y, position.z, this.distance), false];
    }

    /**
     * Gets the distance to the target position.
     * 
     * @returns The distance, or 0 if no target position is assigned.
     */
    distanceToTarget(): number
    {
        let position = this.targets.position;
        if (!position)
            return 0;

        return this.bot.entity.position.distanceTo(position);
    }
}