require('dotenv').config()
const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const APP_PORT = process.env.PORT || 3000
var certOptions = {
  key: fs.readFileSync(path.resolve('../ssl/server.key')),
  cert: fs.readFileSync(path.resolve('../ssl/server.crt'))
}

// Prevents cross-frame clickjacking attacks from external websites
const securityHeaderMiddleware = (req, res, next) => {
  res.setHeader('Content-Security-Policy', 'default-src: https: "unsafe-inline"')
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.originalUrl.startsWith('/popup')) {
    // skip any /popup routes for x-frame-options for it to function properly
    next()
    return
  }
  res.setHeader('X-Frame-Options', 'sameorigin')
  next()
}

app.use(securityHeaderMiddleware)

app.use(express.static('dist'))

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/dist/index.html'))
})

app.use(express.static('public'))

https.createServer(certOptions, app).listen(APP_PORT)
console.log('listening to port ' + APP_PORT)

if (process.env.NODE_ENV === 'production') {
  var redirectApp = express()
  redirectApp.get('*', (req, res) => {
    res.redirect(301, 'https://tor.us')
  })
  console.log('listening to port 80')
  http.createServer(redirectApp).listen(80)
}
