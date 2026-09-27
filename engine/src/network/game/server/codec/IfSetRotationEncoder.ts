import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import IfSetRotation from '#/network/game/server/model/IfSetRotation.js';

// Allstar-City: 377 packet carried over to the 289 protocol
export default class IfSetRotationEncoder extends ServerGameMessageEncoder<IfSetRotation> {
    prot = ServerGameProt.IF_SETROTATION;

    encode(buf: Packet, message: IfSetRotation): void {
        buf.p2(message.component);
        buf.p2(message.xAngleSpeed);
        buf.p2(message.yAngleSpeed);
    }
}
