const mysql = require('mysql2/promise');

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Pranav@06',
  database: process.env.DB_NAME || 'codealpha_2',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

pool.getConnection()
  .then(conn => {
    console.log('Connected to MySQL database:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('Failed to connect to MySQL database:', err.message);
    process.exit(1);
  });

// Wrapper to mimic sqlite3 db.get (returns single row)
pool.asyncGet = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows[0];
};

// Wrapper to mimic sqlite3 db.all (returns all rows)
pool.asyncAll = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

// Wrapper to mimic sqlite3 db.run (returns lastID and changes)
pool.asyncRun = async (sql, params = []) => {
  const [result] = await pool.query(sql, params);
  return { lastID: result.insertId, changes: result.affectedRows };
};

module.exports = pool;
