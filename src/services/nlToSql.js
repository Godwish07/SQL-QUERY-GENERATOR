/**
 * Natural Language to SQL Generator Service
 * Combines an intelligent offline semantic rule/intent parser with
 * optional LLM (Gemini / OpenAI) integration.
 */

const { schemas } = require('../data/schemas');
const sqlGenerator = require('./sqlGenerator');

class NaturalLanguageToSql {
  /**
   * Convert Natural Language prompt into SQL
   */
  async convert({ prompt, schemaId = 'ecommerce', dialect = 'postgres', apiKey = null, modelProvider = 'gemini' }) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('Please provide a natural language query prompt.');
    }

    const cleanPrompt = prompt.trim();
    const schema = schemas[schemaId] || schemas.ecommerce;

    // If an API key is provided, attempt LLM generation
    if (apiKey && apiKey.trim() !== '') {
      try {
        return await this.generateWithLLM({
          prompt: cleanPrompt,
          schema,
          dialect,
          apiKey: apiKey.trim(),
          modelProvider
        });
      } catch (err) {
        console.warn('LLM generation failed, falling back to rule-based parser:', err.message);
        const fallbackResult = this.generateWithRules({ prompt: cleanPrompt, schema, dialect });
        fallbackResult.note = `AI generation notice: ${err.message}. Showing result from intelligent local parser.`;
        return fallbackResult;
      }
    }

    // Default: Fast, local, intelligent rule-based engine
    return this.generateWithRules({ prompt: cleanPrompt, schema, dialect });
  }

  /**
   * Intelligent Rule-based NLP SQL Synthesizer
   */
  generateWithRules({ prompt, schema, dialect = 'postgres' }) {
    const text = prompt.toLowerCase();
    const tableEntries = Object.entries(schema.tables);

    // 1. Identify primary and referenced tables in prompt
    let primaryTable = null;
    const secondaryTables = [];

    // Prioritize tables whose specific columns are mentioned
    let targetColFound = null;
    let tableForTargetCol = null;

    tableEntries.forEach(([tblName, def]) => {
      def.columns.forEach(col => {
        const colClean = col.name.toLowerCase().replace(/_/g, ' ');
        if (text.includes(colClean) || text.includes(col.name)) {
          targetColFound = col.name;
          tableForTargetCol = tblName;
        }
      });
    });

    if (tableForTargetCol) {
      primaryTable = tableForTargetCol;
    }

    // Also collect all mentioned tables
    tableEntries.forEach(([tableName]) => {
      const singular = tableName.replace(/s$/, '');
      const pattern = new RegExp(`\\b(${tableName}|${singular})\\b`, 'i');
      if (pattern.test(text)) {
        if (!primaryTable) {
          primaryTable = tableName;
        } else if (tableName !== primaryTable && !secondaryTables.includes(tableName)) {
          secondaryTables.push(tableName);
        }
      }
    });

    if (!primaryTable) {
      primaryTable = tableEntries[0][0];
    }

    const primaryTableDef = schema.tables[primaryTable];
    const columns = primaryTableDef.columns;

    // 2. Identify requested columns and aggregations
    const queryColumns = [];
    let isDistinct = text.includes('distinct') || text.includes('unique');

    const isCount = /\b(how many|count|number of|total number)\b/.test(text);
    const isSum = /\b(sum|total (amount|spend|sales|revenue|salary|budget|mrr))\b/.test(text) && !text.includes('total number');
    const isAvg = /\b(average|avg|mean)\b/.test(text);
    const isMax = /\b(highest|maximum|max|most expensive|top paid)\b/.test(text);
    const isMin = /\b(lowest|minimum|min|cheapest|least)\b/.test(text);

    let aggregatedCol = targetColFound;
    if (!aggregatedCol) {
      const numeric = columns.find(c => ['price', 'salary', 'budget', 'total_amount', 'amount', 'mrr'].includes(c.name));
      if (numeric) aggregatedCol = numeric.name;
    }

    if (isCount) {
      queryColumns.push({ column: '*', aggregate: 'COUNT', alias: 'total_count' });
    } else if (isSum && aggregatedCol) {
      queryColumns.push({ column: aggregatedCol, aggregate: 'SUM', alias: `total_${aggregatedCol}` });
    } else if (isAvg && aggregatedCol) {
      queryColumns.push({ column: aggregatedCol, aggregate: 'AVG', alias: `avg_${aggregatedCol}` });
    } else if (isMax && aggregatedCol) {
      queryColumns.push({ column: aggregatedCol, aggregate: 'MAX', alias: `max_${aggregatedCol}` });
    } else if (isMin && aggregatedCol) {
      queryColumns.push({ column: aggregatedCol, aggregate: 'MIN', alias: `min_${aggregatedCol}` });
    } else {
      const matchingCols = columns.filter(col => {
        const colClean = col.name.toLowerCase().replace(/_/g, ' ');
        return text.includes(colClean) || text.includes(col.name);
      });

      if (matchingCols.length > 0) {
        matchingCols.forEach(c => queryColumns.push({ column: c.name }));
      } else {
        columns.slice(0, 5).forEach(c => queryColumns.push({ column: c.name }));
      }
    }

    // 3. Identify WHERE conditions
    const where = [];

    // Check status filters
    ['active', 'inactive', 'vip', 'completed', 'pending', 'cancelled', 'paid', 'unpaid', 'churned'].forEach(st => {
      if (text.includes(st)) {
        const statusCol = columns.find(c => c.name === 'status' || c.name === 'is_active');
        if (statusCol) {
          if (statusCol.type === 'BOOLEAN') {
            where.push({ field: statusCol.name, operator: '=', value: st === 'active' ? true : false });
          } else {
            where.push({ field: statusCol.name, operator: '=', value: st });
          }
        }
      }
    });

    // Check country filters
    ['usa', 'uk', 'canada', 'germany', 'australia'].forEach(country => {
      if (text.includes(country)) {
        const countryCol = columns.find(c => c.name === 'country');
        if (countryCol) {
          where.push({ field: 'country', operator: '=', value: country.toUpperCase() });
        }
      }
    });

    // Check category / department name filters like "Engineering", "Marketing", "Electronics"
    ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Electronics', 'Furniture', 'Accessories', 'Enterprise', 'Pro', 'Free'].forEach(val => {
      if (new RegExp(`\\b${val}\\b`, 'i').test(prompt)) {
        const fieldCol = columns.find(c => ['category', 'department', 'plan_tier', 'job_title'].includes(c.name));
        if (fieldCol) {
          where.push({ field: fieldCol.name, operator: '=', value: val });
        }
      }
    });

    // Check numeric comparison filters
    const numComparisonRegex = /(price|salary|budget|amount|rating|stock_quantity|total_orders|mrr)\s*(>|<|>=|<=|=|greater than|more than|above|over|less than|under|below|equals? to?)\s*([0-9]+(?:\.[0-9]+)?)/gi;
    let match;
    while ((match = numComparisonRegex.exec(text)) !== null) {
      const fieldName = match[1].toLowerCase();
      const rawOp = match[2].toLowerCase();
      const numVal = parseFloat(match[3]);

      let op = '=';
      if (['>', 'greater than', 'more than', 'above', 'over'].includes(rawOp)) op = '>';
      else if (['<', 'less than', 'under', 'below'].includes(rawOp)) op = '<';
      else if (rawOp === '>=') op = '>=';
      else if (rawOp === '<=') op = '<=';

      where.push({ field: fieldName, operator: op, value: numVal });
    }

    // 4. Identify GROUP BY
    const groupBy = [];
    const groupMatch = text.match(/grouped by\s+([a-z0-9_]+)|by\s+(category|country|department|department_id|status|plan_tier|payment_method)/i);
    if (groupMatch) {
      const groupField = (groupMatch[1] || groupMatch[2]).toLowerCase();
      const validCol = columns.find(c => c.name === groupField || c.name === `${groupField}_id`);
      if (validCol) {
        groupBy.push(validCol.name);
        if (!queryColumns.some(c => c.column === validCol.name)) {
          queryColumns.unshift({ column: validCol.name });
        }
      }
    }

    // 5. Identify ORDER BY
    const orderBy = [];
    const isDesc = /\b(desc|descending|highest|top|most|newest|latest|max)\b/.test(text);
    const isAsc = /\b(asc|ascending|lowest|cheapest|oldest|min)\b/.test(text);

    let sortCol = null;
    columns.forEach(c => {
      if (text.includes(`order by ${c.name}`) || text.includes(`sort by ${c.name}`) || text.includes(`ordered by ${c.name}`)) {
        sortCol = c.name;
      }
    });

    if (!sortCol) {
      if (isMax || isMin || isSum || isAvg) {
        sortCol = queryColumns[0] ? (queryColumns[0].alias || queryColumns[0].column) : null;
      } else if (text.includes('price')) sortCol = 'price';
      else if (text.includes('salary')) sortCol = 'salary';
      else if (text.includes('created') || text.includes('recent') || text.includes('newest')) {
        const dateCol = columns.find(c => ['created_at', 'order_date', 'hire_date', 'signup_date'].includes(c.name));
        if (dateCol) sortCol = dateCol.name;
      }
    }

    if (sortCol) {
      orderBy.push({
        column: sortCol,
        direction: isAsc ? 'ASC' : (isDesc ? 'DESC' : 'ASC')
      });
    }

    // 6. Identify LIMIT
    let limit = null;
    const limitMatch = text.match(/\b(top|first|limit)\s+([0-9]+)\b/);
    if (limitMatch) {
      limit = parseInt(limitMatch[2], 10);
    } else if (/\b(top|first)\b/.test(text)) {
      limit = 5;
    }

    // 7. Auto-detect JOINs if secondary tables referenced
    const joins = [];
    secondaryTables.forEach(secTable => {
      const secDef = schema.tables[secTable];
      let joinCondition = null;

      secDef.columns.forEach(col => {
        if (col.foreignKey && col.foreignKey.startsWith(`${primaryTable}.`)) {
          joinCondition = { left: `${secTable}.${col.name}`, operator: '=', right: `${primaryTable}.id` };
        }
      });

      if (!joinCondition) {
        primaryTableDef.columns.forEach(col => {
          if (col.foreignKey && col.foreignKey.startsWith(`${secTable}.`)) {
            joinCondition = { left: `${primaryTable}.${col.name}`, operator: '=', right: `${secTable}.id` };
          }
        });
      }

      if (joinCondition) {
        joins.push({
          type: 'INNER',
          table: secTable,
          on: [joinCondition]
        });
      }
    });

    const spec = {
      operation: 'SELECT',
      distinct: isDistinct,
      columns: queryColumns.length > 0 ? queryColumns : [{ column: '*' }],
      fromTable: primaryTable,
      joins,
      where,
      groupBy,
      orderBy,
      limit
    };

    const sql = sqlGenerator.generate(spec, dialect);

    return {
      success: true,
      mode: 'rule_parser',
      nlPrompt: prompt,
      schemaId: schema.id,
      dialect,
      sql,
      structuredSpec: spec,
      explanation: this.generateExplanation(spec, schema)
    };
  }

  generateExplanation(spec, schema) {
    const parts = [];
    const tableName = spec.fromTable || 'records';

    parts.push(`1. **Source**: Reads data from the \`${tableName}\` table.`);

    if (spec.joins && spec.joins.length > 0) {
      spec.joins.forEach(j => {
        parts.push(`2. **Join**: Joins with \`${j.table}\` to combine related records.`);
      });
    }

    if (spec.where && spec.where.length > 0) {
      const filterDescriptions = spec.where
        .map(w => `\`${w.field}\` ${w.operator} \`${w.value}\``)
        .join(' AND ');
      parts.push(`3. **Filter**: Filters rows where ${filterDescriptions}.`);
    }

    if (spec.groupBy && spec.groupBy.length > 0) {
      parts.push(`4. **Group**: Groups results by ${spec.groupBy.map(g => `\`${g}\``).join(', ')} for aggregation.`);
    }

    if (spec.orderBy && spec.orderBy.length > 0) {
      const sorts = spec.orderBy.map(o => `\`${o.column}\` (${o.direction || 'ASC'})`).join(', ');
      parts.push(`5. **Sort**: Orders records by ${sorts}.`);
    }

    if (spec.limit) {
      parts.push(`6. **Limit**: Restricts the output to the top **${spec.limit}** records.`);
    }

    return parts.join('\n');
  }

  async generateWithLLM({ prompt, schema, dialect, apiKey, modelProvider }) {
    const schemaSummary = Object.entries(schema.tables)
      .map(([tbl, def]) => {
        const colList = def.columns.map(c => `${c.name} (${c.type}${c.foreignKey ? `, FK -> ${c.foreignKey}` : ''})`).join(', ');
        return `Table: ${tbl}\nColumns: ${colList}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert SQL engineer. Given a natural language query and the database schema below, generate ONLY the valid SQL query for the ${dialect} dialect.
Do not wrap in markdown or explanation. Output pure raw SQL.

SCHEMA:
${schemaSummary}

TARGET DIALECT: ${dialect}`;

    if (modelProvider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUSER QUERY: ${prompt}` }]
            }
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${errJson.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let sqlText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      sqlText = sqlText.replace(/```sql/gi, '').replace(/```/g, '').trim();

      return {
        success: true,
        mode: 'llm_gemini',
        nlPrompt: prompt,
        schemaId: schema.id,
        dialect,
        sql: sqlText,
        explanation: `AI-generated SQL query synthesized using Google Gemini with ${schema.name} schema context.`
      };
    }

    throw new Error(`Unsupported model provider: ${modelProvider}`);
  }
}

module.exports = new NaturalLanguageToSql();
