const lunr = require('lunr')
const crawler = require('./crawl')

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
      store[document.id] = document
    })  
  })

  d = new Date();
  console.log(JSON.stringify({
    date: d.toLocaleString(),
    store,
    tags: Array.from(tags).sort(),
    idx
  }))
})

crawler.emit('start')