export default {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: 'auto'
    }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  env: {
    test: {
      // For backend tests
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ]
    }
  }
}; 