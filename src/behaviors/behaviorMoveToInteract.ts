import { StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { Move, goals } from "mineflayer-pathfinder";
import { BehaviorMoveTo } from ".";
import { Vec3 } from "vec3";
import { Block } from "prismarine-block";

/**
 * Moves the bot to a position where it can safely interact with the target block.
 * 
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorMoveToInteract extends BehaviorMoveTo
{
    /**
     * @inheritdoc
     */
    stateName: string = 'moveToInteract';

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
     * @inheritdoc
     */
    getGoal(): [goals.Goal | undefined, boolean]
    {
        const position = this.targets.position;
        if (!position)
            return [undefined, false];

        return [new CanInteractGoal(this.bot, position.x, position.y, position.z), false];
    }
}

/**
 * A simple pathfinder check which determines if the bot can interact with the
 * target block from the given position or not.
 */
class CanInteractGoal extends goals.GoalBlock
{
    readonly bot: Bot;

    constructor(bot: Bot, x: number, y: number, z: number)
    {
        super(x, y, z);
        this.bot = bot;
    }

    /**
     * @inheritdoc
     */
    isEnd(node: Move): boolean
    {
        return this.rayTraceBlock(node);
    }

    /**
     * Raytraces the world to check if the target block can be reached from the
     * current node.
     * 
     * @param node - The pathfinding node.
     * @param maxSteps - The maximum number of steps to attempt while checking.
     * @param vectorLength - How far forward to move the checker.
     */
    private rayTraceBlock(node: Move, maxSteps = 256, vectorLength = 5 / 16): boolean
    {
        const start = new Vec3(node.x, node.y + this.bot.entity.height, node.z);
        const end = new Vec3(this.x, this.y, this.z).floor();

        if (start.distanceTo(end) > 5)
            return false;

        const step = end.clone().subtract(start).scale(vectorLength);
        const cursor = start.clone();
        for (let i = 0; i < maxSteps; ++i)
        {
            cursor.add(step);

            const block = this.bot.blockAt(cursor);
            if (!block)
                continue;

            if (block.position === end)
                return true;

            if (this.blockObstructsReach(block, node))
                return false;
        }

        return false;
    }

    private blockObstructsReach(block: Block, node: Move): boolean
    {
        // TODO: [STATE-36] Check boundingBox of block

        // TODO: [STATE-37] Support dynamic world changes as a result of handling blocks. (I.e. Water/Sand)

        const pos = block.position;

        for (const toBreak of node.toBreak)
        {
            if (toBreak.x === pos.x && toBreak.y == pos.y && toBreak.z == pos.z)
                return false;
        }

        for (const toPlace of node.toPlace)
        {
            if (toPlace.x === pos.x && toPlace.y == pos.y && toPlace.z == pos.z)
                return true;
        }

        return block.boundingBox === 'empty';
    }
}