'use strict';

const WebsocketHttpSocketAdapter = require('./dist/commonjs/index').WebsocketHttpSocketAdapter;

function registerInContainer(container) {

  container.register('WebsocketHttpSocketAdapter', WebsocketHttpSocketAdapter)
    .dependencies('container', 'IdentityService')
    .configure('http:http_extension')
    .singleton();
}

module.exports.registerInContainer = registerInContainer;
