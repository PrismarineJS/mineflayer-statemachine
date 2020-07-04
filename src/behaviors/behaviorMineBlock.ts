import { StateBehavior, StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";

/**
 * This behavior will attempt to break the target block. If the target block
 * could not be mined for any reason, this behavior fails silently.
 */
export class BehaviorMineBlock implements StateBehavior
{
    readonly bot: Bot;
    readonly targets: StateMachineTargets;

    stateName: string = 'mineBlock';
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
        if (!this.targets.position)
            return;

        let block = this.bot.blockAt(this.targets.position);
        if (!block || !this.bot.canDigBlock(block) || !this.bot.canSeeBlock(block))
            return;

        this.bot.dig(block);
    }
}
