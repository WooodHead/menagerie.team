const Crawler = require("crawler")
const EventEmitter = require('events')
const fs = require('fs')
const moment = require('moment')
const { addIndex, head, map, or, pluck, reject } = require('ramda')
const request = require('request')
const seenreq = require('seenreq')
const { URL } = require('url')

const jar = request.jar()
const seen = new seenreq()

const roll20Url = (urlFragment) => {
    return new URL(urlFragment, 'https://app.roll20.net').toString()
}

const pageEmitter = new EventEmitter()

module.exports = pageEmitter

const pageTitleRegexp = new RegExp(/\[([^\[]*)\]/g)
const bodyRegexp = new RegExp(/(?:^|\s)(?:#)([a-zA-Z\d]+)/gm)
const scriptRegexp = new RegExp(/data-postid=(\d+).*BASE64.decode\("([^"]+)"\)/)

const isNumeric = (s) => !!or(s, "").match(/^\d+$/)

const getTags = (r, t) => {
    var tl = new Set(), m
    while(m = r.exec(t)) {
        tl.add(m[1])
    }
    return reject(isNumeric, Array.from(tl))
}

const parseCampaignPage = async (c, res) => {
    var $ = res.$
    var nonStickyPosts = 0
    var postUrls = []

    $('div.postlisting').each((i, e) => {
        var postUrl = roll20Url($('div.title a', e).attr('href').trim())
        postUrls.push({
            uri: postUrl,
            postPage: true
        })
        if (!$(e).hasClass('stickypost')) {
            nonStickyPosts = nonStickyPosts + 1
        }
    })

    if (nonStickyPosts > 0) {
        // We care about pagination after all
        var nextPageUrl = $('div.nextpage a').attr('href')
        if (nextPageUrl) {
            nextPageUrl = roll20Url(nextPageUrl)
            postUrls.push({
                uri: nextPageUrl,
                campaignPage: true
            })
        }
    }

    // For each URL, did we see it, true or false?
    var seenExistResults = await Promise.all(map(o => seen.exists(o.uri), postUrls))

    // Seenreq returns an array of booleans, unfuck that data structure
    seenExistResults = map(head, seenExistResults)

    // Throw out any URLs we've already visited
    const unseenUrls = addIndex(reject)((e, i) => seenExistResults[i], postUrls)

    // Enqueue all posts, and next page
    map(opt => c.queue(opt), unseenUrls)
}

const parsePostPage = async (c, res) => {
    var $ = res.$
    var url = res.request.uri.href
    const title = $('h1.posttitle').text().trim()
    var pageTags = getTags(pageTitleRegexp, title)

    $('div.post').each((i, e) => {
        var postId = $(e).attr('data-postid')
        var author = $('div.name a', e).text().trim()
        var body = $('div.postcontent', e).text().trim()
        var permalink = roll20Url(`/forum/permalink/${postId}`)
        var datestamp = $('div.timestamp', e).text().trim()
        var date = moment(parseInt(datestamp) * 1000).format()
        var postTags = getTags(bodyRegexp, body)
        var images = []

        // What the fuck, Roll20
        $('script', e).each((i, e) => {
            var scriptText = $(e).text()
            var m
            if ((m = scriptText.match(scriptRegexp))) {
                var htmlBody = Buffer.from(m[2], 'base64').toString()
                var htmlE = $('<div>').html(htmlBody)
                $('img', htmlE).each((ii, ie) => {
                    images.push($(ie).attr('src'))
                })
                if (images.length > 0) {
                    postTags.push('Image')
                }
            }
        })

        if (!body) {
            postTags.push('ImageOnly')
        }
        pageEmitter.emit('document', {
            id: postId,
            url: permalink,
            tags: postTags.concat(pageTags),
            date,
            title,
            author,
            body,
            images
        })
        pageTags = []
    })

    try {
        var olderUrl = $('div.postnav ul.pagination li:not(.active) a')
        if (olderUrl && olderUrl.attr('href')) {
            olderUrl = roll20Url(olderUrl.attr('href'))
            const found = await seen.exists(olderUrl)
            if (!found[0]) {
                c.queue({
                    uri: olderUrl,
                    postPage: true
                })
            }
        }
    } catch (e) {
        console.error(e)
    }
}

var c = new Crawler({
    maxConnections: 4,
    preRequest: (options, done) => {
        options.jar = jar
        done()
    },
    callback: (error, res, done) => {
        if (error) {
            console.error(error)
            done()
        } else {
            console.error(res.request.uri.href)
            var $ = res.$;
            if (res.options.campaignPage) {
                parseCampaignPage(c, res).then(() => done()).catch(() => done())
            } else if (res.options.postPage) {
                parsePostPage(c, res).then(() => done()).catch(() => done())
            } else {
                console.error("Unknown page type")
                done()
            }
        }
    }
})

c.on('drain', () => {
    pageEmitter.emit('done')
})

pageEmitter.on('start', () => {
    const options = {
        url: roll20Url('/sessions/create'),
        form: {
            email: process.env.ROLL20_USERNAME,
            password: process.env.ROLL20_PASSWORD
        },
        jar: jar
    }

    request.post(options, (err, response, body) => {
        seen.initialize()
            .then(() => {
                c.queue({
                    uri: roll20Url('/campaigns/forum/1698225'),
                    campaignPage: true
                })
            })
            .catch(console.error)
    })
})
