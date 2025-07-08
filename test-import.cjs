// Simple test to check if we can resolve the import
const fs = require('fs');
const path = require('path');

const filePath = '/home/runner/workspace/client/src/pages/admin/api-analytics.tsx';

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for default export
  const hasDefaultExport = content.includes('export default');
  console.log('File exists:', true);
  console.log('Has default export:', hasDefaultExport);
  console.log('File size:', content.length);
  
  // Check the last few lines
  const lines = content.split('\n');
  console.log('Last 5 lines:');
  console.log(lines.slice(-5).join('\n'));
} else {
  console.log('File does not exist');
}