import { loadWorldConfig } from '#/util/WorldConfig.js';

const config = loadWorldConfig();

export default {
    runtime: {
        maxNpcs: 16383
    },
    ...config,

    // Allstar-City: the 377 engine's flat names, kept so engine code written against Engine-TS 377
    // (the Allstar-City gameplay branches) still compiles. New code should use the structured config.
    NODE_TICKRATE: config.node.tickrate,
    NODE_ALLSTAR_XP: config.node.allstarXp,
    NODE_DEBUG: config.node.debug,
    NODE_DEBUG_PROFILE: config.node.debugProfile,
    NODE_PRODUCTION: config.node.production,
    NODE_MEMBERS: config.node.members,
    NODE_XPRATE: config.node.xpRate,
    NODE_PORT: config.node.port,
    NODE_ID: config.node.id,
    NODE_PROFILE: config.node.profile,
    NODE_CLIENT_ROUTEFINDER: config.node.clientRoutefinder,
    NODE_DEBUGPROC_CHAR: config.node.debugProcChar,
    NODE_MAX_NPCS: 16383,
    WEB_PORT: config.web.port,
    ENGINE_REVISION: config.engine.revision,
    FRIEND_SERVER: config.friend.enabled,
    LOGIN_SERVER: config.login.enabled,
    LOGGER_SERVER: config.logger.enabled,
    BUILD_SRC_DIR: config.build.srcDir,
    BUILD_VERIFY: config.build.verify,
    BUILD_VERIFY_PACK: config.build.verifyPack,
    BUILD_VERIFY_FOLDER: config.build.verifyFolder
};
