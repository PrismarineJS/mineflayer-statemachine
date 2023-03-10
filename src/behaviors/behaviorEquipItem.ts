import type { EquipmentDestination } from 'mineflayer'
import { StateBehavior } from '../stateBehavior'

export class BehaviorEquipItem extends StateBehavior {
  onStateEntered (itemName: string, destination: EquipmentDestination): void {
    const items = this.bot.inventory.slots.filter(slot => slot != null)
    const item = items.find(i => i.name.includes(itemName))
    if (item == null) throw Error('Could not find item!')

    void this.bot.equip(item, destination)
  }
}
