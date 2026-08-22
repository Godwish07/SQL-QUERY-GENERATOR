/**
 * Pre-defined Database Schemas and Sample Datasets
 * Used for Context-aware Natural Language generation, Visual Query Builder dropdowns,
 * Schema Explorer, and In-Memory Execution Sandbox.
 */

const schemas = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce & Retail',
    description: 'Online store with customers, products, orders, line items, and reviews.',
    tables: {
      customers: {
        description: 'Store registered customer profiles',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'email', type: 'VARCHAR(150)', nullable: false },
          { name: 'country', type: 'VARCHAR(50)', nullable: false },
          { name: 'status', type: 'VARCHAR(20)', nullable: false }, // 'active', 'inactive', 'vip'
          { name: 'total_orders', type: 'INTEGER', defaultValue: 0 },
          { name: 'created_at', type: 'DATE' }
        ],
        sampleData: [
          { id: 1, name: 'Alice Johnson', email: 'alice@example.com', country: 'USA', status: 'active', total_orders: 12, created_at: '2023-01-15' },
          { id: 2, name: 'Bob Smith', email: 'bob@example.com', country: 'Canada', status: 'active', total_orders: 5, created_at: '2023-02-20' },
          { id: 3, name: 'Charlie Lee', email: 'charlie@example.com', country: 'UK', status: 'vip', total_orders: 28, created_at: '2022-11-05' },
          { id: 4, name: 'Diana Prince', email: 'diana@example.com', country: 'USA', status: 'vip', total_orders: 35, created_at: '2022-08-14' },
          { id: 5, name: 'Evan Wright', email: 'evan@example.com', country: 'Germany', status: 'inactive', total_orders: 1, created_at: '2023-05-10' },
          { id: 6, name: 'Fiona Gallagher', email: 'fiona@example.com', country: 'USA', status: 'active', total_orders: 9, created_at: '2023-06-01' },
          { id: 7, name: 'George Clark', email: 'george@example.com', country: 'Australia', status: 'active', total_orders: 14, created_at: '2023-03-12' },
          { id: 8, name: 'Hannah Abbott', email: 'hannah@example.com', country: 'UK', status: 'active', total_orders: 7, created_at: '2023-07-22' }
        ]
      },
      products: {
        description: 'Catalog items for sale',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'category', type: 'VARCHAR(50)', nullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'stock_quantity', type: 'INTEGER', defaultValue: 0 },
          { name: 'rating', type: 'DECIMAL(3,2)', defaultValue: 0.0 },
          { name: 'is_active', type: 'BOOLEAN', defaultValue: true }
        ],
        sampleData: [
          { id: 101, name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 199.99, stock_quantity: 45, rating: 4.8, is_active: 1 },
          { id: 102, name: 'Mechanical Gaming Keyboard', category: 'Electronics', price: 129.50, stock_quantity: 80, rating: 4.6, is_active: 1 },
          { id: 103, name: 'Ergonomic Office Chair', category: 'Furniture', price: 289.00, stock_quantity: 15, rating: 4.7, is_active: 1 },
          { id: 104, name: 'Standing Desk Converter', category: 'Furniture', price: 175.00, stock_quantity: 22, rating: 4.4, is_active: 1 },
          { id: 105, name: 'Stainless Steel Water Bottle', category: 'Accessories', price: 24.99, stock_quantity: 200, rating: 4.9, is_active: 1 },
          { id: 106, name: '4K Ultra HD Monitor 27-inch', category: 'Electronics', price: 349.99, stock_quantity: 30, rating: 4.7, is_active: 1 },
          { id: 107, name: 'USB-C Multi-Port Hub', category: 'Electronics', price: 49.99, stock_quantity: 120, rating: 4.3, is_active: 1 },
          { id: 108, name: 'Leather Laptop Backpack', category: 'Accessories', price: 89.95, stock_quantity: 60, rating: 4.5, is_active: 1 }
        ]
      },
      orders: {
        description: 'Customer order transactions',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'customer_id', type: 'INTEGER', foreignKey: 'customers.id' },
          { name: 'order_date', type: 'DATE', nullable: false },
          { name: 'status', type: 'VARCHAR(20)', nullable: false }, // 'completed', 'pending', 'cancelled'
          { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'payment_method', type: 'VARCHAR(30)' }
        ],
        sampleData: [
          { id: 1001, customer_id: 1, order_date: '2024-01-10', status: 'completed', total_amount: 199.99, payment_method: 'Credit Card' },
          { id: 1002, customer_id: 2, order_date: '2024-01-12', status: 'completed', total_amount: 129.50, payment_method: 'PayPal' },
          { id: 1003, customer_id: 3, order_date: '2024-01-15', status: 'completed', total_amount: 464.00, payment_method: 'Credit Card' },
          { id: 1004, customer_id: 4, order_date: '2024-01-20', status: 'completed', total_amount: 638.99, payment_method: 'Credit Card' },
          { id: 1005, customer_id: 1, order_date: '2024-02-01', status: 'pending', total_amount: 49.99, payment_method: 'Apple Pay' },
          { id: 1006, customer_id: 6, order_date: '2024-02-05', status: 'completed', total_amount: 89.95, payment_method: 'Credit Card' },
          { id: 1007, customer_id: 7, order_date: '2024-02-08', status: 'cancelled', total_amount: 349.99, payment_method: 'Credit Card' },
          { id: 1008, customer_id: 4, order_date: '2024-02-14', status: 'completed', total_amount: 24.99, payment_method: 'Credit Card' }
        ]
      },
      order_items: {
        description: 'Individual items inside orders',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'order_id', type: 'INTEGER', foreignKey: 'orders.id' },
          { name: 'product_id', type: 'INTEGER', foreignKey: 'products.id' },
          { name: 'quantity', type: 'INTEGER', nullable: false },
          { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false }
        ],
        sampleData: [
          { id: 5001, order_id: 1001, product_id: 101, quantity: 1, unit_price: 199.99 },
          { id: 5002, order_id: 1002, product_id: 102, quantity: 1, unit_price: 129.50 },
          { id: 5003, order_id: 1003, product_id: 103, quantity: 1, unit_price: 289.00 },
          { id: 5004, order_id: 1003, product_id: 104, quantity: 1, unit_price: 175.00 },
          { id: 5005, order_id: 1004, product_id: 106, quantity: 1, unit_price: 349.99 },
          { id: 5006, order_id: 1004, product_id: 103, quantity: 1, unit_price: 289.00 },
          { id: 5007, order_id: 1005, product_id: 107, quantity: 1, unit_price: 49.99 },
          { id: 5008, order_id: 1006, product_id: 108, quantity: 1, unit_price: 89.95 }
        ]
      }
    }
  },

  hr: {
    id: 'hr',
    name: 'Human Resources & Corporate',
    description: 'Departments, employees, job roles, and salary tracking.',
    tables: {
      departments: {
        description: 'Company divisions',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'VARCHAR(50)', nullable: false },
          { name: 'location', type: 'VARCHAR(50)' },
          { name: 'budget', type: 'DECIMAL(12,2)' }
        ],
        sampleData: [
          { id: 10, name: 'Engineering', location: 'San Francisco', budget: 1500000.00 },
          { id: 20, name: 'Marketing', location: 'New York', budget: 600000.00 },
          { id: 30, name: 'Sales', location: 'Chicago', budget: 850000.00 },
          { id: 40, name: 'Human Resources', location: 'San Francisco', budget: 350000.00 },
          { id: 50, name: 'Product Design', location: 'Austin', budget: 500000.00 }
        ]
      },
      employees: {
        description: 'Staff member directory',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'first_name', type: 'VARCHAR(50)', nullable: false },
          { name: 'last_name', type: 'VARCHAR(50)', nullable: false },
          { name: 'email', type: 'VARCHAR(100)' },
          { name: 'department_id', type: 'INTEGER', foreignKey: 'departments.id' },
          { name: 'job_title', type: 'VARCHAR(60)' },
          { name: 'salary', type: 'DECIMAL(10,2)' },
          { name: 'hire_date', type: 'DATE' },
          { name: 'is_active', type: 'BOOLEAN', defaultValue: true }
        ],
        sampleData: [
          { id: 201, first_name: 'Sarah', last_name: 'Connor', email: 'sconnor@company.com', department_id: 10, job_title: 'Lead Software Architect', salary: 145000.00, hire_date: '2019-03-15', is_active: 1 },
          { id: 202, first_name: 'John', last_name: 'Doe', email: 'jdoe@company.com', department_id: 10, job_title: 'Senior Backend Developer', salary: 115000.00, hire_date: '2021-06-01', is_active: 1 },
          { id: 203, first_name: 'Elena', last_name: 'Rostova', email: 'erostova@company.com', department_id: 20, job_title: 'Marketing Director', salary: 120000.00, hire_date: '2020-01-10', is_active: 1 },
          { id: 204, first_name: 'Marcus', last_name: 'Vance', email: 'mvance@company.com', department_id: 30, job_title: 'Enterprise Account Executive', salary: 98000.00, hire_date: '2022-09-15', is_active: 1 },
          { id: 205, first_name: 'Amina', last_name: 'Said', email: 'asaid@company.com', department_id: 10, job_title: 'Frontend Engineer', salary: 95000.00, hire_date: '2022-02-18', is_active: 1 },
          { id: 206, first_name: 'David', last_name: 'Kim', email: 'dkim@company.com', department_id: 50, job_title: 'Senior Product Designer', salary: 105000.00, hire_date: '2021-11-20', is_active: 1 },
          { id: 207, first_name: 'Rachel', last_name: 'Green', email: 'rgreen@company.com', department_id: 40, job_title: 'HR Specialist', salary: 72000.00, hire_date: '2023-04-01', is_active: 1 },
          { id: 208, first_name: 'Michael', last_name: 'Scott', email: 'mscott@company.com', department_id: 30, job_title: 'Regional Sales Manager', salary: 110000.00, hire_date: '2018-07-01', is_active: 1 }
        ]
      },
      projects: {
        description: 'Initiatives and team assignments',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'department_id', type: 'INTEGER', foreignKey: 'departments.id' },
          { name: 'budget', type: 'DECIMAL(10,2)' },
          { name: 'start_date', type: 'DATE' },
          { name: 'status', type: 'VARCHAR(20)' }
        ],
        sampleData: [
          { id: 301, name: 'Cloud Migration 2.0', department_id: 10, budget: 350000.00, start_date: '2024-01-01', status: 'In Progress' },
          { id: 302, name: 'Brand Refresh 2024', department_id: 20, budget: 120000.00, start_date: '2024-02-15', status: 'Planning' },
          { id: 303, name: 'Global Sales Expansion', department_id: 30, budget: 200000.00, start_date: '2023-09-01', status: 'Completed' },
          { id: 304, name: 'Design System Overhaul', department_id: 50, budget: 80000.00, start_date: '2024-03-01', status: 'In Progress' }
        ]
      }
    }
  },

  saas: {
    id: 'saas',
    name: 'SaaS & Subscription Analytics',
    description: 'User subscriptions, plans, billing invoices, and usage tracking.',
    tables: {
      users: {
        description: 'SaaS accounts and customers',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'email', type: 'VARCHAR(100)' },
          { name: 'plan_tier', type: 'VARCHAR(30)' }, // 'Free', 'Pro', 'Enterprise'
          { name: 'mrr', type: 'DECIMAL(8,2)' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'signup_date', type: 'DATE' }
        ],
        sampleData: [
          { id: 1, name: 'Acme Corp', email: 'admin@acme.com', plan_tier: 'Enterprise', mrr: 1200.00, status: 'active', signup_date: '2023-01-10' },
          { id: 2, name: 'Starlight Inc', email: 'billing@starlight.io', plan_tier: 'Pro', mrr: 149.00, status: 'active', signup_date: '2023-04-15' },
          { id: 3, name: 'Nova Labs', email: 'team@novalabs.dev', plan_tier: 'Pro', mrr: 149.00, status: 'active', signup_date: '2023-08-01' },
          { id: 4, name: 'DevStudio Ltd', email: 'info@devstudio.com', plan_tier: 'Free', mrr: 0.00, status: 'active', signup_date: '2023-11-20' },
          { id: 5, name: 'Global Logistics', email: 'ops@globallog.com', plan_tier: 'Enterprise', mrr: 2500.00, status: 'active', signup_date: '2022-09-05' },
          { id: 6, name: 'Peak Fitness', email: 'alex@peakfit.com', plan_tier: 'Pro', mrr: 149.00, status: 'churned', signup_date: '2023-02-12' }
        ]
      },
      invoices: {
        description: 'Monthly billing records',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'user_id', type: 'INTEGER', foreignKey: 'users.id' },
          { name: 'amount', type: 'DECIMAL(8,2)' },
          { name: 'status', type: 'VARCHAR(20)' }, // 'paid', 'unpaid', 'refunded'
          { name: 'invoice_date', type: 'DATE' }
        ],
        sampleData: [
          { id: 701, user_id: 1, amount: 1200.00, status: 'paid', invoice_date: '2024-02-01' },
          { id: 702, user_id: 2, amount: 149.00, status: 'paid', invoice_date: '2024-02-01' },
          { id: 703, user_id: 3, amount: 149.00, status: 'paid', invoice_date: '2024-02-01' },
          { id: 704, user_id: 5, amount: 2500.00, status: 'paid', invoice_date: '2024-02-01' },
          { id: 705, user_id: 1, amount: 1200.00, status: 'paid', invoice_date: '2024-01-01' },
          { id: 706, user_id: 6, amount: 149.00, status: 'unpaid', invoice_date: '2024-01-15' }
        ]
      }
    }
  }
};

const templates = [
  {
    title: 'Top 5 Customers by Lifetime Spend',
    schemaId: 'ecommerce',
    dialect: 'postgres',
    nlQuery: 'Find the top 5 customers ordered by total order amount descending',
    sql: `SELECT \n  c.id,\n  c.name,\n  c.email,\n  c.country,\n  SUM(o.total_amount) AS lifetime_spend\nFROM customers c\nINNER JOIN orders o ON c.id = o.customer_id\nWHERE o.status = 'completed'\nGROUP BY c.id, c.name, c.email, c.country\nORDER BY lifetime_spend DESC\nLIMIT 5;`
  },
  {
    title: 'Average Department Salary & Headcount',
    schemaId: 'hr',
    dialect: 'postgres',
    nlQuery: 'Calculate average salary and total employee count for each department with more than 1 employee',
    sql: `SELECT \n  d.name AS department_name,\n  d.location,\n  COUNT(e.id) AS employee_count,\n  ROUND(AVG(e.salary), 2) AS avg_salary,\n  MAX(e.salary) AS highest_salary\nFROM departments d\nINNER JOIN employees e ON d.id = e.department_id\nWHERE e.is_active = 1\nGROUP BY d.id, d.name, d.location\nHAVING COUNT(e.id) >= 1\nORDER BY avg_salary DESC;`
  },
  {
    title: 'High-Value Inactive Products Alert',
    schemaId: 'ecommerce',
    dialect: 'mysql',
    nlQuery: 'Show electronics products with price above 100 and stock less than 50',
    sql: `SELECT \n  ` + '`id`,\n  `name`,\n  `category`,\n  `price`,\n  `stock_quantity`,\n  `rating`\nFROM `products`\nWHERE `category` = \'Electronics\'\n  AND `price` >= 100.00\n  AND `stock_quantity` < 50\nORDER BY `price` DESC;'
  },
  {
    title: 'Monthly Recurring Revenue (MRR) Summary',
    schemaId: 'saas',
    dialect: 'sqlite',
    nlQuery: 'Show active users grouped by plan tier with total MRR',
    sql: `SELECT \n  plan_tier,\n  COUNT(id) AS total_subscribers,\n  SUM(mrr) AS tier_mrr,\n  AVG(mrr) AS avg_revenue_per_user\nFROM users\nWHERE status = 'active'\nGROUP BY plan_tier\nORDER BY tier_mrr DESC;`
  }
];

module.exports = {
  schemas,
  templates
};
