import lunr from 'lunr'
import { filter, has, keys } from 'ramda'

var store
var idx

const truncate = (ml, s) => (s && s.length > ml) ? `${s.substr(0, ml)}...` : s

const hasBodyProperty = (e) => has('body')

const bodyKeywords = (hit) => filter(hasBodyProperty, keys(hit.matchData.metadata))

function makeElementFromDoc(doc, hit) {
  var el = $('<p>')
    .addClass('search-hit')
    .attr('id', doc.id)
    .append($('<a>')
      .attr('target', '_blank')
      .attr('href', doc.url)
      .text(doc.title)
    );
  if (doc.body) {
    var summary = $('<small>')
      .addClass('search-hit-summary')
      .html(truncate(80, doc.body))
    for(var kw of bodyKeywords(hit)) {
      summary.addClass(`search-hit-keyword-${kw}`)
    }
    el.append($('<br>'))
      .append(summary)
  }
  return el;
}

function addTagToSearch(tag) {
  const searchText = $('#searchText').val()
  var newText = ''
  if (!searchText) {
    newText = tag
  } else if (searchText.includes(tag)) {
    return
  } else {
    newText = `${searchText} ${tag}`
  }
  $('#searchText').val(newText)
  doSearch()
  return false
}

function makeTag(tag) {
  return $('<span>')
    .append($('<a>')
      .attr('href', '#')
      .on('click', (e) => addTagToSearch(`#${tag}`))
      .text(`#${tag} `)
  )
}

const sortByRef = (a, b) => parseInt(b.ref) - parseInt(a.ref)

function getSearchResults(searchText) {
  console.log(searchText)
  const results = idx.search(searchText);
  const sortOrder = $('#sortOrder').val()
  if (sortOrder == 'ref') {
    results.sort(sortByRef)
  }
  console.log(results)
  return results
}

function highlightResults(results) {
  var kwl = {}
  for (var hit of results) {
    for (var kw of bodyKeywords(hit)) {
      kwl[kw] = true;
    }
  }
  for (var kw of keys(kwl)) {
    $(`.search-hit-keyword-${kw}`).mark(kw)
  }
}

function doSearch() {
  const searchText = $('#searchText').val()
  $('#searchError').transition('hide');
  try {
    const results = getSearchResults(searchText.replace(/\B#/g, 'tags:'))
    $('#searchResults').empty().append(
      results.length ?
        results.map((r) => makeElementFromDoc(store[r.ref], r)) :
        $(`<p><strong>No results found for '${searchText}'</strong></p>`)
    )
    highlightResults(results)
  } catch (e) {
    console.error(e);
    $('#searchErrorText').text(e);
    $('#searchError').transition('show');
  }
}

function buildIndex(data) {
  store = data.store
  idx = lunr.Index.load(data.idx)
  $('#searchTags').empty().append(data.tags.length ? data.tags.map(makeTag) : $('<p>No tags</p>'))
  $('#searchDiv').removeClass('loading')
  $('.search-control').removeAttr('disabled')
  $('#rebuildDate').text(data.date)
}

$(document).ready(function () {
  $.ajax({ url: 'search.json' }).done(buildIndex)

  $('#searchText').keyup((e) => {
    if (e.keyCode === 13 && idx) {
      doSearch()
    }
  })

  $('#sortOrder').on('change', (e) => {
    if (idx) {
      doSearch()
    }
  })

  $('.message .close').on('click', () => $(this).closest('.message').transition('hide'))
})
