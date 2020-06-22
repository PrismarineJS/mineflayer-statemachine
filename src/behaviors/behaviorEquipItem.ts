import { StateMachineTargets } from "../statemachine";
import { Bot, EquipmentDestination } from "mineflayer";
import { AbstractBehaviorInventory } from "./abstractBehaviorInventory";
import { globalSettings } from "..";

// TODO Add support for equipped to off-hand

/**
 * Equips the target item, if the item is in the bots inventory. If the item
 * is an armor type, the bot will automatically put it on. Otherwise, the bot
 * will place them item in their hand.
 * 
 * If an error occurs while attempting to equip an item, and debug mode is
 * enabled, the error will be logged to the console.
 */
export class BehaviorEquipItem extends AbstractBehaviorInventory
{
    /**
     * Whether or not to automatically equip armor. If false, armor
     * is moved to the bots hand instead.
     */
    autoEquipArmor: boolean = true;

    /**
     * Gets whether or not the last equip attempt was successful. This
     * will return false if the target.item is undefined, or if the bot
     * does not have the item to equip, or the item could not be equipped
     * for any reason.
     */
    wasEquipped: boolean = false;

    /**
     * Creates a new equip item behavior.
     * 
     * @param bot - The bot this behavior operates on.
     * @param targets - The targets to use for deciding what item to equip.
     */
    constructor(bot: Bot, targets: StateMachineTargets)
    {
        super(bot, targets);
    }

    onStateEntered(): void
    {
        if (this.targets.item)
        {
            let destination: EquipmentDestination = "hand";

            if (this.autoEquipArmor)
                destination = this.getEquipDestination(this.targets.item);

            this.bot.equip(this.targets.item, destination, err => this.equipItemCallback(err));
        }
    }

    /**
     * The callback for item equip events.
     * 
     * @param err - The error that was thrown while equipping the item, if any.
     */
    private equipItemCallback(err?: Error): void
    {
        if (globalSettings.debugMode && err)
            console.log(err);

        this.wasEquipped = err !== undefined;
    }
}