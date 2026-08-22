/**
 * SQL Formatter & Beautifier Service
 * Beautifies messy SQL queries with consistent indentation and keyword casing.
 */

class SqlFormatter {
  constructor() {
    this.reservedKeywords = [
      'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT',
      'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN',
      'ON', 'USING', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC',
      'LIMIT', 'OFFSET', 'FETCH FIRST', 'FETCH NEXT', 'ROWS ONLY', 'TOP',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DELETE',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY',
      'DEFAULT', 'UNIQUE', 'NOT NULL', 'NULL', 'IS NULL', 'IS NOT NULL',
      'LIKE', 'ILIKE', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN', 'EXISTS',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'UNION', 'UNION ALL'
    ];
  }

  /**
   * Format SQL string
   */
  format(sql, options = {}) {
    if (!sql || typeof sql !== 'string') return '';

    const indentSize = options.indentSize || 2;
    const uppercaseKeywords = options.uppercaseKeywords !== false;
    const indentStr = ' '.repeat(indentSize);

    let formatted = sql.trim();

    // 1. Normalize line breaks and spaces
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\t/g, indentStr);

    // 2. Uppercase major reserved keywords
    if (uppercaseKeywords) {
      this.reservedKeywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        formatted = formatted.replace(regex, kw);
      });
    }

    // 3. Structured clause line breaks
    const majorClauses = [
      'SELECT', 'FROM', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN',
      'FULL JOIN', 'CROSS JOIN', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
      'LIMIT', 'OFFSET', 'FETCH NEXT', 'FETCH FIRST', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'
    ];

    // Put major clauses on new lines
    majorClauses.forEach(clause => {
      const regex = new RegExp(`\\s+(${clause})\\b`, 'g');
      formatted = formatted.replace(regex, `\n$1`);
    });

    // 4. Split by lines and indent sub-clauses
    const rawLines = formatted.split('\n');
    const processedLines = [];

    let currentClause = '';

    rawLines.forEach(line => {
      let trimmed = line.trim();
      if (!trimmed) return;

      const upperTrimmed = trimmed.toUpperCase();
      const isMajor = majorClauses.some(mc => upperTrimmed.startsWith(mc));

      if (isMajor) {
        currentClause = majorClauses.find(mc => upperTrimmed.startsWith(mc));
        processedLines.push(trimmed);
      } else {
        // Indent lines inside a clause (like columns or AND/OR filters)
        if (upperTrimmed.startsWith('AND ') || upperTrimmed.startsWith('OR ')) {
          processedLines.push(indentStr + trimmed);
        } else if (upperTrimmed.startsWith('ON ')) {
          processedLines.push(indentStr + trimmed);
        } else {
          processedLines.push(indentStr + trimmed);
        }
      }
    });

    return processedLines.join('\n');
  }
}

module.exports = new SqlFormatter();
