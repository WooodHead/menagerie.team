// Return an array of posts

const {
    values
} = require('ramda')

const {store} = require('../s3/search.json')

const posts = values(store)

module.exports = posts