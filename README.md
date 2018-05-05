# menagerie.team

These are scripts to trawl our Roll20 campaign forums, generate a Lunr.js index file,
then publish the main site, a search page, and the index to AWS S3.
Anything in the `s3/` folder gets synced to http://menagerie.team/

You must have Node LTS installed.
Install prerequisites with `npm i`.
Your AWS credentials must be set up already, via `aws configure`.

To run: `node index.js`.
You must set environment variables `ROLL20_USERNAME` and `ROLL20_PASSWORD`.

You must periodically re-run the steps if you want newer forum posts to be indexed.
There is no automatic crawler or publishing system, it's all manual.
