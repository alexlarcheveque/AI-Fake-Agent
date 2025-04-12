# AI-Fake-Agent
Integrate as a fake real estate agent

## Backend Environment Configuration

### Logging Configuration

The backend server supports different levels of logging verbosity, controlled by environment variables:

- `DEBUG_REQUESTS`: When set to `'true'`, enables detailed logging of all HTTP requests, including headers and bodies. When set to `'false'` (default), only minimal request information is logged.

Example usage in `.env` file:
```
# For minimal logging (production)
DEBUG_REQUESTS=false

# For detailed logging (development/debugging)
DEBUG_REQUESTS=true
```

This helps reduce console clutter in production while providing detailed logs when needed for debugging.
