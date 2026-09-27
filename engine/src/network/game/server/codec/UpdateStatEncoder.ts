import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import UpdateStat from '#/network/game/server/model/UpdateStat.js';
import Environment from '#/util/Environment.js';

export default class UpdateStatEncoder extends ServerGameMessageEncoder<UpdateStat> {
    prot = ServerGameProt.UPDATE_STAT;

    encode(buf: Packet, message: UpdateStat): void {
        buf.p1_alt2(message.stat);
        buf.p1(message.level); // not base level
        buf.p4(Environment.NODE_ALLSTAR_XP ? message.exp : (message.exp / 10) | 0);
    }
}
