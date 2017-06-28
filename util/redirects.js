const http = require('http');
const https = require('https');
const URL = require('./url');
const { createPromise, promiseResolve, promiseReject } = process.binding('util');
const Constants = require('../Constants');

function redirects(url, last) {
  if (!new URL(url)) return Promise.reject(new Error('invalid url'));
  if (!last) {
    last = {};
    last.promise = createPromise();
    last.urls = [];
  }
  last.urls.push(url);

  if (last.urls.length > Constants.MAX_REDIRECTS) {
    promiseResolve(last.promise, last.urls);
  } else {
    try {
      const request = (url.startsWith('https') ? https : http).get(url, (res) => {
        if ([300, 301, 302, 303].includes(res.statusCode)) {
          const newURL = /^https?:\/\//i.test(res.headers.location) ?
            res.headers.location :
            URL.resolve(url, res.headers.location);
          redirects(newURL, last);
        } else {
          promiseResolve(last.promise, last.urls);
        }
      });
      request.on('error', (err) => {
        promiseReject(last.promise, err);
      });
    } catch (err) {
      console.error('INVALID URL', url);
      promiseReject(last.promise, err);
    }
  }

  return last.promise;
}

module.exports = redirects;
