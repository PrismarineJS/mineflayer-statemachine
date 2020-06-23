import { StateBehavior, StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { Block } from "prismarine-block";
import { Vec3 } from "vec3";

/**
 * If a block is defined in targets.position, this behavior will attempt to locate a
 * safe position to stand in order to interact with the block. (Breaking, placing, etc.)
 * 
 * If there are multiple safe standing positions around the block, the position with the
 * lowest cost is selected. Cost constraints can be configured to adjust the optimal position.
 */
export class BehaviorFindInteractPosition implements StateBehavior
{
    /**
     * The bot this behavior is acting on.
     */
    readonly bot: Bot;

    /**
     * The targets object for this behavior.
     */
    readonly targets: StateMachineTargets;

    /**
     * The maximum distance away from the block the bot can stand.
     */
    maxDistance: number = 3;

    /**
     * The settings for defining how position costs are calculated.
     */
    costs: StandingPositionCosts;

    /** @inheritDoc */
    stateName: string = 'findInteractPosition';

    /** @inheritDoc */
    active: boolean = false;

    /**
     * Creates a new find block behavior.
     * 
     * @param bot - The bot preforming the search function.
     * @param targets - The bot targets objects.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        this.bot = bot;
        this.targets = targets;
        this.costs = new StandingPositionCosts(bot, targets);
    }

    /** @inheritDoc */
    onStateEntered(): void
    {
        if (!this.targets.position)
            return;

        const positions: StandingPosition[] = [];

        for (let x = -this.maxDistance; x <= this.maxDistance; x++)
            for (let y = -this.maxDistance; y <= this.maxDistance; y++)
                for (let z = -this.maxDistance; z <= this.maxDistance; z++)
                {
                    // @ts-ignore Not sure why offset throws a TS error
                    const position = this.targets.position.offset(x, y, z);
                    const block = this.bot.blockAt(position);

                    if (block)
                        this.checkPosition(block, positions);
                }

        if (positions.length === 0)
        {
            this.targets.position = undefined;
            return;
        }

        positions.sort((a, b) => a.cost - b.cost);
        this.targets.position = positions[0].position;
    }

    /**
     * Checks if the the block is a valid standing position, adding it to
     * the position list if available.
     * 
     * @param block - The block to check.
     * @param positions - The position list to add valid standing positions to.
     */
    private checkPosition(block: Block, positions: StandingPosition[]): void
    {
        // Ignore if block is not empty
        if (block.boundingBox !== 'empty')
            return;

        // Ignore if block can't be stood on.
        // @ts-ignore Not sure why offset throws a TS error
        const under = this.bot.blockAt(block.position.offset(0, -1, 0));
        if (!under || under.boundingBox !== 'block')
            return;

        // Ignore if there is no head room.
        // @ts-ignore Not sure why offset throws a TS error
        const over = this.bot.blockAt(block.position.offset(0, 1, 0));
        if (!over || over.boundingBox !== 'empty')
            return;

        if (this.costs.shouldAvoid(block, over))
            return;

        positions.push({
            position: block.position,
            cost: this.costs.calculateStandCost(block, over),
        });
    }
}

/**
 * A temporary object interface for deciding the best place to stand of
 * all available options.
 */
interface StandingPosition
{
    /**
     * The block position to stand in.
     */
    position: Vec3;

    /**
     * The estimated cost of standing in this block.
     */
    cost: number;
}

class StandingPositionCosts
{
    private readonly bot: Bot;
    private readonly targets: StateMachineTargets;

    /**
     * A list of block IDs to avoid standing in at all costs.
     */
    avoid: number[];

    /**
     * A list of tuples for defining how much blocks should cost to stand
     * inside of.
     * 
     * Each tuple is defined as [blockId, footCost, (optional )headCost]. If the
     * head cost is not defined, the head cost will be assumed to be the same
     * as the cost. The footCost is the cost for standing in the same position of
     * a block with the given ID, while the headCost is the cost for having the bots
     * head in the same block at the block ID.
     */
    blockCosts: [number, number, number?][];

    /**
     * How much cost to add for each block away from the target the position is.
     */
    distanceMultiplyer: number = 3;

    /**
     * How much cost to add for each block the bot would need to move to get here.
     */
    moveMultiplyer: number = 1;

    /**
     * Creates a new StandingPositionCosts object.

     * @param bot - TRhe bot to use when preforming calculations.
     * @param targets - The behavior targets information.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        this.bot = bot;
        this.targets = targets;

        const mcData = require('minecraft-data')(this.bot.version);

        this.avoid = [
            mcData.blocksByName.lava.id,
            mcData.blocksByName.fire.id,
        ];

        this.blockCosts = [
            [mcData.blocksByName.water.id, 25, 100]
            [mcData.blocksByName.wheat.id, 5]
        ];
    }

    /**
     * Checks whether or not the given position should be avoided.
     * 
     * @param block - The standing position.
     * @param over - The block over the standing position.
     * 
     * @returns True if the block should be avoided. False otherwise.
     */
    shouldAvoid(block: Block, over: Block): boolean
    {
        if (this.avoid.indexOf(block.type) > -1)
            return true;

        if (this.avoid.indexOf(over.type) > -1)
            return true;

        return false;
    }

    /**
     * Calculates the estimated cost of standing in the selected block.
     * 
     * @param block - The block to check.
     * @param over - The block where the bots head would be.
     * 
     * @returns The estimated cost value.
     */
    calculateStandCost(block: Block, over: Block): number
    {
        let cost = 0;

        for (const c of this.blockCosts)
        {
            if (block.type === c[0])
                cost += c[1];

            if (over.type === c[0])
                cost += c[2] || c[1];
        }

        if (this.targets.position)
            // @ts-ignore TypeScript can't load vec3 for some reason
            cost += block.position.manhattanDistanceTo(this.targets.position) * this.distanceMultiplyer;

        // TODO Test bot path and add cost

        return cost;
    }
}