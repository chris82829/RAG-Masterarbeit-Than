module.exports = {
  apps: [
    {
      name: 'rag-masterarbeit-than',
      cwd: __dirname,
      script: './.output/server/index.mjs',
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
