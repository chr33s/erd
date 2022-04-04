import yargs from 'yargs';

import erd from '../index.js';

const { argv } = yargs(process.argv.slice(2));
if (!argv.db) {
  console.error('!db specified')
  process.exit(1)
}

erd(argv.db, argv.username, argv.password)
