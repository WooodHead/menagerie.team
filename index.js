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
  
  var idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('body')
    this.field('url')

    documents.forEach(function (doc) {
      this.add(doc)
    }, this)
  });

  documents.forEach(function (doc) {
    store[doc.id] = doc;
  });

  stdout.write(JSON.stringify({
    store: store,
    idx: idx
  }))
})
