const Crawler = require("crawler")
const EventEmitter = require('events')
const fs = require('fs')
const request = require('request')
const { URL } = require('url')

const jar = request.jar()

const roll20Url = (urlFragment) => {
    return new URL(urlFragment, 'https://app.roll20.net').toString()
}

const pageEmitter = new EventEmitter()

module.exports = pageEmitter

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
    pageEmitter.emit('document', {
        id: url,
        url,
        title,
        author: '',
        body: ''
    })

    $('div.post').each((i, e) => {
        var postId = $(e).attr('data-postid')
        var author = $('div.name a', e).text().trim()
        var body = $('div.postcontent', e).text().trim()
        var permalink = roll20Url(`/forum/permalink/${postId}`)
        pageEmitter.emit('document', {
            id: postId,
            url: permalink,
            title,
            author,
            body
        })
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
