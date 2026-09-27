// Generator steps, run in order by allstar/tools/generate.mjs. Add one import + entry per step.
import customitems from './customitems.mjs';
import npcs from './npcs.mjs';
import scroll from './scroll.mjs';
import shops from './shops.mjs';
import ui from './ui.mjs';
import world from './world.mjs';

// customitems runs before shops and ui: both look up allstar_item_<id> objs.
export default [world, scroll, customitems, shops, ui, npcs];
