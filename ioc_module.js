'use strict';

const WebsocketHttpSocketAdapter = require('./dist/commonjs/index').WebsocketHttpSocketAdapter;
const socketAdapterDiscoveryTag = require('@essential-projects/http_contracts').socketAdapterDiscoveryTag;

function registerInContainer(container) {

  container.register('WebsocketHttpSocketAdapter', WebsocketHttpSocketAdapter)
    .dependencies('container', 'IdentityService')
    .configure('http:http_extension')
    .singleton()
    .tags(socketAdapterDiscoveryTag);
}

module.exports.registerInContainer = registerInContainer;
