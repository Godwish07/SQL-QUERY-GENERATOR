/**
 * Core SQL Query Generator Service
 * Generates standards-compliant SQL across PostgreSQL, MySQL, SQLite, MSSQL, and Oracle.
 */

class SqlGenerator {
  constructor() {
    this.dialects = ['postgres', 'mysql', 'sqlite', 'mssql', 'oracle'];
  }

  /**
   * Escape an identifier based on target SQL dialect
   */
  escapeIdentifier(name, dialect = 'postgres') {
    if (!name || name === '*') return '*';
    if (typeof name !== 'string') return String(name);
    
    // Check if it has a table prefix like "customers.id"
    if (name.includes('.')) {
      return name
        .split('.')
        .map(part => this.escapeIdentifier(part.trim(), dialect))
        .join('.');
    }

    const clean = name.trim();
    // If it's a raw expression or function call like COUNT(*), do not escape
    if (clean.includes('(') || clean.includes(' ') || clean.includes('+') || clean.includes('-')) {
      return clean;
    }

    switch (dialect) {
      case 'mysql':
        return `\`${clean}\``;
      case 'mssql':
        return `[${clean}]`;
      case 'oracle':
      case 'postgres':
        // Standard identifier or quoted if needed
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(clean) && !this.isReservedWord(clean)
          ? clean
          : `"${clean}"`;
      case 'sqlite':
      default:
        return clean;
    }
  }

  isReservedWord(word) {
    const reserved = ['user', 'order', 'group', 'table', 'select', 'where', 'from', 'join', 'check', 'default', 'primary', 'key', 'index'];
    return reserved.includes(word.toLowerCase());
  }

  /**
   * Format a scalar value appropriately for SQL
   */
  formatValue(val, dialect = 'postgres') {
    if (val === null || val === undefined || val === '') return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') {
      if (dialect === 'mysql' || dialect === 'sqlite') return val ? '1' : '0';
      return val ? 'TRUE' : 'FALSE';
    }

    const str = String(val).trim();
    // Number check
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return str;
    }
    // Boolean strings
    if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
      const boolVal = str.toLowerCase() === 'true';
      if (dialect === 'mysql' || dialect === 'sqlite') return boolVal ? '1' : '0';
      return boolVal ? 'TRUE' : 'FALSE';
    }

    // Escape single quotes for SQL safety
    const escaped = str.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * Build SELECT Query
   */
  buildSelect(spec, dialect = 'postgres') {
    const lines = [];
    const isMssql = dialect === 'mssql';
    const topClause = isMssql && spec.limit && !spec.offset ? `TOP (${parseInt(spec.limit, 10)}) ` : '';

    // 1. SELECT Clause
    let selectKeyword = spec.distinct ? 'SELECT DISTINCT' : 'SELECT';
    if (topClause) {
      selectKeyword += ` ${topClause}`;
    }

    let columnsStr = '*';
    if (spec.columns && Array.isArray(spec.columns) && spec.columns.length > 0) {
      columnsStr = spec.columns
        .map(col => {
          if (typeof col === 'string') {
            return this.escapeIdentifier(col, dialect);
          }

          let colExpr = '';
          const colName = col.column || '*';

          if (col.aggregate && col.aggregate.toUpperCase() !== 'NONE') {
            const agg = col.aggregate.toUpperCase();
            const distinctAgg = col.distinct ? 'DISTINCT ' : '';
            const targetCol = colName === '*' ? '*' : this.escapeIdentifier(colName, dialect);
            colExpr = `${agg}(${distinctAgg}${targetCol})`;
          } else if (col.rawExpr) {
            colExpr = col.rawExpr;
          } else {
            colExpr = this.escapeIdentifier(colName, dialect);
          }

          if (col.alias && col.alias.trim() !== '') {
            colExpr += ` AS ${this.escapeIdentifier(col.alias.trim(), dialect)}`;
          }

          return colExpr;
        })
        .join(',\n  ');
    }

    lines.push(`${selectKeyword}\n  ${columnsStr}`);

    // 2. FROM Clause
    if (spec.fromTable) {
      let fromStr = `FROM ${this.escapeIdentifier(spec.fromTable, dialect)}`;
      if (spec.fromAlias) {
        fromStr += ` ${this.escapeIdentifier(spec.fromAlias, dialect)}`;
      }
      lines.push(fromStr);
    }

    // 3. JOIN Clauses
    if (spec.joins && Array.isArray(spec.joins) && spec.joins.length > 0) {
      spec.joins.forEach(join => {
        if (!join.table) return;
        const joinType = (join.type || 'INNER').toUpperCase();
        let joinStr = `${joinType} JOIN ${this.escapeIdentifier(join.table, dialect)}`;
        if (join.alias) {
          joinStr += ` ${this.escapeIdentifier(join.alias, dialect)}`;
        }

        if (join.on && Array.isArray(join.on) && join.on.length > 0) {
          const onConditions = join.on
            .map((c, idx) => {
              const prefix = idx > 0 ? (c.logical || 'AND').toUpperCase() + ' ' : '';
              const left = this.escapeIdentifier(c.left, dialect);
              const op = c.operator || '=';
              const right = c.isLiteral ? this.formatValue(c.right, dialect) : this.escapeIdentifier(c.right, dialect);
              return `${prefix}${left} ${op} ${right}`;
            })
            .join(' ');
          joinStr += ` ON ${onConditions}`;
        } else if (join.using) {
          joinStr += ` USING (${this.escapeIdentifier(join.using, dialect)})`;
        }
        lines.push(joinStr);
      });
    }

    // 4. WHERE Clause
    if (spec.where && Array.isArray(spec.where) && spec.where.length > 0) {
      const whereConditions = this.buildWhereClause(spec.where, dialect);
      if (whereConditions) {
        lines.push(`WHERE ${whereConditions}`);
      }
    }

    // 5. GROUP BY Clause
    if (spec.groupBy && Array.isArray(spec.groupBy) && spec.groupBy.length > 0) {
      const groupCols = spec.groupBy
        .map(col => this.escapeIdentifier(col, dialect))
        .join(', ');
      lines.push(`GROUP BY ${groupCols}`);
    }

    // 6. HAVING Clause
    if (spec.having && Array.isArray(spec.having) && spec.having.length > 0) {
      const havingConditions = this.buildWhereClause(spec.having, dialect);
      if (havingConditions) {
        lines.push(`HAVING ${havingConditions}`);
      }
    }

    // 7. ORDER BY Clause
    if (spec.orderBy && Array.isArray(spec.orderBy) && spec.orderBy.length > 0) {
      const orderItems = spec.orderBy
        .map(item => {
          const col = typeof item === 'string' ? item : item.column;
          const dir = (item.direction || 'ASC').toUpperCase();
          let orderClause = `${this.escapeIdentifier(col, dialect)} ${dir}`;
          if (item.nulls && (dialect === 'postgres' || dialect === 'oracle')) {
            orderClause += ` NULLS ${item.nulls.toUpperCase()}`;
          }
          return orderClause;
        })
        .join(', ');
      lines.push(`ORDER BY ${orderItems}`);
    }

    // 8. LIMIT & OFFSET / Pagination
    const limitNum = spec.limit ? parseInt(spec.limit, 10) : null;
    const offsetNum = spec.offset ? parseInt(spec.offset, 10) : null;

    if (limitNum !== null || offsetNum !== null) {
      if (dialect === 'mssql') {
        if (offsetNum !== null || (limitNum !== null && spec.orderBy && spec.orderBy.length > 0)) {
          const off = offsetNum || 0;
          lines.push(`OFFSET ${off} ROWS`);
          if (limitNum !== null) {
            lines.push(`FETCH NEXT ${limitNum} ROWS ONLY`);
          }
        }
      } else if (dialect === 'oracle') {
        if (offsetNum !== null) {
          lines.push(`OFFSET ${offsetNum} ROWS`);
        }
        if (limitNum !== null) {
          lines.push(`FETCH NEXT ${limitNum} ROWS ONLY`);
        }
      } else {
        // postgres, mysql, sqlite
        if (limitNum !== null) {
          lines.push(`LIMIT ${limitNum}`);
        }
        if (offsetNum !== null) {
          lines.push(`OFFSET ${offsetNum}`);
        }
      }
    }

    return lines.join('\n') + ';';
  }

  /**
   * Helper to build WHERE / HAVING condition chains
   */
  buildWhereClause(conditions, dialect = 'postgres') {
    const active = conditions.filter(c => c && c.field);
    if (active.length === 0) return '';

    return active
      .map((cond, idx) => {
        const prefix = idx > 0 ? `\n  ${(cond.logical || 'AND').toUpperCase()} ` : '';
        const field = this.escapeIdentifier(cond.field, dialect);
        const op = (cond.operator || '=').toUpperCase();

        if (op === 'IS NULL' || op === 'IS NOT NULL') {
          return `${prefix}${field} ${op}`;
        }

        if (op === 'BETWEEN' || op === 'NOT BETWEEN') {
          const val1 = this.formatValue(cond.value, dialect);
          const val2 = this.formatValue(cond.value2, dialect);
          return `${prefix}${field} ${op} ${val1} AND ${val2}`;
        }

        if (op === 'IN' || op === 'NOT IN') {
          let listStr = '';
          if (Array.isArray(cond.value)) {
            listStr = cond.value.map(v => this.formatValue(v, dialect)).join(', ');
          } else if (typeof cond.value === 'string') {
            listStr = cond.value
              .split(',')
              .map(v => this.formatValue(v.trim(), dialect))
              .join(', ');
          }
          return `${prefix}${field} ${op} (${listStr})`;
        }

        if (op === 'ILIKE' && dialect !== 'postgres') {
          // MySQL/SQLite emulate ILIKE with UPPER()
          return `${prefix}UPPER(${field}) LIKE UPPER(${this.formatValue(cond.value, dialect)})`;
        }

        const formattedVal = this.formatValue(cond.value, dialect);
        return `${prefix}${field} ${op} ${formattedVal}`;
      })
      .join('');
  }

  /**
   * Build INSERT Query
   */
  buildInsert(spec, dialect = 'postgres') {
    const table = this.escapeIdentifier(spec.table, dialect);
    const cols = Object.keys(spec.values || {});
    if (cols.length === 0) {
      throw new Error('Insert query requires at least one column and value.');
    }

    const escapedCols = cols.map(c => this.escapeIdentifier(c, dialect)).join(', ');
    const escapedVals = cols.map(c => this.formatValue(spec.values[c], dialect)).join(', ');

    let query = `INSERT INTO ${table} (\n  ${escapedCols}\n)\nVALUES (\n  ${escapedVals}\n)`;

    if (spec.returning && (dialect === 'postgres' || dialect === 'sqlite')) {
      query += `\nRETURNING ${this.escapeIdentifier(spec.returning, dialect)}`;
    }

    return query + ';';
  }

  /**
   * Build UPDATE Query
   */
  buildUpdate(spec, dialect = 'postgres') {
    const table = this.escapeIdentifier(spec.table, dialect);
    const sets = Object.entries(spec.values || {})
      .map(([k, v]) => `${this.escapeIdentifier(k, dialect)} = ${this.formatValue(v, dialect)}`)
      .join(',\n  ');

    if (!sets) {
      throw new Error('Update query requires values to set.');
    }

    let query = `UPDATE ${table}\nSET\n  ${sets}`;

    if (spec.where && spec.where.length > 0) {
      const whereStr = this.buildWhereClause(spec.where, dialect);
      if (whereStr) {
        query += `\nWHERE ${whereStr}`;
      }
    }

    return query + ';';
  }

  /**
   * Build DELETE Query
   */
  buildDelete(spec, dialect = 'postgres') {
    const table = this.escapeIdentifier(spec.table, dialect);
    let query = `DELETE FROM ${table}`;

    if (spec.where && spec.where.length > 0) {
      const whereStr = this.buildWhereClause(spec.where, dialect);
      if (whereStr) {
        query += `\nWHERE ${whereStr}`;
      }
    }

    return query + ';';
  }

  /**
   * Build CREATE TABLE Query
   */
  buildCreateTable(spec, dialect = 'postgres') {
    const table = this.escapeIdentifier(spec.name, dialect);
    const colDefs = (spec.columns || []).map(col => {
      let def = `${this.escapeIdentifier(col.name, dialect)} ${col.type || 'VARCHAR(255)'}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.autoIncrement) {
        if (dialect === 'postgres') def = `${this.escapeIdentifier(col.name, dialect)} SERIAL PRIMARY KEY`;
        else if (dialect === 'mysql') def += ' AUTO_INCREMENT';
        else if (dialect === 'sqlite') def += ' AUTOINCREMENT';
        else if (dialect === 'mssql') def += ' IDENTITY(1,1)';
      }
      if (col.nullable === false && !col.primaryKey) def += ' NOT NULL';
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        def += ` DEFAULT ${this.formatValue(col.defaultValue, dialect)}`;
      }
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      return '  ' + def;
    });

    return `CREATE TABLE ${table} (\n${colDefs.join(',\n')}\n);`;
  }

  /**
   * Master generation entry point
   */
  generate(spec, dialect = 'postgres') {
    const normalizedDialect = this.dialects.includes(dialect.toLowerCase())
      ? dialect.toLowerCase()
      : 'postgres';

    const operation = (spec.operation || 'SELECT').toUpperCase();

    switch (operation) {
      case 'SELECT':
        return this.buildSelect(spec, normalizedDialect);
      case 'INSERT':
        return this.buildInsert(spec, normalizedDialect);
      case 'UPDATE':
        return this.buildUpdate(spec, normalizedDialect);
      case 'DELETE':
        return this.buildDelete(spec, normalizedDialect);
      case 'CREATE_TABLE':
        return this.buildCreateTable(spec, normalizedDialect);
      default:
        throw new Error(`Unsupported SQL operation: ${operation}`);
    }
  }
}

module.exports = new SqlGenerator();
