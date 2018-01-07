import scrapy

class CampaignForumSpider(scrapy.Spider):
	name = "roll20"
	start_urls = [
		'https://app.roll20.net/campaigns/forum/1698225/',
	]

	def parse(self, response):
		non_stickies_found = 0
		for postlisting in response.css('div.postlisting'):
			post_url = postlisting.css('div.title a::attr("href")').extract_first()
			post_classes = postlisting.xpath("@class").extract_first()
			if "stickypost" not in post_classes:
				non_stickies_found = non_stickies_found + 1
			if post_url:
				yield response.follow(post_url, self.parse_post)
		next_url = response.css('div.nextpage a::attr("href")').extract_first()
		if next_url and non_stickies_found > 0:
			yield response.follow(next_url, self.parse)

	def parse_post(self, response):
		# Yield the page so we can keep track of tags.
		title = response.css('h1.posttitle::text').extract_first()
		yield {
			'id': response.url,
			'url': response.url,
			'title': title,
			'author': '',
			'body': ''
		}
		# Yield individual posts.
		for post in response.css('div.post'):
			post_id = post.xpath('@data-postid').extract_first()
			author = post.css('div.name a::text').extract_first().strip()
			body = post.css('div.postcontent::text').extract_first().strip()
			yield {
				'id': post_id,
				'url': ('https://app.roll20.net/forum/permalink/%s/' % post_id),
				'title': title,
				'author': author,
				'body': body
			}
		# Roll20 drops us onto the first page of a multi-page thread when not logged in.
		older = response.css('ul.pagination li.active ~ li a::attr("href")').extract_first()
		if older:
			yield response.follow(older, self.parse_post)