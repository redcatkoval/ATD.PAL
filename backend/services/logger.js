const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, context = {}) {
    const timestamp = this.formatTimestamp();
    const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context) : '';
    
    if (this.isDevelopment) {
      return `${colors.gray}[${timestamp}]${colors.reset} ${level} ${message} ${contextStr}`;
    }
    
    return JSON.stringify({
      timestamp,
      level: level.replace(/\x1b\[[0-9;]*m/g, ''), // Remove color codes for production
      message,
      ...context
    });
  }

  info(message, context = {}) {
    const formatted = this.formatMessage(`${colors.blue}INFO${colors.reset}`, message, context);
    console.log(formatted);
  }

  success(message, context = {}) {
    const formatted = this.formatMessage(`${colors.green}SUCCESS${colors.reset}`, message, context);
    console.log(formatted);
  }

  warn(message, context = {}) {
    const formatted = this.formatMessage(`${colors.yellow}WARN${colors.reset}`, message, context);
    console.warn(formatted);
  }

  error(message, error = null, context = {}) {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
          code: error.code,
          name: error.name
        }
      })
    };
    
    const formatted = this.formatMessage(`${colors.red}ERROR${colors.reset}`, message, errorContext);
    console.error(formatted);
  }

  debug(message, context = {}) {
    if (this.isDevelopment) {
      const formatted = this.formatMessage(`${colors.magenta}DEBUG${colors.reset}`, message, context);
      console.log(formatted);
    }
  }

  http(req, res, responseTime) {
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    const statusColor = statusCode >= 400 ? colors.red : 
                       statusCode >= 300 ? colors.yellow : colors.green;
    
    const message = `${method} ${url}`;
    const context = {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip,
      userAgent: req.get('User-Agent')
    };

    const formatted = this.formatMessage(
      `${colors.cyan}HTTP${colors.reset} ${statusColor}${statusCode}${colors.reset}`, 
      message, 
      context
    );
    console.log(formatted);
  }

  database(operation, table, context = {}) {
    const message = `Database ${operation} on ${table}`;
    const formatted = this.formatMessage(`${colors.cyan}DB${colors.reset}`, message, context);
    console.log(formatted);
  }

  api(service, operation, context = {}) {
    const message = `API call to ${service}: ${operation}`;
    const formatted = this.formatMessage(`${colors.magenta}API${colors.reset}`, message, context);
    console.log(formatted);
  }
}

module.exports = new Logger(); 