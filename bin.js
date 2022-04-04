#!/usr/bin/env node

import yargs from 'yargs';

import erd from './index.js';

const { argv } = yargs(process.argv.slice(2));
if (!argv.dsn) {
  console.error('!dsn specified')
  process.exit(1)
}

erd(argv.dsn)
