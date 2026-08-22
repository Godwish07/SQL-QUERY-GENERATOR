/**
 * Comprehensive Automated Test & Verification Suite
 * Tests Generator (multi-dialect), NL parser, Explainer, Formatter, and Sandbox.
 */

const assert = require('assert');
const sqlGenerator = require('../src/services/sqlGenerator');
const nlToSql = require('../src/services/nlToSql');
const sqlExplainer = require('../src/services/sqlExplainer');
const sqlFormatter = require('../src/services/sqlFormatter');
const dbSandbox = require('../src/services/dbSandbox');
const { schemas } = require('../src/data/schemas');

async function runTests() {
  console.log('🧪 Starting SQLForge Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  console.log('--- 1. Testing SQL Generator (Multi-Dialect) ---');

  test('PostgreSQL: SELECT with WHERE, ORDER BY, LIMIT', () => {
    const spec = {
      operation: 'SELECT',
      columns: [{ column: 'id' }, { column: 'name' }, { column: 'total_amount', aggregate: 'SUM', alias: 'total_spend' }],
      fromTable: 'customers',
      fromAlias: 'c',
      where: [{ field: 'c.status', operator: '=', value: 'active' }],
      groupBy: ['c.id', 'c.name'],
      orderBy: [{ column: 'total_spend', direction: 'DESC' }],
      limit: 10,
      offset: 5
    };
    const sql = sqlGenerator.generate(spec, 'postgres');
    assert(sql.includes('SELECT'), 'Should contain SELECT');
    assert(sql.includes('FROM customers c'), 'Should contain FROM customers c');
    assert(sql.includes('WHERE c.status = \'active\''), 'Should format WHERE');
    assert(sql.includes('GROUP BY c.id, c.name'), 'Should contain GROUP BY');
    assert(sql.includes('ORDER BY total_spend DESC'), 'Should contain ORDER BY');
    assert(sql.includes('LIMIT 10'), 'Should contain LIMIT');
    assert(sql.includes('OFFSET 5'), 'Should contain OFFSET');
  });

  test('MySQL: SELECT with backticks and numeric limit', () => {
    const spec = {
      operation: 'SELECT',
      columns: [{ column: 'name' }, { column: 'price' }],
      fromTable: 'products',
      where: [{ field: 'price', operator: '>=', value: 100 }],
      limit: 5
    };
    const sql = sqlGenerator.generate(spec, 'mysql');
    assert(sql.includes('`products`'), 'Should escape with backticks in MySQL');
    assert(sql.includes('`price` >= 100'), 'Should handle numeric comparison');
    assert(sql.includes('LIMIT 5'), 'Should contain LIMIT 5');
  });

  test('MS SQL Server: TOP and square brackets', () => {
    const spec = {
      operation: 'SELECT',
      columns: [{ column: 'first_name' }, { column: 'salary' }],
      fromTable: 'employees',
      limit: 3
    };
    const sql = sqlGenerator.generate(spec, 'mssql');
    assert(sql.includes('TOP (3)'), 'Should use TOP (3) in T-SQL');
    assert(sql.includes('[employees]'), 'Should use square brackets for identifiers');
  });

  test('Oracle SQL: FETCH FIRST', () => {
    const spec = {
      operation: 'SELECT',
      columns: [{ column: 'name' }],
      fromTable: 'departments',
      limit: 5
    };
    const sql = sqlGenerator.generate(spec, 'oracle');
    assert(sql.includes('FETCH NEXT 5 ROWS ONLY'), 'Should use FETCH NEXT in Oracle');
  });

  test('JOIN Query Generation', () => {
    const spec = {
      operation: 'SELECT',
      columns: [{ column: 'c.name' }, { column: 'o.total_amount' }],
      fromTable: 'customers',
      fromAlias: 'c',
      joins: [{
        type: 'INNER',
        table: 'orders',
        alias: 'o',
        on: [{ left: 'c.id', operator: '=', right: 'o.customer_id' }]
      }]
    };
    const sql = sqlGenerator.generate(spec, 'postgres');
    assert(sql.includes('INNER JOIN orders o ON c.id = o.customer_id'), 'Should generate valid JOIN clause');
  });

  test('INSERT, UPDATE, DELETE Queries', () => {
    const insertSql = sqlGenerator.generate({
      operation: 'INSERT',
      table: 'customers',
      values: { name: 'John Doe', email: 'john@example.com', total_orders: 0 }
    }, 'postgres');
    assert(insertSql.includes('INSERT INTO customers'), 'Should generate INSERT');
    assert(insertSql.includes('\'John Doe\''), 'Should escape string value');

    const updateSql = sqlGenerator.generate({
      operation: 'UPDATE',
      table: 'products',
      values: { price: 89.99 },
      where: [{ field: 'id', operator: '=', value: 101 }]
    }, 'postgres');
    assert(updateSql.includes('UPDATE products'), 'Should generate UPDATE');
    assert(updateSql.includes('price = 89.99'), 'Should set values');
    assert(updateSql.includes('id = 101'), 'Should add WHERE filter');

    const deleteSql = sqlGenerator.generate({
      operation: 'DELETE',
      table: 'orders',
      where: [{ field: 'status', operator: '=', value: 'cancelled' }]
    }, 'postgres');
    assert(deleteSql.includes('DELETE FROM orders'), 'Should generate DELETE');
    assert(deleteSql.includes("status = 'cancelled'"), 'Should include where condition');
  });

  console.log('\n--- 2. Testing Natural Language to SQL Engine ---');

  await asyncTest('NL: Top customers ordered by spend', async () => {
    const result = await nlToSql.convert({
      prompt: 'Find top 5 customers from USA ordered by total spend desc',
      schemaId: 'ecommerce',
      dialect: 'postgres'
    });
    assert(result.success, 'NL conversion should succeed');
    assert(result.sql.includes('FROM customers'), 'Should target customers table');
    assert(result.sql.includes('USA'), 'Should filter by USA');
    assert(result.sql.includes('LIMIT 5'), 'Should limit to 5');
    assert(result.explanation.length > 0, 'Should include explanation');
  });

  await asyncTest('NL: Department average salary', async () => {
    const result = await nlToSql.convert({
      prompt: 'Show average salary of employees in Engineering department',
      schemaId: 'hr',
      dialect: 'postgres'
    });
    assert(result.success, 'NL conversion should succeed');
    assert(result.sql.includes('AVG(salary)') || result.sql.includes('avg_salary'), 'Should contain AVG aggregate');
  });

  console.log('\n--- 3. Testing SQL Explainer Service ---');

  test('Explain Complex SELECT with Join and Filter', () => {
    const sql = `SELECT c.name, SUM(o.total_amount) AS spend 
                 FROM customers c 
                 INNER JOIN orders o ON c.id = o.customer_id 
                 WHERE o.status = 'completed' 
                 GROUP BY c.name 
                 ORDER BY spend DESC 
                 LIMIT 5;`;
    const explanation = sqlExplainer.explain(sql);
    assert.strictEqual(explanation.queryType, 'SELECT');
    assert(explanation.tables.includes('customers'), 'Should detect customers table');
    assert(explanation.tables.includes('orders'), 'Should detect orders table');
    assert(explanation.steps.length >= 4, 'Should contain step-by-step breakdown');
  });

  console.log('\n--- 4. Testing SQL Formatter Service ---');

  test('Format Raw SQL String', () => {
    const messy = 'select id,name,email from customers where status=\'active\' and total_orders>5 order by name asc limit 10';
    const formatted = sqlFormatter.format(messy);
    assert(formatted.includes('SELECT'), 'Should uppercase SELECT');
    assert(formatted.includes('FROM'), 'Should uppercase FROM');
    assert(formatted.includes('WHERE'), 'Should uppercase WHERE');
  });

  console.log('\n--- 5. Testing Database Execution Sandbox ---');

  await asyncTest('Execute Live In-Memory Query', async () => {
    const sql = 'SELECT id, name, country, status FROM customers WHERE status = \'active\' LIMIT 3;';
    const result = await dbSandbox.execute(sql, 'ecommerce');
    assert(result.success, 'Execution should succeed');
    assert(result.columns.length >= 3, 'Should return columns');
    assert(result.rows.length <= 3 && result.rows.length > 0, 'Should return rows within limit');
    assert(typeof result.executionTimeMs === 'number', 'Should report execution time');
  });

  console.log('\n====================================================');
  console.log(`🎉 Test Run Completed: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
