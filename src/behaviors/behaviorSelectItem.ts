import { StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { AbstractBehaviorInventory } from "./abstractBehaviorInventory";

/**
 * Selects the target item, if the item is in the bots inventory.
 */
export class BehaviorSelectItem extends AbstractBehaviorInventory
{
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        super(bot, targets);
    }

    onStateEntered(): void
    {
        if (this.targets.item)
            this.bot.equip(this.targets.item, "hand");
    }
}