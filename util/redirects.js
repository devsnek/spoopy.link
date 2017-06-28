const http = require('http');
const https = require('https');
const URL = require('./url');
const Constants = require('../Constants');
const metaRefresh = require('./meta_refresh');

function redirects(url, last) {
  if (!new URL(url)) return Promise.reject(new Error('invalid url'));
  if (!last) {
    last = {};
    last.promise = Promise.create();
    last.urls = [];
  }
  last.urls.push(url);

  if (last.urls.length > Constants.MAX_REDIRECTS) {
    last.promise.resolve(last.urls);
  } else {
    try {
      const request = (url.startsWith('https') ? https : http).get(url, (res) => {
        if ([300, 301, 302, 303].includes(res.statusCode)) {
          const newURL = /^https?:\/\//i.test(res.headers.location) ?
            res.headers.location :
            URL.resolve(url, res.headers.location);
          redirects(newURL, last);
        } else {
          let done = false;

          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));

          const finish = () => {
            last.promise.resolve(last.urls);
            done = true;
          };
          const timeout = setTimeout(finish, 750);

          res.on('end', () => {
            if (done) return;
            clearTimeout(timeout);
            const meta = metaRefresh(Buffer.concat(chunks).toString());
            if (meta && meta.url) {
              redirects(meta.url, last);
            } else {
              finish();
            }
          });
        }
      });
      request.on('error', (err) => {
        last.promise.reject(err);
      });
    } catch (err) {
      console.error('INVALID URL', url);
      last.promise.reject(err);
    }
  }

  return last.promise;
}

module.exports = redirects;
