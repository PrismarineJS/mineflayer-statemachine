import { StateBehavior, StateMachineTargets } from '../statemachine'
import { Bot } from 'mineflayer'
import { Block } from 'prismarine-block'
import { Vec3 } from 'vec3'
import mcDataLoader from 'minecraft-data'

/* TODO Allow for creating positions in the air, or mining out new positions,
   if the bot if able to place blocks or mine in the area, respectively. */

/**
 * If a block is defined in targets.position, this behavior will attempt to locate a
 * safe position to stand in order to interact with the block. (Breaking, placing, etc.)
 *
 * If there are multiple safe standing positions around the block, the position with the
 * lowest cost is selected. Cost constraints can be configured to adjust the optimal position.
 */
export class BehaviorFindInteractPosition implements StateBehavior {
  /**
     * The bot this behavior is acting on.
     */
  readonly bot: Bot

  /**
     * The targets object for this behavior.
     */
  readonly targets: StateMachineTargets

  /**
     * The maximum distance away from the block the bot can stand.
     */
  maxDistance: number = 3

  /**
     * The settings for defining how position costs are calculated.
     */
  costs: StandingPositionCosts

  /** @inheritDoc */
  stateName: string = 'findInteractPosition'

  /** @inheritDoc */
  active: boolean = false

  /**
     * The x position of this behavior state for webservice.
     */
  x?: number

  /**
    * The y position of this behavior state for webservice.
    */
  y?: number

  /**
     * Creates a new find block behavior.
     *
     * @param bot - The bot preforming the search function.
     * @param targets - The bot targets objects.
     */
  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets
    this.costs = new StandingPositionCosts(bot, targets)
  }

  /** @inheritDoc */
  onStateEntered (): void {
    if (this.targets.position == null) return

    this.targets.position.floor()
    const positions: StandingPosition[] = []

    for (let x = -this.maxDistance; x <= this.maxDistance; x++) {
      for (let y = -this.maxDistance; y <= this.maxDistance; y++) {
        for (let z = -this.maxDistance; z <= this.maxDistance; z++) {
          const position = this.targets.position.offset(x, y, z)
          const block = this.bot.blockAt(position)

          if (block != null) {
            this.checkPosition(block, positions)
          }
        }
      }
    }

    if (positions.length === 0) {
      this.targets.position = undefined
      return
    }

    positions.sort((a, b) => a.cost - b.cost)
    this.targets.position = positions[0].position.offset(0.5, 0, 0.5)
  }

  /**
     * Checks if the the block is a valid standing position, adding it to
     * the position list if available.
     *
     * @param block - The block to check.
     * @param positions - The position list to add valid standing positions to.
     */
  private checkPosition (block: Block, positions: StandingPosition[]): void {
    // Ignore if block is not empty
    if (block.boundingBox !== 'empty') return

    // Ignore if block can't be stood on.
    const under = this.bot.blockAt(block.position.offset(0, -1, 0))
    if (under == null || under.boundingBox !== 'block') return

    // Ignore if there is no head room.
    const over = this.bot.blockAt(block.position.offset(0, 1, 0)) ?? undefined
    if (over != null && over.boundingBox !== 'empty') return
    if (this.costs.shouldAvoid(block, over)) return

    positions.push({
      position: block.position,
      cost: this.costs.calculateStandCost(block, over)
    })
  }
}

/**
 * A temporary object interface for deciding the best place to stand of
 * all available options.
 */
interface StandingPosition {
  /**
     * The block position to stand in.
     */
  position: Vec3

  /**
     * The estimated cost of standing in this block.
     */
  cost: number
}

class StandingPositionCosts {
  private readonly bot: Bot
  private readonly targets: StateMachineTargets

  /**
     * A list of block IDs to avoid standing in at all costs.
     */
  avoid: number[]

  /**
     * If true, movement cost is calculated based on the distance between the bot and the
     * standing position without taking the path into consideration. This is much faster
     * than calculating the cost and works well in most cases. In some rare scenarios,
     * however, the position may be further away.
     *
     * If this is false, an entire movement path is calculated for each potential standing
     * position. This is slow, and should only be used when accurate results are a priority.
     *
     * NOTE
     * ====
     * Only approximate mode is implemented!
     */
  approximateMoveMode: boolean = true

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
  blockCosts: Array<[number, number, number?]>

  /**
     * How much cost to add for each block away from the target the position is.
     */
  distanceMultiplier: number = 3

  /**
     * How much cost to add for each block the bot would need to move to get here.
     */
  moveMultiplier: number = 1

  /**
     * How much cost to add for standing on the block.
     */
  standOnCost: number = 30

  /**
     * How much cost to add for standing under the block.
     */
  standUnderCost: number = 10

  /**
     * Creates a new StandingPositionCosts object.

     * @param bot - TRhe bot to use when preforming calculations.
     * @param targets - The behavior targets information.
     */
  constructor (bot: Bot, targets: StateMachineTargets) {
    this.bot = bot
    this.targets = targets

    const mcData = mcDataLoader(this.bot.version)

    this.avoid = [
      mcData.blocksByName.lava.id,
      mcData.blocksByName.fire.id
    ]

    this.blockCosts = [
      [mcData.blocksByName.water.id, 25, 100],
      [mcData.blocksByName.wheat.id, 5]
    ]
  }

  /**
     * Checks whether or not the given position should be avoided.
     *
     * @param block - The standing position.
     * @param over - The block over the standing position.
     *
     * @returns True if the block should be avoided. False otherwise.
     */
  shouldAvoid (block: Block, over?: Block): boolean {
    if (this.avoid.includes(block.type)) return true
    if (over != null && this.avoid.includes(over.type)) return true

    return false
  }

  /**
     * Calculates the estimated cost of standing in the selected block.
     *
     * @param block - The block to check.
     * @param over - The block where the bots head would be.
     *
     * @returns The estimated cost value.
     */
  calculateStandCost (block: Block, over?: Block): number {
    if (this.targets.position == null) throw new Error('Target position not assigned!')

    let cost = 0
    const targetPos = this.targets.position.floored()

    for (const c of this.blockCosts) {
      if (block.type === c[0]) cost += c[1]
      if (over != null && over.type === c[0]) cost += c[2] ?? c[1]
    }

    cost += block.position.manhattanDistanceTo(this.targets.position) * this.distanceMultiplier
    cost += this.calculatePathCost(block) * this.moveMultiplier

    if (this.numberEquals(block.position.x, targetPos.x) &&
      this.numberEquals(block.position.z, targetPos.z)) {
      if (targetPos.y < block.position.y) cost += this.standOnCost
      if (targetPos.y > block.position.y) cost += this.standUnderCost
    }

    return cost
  }

  private calculatePathCost (block: Block): number {
    if (this.approximateMoveMode) return block.position.distanceTo(this.bot.entity.position)

    // TODO Test bot path and add cost
    return 0
  }

  private numberEquals (a: number, b: number): boolean {
    return Math.abs(a - b) < 0.00001
  }
}
