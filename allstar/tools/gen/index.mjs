// Generator steps, run in order by allstar/tools/generate.mjs. Add one import + entry per step.
import combat from './combat.mjs';
import customitems from './customitems.mjs';
import items from './items.mjs';
import objects from './objects.mjs';
import scroll from './scroll.mjs';
import shops from './shops.mjs';
import ui from './ui.mjs';
import world from './world.mjs';

// items (ids < 7956) and customitems (ids >= 7956) run before objects, shops, ui and combat, which
// read their objs.
export default [world, scroll, items, customitems, objects, shops, ui, combat];
