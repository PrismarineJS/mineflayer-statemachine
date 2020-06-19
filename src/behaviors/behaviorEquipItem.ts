import { StateMachineTargets } from "../statemachine";
import { Bot } from "mineflayer";
import { AbstractBehaviorInventory } from "./abstractBehaviorInventory";

/**
 * Equips the target item, if the item is in the bots inventory. If the item
 * is an armor type, the bot will automatically put it on. Otherwise, the bot
 * will place them item in their hand.
 */
export class BehaviorEquipItem extends AbstractBehaviorInventory
{
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        super(bot, targets);
    }

    onStateEntered(): void
    {
        if (this.targets.item)
        {
            const destination = this.getEquipDestination(this.targets.item);
            this.bot.equip(this.targets.item, destination);
        }
    }
}