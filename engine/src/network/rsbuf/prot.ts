export enum PlayerInfoProt {
    APPEARANCE = 4,
    ANIM = 8,
    FACE_ENTITY = 1,
    SAY = 16,
    DAMAGE = 1024,
    FACE_COORD = 2,
    CHAT = 64,
    BIG = 32,
    SPOT_ANIM = 512,
    EXACT_MOVE = 256,
    DAMAGE2 = 128
}

export function playerInfoProtIndex(prot: PlayerInfoProt): number {
    switch (prot) {
        case PlayerInfoProt.APPEARANCE:
            return 0;
        case PlayerInfoProt.ANIM:
            return 1;
        case PlayerInfoProt.FACE_ENTITY:
            return 2;
        case PlayerInfoProt.SAY:
            return 3;
        case PlayerInfoProt.DAMAGE:
            return 4;
        case PlayerInfoProt.DAMAGE2:
            return 5;
        case PlayerInfoProt.FACE_COORD:
            return 6;
        case PlayerInfoProt.CHAT:
            return 7;
        case PlayerInfoProt.SPOT_ANIM:
            return 8;
        case PlayerInfoProt.BIG:
        case PlayerInfoProt.EXACT_MOVE:
            return 255;
    }
}

export enum NpcInfoProt {
    DAMAGE2 = 16,
    ANIM = 2,
    FACE_ENTITY = 64,
    SAY = 32,
    DAMAGE = 128,
    CHANGE_TYPE = 1,
    SPOT_ANIM = 4,
    FACE_COORD = 8
}

export function npcInfoProtIndex(prot: NpcInfoProt): number {
    switch (prot) {
        case NpcInfoProt.ANIM:
            return 0;
        case NpcInfoProt.FACE_ENTITY:
            return 1;
        case NpcInfoProt.SAY:
            return 2;
        case NpcInfoProt.DAMAGE:
            return 3;
        case NpcInfoProt.DAMAGE2:
            return 4;
        case NpcInfoProt.CHANGE_TYPE:
            return 5;
        case NpcInfoProt.SPOT_ANIM:
            return 6;
        case NpcInfoProt.FACE_COORD:
            return 7;
    }
}
