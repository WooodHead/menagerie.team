#!/usr/bin/env node

const { values } = require('ramda')
const data = require('./s3/search.json')

const rows = values(data.store)

console.log(JSON.stringify(rows, null, 2))