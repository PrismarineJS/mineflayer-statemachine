import { StateBehavior } from "./statemachine";

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle implements StateBehavior
{
    readonly stateName: string = 'idle';

    onStateEntered(): void
    {
        // Nothing to do.
    }

    onStateExited(): void
    {
        // Nothing to do.
    }
}
