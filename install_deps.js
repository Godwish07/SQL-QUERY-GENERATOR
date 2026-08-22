const { spawn } = require('child_process');
const path = require('path');

const npmCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
const child = spawn(process.execPath, [npmCli, 'install', 'express', 'cors', 'dotenv', '--no-fund', '--no-audit'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    npm_config_cache: path.join(__dirname, '.npm-cache'),
    npm_config_update_notifier: 'false'
  }
});

child.on('exit', (code) => {
  console.log(`npm exited with code ${code}`);
  process.exit(code || 0);
});
