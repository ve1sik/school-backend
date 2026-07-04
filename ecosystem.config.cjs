module.exports = {
  apps: [
    {
      name: 'school-backend',
      cwd: '/root/school-backend',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      min_uptime: '15s',
      env: { NODE_ENV: 'production' },
    },
  ],
};
