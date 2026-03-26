const { execSync } = require('child_process');
try {
  console.log('Running npm install...');
  execSync('npm install @radix-ui/react-slider @radix-ui/react-switch', { stdio: 'inherit' });
  console.log('Install successful!');
} catch(e) {
  console.error('Install failed:', e.message);
}
