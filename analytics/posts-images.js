const {
    flatten,
    isNil,
    map,
    merge,
    pick,
    reject,
    values
} = require('ramda')
const url = require('url')

const {store} = require('../s3/search.json')

const posts = values(store) // Array of post objects
var postsWithImages = reject((post) => post.images.length < 1, posts)
const explodeImages = (post) => map((img) => merge(pick(['author', 'date'], post), url.parse(img)), reject(isNil, post.images))
var explodedPosts = flatten(map(explodeImages, postsWithImages))

module.exports = explodedPosts