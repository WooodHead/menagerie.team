var store;
var idx;

function truncate(ml, s) {
  if (s && s.length > ml) {
    return s.substr(0, ml) + "...";
  } else {
    return s;
  }
}

function makeElementFromDoc(doc) {
  var el = $("<p>")
    .append($("<a>")
      .attr("target", "_blank")
      .attr("href", doc.url)
      .text(doc.title)
    );
  if (doc.body) {
    el.append($("<br>"))
      .append($("<small>")
        .html(truncate(80, doc.body))
      );
  }
  return el;
}

function doSearch() {
  var text = $("#searchText").val().replace('#', 'tags:')
  var sortOrder = $("#sortOrder").val()
  try {
    var results = idx.search(text);
    if (sortOrder == "ref") {
      results.sort(function (a, b) {
        return parseInt(b.ref) - parseInt(a.ref)
      })
    }
    $("#searchError").transition('hide');
    console.log(results);

    $("#searchResults").empty().append(
      results.length ? results.map(function (result) {
        return makeElementFromDoc(store[result.ref]);
      }) : $("<p><strong>No results found for '" + text + "'</strong></p>")
    );
  } catch (e) {
    console.error(e);
    $("#searchErrorText").text(e);
    $("#searchError").transition('show');
  }
};

$(document).ready(function () {
  $.ajax({ url: "search.json" }).done(function (data) {
    store = data.store;
    idx = lunr.Index.load(data.idx);
    $("#searchTags").empty().append(
      data.tags.length ? data.tags.map(function (tag) {
        var el = $("<span>")
          .append($("<a>")
            .attr('href', '#')
            .on("click", function () {
              $("#searchText").val("#" + tag)
              doSearch()
              return false;
            })
            .text("#" + tag + " ")
          );
        return el;
      }) : $("<p>No tags</p>")
    );
    $("#searchDiv").removeClass("loading");
    $("#searchText").removeAttr("disabled");
    $("#rebuildDate").text(data.date);
  });

  $("#searchText").keyup(function (event) {
    if (event.keyCode === 13 && idx) {
      doSearch();
    }
  });

  $('.message .close').on('click', function () {
    $(this).closest('.message').transition('hide');
  });
});
