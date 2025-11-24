const fs = require('fs');
const path = require('path');

describe('Style injection script', () => {
  test('should contain a descriptive header', () => {
    const file = fs.readFileSync(path.join(__dirname, '..', 'injector', 'style-injection.js'), 'utf8');
    expect(file).toMatch(/Portal styling injection/);
  });
});
