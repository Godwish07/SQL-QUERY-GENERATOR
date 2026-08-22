# ⚡ SQLForge - SQL Query Generator (Node.js & Express)

A full-stack, multi-dialect **SQL Query Generator, Explainer, Formatter, and Live Database Sandbox** built with JavaScript, Node.js, and Express.

---

## 🌟 Key Features

1. **Natural Language to SQL (NLP & AI)**:
   - **Offline Pattern Engine**: Translates plain-English questions into valid SQL without external dependencies or API keys.
   - **Optional Gemini / LLM Integration**: Connect your API key to synthesize arbitrary complex multi-table SQL queries.
   - Schema context awareness (maps entities to columns, joins, and data types).

2. **Visual Interactive Query Builder**:
   - GUI for `SELECT` (aggregations: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `DISTINCT`, aliases), `FROM`, `JOIN` (`INNER`, `LEFT`, `RIGHT`, `FULL`), `WHERE` filters, `GROUP BY`, `HAVING`, `ORDER BY`, and `LIMIT/OFFSET`.
   - Full support for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `CREATE TABLE`.

3. **Multi-Dialect Translation**:
   - Generates customized dialect syntax for **PostgreSQL**, **MySQL / MariaDB**, **SQLite**, **Microsoft SQL Server (T-SQL)**, and **Oracle SQL**.

4. **Live In-Memory Database Sandbox**:
   - Test and execute queries in real-time with sample data loaded for **E-Commerce**, **Human Resources**, and **SaaS Analytics**.
   - Tabular result viewer with row count, execution time in milliseconds, and one-click **Export to CSV / JSON**.

5. **SQL Explainer & Formatter**:
   - Breaks down any SQL statement into clear, human-readable step-by-step logic cards.
   - Custom SQL beautifier with keyword capitalization and indentation.

6. **Responsive Web UI**:
   - Modern dark/light theme single-page dashboard.
   - Interactive schema diagram explorer, cheat sheet, and template gallery.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+) and `npm`

### Installation & Running

1. Open your terminal in the project directory:
   ```bash
   cd "C:\Users\GODWISH\.gemini\antigravity\scratch\sql-query-generator"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Express server:
   ```bash
   npm start
   ```

4. Open your web browser and visit:
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
sql-query-generator/
├── package.json               # Project manifest and scripts
├── server.js                  # Main Express application entrypoint
├── .env.example               # Environment variables configuration
├── README.md                  # Project documentation
├── src/
│   ├── routes/
│   │   └── api.js             # Express REST API routes
│   ├── controllers/
│   │   └── sqlController.js   # Request handlers for generator, explainer, sandbox
│   ├── services/
│   │   ├── sqlGenerator.js    # Multi-dialect SQL builder (SELECT, JOIN, WHERE, DDL, DML)
│   │   ├── nlToSql.js         # Natural Language to SQL synthesizer (rules + LLM)
│   │   ├── sqlExplainer.js    # Human-readable SQL query analyzer
│   │   ├── sqlFormatter.js    # SQL syntax beautifier and formatter
│   │   └── dbSandbox.js       # In-memory execution sandbox with mock tables
│   └── data/
│       └── schemas.js         # Pre-loaded schemas and sample datasets
├── public/
│   ├── index.html             # Responsive Single-Page Application UI
│   ├── app.js                 # Client-side state, tab routing, API integration
│   └── styles.css             # Modern dark/light responsive CSS design
└── test/
    └── verify.js              # Automated test suite
```

---

## 📡 REST API Reference

### 1. Generate SQL from Natural Language
`POST /api/generate/nl`

**Request Body:**
```json
{
  "prompt": "Find top 5 customers from USA ordered by total spend desc",
  "schemaId": "ecommerce",
  "dialect": "postgres"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "rule_parser",
  "sql": "SELECT id, name, email, country, status FROM customers WHERE country = 'USA' ORDER BY total_orders DESC LIMIT 5;",
  "formattedSql": "SELECT\n  id,\n  name,\n  email,\n  country,\n  status\nFROM customers\nWHERE country = 'USA'\nORDER BY total_orders DESC\nLIMIT 5;",
  "deepExplanation": {
    "queryType": "SELECT",
    "tables": ["customers"],
    "steps": [...]
  }
}
```

---

### 2. Generate SQL from Visual Builder
`POST /api/generate/builder`

**Request Body:**
```json
{
  "dialect": "mysql",
  "spec": {
    "operation": "SELECT",
    "fromTable": "products",
    "columns": [
      { "column": "category" },
      { "column": "price", "aggregate": "AVG", "alias": "avg_price" }
    ],
    "where": [
      { "field": "is_active", "operator": "=", "value": 1 }
    ],
    "groupBy": ["category"],
    "orderBy": [{ "column": "avg_price", "direction": "DESC" }],
    "limit": 5
  }
}
```

---

### 3. Explain SQL Query
`POST /api/explain`

**Request Body:**
```json
{
  "sql": "SELECT c.name, SUM(o.total_amount) FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.name ORDER BY 2 DESC LIMIT 10;"
}
```

---

### 4. Execute Query in In-Memory Sandbox
`POST /api/execute`

**Request Body:**
```json
{
  "sql": "SELECT id, name, price, rating FROM products WHERE price > 100 ORDER BY rating DESC;",
  "schemaId": "ecommerce"
}
```

**Response:**
```json
{
  "success": true,
  "columns": ["id", "name", "price", "rating"],
  "rows": [
    { "id": 101, "name": "Wireless Noise-Cancelling Headphones", "price": 199.99, "rating": 4.8 },
    { "id": 106, "name": "4K Ultra HD Monitor 27-inch", "price": 349.99, "rating": 4.7 }
  ],
  "rowCount": 2,
  "executionTimeMs": 2
}
```

---

### 5. Format & Beautify SQL
`POST /api/format`

**Request Body:**
```json
{
  "sql": "select id,name from customers where status='active' limit 5"
}
```

---

## 🧪 Running Automated Tests

Run the test suite to verify all generators and dialects:
```bash
npm test
```
