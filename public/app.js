/**
 * SQLForge Frontend Application Script
 */

const state = {
  schemas: {},
  activeSchemaId: 'ecommerce',
  activeDialect: 'postgres',
  apiKey: localStorage.getItem('sqlforge_gemini_key') || '',
  history: JSON.parse(localStorage.getItem('sqlforge_history') || '[]'),
  lastResultData: null,
  builderColumns: [],
  builderJoins: [],
  builderWhere: []
};

// Sample prompt presets per schema
const schemaPromptSuggestions = {
  ecommerce: [
    'Find top 5 customers by total order amount descending',
    'Show all active products in Electronics with price > 100',
    'Count total completed orders for each customer country',
    'List products with stock quantity less than 30 ordered by price'
  ],
  hr: [
    'Find all employees in Engineering department with salary > 100000',
    'Show average salary and employee count for each department',
    'List highest paid employee in each department',
    'Show all projects in progress with budget above 100000'
  ],
  saas: [
    'Show active users grouped by plan tier with total MRR',
    'Find unpaid invoices with amount greater than 100',
    'List top 3 enterprise accounts ordered by MRR desc',
    'Count total churned users'
  ]
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavTabs();
  setupGlobalControls();
  await loadSchemas();
  await loadTemplates();
  initNlTab();
  initBuilderTab();
  initSandboxTab();
  initExplainerTab();
  renderHistory();
});

/* ==========================================================================
   Theme & Navigation
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('sqlforge_theme') || 'dark';
  document.documentElement.className = savedTheme;
  themeToggleBtn.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.className = newTheme;
    localStorage.setItem('sqlforge_theme', newTheme);
    themeToggleBtn.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '🌙' : '☀️';
  });
}

function setupNavTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

function switchTab(tabId) {
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.click();
}

function setupGlobalControls() {
  const schemaSelect = document.getElementById('globalSchemaSelect');
  const dialectSelect = document.getElementById('globalDialectSelect');

  schemaSelect.addEventListener('change', (e) => {
    state.activeSchemaId = e.target.value;
    onSchemaChange();
  });

  dialectSelect.addEventListener('change', (e) => {
    state.activeDialect = e.target.value;
  });

  // Saved API key
  const apiKeyInput = document.getElementById('geminiApiKeyInput');
  const saveKeyBtn = document.getElementById('saveApiKeyBtn');
  if (state.apiKey) apiKeyInput.value = state.apiKey;

  saveKeyBtn.addEventListener('click', () => {
    state.apiKey = apiKeyInput.value.trim();
    localStorage.setItem('sqlforge_gemini_key', state.apiKey);
    alert(state.apiKey ? 'API Key saved locally!' : 'API Key cleared. Using built-in local NLP parser.');
  });
}

function onSchemaChange() {
  renderPromptSuggestions();
  populateBuilderDropdowns();
  renderSchemaExplorer();
}

/* ==========================================================================
   API Communication
   ========================================================================== */
async function loadSchemas() {
  try {
    const res = await fetch('/api/schemas');
    const data = await res.json();
    if (data.success && data.schemas) {
      state.schemas = data.schemas;
      onSchemaChange();
    }
  } catch (err) {
    console.error('Failed to load schemas from API:', err);
  }
}

async function loadTemplates() {
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (data.success && data.templates) {
      renderTemplates(data.templates);
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

/* ==========================================================================
   TAB 1: Natural Language to SQL
   ========================================================================== */
function initNlTab() {
  const promptInput = document.getElementById('nlPromptInput');
  const generateBtn = document.getElementById('generateNlBtn');
  const clearBtn = document.getElementById('clearNlBtn');
  const copyBtn = document.getElementById('copyNlSqlBtn');
  const downloadBtn = document.getElementById('downloadNlSqlBtn');
  const runBtn = document.getElementById('runNlSqlBtn');

  renderPromptSuggestions();

  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    document.getElementById('nlResultArea').classList.add('hidden');
  });

  generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Please enter a natural language prompt or click one of the suggested prompts.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⏳ Synthesizing SQL...</span>';

    try {
      const res = await fetch('/api/generate/nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          schemaId: state.activeSchemaId,
          dialect: state.activeDialect,
          apiKey: state.apiKey
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Render Result
      document.getElementById('nlSqlOutput').textContent = data.formattedSql || data.sql;
      renderExplanationCards('nlExplanationOutput', data.deepExplanation || { summary: data.explanation });
      document.getElementById('nlResultArea').classList.remove('hidden');

      // Add to History
      addToHistory(data.formattedSql || data.sql, `NL: ${prompt}`);
    } catch (err) {
      alert('Error generating SQL: ' + err.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span>✨ Generate SQL Query</span>';
    }
  });

  copyBtn.addEventListener('click', () => {
    const code = document.getElementById('nlSqlOutput').textContent;
    navigator.clipboard.writeText(code);
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => (copyBtn.textContent = '📋 Copy'), 2000);
  });

  downloadBtn.addEventListener('click', () => {
    const code = document.getElementById('nlSqlOutput').textContent;
    downloadFile(code, 'query.sql', 'text/sql');
  });

  runBtn.addEventListener('click', () => {
    const code = document.getElementById('nlSqlOutput').textContent;
    document.getElementById('sandboxSqlInput').value = code;
    switchTab('tab-sandbox');
    document.getElementById('executeSandboxBtn').click();
  });
}

function renderPromptSuggestions() {
  const container = document.getElementById('promptChips');
  if (!container) return;
  container.innerHTML = '';

  const suggestions = schemaPromptSuggestions[state.activeSchemaId] || schemaPromptSuggestions.ecommerce;
  suggestions.forEach(item => {
    const chip = document.createElement('button');
    chip.className = 'prompt-chip';
    chip.textContent = item;
    chip.addEventListener('click', () => {
      document.getElementById('nlPromptInput').value = item;
      document.getElementById('generateNlBtn').click();
    });
    container.appendChild(chip);
  });
}

function renderExplanationCards(containerId, explanation) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (explanation.steps && explanation.steps.length > 0) {
    explanation.steps.forEach(step => {
      const card = document.createElement('div');
      card.className = 'explanation-step';
      card.innerHTML = `
        <div class="step-icon">${step.icon || '📌'}</div>
        <div>
          <div class="step-title">${step.title}</div>
          <div class="step-desc">${step.detail}</div>
        </div>
      `;
      container.appendChild(card);
    });
  } else if (explanation.summary) {
    const card = document.createElement('div');
    card.className = 'explanation-step';
    card.innerHTML = `
      <div class="step-icon">💡</div>
      <div>
        <div class="step-title">Summary</div>
        <div class="step-desc">${explanation.summary}</div>
      </div>
    `;
    container.appendChild(card);
  }
}

/* ==========================================================================
   TAB 2: Visual Query Builder
   ========================================================================== */
function initBuilderTab() {
  const addColBtn = document.getElementById('addColBtn');
  const addJoinBtn = document.getElementById('addJoinBtn');
  const addFilterBtn = document.getElementById('addFilterBtn');
  const generateBtn = document.getElementById('generateBuilderBtn');
  const resetBtn = document.getElementById('resetBuilderBtn');
  const opSelect = document.getElementById('builderOperation');
  const fromTableSelect = document.getElementById('builderFromTable');

  opSelect.addEventListener('change', (e) => {
    const isSelect = e.target.value === 'SELECT';
    document.getElementById('builderSelectPanel').classList.toggle('hidden', !isSelect);
    document.getElementById('builderDmlPanel').classList.toggle('hidden', isSelect);
  });

  fromTableSelect.addEventListener('change', () => {
    updateBuilderColumnsOptions();
  });

  addColBtn.addEventListener('click', () => addBuilderColumnRow());
  addJoinBtn.addEventListener('click', () => addBuilderJoinRow());
  addFilterBtn.addEventListener('click', () => addBuilderWhereRow());

  resetBtn.addEventListener('click', () => {
    document.getElementById('builderColumnsList').innerHTML = '';
    document.getElementById('builderJoinsList').innerHTML = '';
    document.getElementById('builderWhereList').innerHTML = '';
    document.getElementById('builderGroupBy').value = '';
    document.getElementById('builderLimit').value = '';
    document.getElementById('builderOffset').value = '';
    document.getElementById('builderDistinct').checked = false;
    document.getElementById('builderResultArea').classList.add('hidden');
    addBuilderColumnRow();
  });

  generateBtn.addEventListener('click', async () => {
    const spec = buildSpecFromForm();
    generateBtn.disabled = true;

    try {
      const res = await fetch('/api/generate/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, dialect: state.activeDialect })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      document.getElementById('builderSqlOutput').textContent = data.formattedSql || data.sql;
      document.getElementById('builderResultArea').classList.remove('hidden');

      addToHistory(data.formattedSql || data.sql, `Visual Builder (${spec.operation})`);
    } catch (err) {
      alert('Error building SQL: ' + err.message);
    } finally {
      generateBtn.disabled = false;
    }
  });

  // Result buttons
  document.getElementById('copyBuilderSqlBtn').addEventListener('click', () => {
    const code = document.getElementById('builderSqlOutput').textContent;
    navigator.clipboard.writeText(code);
    alert('SQL copied to clipboard!');
  });

  document.getElementById('downloadBuilderSqlBtn').addEventListener('click', () => {
    const code = document.getElementById('builderSqlOutput').textContent;
    downloadFile(code, 'builder_query.sql', 'text/sql');
  });

  document.getElementById('runBuilderSqlBtn').addEventListener('click', () => {
    const code = document.getElementById('builderSqlOutput').textContent;
    document.getElementById('sandboxSqlInput').value = code;
    switchTab('tab-sandbox');
    document.getElementById('executeSandboxBtn').click();
  });

  // Initial rows
  addBuilderColumnRow();
}

function populateBuilderDropdowns() {
  const schema = state.schemas[state.activeSchemaId];
  if (!schema) return;

  const tableNames = Object.keys(schema.tables);
  const fromSelect = document.getElementById('builderFromTable');
  const dmlTableSelect = document.getElementById('builderDmlTable');

  fromSelect.innerHTML = tableNames.map(t => `<option value="${t}">${t}</option>`).join('');
  dmlTableSelect.innerHTML = tableNames.map(t => `<option value="${t}">${t}</option>`).join('');

  updateBuilderColumnsOptions();
}

function updateBuilderColumnsOptions() {
  const schema = state.schemas[state.activeSchemaId];
  if (!schema) return;

  const fromTable = document.getElementById('builderFromTable').value;
  const tableDef = schema.tables[fromTable];
  if (!tableDef) return;

  // Update ORDER BY column select
  const orderSelect = document.getElementById('builderOrderByCol');
  orderSelect.innerHTML = '<option value="">(None)</option>' +
    tableDef.columns.map(c => `<option value="${c.name}">${c.name} (${c.type})</option>`).join('');

  // Update all existing column select rows
  document.querySelectorAll('.col-select-field').forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = '<option value="*">* (All Columns)</option>' +
      tableDef.columns.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (currentVal) sel.value = currentVal;
  });

  // Update all existing where field select rows
  document.querySelectorAll('.where-select-field').forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = tableDef.columns.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (currentVal) sel.value = currentVal;
  });
}

function addBuilderColumnRow() {
  const container = document.getElementById('builderColumnsList');
  const schema = state.schemas[state.activeSchemaId];
  const fromTable = document.getElementById('builderFromTable').value;
  const cols = schema && schema.tables[fromTable] ? schema.tables[fromTable].columns : [];

  const row = document.createElement('div');
  row.className = 'dynamic-row column-row';
  row.innerHTML = `
    <select class="form-select flex-2 col-select-field">
      <option value="*">* (All Columns)</option>
      ${cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
    </select>
    <select class="form-select flex-1 col-aggregate-field">
      <option value="">No Aggregate</option>
      <option value="COUNT">COUNT()</option>
      <option value="SUM">SUM()</option>
      <option value="AVG">AVG()</option>
      <option value="MIN">MIN()</option>
      <option value="MAX">MAX()</option>
    </select>
    <input type="text" class="form-input flex-1 col-alias-field" placeholder="Alias (e.g. total)">
    <button class="btn btn-sm btn-danger btn-remove-row">✕</button>
  `;

  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addBuilderJoinRow() {
  const container = document.getElementById('builderJoinsList');
  const schema = state.schemas[state.activeSchemaId];
  if (!schema) return;

  const tableNames = Object.keys(schema.tables);

  const row = document.createElement('div');
  row.className = 'dynamic-row join-row';
  row.innerHTML = `
    <select class="form-select flex-1 join-type-field">
      <option value="INNER">INNER JOIN</option>
      <option value="LEFT">LEFT JOIN</option>
      <option value="RIGHT">RIGHT JOIN</option>
      <option value="FULL">FULL OUTER JOIN</option>
    </select>
    <select class="form-select flex-2 join-table-field">
      ${tableNames.map(t => `<option value="${t}">${t}</option>`).join('')}
    </select>
    <input type="text" class="form-input flex-2 join-left-field" placeholder="Left col (e.g. orders.customer_id)">
    <span style="font-size:0.8rem; color:var(--text-muted);">=</span>
    <input type="text" class="form-input flex-2 join-right-field" placeholder="Right col (e.g. customers.id)">
    <button class="btn btn-sm btn-danger btn-remove-row">✕</button>
  `;

  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addBuilderWhereRow() {
  const container = document.getElementById('builderWhereList');
  const schema = state.schemas[state.activeSchemaId];
  const fromTable = document.getElementById('builderFromTable').value;
  const cols = schema && schema.tables[fromTable] ? schema.tables[fromTable].columns : [];

  const row = document.createElement('div');
  row.className = 'dynamic-row where-row';
  row.innerHTML = `
    <select class="form-select flex-1 where-logical-field">
      <option value="AND">AND</option>
      <option value="OR">OR</option>
    </select>
    <select class="form-select flex-2 where-select-field">
      ${cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
    </select>
    <select class="form-select flex-1 where-op-field">
      <option value="=">=</option>
      <option value="!=">!=</option>
      <option value=">">&gt;</option>
      <option value=">=">&gt;=</option>
      <option value="<">&lt;</option>
      <option value="<=">&lt;=</option>
      <option value="LIKE">LIKE</option>
      <option value="ILIKE">ILIKE</option>
      <option value="IN">IN</option>
      <option value="IS NULL">IS NULL</option>
      <option value="IS NOT NULL">IS NOT NULL</option>
    </select>
    <input type="text" class="form-input flex-2 where-val-field" placeholder="Value (e.g. USA or 100)">
    <button class="btn btn-sm btn-danger btn-remove-row">✕</button>
  `;

  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function buildSpecFromForm() {
  const op = document.getElementById('builderOperation').value;

  if (op !== 'SELECT') {
    const targetTable = document.getElementById('builderDmlTable').value;
    let rawVals = document.getElementById('builderDmlValues').value.trim();
    let parsedVals = {};
    try {
      parsedVals = rawVals ? JSON.parse(rawVals) : {};
    } catch (e) {
      alert('Invalid JSON in values box. Using empty values.');
    }
    return {
      operation: op,
      table: targetTable,
      name: targetTable,
      values: parsedVals
    };
  }

  // SELECT Spec
  const fromTable = document.getElementById('builderFromTable').value;
  const fromAlias = document.getElementById('builderFromAlias').value.trim() || undefined;
  const distinct = document.getElementById('builderDistinct').checked;

  const columns = [];
  document.querySelectorAll('.column-row').forEach(row => {
    const col = row.querySelector('.col-select-field').value;
    const agg = row.querySelector('.col-aggregate-field').value;
    const alias = row.querySelector('.col-alias-field').value.trim();
    columns.push({
      column: col,
      aggregate: agg || undefined,
      alias: alias || undefined
    });
  });

  const joins = [];
  document.querySelectorAll('.join-row').forEach(row => {
    const type = row.querySelector('.join-type-field').value;
    const table = row.querySelector('.join-table-field').value;
    const left = row.querySelector('.join-left-field').value.trim();
    const right = row.querySelector('.join-right-field').value.trim();
    if (table && left && right) {
      joins.push({
        type,
        table,
        on: [{ left, operator: '=', right }]
      });
    }
  });

  const where = [];
  document.querySelectorAll('.where-row').forEach((row, idx) => {
    const logical = row.querySelector('.where-logical-field').value;
    const field = row.querySelector('.where-select-field').value;
    const operator = row.querySelector('.where-op-field').value;
    const value = row.querySelector('.where-val-field').value.trim();
    if (field) {
      where.push({
        logical: idx > 0 ? logical : undefined,
        field,
        operator,
        value
      });
    }
  });

  const groupByRaw = document.getElementById('builderGroupBy').value.trim();
  const groupBy = groupByRaw ? groupByRaw.split(',').map(s => s.trim()) : undefined;

  const orderCol = document.getElementById('builderOrderByCol').value;
  const orderDir = document.getElementById('builderOrderDirection').value;
  const orderBy = orderCol ? [{ column: orderCol, direction: orderDir }] : undefined;

  const limit = document.getElementById('builderLimit').value || undefined;
  const offset = document.getElementById('builderOffset').value || undefined;

  return {
    operation: 'SELECT',
    distinct,
    columns: columns.length > 0 ? columns : [{ column: '*' }],
    fromTable,
    fromAlias,
    joins,
    where,
    groupBy,
    orderBy,
    limit,
    offset
  };
}

/* ==========================================================================
   TAB 3: Interactive Sandbox
   ========================================================================== */
function initSandboxTab() {
  const executeBtn = document.getElementById('executeSandboxBtn');
  const formatBtn = document.getElementById('formatSandboxSqlBtn');
  const sqlInput = document.getElementById('sandboxSqlInput');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  // Default sample query
  sqlInput.value = `SELECT \n  id,\n  name,\n  country,\n  status,\n  total_orders\nFROM customers\nWHERE status = 'active'\nORDER BY total_orders DESC\nLIMIT 5;`;

  executeBtn.addEventListener('click', async () => {
    const sql = sqlInput.value.trim();
    if (!sql) {
      alert('Please enter a SQL query to execute.');
      return;
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '⏳ Running...';
    document.getElementById('sandboxExecutionStats').textContent = 'Executing...';

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, schemaId: state.activeSchemaId })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      state.lastResultData = data;
      renderSandboxTable(data);
      exportCsvBtn.disabled = false;
      exportJsonBtn.disabled = false;

      document.getElementById('sandboxExecutionStats').textContent = `✅ ${data.rowCount} rows returned in ${data.executionTimeMs}ms`;
      addToHistory(sql, `Sandbox Run (${data.rowCount} rows)`);
    } catch (err) {
      document.getElementById('sandboxExecutionStats').textContent = `❌ Execution Failed`;
      document.getElementById('sandboxTableContainer').innerHTML = `
        <div class="empty-state">
          <p class="empty-icon" style="color:var(--danger)">⚠️</p>
          <p style="color:var(--danger); font-weight:600;">Execution Error</p>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-top:4px;">${err.message}</p>
        </div>
      `;
      exportCsvBtn.disabled = true;
      exportJsonBtn.disabled = true;
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '▶ Execute Query';
    }
  });

  formatBtn.addEventListener('click', async () => {
    const sql = sqlInput.value.trim();
    if (!sql) return;

    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      if (data.formatted) sqlInput.value = data.formatted;
    } catch (e) {
      console.error(e);
    }
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!state.lastResultData || !state.lastResultData.rows) return;
    const csv = convertToCsv(state.lastResultData.columns, state.lastResultData.rows);
    downloadFile(csv, 'query_results.csv', 'text/csv');
  });

  exportJsonBtn.addEventListener('click', () => {
    if (!state.lastResultData || !state.lastResultData.rows) return;
    const jsonStr = JSON.stringify(state.lastResultData.rows, null, 2);
    downloadFile(jsonStr, 'query_results.json', 'application/json');
  });
}

function renderSandboxTable(data) {
  const container = document.getElementById('sandboxTableContainer');
  if (!data.columns || data.columns.length === 0 || !data.rows || data.rows.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">ℹ️</p>
        <p>${data.message || '0 rows returned.'}</p>
      </div>
    `;
    return;
  }

  const ths = data.columns.map(c => `<th>${c}</th>`).join('');
  const trs = data.rows.map(row => {
    const tds = data.columns.map(col => {
      let val = row[col];
      if (val === null || val === undefined) val = '<em style="color:var(--text-muted)">NULL</em>';
      return `<td>${val}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
  `;
}

function convertToCsv(columns, rows) {
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => `"${String(r[c] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return `${header}\n${body}`;
}

/* ==========================================================================
   TAB 4: Explainer & Formatter
   ========================================================================== */
function initExplainerTab() {
  const explainBtn = document.getElementById('explainQueryBtn');
  const formatBtn = document.getElementById('formatQueryBtn');
  const input = document.getElementById('explainerSqlInput');
  const container = document.getElementById('explainerResultContainer');

  explainBtn.addEventListener('click', async () => {
    const sql = input.value.trim();
    if (!sql) {
      alert('Please enter a SQL query to explain.');
      return;
    }

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      renderExplanationCards('explainerResultContainer', data.explanation);
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger)">Error: ${err.message}</p>`;
    }
  });

  formatBtn.addEventListener('click', async () => {
    const sql = input.value.trim();
    if (!sql) return;

    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      if (data.formatted) input.value = data.formatted;
    } catch (e) {
      console.error(e);
    }
  });
}

/* ==========================================================================
   TAB 5: Schema Explorer
   ========================================================================== */
function renderSchemaExplorer() {
  const container = document.getElementById('schemaTablesGrid');
  if (!container) return;
  container.innerHTML = '';

  const schema = state.schemas[state.activeSchemaId];
  if (!schema) return;

  Object.entries(schema.tables).forEach(([tableName, def]) => {
    const card = document.createElement('div');
    card.className = 'schema-table-card';

    const colHtml = def.columns.map(c => `
      <div class="column-badge">
        <span class="column-name">
          ${c.name}
          ${c.primaryKey ? '<span class="pk-tag">PK</span>' : ''}
          ${c.foreignKey ? `<span class="fk-tag" title="FK to ${c.foreignKey}">FK</span>` : ''}
        </span>
        <span class="column-type">${c.type}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="schema-table-name">📁 ${tableName}</div>
      <div class="schema-table-desc">${def.description}</div>
      <div class="columns-list">${colHtml}</div>
    `;

    container.appendChild(card);
  });
}

/* ==========================================================================
   TAB 6: Templates & History
   ========================================================================== */
function renderTemplates(templates) {
  const container = document.getElementById('templatesContainer');
  if (!container) return;
  container.innerHTML = '';

  templates.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-title">${tpl.title}</div>
      <div class="template-query">"${tpl.nlQuery}"</div>
      <div style="font-size:0.75rem; color:var(--accent);">Schema: ${tpl.schemaId} | Dialect: ${tpl.dialect}</div>
    `;

    card.addEventListener('click', () => {
      document.getElementById('globalSchemaSelect').value = tpl.schemaId;
      state.activeSchemaId = tpl.schemaId;
      onSchemaChange();

      document.getElementById('sandboxSqlInput').value = tpl.sql;
      switchTab('tab-sandbox');
      document.getElementById('executeSandboxBtn').click();
    });

    container.appendChild(card);
  });
}

function addToHistory(sql, label) {
  state.history.unshift({
    sql,
    label,
    timestamp: new Date().toLocaleTimeString()
  });
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('sqlforge_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">📜</p>
        <p>No queries in history yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  state.history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${item.timestamp} - ${item.label}</div>
        <div class="history-text">${item.sql.replace(/\n/g, ' ')}</div>
      </div>
      <button class="btn btn-sm btn-secondary">Load</button>
    `;

    row.querySelector('button').addEventListener('click', () => {
      document.getElementById('sandboxSqlInput').value = item.sql;
      switchTab('tab-sandbox');
    });

    container.appendChild(row);
  });

  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      state.history = [];
      localStorage.removeItem('sqlforge_history');
      renderHistory();
    };
  }
}

/* ==========================================================================
   Utility Helpers
   ========================================================================== */
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
