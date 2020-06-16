import { Entity } from "prismarine-entity";
import { StateBehavior } from "./../statemachine";
import { Bot } from "mineflayer";

/**
 * The header for the EntityFilters() function.
 */
export interface EntityFiltersHeader
{
    /**
     * Returns true for all entities.
     *
     * @param entity - The entity.
     */
    AllEntities: (entity: Entity) => boolean;

    /**
     * Returns true for all players. False for all other entities.
     *
     * @param entity - The entity.
     */
    PlayersOnly: (entity: Entity) => boolean;

    /**
     * Returns true for all mobs. False for all other entities.
     *
     * @param entity - The entity.
     */
    MobsOnly: (entity: Entity) => boolean;

    /**
     * Returns true for item drop entities and collectable arrows. False for
     * all other entities.
     *
     * @param entity - The entity.
     */
    ItemDrops: (entity: Entity) => boolean;
}

/**
 * Gets a list of many default entity filters which can be applied to
 * default state behaviors.
 */
export function EntityFilters(): object
{
    return {
        AllEntities: function (): boolean
        {
            return true;
        },

        PlayersOnly: function (entity: Entity): boolean
        {
            return entity.type === 'player';
        },

        MobsOnly: function (entity: Entity): boolean
        {
            return entity.type === 'mob';
        },

        ItemDrops: function (entity: Entity): boolean
        {
            if (entity.objectType === 'item')
                return true;

            if (entity.objectType === 'arrow')
            {
                // TODO Check if arrow can be picked up
                // Current NBT parsing is too limited to effectively check.

                return true;
            }

            return false;
        }
    };
}

/**
 * The bot will look at the nearest entity, player, or specific entity.
 */
export class BehaviorLookAtEntities implements StateBehavior
{
    private readonly bot: Bot;
    private readonly lookAtFilter: (entity: Entity) => boolean;

    stateName: string = 'lookAtEntities';
    active: boolean = false;

    constructor(bot: Bot, lookAtFilter: (entity: Entity) => boolean)
    {
        this.bot = bot;
        this.lookAtFilter = lookAtFilter;
        this.bot.on("physicTick", () => this.update());
    }

    private update(): void
    {
        if (!this.active)
            return;

        let closest = this.getClosestEntity();

        if (closest)
            // @ts-ignore
            this.bot.lookAt(closest.position.offset(0, closest.height, 0));
    }

    /**
     * Gets the closest entity to the bot, filtering entities as needed.
     * 
     * @returns The closest entity, or null if there are none.
     */
    private getClosestEntity(): Entity | null
    {
        let closest = null;
        let distance = 0;

        for (let entityName of Object.keys(this.bot.entities))
        {
            let entity = this.bot.entities[entityName];

            if (entity === this.bot.entity)
                continue;

            if (!this.lookAtFilter(entity))
                continue;

            // @ts-ignore
            let dist = entity.position.distanceTo(this.bot.entity.position);

            if (closest === null || dist < distance)
            {
                closest = entity;
                distance = dist;
            }
        }

        return closest;
    }
}