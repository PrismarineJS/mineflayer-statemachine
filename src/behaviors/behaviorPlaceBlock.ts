import { StateBehavior, StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";

/**
 * This behavior will attempt to place the target item against the block at the target
 * position and given target block face. If the block could not be placed for any
 * reason, this behavior fails silently.
 * 
 * Even if the block could not be placed, the target item is still equipped if possible.
 */
export class BehaviorPlaceBlock implements StateBehavior
{
    readonly bot: Bot;
    readonly targets: StateMachineTargets;

    stateName: string = 'placeBlock';
    active: boolean = false;

    /**
     * Creates a new mine block behavior.
     * 
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        this.bot = bot;
        this.targets = targets;
    }

    onStateEntered(): void
    {
        if (!this.targets.item)
            return;

        let success = true;
        this.bot.equip(this.targets.item, "hand", (err) =>
        {
            if (err)
                success = false;
        });

        if (!success)
            return;

        if (!this.targets.position)
            return;

        if (!this.targets.blockFace)
            return;

        let block = this.bot.blockAt(this.targets.position);
        if (!block || !this.bot.canSeeBlock(block))
            return;

        this.bot.placeBlock(block, this.targets.blockFace, () => { });
    }
}
