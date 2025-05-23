'use strict';

// This is a custom Jest transformer turning style imports into empty objects.
// http://facebook.github.io/jest/docs/en/webpack.html

export default {
  process() {
    return {
      code: 'export default {};',
    };
  },
  getCacheKey() {
    // The output is always the same.
    return 'cssTransform';
  },
}; 