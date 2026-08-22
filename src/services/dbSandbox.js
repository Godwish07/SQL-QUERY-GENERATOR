/**
 * In-Memory Database Execution Sandbox
 * Allows users to run generated queries against realistic pre-loaded demo datasets.
 */

const { schemas } = require('../data/schemas');

class DatabaseSandbox {
  constructor() {
    this.sqlJs = null;
    this.db = null;
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      // Attempt to load sql.js WebAssembly
      const initSqlJs = require('sql.js');
      this.sqlJs = await initSqlJs();
      this.db = new this.sqlJs.Database();
      this.seedDatabase();
      this.initialized = true;
      console.log('✅ SQLite in-memory sandbox initialized with sample data.');
    } catch (err) {
      console.warn('⚠️ sql.js not available yet, using built-in JS query executor:', err.message);
      this.initialized = false;
    }
  }

  seedDatabase() {
    if (!this.db) return;

    // Seed all tables from all schema datasets
    Object.values(schemas).forEach(schema => {
      Object.entries(schema.tables).forEach(([tableName, tableDef]) => {
        // Create table SQL
        const colDefs = tableDef.columns.map(c => {
          let type = c.type;
          if (type.includes('VARCHAR') || type === 'DATE') type = 'TEXT';
          if (type.includes('DECIMAL')) type = 'REAL';
          if (type === 'BOOLEAN') type = 'INTEGER';
          return `${c.name} ${type} ${c.primaryKey ? 'PRIMARY KEY' : ''}`;
        }).join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`);

        // Insert sample data
        if (tableDef.sampleData && tableDef.sampleData.length > 0) {
          tableDef.sampleData.forEach(row => {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const values = Object.values(row).map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
            try {
              this.db.run(
                `INSERT OR IGNORE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders});`,
                values
              );
            } catch (insertErr) {
              // ignore duplicate key
            }
          });
        }
      });
    });
  }

  /**
   * Execute query in sandbox
   */
  async execute(sql, schemaId = 'ecommerce') {
    await this.initPromise;
    const startTime = Date.now();

    if (!sql || typeof sql !== 'string' || sql.trim() === '') {
      throw new Error('No SQL query provided for execution.');
    }

    const cleanSql = sql.trim().replace(/;$/, '');

    // 1. If SQLite WebAssembly is initialized, run directly
    if (this.initialized && this.db) {
      try {
        // Clean dialect-specific quirks for SQLite (e.g. convert ILIKE or MS TOP)
        let executableSql = cleanSql
          .replace(/\bILIKE\b/gi, 'LIKE')
          .replace(/TOP\s*\(([0-9]+)\)/gi, '') // simple replacement if needed
          .replace(/\[([a-zA-Z0-9_]+)\]/g, '$1') // remove square brackets
          .replace(/"([a-zA-Z0-9_]+)"/g, '$1');

        const results = this.db.exec(executableSql);
        const executionTimeMs = Math.max(1, Date.now() - startTime);

        if (!results || results.length === 0) {
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs,
            message: 'Query executed successfully. 0 rows returned (or DDL/DML update completed).'
          };
        }

        const firstResult = results[0];
        const columns = firstResult.columns;
        const rows = firstResult.values.map(vals => {
          const rowObj = {};
          columns.forEach((col, idx) => {
            rowObj[col] = vals[idx];
          });
          return rowObj;
        });

        return {
          success: true,
          columns,
          rows,
          rowCount: rows.length,
          executionTimeMs,
          engine: 'sqlite_wasm'
        };
      } catch (sqlErr) {
        throw new Error(`Execution error: ${sqlErr.message}`);
      }
    }

    // 2. Fallback: Pure In-Memory JS Evaluator
    return this.fallbackExecute(cleanSql, schemaId, startTime);
  }

  /**
   * Fallback in-memory evaluator for environments without native WebAssembly
   */
  fallbackExecute(sql, schemaId, startTime) {
    const schema = schemas[schemaId] || schemas.ecommerce;
    const tableNames = Object.keys(schema.tables);

    // Identify primary table
    let primaryTable = tableNames.find(t => new RegExp(`\\b${t}\\b`, 'i').test(sql)) || tableNames[0];
    const tableDef = schema.tables[primaryTable];
    let data = JSON.parse(JSON.stringify(tableDef.sampleData || []));

    // Handle WHERE filters
    if (/WHERE/i.test(sql)) {
      if (/status\s*=\s*'([a-z]+)'/i.test(sql)) {
        const statusMatch = sql.match(/status\s*=\s*'([a-z]+)'/i);
        if (statusMatch) data = data.filter(r => r.status === statusMatch[1]);
      }
      if (/country\s*=\s*'([a-z]+)'/i.test(sql)) {
        const countryMatch = sql.match(/country\s*=\s*'([a-z]+)'/i);
        if (countryMatch) data = data.filter(r => (r.country || '').toUpperCase() === countryMatch[1].toUpperCase());
      }
      if (/price\s*(>|>=|<|<=|=)\s*([0-9.]+)/i.test(sql)) {
        const priceMatch = sql.match(/price\s*(>|>=|<|<=|=)\s*([0-9.]+)/i);
        if (priceMatch) {
          const op = priceMatch[1];
          const val = parseFloat(priceMatch[2]);
          data = data.filter(r => op === '>' ? r.price > val : op === '>=' ? r.price >= val : op === '<' ? r.price < val : r.price === val);
        }
      }
      if (/salary\s*(>|>=|<|<=|=)\s*([0-9.]+)/i.test(sql)) {
        const salaryMatch = sql.match(/salary\s*(>|>=|<|<=|=)\s*([0-9.]+)/i);
        if (salaryMatch) {
          const op = salaryMatch[1];
          const val = parseFloat(salaryMatch[2]);
          data = data.filter(r => op === '>' ? r.salary > val : op === '>=' ? r.salary >= val : op === '<' ? r.salary < val : r.salary === val);
        }
      }
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+([0-9]+)/i);
    if (limitMatch) {
      data = data.slice(0, parseInt(limitMatch[1], 10));
    }

    const columns = data.length > 0 ? Object.keys(data[0]) : tableDef.columns.map(c => c.name);

    return {
      success: true,
      columns,
      rows: data,
      rowCount: data.length,
      executionTimeMs: Math.max(1, Date.now() - startTime),
      engine: 'in_memory_js_evaluator'
    };
  }
}

module.exports = new DatabaseSandbox();
