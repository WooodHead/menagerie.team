# menagerie.team

These are scripts to trawl our Roll20 campaign forums, generate a Lunr.js index file,
then publish the main site, a search page, and the index to AWS S3.
Anything in the `s3/` folder gets synced to http://menagerie.team/

You must have Python 2.7 and Node LTS installed.
Install prerequisites with `pip install -r requirements.txt` and `npm i`.
Your AWS credentials must be set up already, via `aws configure`.

To run:

1. `npm run clean`
2. `npm run fetch`
3. `npm run build`
4. `npm run deploy`

If you want to use this for your own Roll20 campaign,
update `krol.py` with the correct campaign URL,
and update `s3/index.html` to reflect your own game's web site.

You must periodically re-run the steps if you want newer forum posts to be indexed.
There is no automatic crawler or publishing system, it's all manual.
