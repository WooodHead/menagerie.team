const Crawler = require("crawler")
const EventEmitter = require('events')
const fs = require('fs')
const moment = require('moment')
const { or, reject } = require('ramda')
const request = require('request')
const { URL } = require('url')

const jar = request.jar()

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

const parseCampaignPage = (c, res) => {
    var $ = res.$
    var nonStickyPosts = 0

    $('div.postlisting').each((i, e) => {
        var postUrl = $('div.title a', e).attr('href').trim()
        if (!$(e).hasClass('stickypost')) {
            nonStickyPosts = nonStickyPosts + 1
        }
        c.queue({
            uri: roll20Url(postUrl),
            postPage: true
        })
    })

    if (nonStickyPosts > 0) {
        // We care about pagination after all
        var nextPageUrl = $('div.nextpage a').attr('href')
        if (nextPageUrl) {
            c.queue({
                uri: roll20Url(nextPageUrl),
                campaignPage: true
            })
        }
    }
}

const parsePostPage = (c, res) => {
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

        $('script', e).each((i, e) => {
            var scriptText = $(e).text()
            var m
            if ((m = scriptText.match(scriptRegexp))) {
                var htmlBody = Buffer.from(m[2], 'base64').toString()
                var htmlE = $('<div>').html(htmlBody)
                if (htmlE.has('img').length > 0) {
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
            body
        })
        pageTags = []
    })

    var olderUrl = $('div.postnav ul.pagination li:not(.active) a')
    if (olderUrl && olderUrl.attr('href')) {
        c.queue({
            uri: roll20Url(olderUrl.attr('href')),
            postPage: true
        })
    }
}

var c = new Crawler({
    maxConnections: 8,
    skipDuplicates: true,   // TODO: migrate to seenreq
    preRequest: (options, done) => {
        options.jar = jar
        done()
    },
    callback: (error, res, done) => {
        if (error) {
            console.error(error)
        } else {
            console.error(res.request.uri.href)
            var $ = res.$;
            if (res.options.campaignPage) {
                parseCampaignPage(c, res)
            } else if (res.options.postPage) {
                parsePostPage(c, res)
            } else {
                console.error("Unknown page type")
            }
        }
        done()
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
    
    request.post(options, (err, res, body) => {
        c.queue({
            uri: roll20Url('/campaigns/forum/1698225'),
            campaignPage: true
        })
    })
})
