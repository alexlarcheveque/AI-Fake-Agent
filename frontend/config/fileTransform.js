'use strict';

import path from 'path';
import camelcase from 'camelcase';

// This is a custom Jest transformer turning file imports into filenames.
// http://facebook.github.io/jest/docs/en/webpack.html

export default {
  process(src, filename) {
    const assetFilename = JSON.stringify(path.basename(filename));

    if (filename.match(/\.svg$/)) {
      // Based on how SVGR generates a component name:
      // https://github.com/smooth-code/svgr/blob/01b194cf967347d43d4cbe6b434404731b87cf27/packages/core/src/state.js#L6
      const pascalCaseFilename = camelcase(path.parse(filename).name, {
        pascalCase: true,
      });
      const componentName = `Svg${pascalCaseFilename}`;
      return {
        code: `
          import React from 'react';
          const Component = {
            __esModule: true,
            default: ${assetFilename},
            ReactComponent: React.forwardRef(function ${componentName}(props, ref) {
              return {
                $$typeof: Symbol.for('react.element'),
                type: 'svg',
                ref: ref,
                key: null,
                props: Object.assign({}, props, {
                  children: ${assetFilename}
                })
              };
            }),
          };
          export default Component;
        `,
      };
    }

    return {
      code: `export default ${assetFilename};`,
    };
  },
  getCacheKey() {
    // The output is always the same.
    return 'fileTransform';
  },
}; 