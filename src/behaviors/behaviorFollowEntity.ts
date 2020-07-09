import { StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { goals, Goal } from "mineflayer-pathfinder";
import { AbstractBehaviorMovement } from "./abstractBehaviorMovement";

/**
 * Causes the bot to follow the target entity.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity extends AbstractBehaviorMovement
{
    /**
     * @inheritdoc
     */
    stateName: string = 'followEntity';

    /**
     * How close to the entity should the bot attempt to get?
     */
    followDistance: number = 0;

    constructor(bot: Bot, targets: StateMachineTargets)
    {
        super(bot, targets);
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
     * Calling this method will update the targets object.
     * 
     * @param entity - The entity to follow.
     */
    setFollowTarget(entity: Entity): void
    {
        if (this.targets.entity === entity)
            return;

        this.targets.entity = entity;
        this.restart();
    }

    /**
     * @inheritdoc
     */
    getGoal(): [Goal | undefined, boolean]
    {
        let entity = this.targets.entity;
        if (!entity)
            return [undefined, false];

        return [new goals.GoalFollow(entity, this.followDistance), true];
    }

    /**
     * Gets the distance to the target entity.
     * 
     * @returns The distance, or 0 if no target entity is assigned.
     */
    distanceToTarget(): number
    {
        let entity = this.targets.entity;
        if (!entity)
            return 0;

        return this.bot.entity.position.distanceTo(entity.position);
    }
}