const fs = require('fs')
const lunr = require('lunr')
const { curry, evolve } = require('ramda')
const crawler = require('./crawl')

const truncate = curry((ml, s) => (s && s.length > ml) ? `${s.substr(0, ml)}...` : s)

var store = {}
var tags = new Set()
var documents = []

crawler.on('document', (doc) => {
  documents.push(doc)
})

crawler.on('done', () => {
  var idx = lunr(function() {
    var _idx = this
  
    _idx.ref('id')
    _idx.field('title')
    _idx.field('tags')
    _idx.field('body')
    _idx.field('author')
    _idx.field('url')
  
    documents.forEach(function(document) {
      _idx.add({...document, tags: document.tags.join(' ')})
      for(var tag of (document.tags || [])) {
        tags.add(tag)
      }
      store[document.id] = evolve({
        body: truncate(80)
      })(document)
    })  
  })

  d = new Date();
  const searchJson = JSON.stringify({
    date: d.toLocaleString(),
    store,
    tags: Array.from(tags).sort(),
    idx
  })

  fs.writeFileSync('s3/search.json', searchJson)
})

crawler.emit('start')