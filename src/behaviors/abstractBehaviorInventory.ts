import { StateBehavior, StateMachineTargets } from '../statemachine'
import { Bot, EquipmentDestination } from 'mineflayer'
import { Item } from 'prismarine-item'
import mcDataLoader from 'minecraft-data'

/**
 * A collection of useful functions for inventory-based behaviors.
 *
 * Credits to: https://github.com/PrismarineJS/mineflayer/blob/master/examples/inventory.js
 * for most of the code in this class was created from.
 */
export abstract class AbstractBehaviorInventory implements StateBehavior {
  protected readonly bot: Bot
  protected readonly mcData: any

  readonly targets: StateMachineTargets
  stateName: string = 'inventory'
  active: boolean = false
  x?: number
  y?: number

  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
    this.mcData = mcDataLoader(this.bot.version)
  }

  /**
     * Gets a list of all items in the bots inventory.
     */
  listItems (): string[] {
    return this.bot.inventory.items().map(this.itemToString)
  }

  /**
     * Throws out a specific item from this inventory. If the bot does
     * not have the item this function fails silently. If debugMode is
     * enabled, the error will be printed to the console.
     *
     * If the item stack contains fewer than the requested amount, then
     * then entire stack is thrown and no more.
     *
     * @param item - The item to throw.
     * @param amount - The number of items from this stack to throw.
     * In not defined, default to the entire stack.
     *
     * @returns The number of items actually dropped.
     */
  throwItem (item: Item, amount: number = -1): number {
    if (amount === -1) {
      this.bot.tossStack(item).catch(err => {
        console.log(err)
      })

      return item.count
    }

    this.bot.toss(item.type, null, amount).catch(err => {
      console.log(err)
    })

    return Math.min(amount, item.count)
  }

  /**
   * Converts an item into the string format: "itemName x itemCount"
   *
   *
   * @param item - The item.
   */
  itemToString (item: Item): string {
    if (item != null) {
      return `${item.name} x ${item.count}`
    } else {
      return '(nothing)'
    }
  }

  /**
   * Searches all items in the bots inventory for an item with the given name.
   * @param name - The name of the item.
   *
   * @returns The item, or undefined if none were found.
   */
  findItem (name: string): Item | undefined {
    return this.bot.inventory.items().filter(item => item.name === name)[0]
  }

  /**
   * Gets the number of items in the bots inventory with the given name.
   * @param name - The item name.
   */
  itemCount (name: string): number {
    let amount = 0

    for (const item of this.bot.inventory.items()) {
      if (item.name === name) { amount += item.count }
    }

    return amount
  }

  /**
     * Creates an given amount of a specific item.
     *
     * @param name - The item to craft.
     * @param craftingTable - Whether a crafting table is required for this recipe.
     * @param amount - The amount to craft. Defaults to 1.
     *
     * @returns The number of items the bot was able to craft with the given inventory.
     */
  craftItem (item: Item, amount: number = 1, cb: (err?: Error) => void = () => {}): number {
    const mcData = mcDataLoader(this.bot.version)
    const table = this.bot.findBlock({
      point: this.bot.entity.position,
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 3.5
    })

    if (table === null) {
      cb(new Error('Crafting table not found!'))
      return 0
    }

    const recipe = this.bot.recipesFor(item.type, null, 1, table)[0]
    if (recipe != null) {
      this.bot.craft(recipe, amount, table).then(() => cb()).catch(cb)
      return amount
    } else { cb(new Error('Recipe not available!')) }

    return 0
  }

  /**
     * Gets the intended equipment destination for the item. If the item is an
     * armor piece, this will return the correct armor slot. Otherwise, the hand
     * is returned.
     *
     * @param item - The item to check.
     *
     * @returns The equipment destination for this item.
     */
  getEquipDestination (item: Item): EquipmentDestination {
    if (this.isHelmet(item)) return 'head'
    if (this.isChestplate(item)) return 'torso'
    if (this.isLeggings(item)) return 'legs'
    if (this.isBoots(item)) return 'feet'

    // TODO Uncomment this when mineflayer updates
    // if (this.isOffhandUsable(item))
    //     return "off-hand";

    return 'hand'
  }

  /**
     * Checks if the item is a helmet or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item is a helmet. False otherwise.
     */
  isHelmet (item: Item): boolean {
    const id = item.type

    if (id === this.mcData.itemsByName.leather_helmet.id) return true
    if (id === this.mcData.itemsByName.iron_helmet.id) return true
    if (id === this.mcData.itemsByName.golden_helmet.id) return true
    if (id === this.mcData.itemsByName.diamond_helmet.id) return true
    if (id === this.mcData.itemsByName.turtle_helmet.id) return true

    return false
  }

  /**
     * Checks if the item is a chestplate or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item is a chestplate. False otherwise.
     */
  isChestplate (item: Item): boolean {
    const id = item.type

    if (id === this.mcData.itemsByName.leather_chestplate.id) return true
    if (id === this.mcData.itemsByName.iron_chestplate.id) return true
    if (id === this.mcData.itemsByName.golden_chestplate.id) return true
    if (id === this.mcData.itemsByName.diamond_chestplate.id) return true

    return false
  }

  /**
     * Checks if the item is a pair of leggings or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item is a pair of leggings. False otherwise.
     */
  isLeggings (item: Item): boolean {
    const id = item.type

    if (id === this.mcData.itemsByName.leather_leggings.id) return true
    if (id === this.mcData.itemsByName.iron_leggings.id) return true
    if (id === this.mcData.itemsByName.golden_leggings.id) return true
    if (id === this.mcData.itemsByName.diamond_leggings.id) return true

    return false
  }

  /**
     * Checks if the item is a pair of boots or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item is a pair of boots. False otherwise.
     */
  isBoots (item: Item): boolean {
    const id = item.type

    if (id === this.mcData.itemsByName.leather_boots.id) return true
    if (id === this.mcData.itemsByName.iron_boots.id) return true
    if (id === this.mcData.itemsByName.golden_boots.id) return true
    if (id === this.mcData.itemsByName.diamond_boots.id) return true

    return false
  }

  /**
     * Checks if the item can be used in the offhand or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item can be used in the offhand. False otherwise.
     */
  isOffhandUsable (item: Item): boolean {
    if (this.isBlock(item)) return true
    if (this.isFood(item)) return true

    const id = item.type

    if (id === this.mcData.itemsByName.bow.id) return true
    if (id === this.mcData.itemsByName.egg.id) return true
    if (id === this.mcData.itemsByName.lingering_potion.id) return true
    if (id === this.mcData.itemsByName.snowball.id) return true
    if (id === this.mcData.itemsByName.splash_potion.id) return true
    if (id === this.mcData.itemsByName.trident.id) return true
    if (id === this.mcData.itemsByName.crossbow.id) return true

    if (id === this.mcData.itemsByName.bucket.id) return true
    if (id === this.mcData.itemsByName.ender_pearl.id) return true
    if (id === this.mcData.itemsByName.fishing_rod.id) return true
    if (id === this.mcData.itemsByName.flint_and_steel.id) return true
    if (id === this.mcData.itemsByName.lead.id) return true
    if (id === this.mcData.itemsByName.shears.id) return true
    if (id === this.mcData.itemsByName.shield.id) return true
    if (id === this.mcData.itemsByName.potion.id) return true
    if (id === this.mcData.itemsByName.totem_of_undying.id) return true

    if (id === this.mcData.itemsByName.stone_hoe.id) return true
    if (id === this.mcData.itemsByName.iron_hoe.id) return true
    if (id === this.mcData.itemsByName.golden_hoe.id) return true
    if (id === this.mcData.itemsByName.diamond_hoe.id) return true

    if (id === this.mcData.itemsByName.stone_shovel.id) return true
    if (id === this.mcData.itemsByName.iron_shovel.id) return true
    if (id === this.mcData.itemsByName.golden_shovel.id) return true
    if (id === this.mcData.itemsByName.diamond_shovel.id) return true

    if (id === this.mcData.itemsByName.stone_axe.id) return true
    if (id === this.mcData.itemsByName.iron_axe.id) return true
    if (id === this.mcData.itemsByName.golden_axe.id) return true
    if (id === this.mcData.itemsByName.diamond_axe.id) return true

    if (id === this.mcData.itemsByName.map.id) return true
    if (id === this.mcData.itemsByName.clock.id) return true
    if (id === this.mcData.itemsByName.compass.id) return true

    if (id === this.mcData.itemsByName.firework_rocket.id) return true

    return false
  }

  /**
     * Checks if the item is a block or not.
     *
     * WARNING:
     * ========
     * This feature is not yet implemented and always returns false!
     * --------
     *
     * @param item - The item to check.
     *
     * @returns True if the item is a block. False otherwise.
     */
  isBlock (item: Item): boolean {
    // TODO Check if item is a block.
    return false
  }

  /**
     * Checks if the item is food or not.
     *
     * @param item - The item to check.
     *
     * @returns True if the item is food. False otherwise.
     */
  isFood (item: Item): boolean {
    if (!(this.mcData.foodsArray.find((itemToCheck: Item) => itemToCheck.name === item.name) == null)) {
      return true
    } else {
      return false
    }
  }
}
