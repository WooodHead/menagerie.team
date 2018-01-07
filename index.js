var lunr = require('lunr'),
    stdin = process.stdin,
    stdout = process.stdout,
    buffer = []
  
stdin.resume()
stdin.setEncoding('utf8')

stdin.on('data', function (data) {
  buffer.push(data)
})

stdin.on('end', function () {
  var documents = JSON.parse(buffer.join(''))
  var store = {};
  var tags = {};
  
  var idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('body')
    this.field('author')
    this.field('url')

    documents.forEach(function (doc) {
      this.add(doc)
    }, this)
  });

  documents.forEach(function (doc) {
    store[doc.id] = doc;

    if (!doc.body) {
      var tagsFound = doc.title.match(/\[[^\[]*\]/g);
      if (tagsFound) {
        tagsFound.forEach(function(tag) {
          if(tags[tag] === undefined) { tags[tag] = new Set(); }
          tags[tag].add({title: doc.title, url: doc.url});
        });
      }  
    }
  });

  for(key in tags) {
    s = tags[key];
    tags[key] = [...s].sort(function(a, b) {
      return b.url.localeCompare(a.url);
    });
  }

  d = new Date();
  stdout.write(JSON.stringify({
    date: d.toLocaleString(),
    store: store,
    tags: tags,
    idx: idx
  }))
})
