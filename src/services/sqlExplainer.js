/**
 * SQL Explainer Service
 * Analyzes and produces step-by-step human-readable explanations of SQL queries.
 */

class SqlExplainer {
  explain(sql) {
    if (!sql || typeof sql !== 'string' || sql.trim() === '') {
      throw new Error('Please provide a SQL query to explain.');
    }

    const cleanSql = sql.trim().replace(/;$/, '');
    const upper = cleanSql.toUpperCase();

    // Determine query type
    let queryType = 'UNKNOWN';
    if (/^\s*SELECT/i.test(cleanSql)) queryType = 'SELECT';
    else if (/^\s*INSERT/i.test(cleanSql)) queryType = 'INSERT';
    else if (/^\s*UPDATE/i.test(cleanSql)) queryType = 'UPDATE';
    else if (/^\s*DELETE/i.test(cleanSql)) queryType = 'DELETE';
    else if (/^\s*CREATE\s+TABLE/i.test(cleanSql)) queryType = 'CREATE TABLE';

    const analysis = {
      queryType,
      rawSql: sql,
      steps: [],
      tables: [],
      operations: [],
      summary: ''
    };

    switch (queryType) {
      case 'SELECT':
        this.explainSelect(cleanSql, analysis);
        break;
      case 'INSERT':
        this.explainInsert(cleanSql, analysis);
        break;
      case 'UPDATE':
        this.explainUpdate(cleanSql, analysis);
        break;
      case 'DELETE':
        this.explainDelete(cleanSql, analysis);
        break;
      case 'CREATE TABLE':
        this.explainCreateTable(cleanSql, analysis);
        break;
      default:
        analysis.steps.push({
          clause: 'QUERY',
          title: 'Custom Query',
          detail: 'Executes a custom SQL statement.'
        });
        analysis.summary = 'Executes a database command.';
    }

    return analysis;
  }

  explainSelect(sql, analysis) {
    // 1. FROM & Tables
    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_`"\[\]]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    const primaryTable = fromMatch ? fromMatch[1].replace(/[`"\[\]]/g, '') : null;
    const primaryAlias = fromMatch && fromMatch[2] ? fromMatch[2] : null;

    if (primaryTable) {
      analysis.tables.push(primaryTable);
      analysis.steps.push({
        clause: 'FROM',
        title: 'Read Source Table',
        icon: '📁',
        detail: `Retrieves initial dataset from table \`${primaryTable}\`${primaryAlias ? ` (aliased as \`${primaryAlias}\`)` : ''}.`
      });
    }

    // 2. JOINs
    const joinRegex = /(INNER|LEFT|RIGHT|FULL(?:\s+OUTER)?|CROSS)?\s*JOIN\s+([a-zA-Z0-9_`"\[\]]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+(?:ON\s+([^WHERE|GROUP|ORDER|LIMIT|;]+)|USING\s*\(([^)]+)\))/gi;
    let joinMatch;
    while ((joinMatch = joinRegex.exec(sql)) !== null) {
      const joinType = (joinMatch[1] || 'INNER').trim().toUpperCase();
      const joinTable = joinMatch[2].replace(/[`"\[\]]/g, '');
      const joinAlias = joinMatch[3] || '';
      const onCondition = (joinMatch[4] || joinMatch[5] || '').trim();

      analysis.tables.push(joinTable);
      analysis.operations.push(`${joinType} JOIN`);

      analysis.steps.push({
        clause: `${joinType} JOIN`,
        title: `Join with ${joinTable}`,
        icon: '🔗',
        detail: `Combines rows from \`${joinTable}\`${joinAlias ? ` (\`${joinAlias}\`)` : ''} using condition: \`${onCondition}\`. (${this.getJoinExplanation(joinType)})`
      });
    }

    // 3. WHERE Filter
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?=\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|\s+FETCH|$)/i);
    if (whereMatch) {
      const whereCondition = whereMatch[1].trim();
      analysis.operations.push('FILTER');
      analysis.steps.push({
        clause: 'WHERE',
        title: 'Filter Records',
        icon: '🔍',
        detail: `Restricts result set to only rows matching condition: \`${whereCondition}\`.`
      });
    }

    // 4. GROUP BY
    const groupMatch = sql.match(/GROUP\s+BY\s+([\s\S]+?)(?=\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|\s+FETCH|$)/i);
    if (groupMatch) {
      const groupCols = groupMatch[1].trim();
      analysis.operations.push('AGGREGATION');
      analysis.steps.push({
        clause: 'GROUP BY',
        title: 'Group Rows',
        icon: '📊',
        detail: `Aggregates rows sharing identical values in: \`${groupCols}\`.`
      });
    }

    // 5. HAVING
    const havingMatch = sql.match(/HAVING\s+([\s\S]+?)(?=\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|\s+FETCH|$)/i);
    if (havingMatch) {
      const havingCond = havingMatch[1].trim();
      analysis.steps.push({
        clause: 'HAVING',
        title: 'Filter Aggregate Groups',
        icon: '⚖️',
        detail: `Filters the grouped aggregate results where: \`${havingCond}\`.`
      });
    }

    // 6. SELECT Projections
    const selectMatch = sql.match(/SELECT\s+(DISTINCT\s+)?([\s\S]+?)\s+FROM/i);
    if (selectMatch) {
      const isDistinct = !!selectMatch[1];
      const cols = selectMatch[2].trim();
      analysis.steps.push({
        clause: 'SELECT',
        title: 'Select Output Columns',
        icon: '📋',
        detail: `Calculates and extracts columns${isDistinct ? ' (removing duplicates via DISTINCT)' : ''}: \`${cols.replace(/\n\s*/g, ' ')}\`.`
      });
    }

    // 7. ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([\s\S]+?)(?=\s+LIMIT|\s+OFFSET|\s+FETCH|$)/i);
    if (orderMatch) {
      const orderCols = orderMatch[1].trim();
      analysis.operations.push('SORT');
      analysis.steps.push({
        clause: 'ORDER BY',
        title: 'Sort Results',
        icon: '🔃',
        detail: `Orders the final output rows by: \`${orderCols}\`.`
      });
    }

    // 8. LIMIT / OFFSET / TOP / FETCH
    const limitMatch = sql.match(/LIMIT\s+([0-9]+)(?:\s+OFFSET\s+([0-9]+))?/i);
    const topMatch = sql.match(/SELECT\s+TOP\s*\(?([0-9]+)\)?/i);
    const fetchMatch = sql.match(/FETCH\s+(?:FIRST|NEXT)\s+([0-9]+)\s+ROWS/i);

    const limitVal = limitMatch ? limitMatch[1] : (topMatch ? topMatch[1] : (fetchMatch ? fetchMatch[1] : null));
    const offsetVal = limitMatch && limitMatch[2] ? limitMatch[2] : null;

    if (limitVal || offsetVal) {
      analysis.operations.push('PAGINATION');
      let pageDetail = '';
      if (limitVal && offsetVal) {
        pageDetail = `Skips the first ${offsetVal} rows and returns the next ${limitVal} rows.`;
      } else if (limitVal) {
        pageDetail = `Limits output to maximum ${limitVal} records.`;
      } else if (offsetVal) {
        pageDetail = `Skips the first ${offsetVal} records.`;
      }

      analysis.steps.push({
        clause: 'PAGINATION',
        title: 'Limit Result Count',
        icon: '📄',
        detail: pageDetail
      });
    }

    // Summary sentence
    analysis.summary = `Fetches records from \`${primaryTable || 'table'}\`${analysis.tables.length > 1 ? ` joined with ${analysis.tables.slice(1).map(t => '`' + t + '`').join(', ')}` : ''}${whereMatch ? ' with custom filters' : ''}${groupMatch ? ', aggregated by groups' : ''}${orderMatch ? ' and sorted' : ''}.`;
  }

  explainInsert(sql, analysis) {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_`"\[\]]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)/i);
    const table = match ? match[1].replace(/[`"\[\]]/g, '') : 'table';
    const cols = match ? match[2].trim() : '';

    analysis.tables.push(table);
    analysis.steps.push({
      clause: 'INSERT',
      title: `Insert Row into ${table}`,
      icon: '➕',
      detail: `Inserts a new record into table \`${table}\` with values for columns: \`${cols}\`.`
    });
    analysis.summary = `Creates new record in \`${table}\`.`;
  }

  explainUpdate(sql, analysis) {
    const tableMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_`"\[\]]+)/i);
    const setMatch = sql.match(/SET\s+([\s\S]+?)(?=\s+WHERE|$)/i);
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)$/i);

    const table = tableMatch ? tableMatch[1].replace(/[`"\[\]]/g, '') : 'table';
    analysis.tables.push(table);

    analysis.steps.push({
      clause: 'UPDATE',
      title: `Modify Rows in ${table}`,
      icon: '✏️',
      detail: `Updates column values in \`${table}\`: \`${setMatch ? setMatch[1].trim() : ''}\`.`
    });

    if (whereMatch) {
      analysis.steps.push({
        clause: 'WHERE',
        title: 'Target Rows',
        icon: '🎯',
        detail: `Only updates rows matching: \`${whereMatch[1].trim()}\`.`
      });
      analysis.summary = `Updates matching rows in \`${table}\`.`;
    } else {
      analysis.steps.push({
        clause: 'WARNING',
        title: 'Global Update',
        icon: '⚠️',
        detail: `No WHERE clause specified! All rows in \`${table}\` will be updated.`
      });
      analysis.summary = `Updates ALL rows in \`${table}\`.`;
    }
  }

  explainDelete(sql, analysis) {
    const tableMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_`"\[\]]+)/i);
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)$/i);

    const table = tableMatch ? tableMatch[1].replace(/[`"\[\]]/g, '') : 'table';
    analysis.tables.push(table);

    analysis.steps.push({
      clause: 'DELETE',
      title: `Delete from ${table}`,
      icon: '🗑️',
      detail: `Removes records from table \`${table}\`.`
    });

    if (whereMatch) {
      analysis.steps.push({
        clause: 'WHERE',
        title: 'Condition',
        icon: '🎯',
        detail: `Only deletes rows matching: \`${whereMatch[1].trim()}\`.`
      });
      analysis.summary = `Deletes matching records from \`${table}\`.`;
    } else {
      analysis.steps.push({
        clause: 'CAUTION',
        title: 'Full Table Truncation',
        icon: '⚠️',
        detail: `No WHERE condition specified! Every row in \`${table}\` will be deleted.`
      });
      analysis.summary = `Deletes ALL records from \`${table}\`.`;
    }
  }

  explainCreateTable(sql, analysis) {
    const match = sql.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_`"\[\]]+)\s*\(([\s\S]+)\)/i);
    const table = match ? match[1].replace(/[`"\[\]]/g, '') : 'new_table';
    analysis.tables.push(table);

    analysis.steps.push({
      clause: 'CREATE TABLE',
      title: `Define Schema for ${table}`,
      icon: '🏗️',
      detail: `Creates a new database table named \`${table}\` with specified column definitions and constraints.`
    });
    analysis.summary = `Defines new table structure for \`${table}\`.`;
  }

  getJoinExplanation(type) {
    switch (type) {
      case 'LEFT':
        return 'Includes all rows from the left table, plus matched rows from the right table.';
      case 'RIGHT':
        return 'Includes all rows from the right table, plus matched rows from the left table.';
      case 'FULL':
      case 'FULL OUTER':
        return 'Includes all rows when there is a match in either left or right table.';
      case 'CROSS':
        return 'Produces Cartesian product of all rows in both tables.';
      case 'INNER':
      default:
        return 'Only returns rows where matching records exist in both tables.';
    }
  }
}

module.exports = new SqlExplainer();
