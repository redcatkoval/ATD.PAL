const { Pool } = require('pg');
const logger = require('../services/logger');

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/atdpal',
  // SSL configuration for external databases like Supabase
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? {
    rejectUnauthorized: false
  } : false,
  // Optional: you can specify connection parameters individually instead of using a connection string
  // user: process.env.DB_USER || 'postgres',
  // password: process.env.DB_PASSWORD || 'postgres',
  // host: process.env.DB_HOST || 'localhost',
  // port: process.env.DB_PORT || 5432,
  // database: process.env.DB_NAME || 'atdpal',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

// Log pool events
pool.on('connect', (client) => {
  logger.info('Database client connected', { 
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('Database client acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.warn('Database client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// The pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle database client', err, {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
  process.exit(-1);
});

// Override the query method to add logging
const originalQuery = pool.query.bind(pool);

pool.query = async (text, params) => {
  const start = Date.now();
  const queryId = Math.random().toString(36).substring(7);
  
  try {
    logger.debug('Database query started', {
      queryId,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params ? params.length : 0
    });
    
    const result = await originalQuery(text, params);
    const duration = Date.now() - start;
    
    logger.database('QUERY', 'executed', {
      queryId,
      duration: `${duration}ms`,
      rowCount: result.rowCount,
      command: result.command
    });
    
    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        queryId,
        duration: `${duration}ms`,
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        rowCount: result.rowCount
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Database query failed', error, {
      queryId,
      duration: `${duration}ms`,
      query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      paramCount: params ? params.length : 0
    });
    
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database pool...');
  await pool.end();
  logger.success('Database pool closed');
});

process.on('SIGTERM', async () => {
  logger.info('Closing database pool...');
  await pool.end();
  logger.success('Database pool closed');
});

module.exports = pool; 