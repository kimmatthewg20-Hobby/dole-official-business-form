# SQLite to PostgreSQL Conversion Guide

This document explains how to convert remaining routes from SQLite to PostgreSQL.

## Key Changes Made

1. ✅ Replaced `sqlite3` with `pg` (PostgreSQL client)
2. ✅ Created `db.js` module with helper functions
3. ✅ Converted admin routes (login, change-password)
4. ✅ Converted settings routes
5. ✅ Converted submit route (with transactions)

## Conversion Pattern

### 1. Change Function Signatures
**Before (SQLite with callbacks):**
```javascript
app.get('/api/route', (req, res) => {
  db.get('SELECT ...', [params], (err, row) => {
    // callback code
  });
});
```

**After (PostgreSQL with async/await):**
```javascript
app.get('/api/route', async (req, res) => {
  try {
    const row = await db.get('SELECT ...', [params]);
    // use row
  } catch (err) {
    // error handling
  }
});
```

### 2. Replace Placeholders
- SQLite uses `?` placeholders
- PostgreSQL uses `$1, $2, $3, ...` placeholders

**Before:**
```javascript
db.run('INSERT INTO table (col1, col2) VALUES (?, ?)', [val1, val2]);
```

**After:**
```javascript
await db.run('INSERT INTO table (col1, col2) VALUES ($1, $2)', [val1, val2]);
```

### 3. Replace Database Methods

| SQLite | PostgreSQL |
|--------|------------|
| `db.get(query, params, callback)` | `await db.get(query, params)` |
| `db.all(query, params, callback)` | `await db.all(query, params)` |
| `db.run(query, params, callback)` | `await db.run(query, params)` |
| `db.serialize(() => {...})` | `await db.transaction(async (client) => {...})` |

### 4. Transactions

**Before (SQLite):**
```javascript
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  db.run('INSERT ...', [], (err) => {
    if (err) {
      db.run('ROLLBACK');
      return;
    }
    db.run('COMMIT');
  });
});
```

**After (PostgreSQL):**
```javascript
await db.transaction(async (client) => {
  await client.query('INSERT ...', [params]);
  // All queries use client.query() inside transaction
});
```

### 5. Getting Last Insert ID

**Before (SQLite):**
```javascript
db.run('INSERT ...', [], function(err) {
  const id = this.lastID;
});
```

**After (PostgreSQL):**
```javascript
const result = await db.run('INSERT ... RETURNING id', [params]);
const id = result.lastID;
```

### 6. IN Clauses

**Before (SQLite):**
```javascript
const placeholders = ids.map(() => '?').join(',');
db.all(`SELECT * FROM table WHERE id IN (${placeholders})`, ids, callback);
```

**After (PostgreSQL):**
```javascript
const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
const rows = await db.all(`SELECT * FROM table WHERE id IN (${placeholders})`, ids);
```

## Routes That Still Need Conversion

Run this command to find all routes that still use SQLite patterns:
```bash
grep -n "db\.\(get\|all\|run\|serialize\)" server.js
```

### Common Patterns to Replace

1. **db.get with callback:**
   ```javascript
   // Find: db.get('SELECT ...', [params], (err, row) => {
   // Replace with: const row = await db.get('SELECT ...', [params]);
   ```

2. **db.all with callback:**
   ```javascript
   // Find: db.all('SELECT ...', [params], (err, rows) => {
   // Replace with: const rows = await db.all('SELECT ...', [params]);
   ```

3. **db.run with callback:**
   ```javascript
   // Find: db.run('INSERT ...', [params], function(err) {
   // Replace with: const result = await db.run('INSERT ... RETURNING id', [params]);
   ```

4. **Error handling:**
   ```javascript
   // Remove: if (err) { ... }
   // Add: try { ... } catch (err) { ... }
   ```

## Quick Conversion Checklist

For each route:
- [ ] Add `async` to route handler: `(req, res) =>` → `async (req, res) =>`
- [ ] Replace `db.get()` with `await db.get()`
- [ ] Replace `db.all()` with `await db.all()`
- [ ] Replace `db.run()` with `await db.run()`
- [ ] Replace `?` with `$1, $2, $3, ...`
- [ ] Replace callbacks with try/catch
- [ ] Replace `db.serialize()` with `db.transaction()`
- [ ] Update `this.lastID` to `result.lastID`
- [ ] Test the route

## Testing

After conversion, test each route:
1. Start server: `npm start`
2. Test each endpoint
3. Check database in Supabase Table Editor
4. Verify data is saved correctly

## Need Help?

If you encounter issues:
1. Check error messages in console
2. Verify DATABASE_URL is set correctly
3. Ensure tables exist in Supabase
4. Check PostgreSQL syntax (different from SQLite in some cases)
