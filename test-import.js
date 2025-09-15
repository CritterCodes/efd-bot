import('./src/commands/gems.js').then(module => {
  console.log('Gems module structure:', {
    hasDefault: !!module.default,
    hasData: !!(module.default && module.default.data),
    keys: Object.keys(module.default || {}),
    dataKeys: module.default && module.default.data ? Object.keys(module.default.data) : 'no data'
  });
}).catch(err => console.error('Error importing gems:', err.message));