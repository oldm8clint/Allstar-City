// Generator steps, run in order by allstar/tools/generate.mjs. Add one import + entry per step.
import combat from './combat.mjs';
import customitems from './customitems.mjs';
import scroll from './scroll.mjs';
import shops from './shops.mjs';
import ui from './ui.mjs';
import world from './world.mjs';

// customitems runs before shops, ui and combat: they look up allstar_item_<id> objs.
export default [world, scroll, customitems, shops, ui, combat];
