<h1 align="center">Mineflayer-StateMachine</h1>
<p align="center"><i>This project is a plugin designed for <a href="https://github.com/PrismarineJS/mineflayer">Mineflayer</a> that adds a high level API for writing state machines. As bot AI code can grow very quickly, writing this code in a finite state machine manner can help keep the code base manageable and improve quality of bot behavior trees.</i></p>

<p align="center">
  <img src="https://github.com/PrismarineJS/mineflayer-statemachine/workflows/Build/badge.svg" />
  <img src="https://img.shields.io/npm/v/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/repo-size/PrismarineJS/mineflayer-statemachine" />
  <img src="https://img.shields.io/npm/dm/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/contributors/PrismarineJS/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/license/PrismarineJS/mineflayer-statemachine" />
</p>

---

### What is it?

Mineflayer-StateMachine is a plugin for Mineflayer. It aims to add a flexible and customizable state machine API on top of Mineflayer to make it easier to write and scale bots.

Writing a complex bot AI can be difficult, especially if it has to be convincing. Finite state machines make this process much eaiser by offloading the fine details into isolated modules which only serve a single function or behavior. These modules can then be connected together in a top level component to customize how these seperate modules should interact and pass around control of the bot and state machine parameters.

### Showcase

**Videos**

[Webserver Demo](https://www.youtube.com/watch?v=ZWMrJJ_RKu8)

[Mining Demo](https://www.youtube.com/watch?v=aC-l0Buy0MY)

### Getting Started

This plugin is built using Node and can be installed using:
```bash
npm install --save mineflayer-statemachine
```

This plugin relies on [mineflayer-pathfinder](https://github.com/Karang/mineflayer-pathfinder) for movement related behaviors. If these behaviors are used, this plugin must be loaded before starting the state machine object.

### Simple Bot

The API for Mineflayer-StateMachine aims to be simple and intuitive, requiring minimal effort to setup a working state machine. The example below creates a three-state finite state machine which finds and follows the nearest player, stopping and looking at them when they are close.

```js
// Create your bot
const mineflayer = require("mineflayer");
const bot = mineflayer.createBot({ username: "Player" });

// Load your dependency plugins.
bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);

// Import required behaviors.
const {
    StateTransition,
    BotStateMachine,
    EntityFilters,
    BehaviorFollowEntity,
    BehaviorLookAtEntity,
    BehaviorGetClosestEntity,
    NestedStateMachine } = require("mineflayer-statemachine");
    
// Wait for our bot to login.
bot.once("spawn", () =>
{
    // This targets object is used to pass data between different states. It can be left empty.
    const targets = {};

    // Create our states
    const getClosestPlayer = new BehaviorGetClosestEntity(bot, targets, EntityFilters().PlayersOnly);
    const followPlayer = new BehaviorFollowEntity(bot, targets);
    const lookAtPlayer = new BehaviorLookAtEntity(bot, targets);

    // Create our transitions
    const transitions = [

        // We want to start following the player immediately after finding them.
        // Since getClosestPlayer finishes instantly, shouldTransition() should always return true.
        new StateTransition({
            parent: getClosestPlayer,
            child: followPlayer,
            shouldTransition: () => true,
        }),

        // If the distance to the player is less than two blocks, switch from the followPlayer
        // state to the lookAtPlayer state.
        new StateTransition({
            parent: followPlayer,
            child: lookAtPlayer,
            shouldTransition: () => followPlayer.distanceToTarget() < 2,
        }),

        // If the distance to the player is more than two blocks, switch from the lookAtPlayer
        // state to the followPlayer state.
        new StateTransition({
            parent: lookAtPlayer,
            child: followPlayer,
            shouldTransition: () => lookAtPlayer.distanceToTarget() >= 2,
        }),
    ];

    // Now we just wrap our transition list in a nested state machine layer. We want the bot
    // to start on the getClosestPlayer state, so we'll specify that here.
    const rootLayer = new NestedStateMachine(transitions, getClosestPlayer);
    
    // We can start our state machine simply by creating a new instance.
    new BotStateMachine(bot, rootLayer);
});
```

### Documentation

[API](https://PrismarineJS.github.io/mineflayer-statemachine/docs/api)

### Roadmap

**Implemented**
* Web View
* Look at Entity Behavior
* Nested State Machines
* Movement Behaviors
* Mining/Placing Behaviors
* Get Nearby Entities
* Equip Items and Armor

**To Do**
* Show Targets in Web View
* Camera Controls in Web View
* Collection-based Behaviors
* Fighting-based Behaviors
* Conversation-based Behaviors

### License

This project uses the [MIT](https://github.com/PrismarineJS/mineflayer-statemachine/blob/master/LICENSE) license.

### Contributions

This project is accepting PRs and Issues. See something you think can be improved? Go for it! Any and all help is highly appreciated!

For larger changes, it is recommended to discuss these changes in the issues tab before writing any code. It's also preferred to make many smaller PRs than one large one, where applicable.
