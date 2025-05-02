const logger = {
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: (...args) => console.info(...args),
  debug: (...args) =>
    process.env.NODE_ENV !== "production" && console.debug(...args),
};

export default logger;
