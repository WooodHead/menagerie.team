// Return an array of unique image URLs from collected data

const {
    flatten,
    isNil,
    pluck,
    reject,
    values,
    uniq
} = require('ramda')

const {store} = require('../s3/search.json')

const images = reject(isNil, uniq(flatten(pluck('images', values(store)))))

module.exports = images
