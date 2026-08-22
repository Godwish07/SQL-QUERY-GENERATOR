/**
 * SQL Controller
 * Handles incoming API requests for SQL generation, explanation, formatting, and execution.
 */

const sqlGenerator = require('../services/sqlGenerator');
const nlToSql = require('../services/nlToSql');
const sqlExplainer = require('../services/sqlExplainer');
const sqlFormatter = require('../services/sqlFormatter');
const dbSandbox = require('../services/dbSandbox');
const { schemas, templates } = require('../data/schemas');

class SqlController {
  /**
   * Generate SQL from structured Visual Builder spec
   */
  async generateFromBuilder(req, res) {
    try {
      const { spec, dialect = 'postgres' } = req.body;
      if (!spec) {
        return res.status(400).json({ error: 'Missing query builder specification.' });
      }

      const sql = sqlGenerator.generate(spec, dialect);
      const explanation = sqlExplainer.explain(sql);
      const formattedSql = sqlFormatter.format(sql);

      return res.json({
        success: true,
        dialect,
        sql,
        formattedSql,
        explanation
      });
    } catch (err) {
      console.error('Error generating from builder:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Generate SQL from Natural Language prompt
   */
  async generateFromNl(req, res) {
    try {
      const { prompt, schemaId = 'ecommerce', dialect = 'postgres', apiKey, modelProvider } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Please provide a natural language prompt.' });
      }

      const result = await nlToSql.convert({ prompt, schemaId, dialect, apiKey, modelProvider });
      const formattedSql = sqlFormatter.format(result.sql);
      const deepExplanation = sqlExplainer.explain(result.sql);

      return res.json({
        ...result,
        formattedSql,
        deepExplanation
      });
    } catch (err) {
      console.error('Error generating from NL:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Explain existing SQL query
   */
  async explainQuery(req, res) {
    try {
      const { sql } = req.body;
      if (!sql) {
        return res.status(400).json({ error: 'SQL query is required for explanation.' });
      }

      const explanation = sqlExplainer.explain(sql);
      return res.json({ success: true, explanation });
    } catch (err) {
      console.error('Error explaining SQL:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Format / Beautify SQL query
   */
  async formatQuery(req, res) {
    try {
      const { sql, options } = req.body;
      if (!sql) {
        return res.status(400).json({ error: 'SQL query is required for formatting.' });
      }

      const formatted = sqlFormatter.format(sql, options);
      return res.json({ success: true, formatted });
    } catch (err) {
      console.error('Error formatting SQL:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Execute SQL query in sandbox
   */
  async executeQuery(req, res) {
    try {
      const { sql, schemaId = 'ecommerce' } = req.body;
      if (!sql) {
        return res.status(400).json({ error: 'SQL query is required for execution.' });
      }

      const result = await dbSandbox.execute(sql, schemaId);
      return res.json(result);
    } catch (err) {
      console.error('Error executing query in sandbox:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get all database schemas and sample data
   */
  getSchemas(req, res) {
    return res.json({ success: true, schemas });
  }

  /**
   * Get pre-built query templates
   */
  getTemplates(req, res) {
    return res.json({ success: true, templates });
  }
}

module.exports = new SqlController();
