import { StateBehavior, StateMachineTargets } from "../statemachine";
import { globalSettings } from "../index";
import { Bot } from "mineflayer";
import { Item } from "prismarine-item";
import { Block } from "prismarine-block";

/**
 * This behavior will attempt to break the target block. If the target block
 * could not be mined for any reason, this behavior fails silently.
 */
export class BehaviorMineBlock implements StateBehavior {
    readonly bot: Bot;
    readonly targets: StateMachineTargets;

    stateName: string = 'mineBlock';
    active: boolean = false;

    /**
     * Checks if the bot has finished mining the block or not.
     */
    isFinished: boolean = false;

    /**
     * Creates a new mine block behavior.
     * 
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot: Bot, targets: StateMachineTargets) {
        this.bot = bot;
        this.targets = targets;
    }

    onStateEntered(): void {
        this.isFinished = false;

        if (!this.targets.position) {
            this.isFinished = true;
            return;
        }

        const block = this.bot.blockAt(this.targets.position);
        if (!block || !this.bot.canDigBlock(block)) {
            if (globalSettings.debugMode)
                console.log("[MineBlock] Cannot mine target block '" + block?.displayName + "'!. Skipping.");

            this.isFinished = true;
            return;
        }

        if (globalSettings.debugMode)
            console.log("[MineBlock] Breaking block '" + block.displayName + "' at " + this.targets.position);

        const tool = this.getBestTool(block);
        if (tool) {
            this.bot.equip(tool, 'hand', () => {
                this.bot.dig(block, () => this.isFinished = true);
            });
        }
        else
            this.bot.dig(block, () => this.isFinished = true);
    }

    private getBestTool(block: Block): Item | undefined {
        const items = this.bot.inventory.items()
        for (const i in block.harvestTools) {
            const id = parseInt(i, 10)
            for (const j in items) {
                const item = items[j]
                if (item.type === id) return item
            }
        }

        return undefined;
    }
}
