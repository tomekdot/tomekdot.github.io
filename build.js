const { execSync } = require('child_process');
try {
  const result = execSync('npx vite build', { cwd: 'C:\\Users\\tomekdot\\Documents\\VSCode\\tomekdot.github.io', encoding: 'utf8', timeout: 60000 });
  console.log(result);
} catch (e) {
  console.error(e.stdout || e.message);
}
