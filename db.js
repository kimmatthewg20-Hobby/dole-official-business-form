const { createClient } = require('@libsql/client');
require('dotenv').config();

const DEFAULT_DATABASE_URL = 'file:local.db';
const LOCAL_URL_SCHEME = 'file:';
const WRITE_TRANSACTION = 'write';

// DATABASE_URL is deliberately not read, so a leftover Postgres setting can never be used.
const databaseUrl = process.env.TURSO_DATABASE_URL || DEFAULT_DATABASE_URL;

let client = null;

function isTursoUrl(url) {
  return !url.startsWith(LOCAL_URL_SCHEME);
}

// Created on first use, so scripts can refuse a Turso URL before any connection or token check.
function getClient() {
  if (client) return client;
  if (!isTursoUrl(databaseUrl)) {
    client = createClient({ url: databaseUrl });
    return client;
  }
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL points at Turso');
  }
  client = createClient({ url: databaseUrl, authToken });
  return client;
}

// Statements with RETURNING report rowsAffected as 0 in libSQL, so fall back to the returned rows.
function toQueryResult(resultSet) {
  const rows = resultSet.rows.map((row) => ({ ...row }));
  return { rows, rowCount: resultSet.rowsAffected || rows.length, resultSet };
}

async function executeOn(target, sql, args = []) {
  return toQueryResult(await target.execute({ sql, args }));
}

async function query(sql, args) {
  const { rows, rowCount } = await executeOn(getClient(), sql, args);
  return { rows, rowCount };
}

async function get(sql, args) {
  const { rows } = await executeOn(getClient(), sql, args);
  return rows[0] || null;
}

async function all(sql, args) {
  const { rows } = await executeOn(getClient(), sql, args);
  return rows;
}

async function run(sql, args) {
  const { rows, rowCount, resultSet } = await executeOn(getClient(), sql, args);
  const insertedRowId = resultSet.lastInsertRowid;
  const fallbackId = rowCount > 0 && insertedRowId !== undefined ? Number(insertedRowId) : null;
  return { lastID: rows[0]?.id ?? fallbackId, changes: rowCount };
}

async function transaction(callback) {
  const tx = await getClient().transaction(WRITE_TRANSACTION);
  const transactionClient = {
    query: async (sql, args) => {
      const { rows, rowCount } = await executeOn(tx, sql, args);
      return { rows, rowCount };
    },
  };
  try {
    const result = await callback(transactionClient);
    await tx.commit();
    return result;
  } catch (err) {
    if (!tx.closed) await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

// Sends every { sql, args } statement in one request that libSQL runs as a single
// transaction, so a large import never holds a transaction open across many round trips.
function batch(statements) {
  return getClient().batch(statements, WRITE_TRANSACTION);
}

// Runs a multi-statement script such as a migration file; it takes no arguments.
function executeScript(sql) {
  return getClient().executeMultiple(sql);
}

function close() {
  if (client) client.close();
  client = null;
}

module.exports = {
  query,
  get,
  all,
  run,
  transaction,
  batch,
  executeScript,
  close,
  databaseUrl,
  isTursoUrl,
};
