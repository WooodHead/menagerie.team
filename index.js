const lunr = require('lunr')
const crawler = require('./crawl')

var store = {}
var tags = {}
var documents = []

const parseTags = (doc) => {
  if (!doc.body) {
    var tagsFound = doc.title.match(/\[[^\[]*\]/g);
    if (tagsFound) {
      tagsFound.forEach(function(tag) {
        if(tags[tag] === undefined) { tags[tag] = new Set(); }
        tags[tag].add({title: doc.title, url: doc.url});
      });
    }
  } else {
    var tagsFound = doc.body.match(/(?:^|\s)(?:#)([a-zA-Z\d]+)/gm);
    if (tagsFound) {
      tagsFound = tagsFound.map((x) => x.trim());
      tagsFound.forEach((tag) => {
        if(tags[tag] === undefined) { tags[tag] = new Set(); }
        tags[tag].add({title: doc.title, url: doc.url});
      })
    }
  }
}

crawler.on('document', (doc) => {
  documents.push(doc)
})

crawler.on('done', () => {
  var idx = lunr(function() {
    var _idx = this
  
    _idx.ref('id')
    _idx.field('title')
    _idx.field('body')
    _idx.field('author')
    _idx.field('url')
  
    documents.forEach(function(document) {
      _idx.add(document)
      store[document.id] = document
      parseTags(document)
    })  
  })
  
  for(key in tags) {
    s = tags[key];
    tags[key] = [...s].sort(function(a, b) {
      return b.url.localeCompare(a.url);
    });
  }

  d = new Date();
  console.log(JSON.stringify({
    date: d.toLocaleString(),
    store: store,
    tags: tags,
    idx: idx
  }))
})

crawler.emit('start')