import fs from 'fs';
import path from 'path';

import { tryParseBoolean, tryParseInt, tryParseString } from '#/util/TryParse.js';

export interface WorldConfig {
    easyStartup: boolean;
    website: {
        registration: boolean;
    };
    web: {
        port: number;
        allowedOrigin: string;
        managementPort: number;
    };
    engine: {
        revision: number;
    };
    node: {
        id: number;
        port: number;
        members: boolean;
        autoSubscribeMembers: boolean;
        xpRate: number;
        production: boolean;
        minimumWealthValueEvent: number;
        debug: boolean;
        debugProfile: boolean;
        clientRoutefinder: boolean;
        profile: string;
        maxConnected: number;
        debugProcChar: string;
        hopTime: number;
        rateLimitAddressLogin: number;
        rateLimitDeviceLogin: number;
        // Allstar-City: ms per game cycle (authentic: 600, Allstar-Scape: 500)
        tickrate: number;
        // Allstar-City: Allstar-Scape xp (whole xp units, half xp curve, strict level thresholds)
        allstarXp: boolean;
        // Allstar-City: Allstar-Scape combat model (engine/src/engine/AllstarCombat.ts)
        allstarCombat: boolean;
    };
    login: {
        enabled: boolean;
        host: string;
        port: number;
    };
    friend: {
        enabled: boolean;
        host: string;
        port: number;
    };
    logger: {
        enabled: boolean;
        host: string;
        port: number;
    };
    db: {
        backend: string;
        host: string;
        port: number;
        user: string;
        pass: string;
        name: string;
        verbose: boolean;
    };
    build: {
        verbose: boolean;
        startup: boolean;
        verify: boolean;
        verifyFolder: boolean;
        verifyPack: boolean;
        liveReload: boolean;
        srcDir: string;
    };
}

const worldConfigPath = path.resolve('data/config/world.json');
const legacyEnvPath = path.resolve('.env');

export function getWorldConfigPath() {
    return worldConfigPath;
}

export function createDefaultWorldConfig(): WorldConfig {
    return {
        easyStartup: false,
        website: {
            registration: true
        },
        web: {
            port: process.platform === 'win32' || process.platform === 'darwin' ? 80 : 8888,
            allowedOrigin: '',
            managementPort: 8898
        },
        engine: {
            revision: 289
        },
        node: {
            id: 10,
            port: 43594,
            members: true,
            autoSubscribeMembers: true,
            xpRate: 1,
            production: false,
            minimumWealthValueEvent: 10,
            debug: true,
            debugProfile: false,
            clientRoutefinder: true,
            profile: 'main',
            maxConnected: 1000,
            debugProcChar: '~',
            hopTime: 45000,
            rateLimitAddressLogin: 30,
            rateLimitDeviceLogin: 5,
            // Allstar-City: Allstar-Scape's 500 ms cycle, xp curve and combat model by default
            tickrate: 500,
            allstarXp: true,
            allstarCombat: true
        },
        login: {
            enabled: false,
            host: 'localhost',
            port: 43500
        },
        friend: {
            enabled: false,
            host: 'localhost',
            port: 45099
        },
        logger: {
            enabled: false,
            host: 'localhost',
            port: 43501
        },
        db: {
            backend: 'sqlite',
            host: 'localhost',
            port: 3306,
            user: 'root',
            pass: 'password',
            name: 'lostcity',
            verbose: false
        },
        build: {
            verbose: false,
            startup: false,
            // Allstar-City: the content is modified, so the packed data never matches the original cache
            verify: false,
            verifyFolder: true,
            verifyPack: false,
            liveReload: true,
            srcDir: '../content'
        }
    };
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeConfig<T>(defaults: T, value: unknown): T {
    if (isObject(defaults)) {
        const result: Record<string, unknown> = {};
        const parsed = isObject(value) ? value : {};

        for (const [key, defaultValue] of Object.entries(defaults)) {
            result[key] = mergeConfig(defaultValue, parsed[key]);
        }

        return result as T;
    }

    if (typeof defaults === 'boolean') {
        return tryParseBoolean(value as string | boolean | undefined | null, defaults) as T;
    }

    if (typeof defaults === 'number') {
        return tryParseInt(value as string | number | undefined | null, defaults) as T;
    }

    if (typeof defaults === 'string') {
        return tryParseString(value as string | undefined | null, defaults) as T;
    }

    return defaults;
}

export function normalizeWorldConfig(value: unknown): WorldConfig {
    const config = mergeConfig(createDefaultWorldConfig(), value);

    // Legacy compatibility: accept db.kyselyVerbose from older world.json files.
    if (isObject(value) && isObject(value.db) && !('verbose' in value.db)) {
        config.db.verbose = tryParseBoolean((value.db as Record<string, unknown>).kyselyVerbose as string | boolean | undefined | null, config.db.verbose);
    }

    return config;
}

function parseLegacyEnvFile(filePath: string): Record<string, string> {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const env: Record<string, string> = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) {
            continue;
        }

        const equals = trimmed.indexOf('=');
        if (equals === -1) {
            continue;
        }

        const rawKey = trimmed
            .slice(0, equals)
            .trim()
            .replace(/^export\s+/, '');
        const rawValue = trimmed.slice(equals + 1).trim();

        let value = rawValue;
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        env[rawKey] = value;
    }

    return env;
}

function migrateFromLegacyEnv(defaults: WorldConfig, env: Record<string, string>): WorldConfig {
    const config = structuredClone(defaults);

    config.easyStartup = tryParseBoolean(env.EASY_STARTUP, config.easyStartup);
    config.website.registration = tryParseBoolean(env.WEBSITE_REGISTRATION, config.website.registration);

    config.web.port = tryParseInt(env.WEB_PORT, config.web.port);
    config.web.allowedOrigin = tryParseString(env.WEB_ALLOWED_ORIGIN, config.web.allowedOrigin);
    config.web.managementPort = tryParseInt(env.WEB_MANAGEMENT_PORT, config.web.managementPort);

    config.engine.revision = tryParseInt(env.ENGINE_REVISION, config.engine.revision);

    config.node.id = tryParseInt(env.NODE_ID, config.node.id);
    config.node.port = tryParseInt(env.NODE_PORT, config.node.port);
    config.node.members = tryParseBoolean(env.NODE_MEMBERS, config.node.members);
    config.node.autoSubscribeMembers = tryParseBoolean(env.NODE_AUTO_SUBSCRIBE_MEMBERS, config.node.autoSubscribeMembers);
    config.node.xpRate = tryParseInt(env.NODE_XPRATE, config.node.xpRate);
    config.node.production = tryParseBoolean(env.NODE_PRODUCTION, config.node.production);
    config.node.minimumWealthValueEvent = tryParseInt(env.NODE_MINIMUM_WEALTH_VALUE_EVENT, config.node.minimumWealthValueEvent);
    config.node.debug = tryParseBoolean(env.NODE_DEBUG, config.node.debug);
    config.node.debugProfile = tryParseBoolean(env.NODE_DEBUG_PROFILE, config.node.debugProfile);
    config.node.clientRoutefinder = tryParseBoolean(env.NODE_CLIENT_ROUTEFINDER, config.node.clientRoutefinder);
    config.node.profile = tryParseString(env.NODE_PROFILE, config.node.profile);
    config.node.maxConnected = tryParseInt(env.NODE_MAX_CONNECTED, config.node.maxConnected);
    config.node.debugProcChar = tryParseString(env.NODE_DEBUGPROC_CHAR, config.node.debugProcChar);
    config.node.hopTime = tryParseInt(env.NODE_HOP_TIME, tryParseInt(env.NODE_MAX_NPCS, config.node.hopTime));
    config.node.rateLimitAddressLogin = tryParseInt(env.NODE_RATELIMIT_ADDRESS_LOGIN, config.node.rateLimitAddressLogin);
    config.node.rateLimitDeviceLogin = tryParseInt(env.NODE_RATELIMIT_DEVICE_LOGIN, config.node.rateLimitDeviceLogin);
    config.node.tickrate = tryParseInt(env.NODE_TICKRATE, config.node.tickrate);
    config.node.allstarXp = tryParseBoolean(env.NODE_ALLSTAR_XP, config.node.allstarXp);
    config.node.allstarCombat = tryParseBoolean(env.NODE_ALLSTAR_COMBAT, config.node.allstarCombat);

    config.login.enabled = tryParseBoolean(env.LOGIN_SERVER, config.login.enabled);
    config.login.host = tryParseString(env.LOGIN_HOST, config.login.host);
    config.login.port = tryParseInt(env.LOGIN_PORT, config.login.port);

    config.friend.enabled = tryParseBoolean(env.FRIEND_SERVER, config.friend.enabled);
    config.friend.host = tryParseString(env.FRIEND_HOST, config.friend.host);
    config.friend.port = tryParseInt(env.FRIEND_PORT, config.friend.port);

    config.logger.enabled = tryParseBoolean(env.LOGGER_SERVER, config.logger.enabled);
    config.logger.host = tryParseString(env.LOGGER_HOST, config.logger.host);
    config.logger.port = tryParseInt(env.LOGGER_PORT, config.logger.port);

    config.db.backend = tryParseString(env.DB_BACKEND, config.db.backend);
    config.db.host = tryParseString(env.DB_HOST, config.db.host);
    config.db.port = tryParseInt(env.DB_PORT, config.db.port);
    config.db.user = tryParseString(env.DB_USER, config.db.user);
    config.db.pass = tryParseString(env.DB_PASS, config.db.pass);
    config.db.name = tryParseString(env.DB_NAME, config.db.name);
    config.db.verbose = tryParseBoolean(env.KYSELY_VERBOSE, config.db.verbose);

    config.build.verbose = tryParseBoolean(env.BUILD_VERBOSE, config.build.verbose);
    config.build.startup = tryParseBoolean(env.BUILD_STARTUP, config.build.startup);
    config.build.verify = tryParseBoolean(env.BUILD_VERIFY, config.build.verify);
    config.build.verifyFolder = tryParseBoolean(env.BUILD_VERIFY_FOLDER, config.build.verifyFolder);
    config.build.verifyPack = tryParseBoolean(env.BUILD_VERIFY_PACK, config.build.verifyPack);
    config.build.liveReload = tryParseBoolean(env.BUILD_LIVE_RELOAD, config.build.liveReload);
    config.build.srcDir = tryParseString(env.BUILD_SRC_DIR, config.build.srcDir);

    return config;
}

export function saveWorldConfig(config: WorldConfig) {
    fs.mkdirSync(path.dirname(worldConfigPath), { recursive: true });
    fs.writeFileSync(worldConfigPath, JSON.stringify(config, null, 4) + '\n');
}

export function getDatabaseUrl(config: WorldConfig): string {
    const user = encodeURIComponent(config.db.user);
    const pass = encodeURIComponent(config.db.pass);
    return `mysql://${user}:${pass}@${config.db.host}:${config.db.port}/${config.db.name}`;
}

// Allstar-City: settings are layered defaults < data/config/world.json < .env < process.env.
// Every Allstar-City checkout keeps its ports and options in engine/.env (the 377 engine's format), so
// .env is read on every start instead of being migrated once into world.json.
const LEGACY_ENV_PREFIXES = ['EASY_STARTUP', 'WEBSITE_', 'WEB_', 'ENGINE_', 'NODE_', 'LOGIN_', 'FRIEND_', 'LOGGER_', 'DB_', 'KYSELY_', 'BUILD_'];

function legacyProcessEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === 'string' && LEGACY_ENV_PREFIXES.some(prefix => key.startsWith(prefix))) {
            env[key] = value;
        }
    }
    return env;
}

export function loadWorldConfig(): WorldConfig {
    let config = createDefaultWorldConfig();

    if (fs.existsSync(worldConfigPath)) {
        try {
            const raw = fs.readFileSync(worldConfigPath, 'utf8');
            config = normalizeWorldConfig(JSON.parse(raw));
        } catch (error) {
            if (error instanceof Error) {
                console.warn(`[Config] Failed to parse ${worldConfigPath}: ${error.message}. Using defaults.`);
            } else {
                console.warn(`[Config] Failed to parse ${worldConfigPath}. Using defaults.`);
            }
        }
    }

    let env: Record<string, string> = {};
    if (fs.existsSync(legacyEnvPath)) {
        try {
            env = parseLegacyEnvFile(legacyEnvPath);
        } catch (error) {
            if (error instanceof Error) {
                console.warn(`[Config] Failed to read ${legacyEnvPath}: ${error.message}.`);
            } else {
                console.warn(`[Config] Failed to read ${legacyEnvPath}.`);
            }
        }
    }

    return migrateFromLegacyEnv(config, { ...env, ...legacyProcessEnv() });
}
