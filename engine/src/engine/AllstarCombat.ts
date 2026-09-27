import EnumType from '#/cache/config/EnumType.js';
import NpcType from '#/cache/config/NpcType.js';
import type Npc from '#/engine/entity/Npc.js';
import { NpcMode } from '#/engine/entity/NpcMode.js';
import { NpcStat } from '#/engine/entity/NpcStat.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ScriptRunner from '#/engine/script/ScriptRunner.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';

// Allstar-City: Allstar-Scape's NPC model (NPCHandler.java), enabled with NODE_ALLSTAR_COMBAT.
//
// Allstar-Scape NPCs have no engine AI at all: every cycle NPCHandler.process() runs one routine per
// NPC (wander, retaliate, aggression, death). The engine therefore runs [proc,allstar_npc_cycle]
// for every active NPC at the start of each cycle, before client input (Allstar-Scape processed NPCs
// after players, i.e. right before the next cycle's packets), and the content does the rest.
//
// NPC types lose their Lost City behaviour here: hitpoints come from npc.cfg (enum allstar_npc_hp,
// missing or 0 -> 3000), no hunting, no engine wandering (mode none), and every NPC respawns a fixed
// ALLSTAR_RESPAWN cycles after npc_del. Npc.ts also skips stat regen and moves NPCs without clipping.

// NPCHandler.process: actionTimer = 60 after the drop, then the NPC is recreated. The engine counts
// the respawn down in the same cycle as npc_del, so 61 makes it reappear 60 cycles after the drop.
export const ALLSTAR_RESPAWN = 61;

// ItemHandler: a dropped item is shown to everyone else after 60 cycles
export const ALLSTAR_OBJ_REVEAL = 60;

// NPCHandler.newNPC: "if (HP <= 0) HP = 3000"
const DEFAULT_HITPOINTS = 3000;

export function applyAllstarNpcTypes(): void {
    if (!Environment.NODE_ALLSTAR_COMBAT) {
        return;
    }

    const hitpoints = EnumType.getByName('allstar_npc_hp');
    for (let id = 0; id < NpcType.count; id++) {
        const type = NpcType.get(id);
        if (!type) {
            continue;
        }
        const hp = hitpoints?.values.get(id);
        type.stats[NpcStat.HITPOINTS] = typeof hp === 'number' && hp > 0 ? hp : DEFAULT_HITPOINTS;
        type.respawnrate = ALLSTAR_RESPAWN;
        type.huntmode = -1;
        type.huntrange = 0;
        type.defaultmode = NpcMode.NONE;
        type.timer = -1;
    }
}

// NPCHandler.process recreated a dead NPC with newNPC (e.g. dead Rock crabs come back as Rocks):
// [proc,allstar_npc_respawn] runs as soon as the NPC is back, before anyone sees it.
export function respawnAllstarNpc(npc: Npc): void {
    if (!Environment.NODE_ALLSTAR_COMBAT) {
        return;
    }

    const script = ScriptProvider.getByName('[proc,allstar_npc_respawn]');
    if (!script) {
        return;
    }
    try {
        npc.executeScript(ScriptRunner.init(script, npc));
    } catch (err) {
        console.error(err);
    }
}

// NPCHandler.process() for every npc, at the start of the cycle
export function processAllstarNpcs(): void {
    if (!Environment.NODE_ALLSTAR_COMBAT) {
        return;
    }

    const script = ScriptProvider.getByName('[proc,allstar_npc_cycle]');
    if (!script) {
        return;
    }

    for (const npc of World.npcs) {
        if (!npc.isActive || npc.delayed) {
            continue;
        }
        try {
            npc.executeScript(ScriptRunner.init(script, npc));
        } catch (err) {
            console.error(err);
        }
    }
}

// PlayerHandler update: Allstar-Scape applied the one pending hit of every NPC (NPC.hitDiff, HP -=
// hitDiff once per player viewing it) and player (NewHP = HP - hitDiff) when it wrote the update
// blocks, after every player had acted. Runs [proc,allstar_npc_update] and [proc,allstar_player_update]
// after player processing so the hits show in this cycle's update.
export function processAllstarUpdates(): void {
    if (!Environment.NODE_ALLSTAR_COMBAT) {
        return;
    }

    const npcUpdate = ScriptProvider.getByName('[proc,allstar_npc_update]');
    if (npcUpdate) {
        for (const npc of World.npcs) {
            if (!npc.isActive) {
                continue;
            }
            try {
                npc.executeScript(ScriptRunner.init(npcUpdate, npc));
            } catch (err) {
                console.error(err);
            }
        }
    }

    const playerUpdate = ScriptProvider.getByName('[proc,allstar_player_update]');
    if (playerUpdate) {
        for (const player of World.playerLoop.all()) {
            if (player.loggingOut) {
                continue;
            }
            try {
                player.executeScript(ScriptRunner.init(playerUpdate, player), false);
            } catch (err) {
                console.error(err);
            }
        }
    }
}
