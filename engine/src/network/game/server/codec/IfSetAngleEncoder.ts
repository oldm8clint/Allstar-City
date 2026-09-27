import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import IfSetAngle from '#/network/game/server/model/IfSetAngle.js';

// Allstar-City: 377 packet carried over to the 289 protocol
export default class IfSetAngleEncoder extends ServerGameMessageEncoder<IfSetAngle> {
    prot = ServerGameProt.IF_SETANGLE;

    encode(buf: Packet, message: IfSetAngle): void {
        buf.p2(message.component);
        buf.p2(message.xan);
        buf.p2(message.yan);
        buf.p2(message.zoom);
    }
}
