import { Kysely, MysqlDialect } from 'kysely';
import type { Dialect, LogEvent } from 'kysely';
import { createPool } from 'mysql2';
import { DatabaseSync } from 'node:sqlite';

import { DB } from '#/db/types.js';
import { NodeSqliteDialect } from '#/db/dialect/NodeSqliteDialect.js';
import Environment from '#/util/Environment.js';

let dialect: Dialect;

if (Environment.DB_BACKEND === 'sqlite') {
    dialect = new NodeSqliteDialect({
        database: new DatabaseSync('db.sqlite')
    });
} else {
    dialect = new MysqlDialect({
        pool: async () =>
            createPool({
                database: Environment.DB_NAME,
                host: Environment.DB_HOST,
                port: Environment.DB_PORT,
                user: Environment.DB_USER,
                password: Environment.DB_PASS,
                timezone: 'Z'
            })
    });
}

function logVerbose(event: LogEvent) {
    if (event.level === 'query') {
        console.log(event.query.sql);
        console.log(event.query.parameters);
    }
}

export const db = new Kysely<DB>({
    dialect,
    log: Environment.KYSELY_VERBOSE ? logVerbose : []
});

export function toDbDate(date: Date | string | number) {
    if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(date);
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
}
