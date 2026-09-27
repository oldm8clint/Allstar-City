import AllstarLists, { appendLog } from '#/engine/AllstarLists.js';
import type Player from '#/engine/entity/Player.js';
import { isClientConnected } from '#/engine/entity/NetworkPlayer.js';
import { ScriptOpcode } from '#/engine/script/ScriptOpcode.js';
import { ActivePlayer } from '#/engine/script/ScriptPointer.js';
import { CommandHandlers } from '#/engine/script/ScriptRunner.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';

// Allstar-City script commands. Their signatures are declared in content/scripts/engine.rs2.

function* onlinePlayers(): IterableIterator<Player> {
    for (const player of World.players) {
        if (player && !player.loggingOut) {
            yield player;
        }
    }
}

const AllstarOps: CommandHandlers = {
    [ScriptOpcode.FINDNAME]: state => {
        const player = World.getPlayerByUsername(state.popString());
        if (!player || player.loggingOut) {
            state.pushInt(0);
            return;
        }

        state.activePlayer = player;
        state.pointerAdd(ActivePlayer[state.intOperand]);
        state.pushInt(1);
    },

    [ScriptOpcode.PLAYERALL]: state => {
        state.playerIterator = onlinePlayers();
    },

    [ScriptOpcode.WORLD_BROADCAST]: state => {
        World.broadcastMes(state.popString());
    },

    [ScriptOpcode.SETSTAFFMODLEVEL]: state => {
        state.activePlayer.staffModLevel = Math.max(0, Math.min(state.popInt(), 4));
    },

    [ScriptOpcode.P_KICK]: state => {
        const player = state.activePlayer;
        player.loggingOut = true;
        if (isClientConnected(player)) {
            player.logout();
            player.client.close();
        }
    },

    [ScriptOpcode.IPADDRESS]: state => {
        const player = state.activePlayer;
        state.pushString(isClientConnected(player) ? player.client.remoteAddress : '');
    },

    [ScriptOpcode.NAMELIST_ADD]: state => {
        const [list, entry] = state.popStrings(2);
        AllstarLists.add(list, entry);
    },

    [ScriptOpcode.NAMELIST_DEL]: state => {
        const [list, entry] = state.popStrings(2);
        AllstarLists.delete(list, entry);
    },

    [ScriptOpcode.NAMELIST_HAS]: state => {
        const [list, entry] = state.popStrings(2);
        state.pushInt(AllstarLists.has(list, entry) ? 1 : 0);
    },

    [ScriptOpcode.NAMELIST_CLEAR]: state => {
        AllstarLists.clear(state.popString());
    },

    [ScriptOpcode.ALLSTAR_LOG]: state => {
        const [name, line] = state.popStrings(2);
        appendLog(name, line);
    },

    [ScriptOpcode.WORLD_REBOOT]: state => {
        const seconds = Math.max(0, state.popInt());
        World.rebootTimer(Math.ceil((seconds * 1000) / Environment.node.tickrate));
    }
};

export default AllstarOps;
