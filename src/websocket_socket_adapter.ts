import * as http from 'http';
import {Logger} from 'loggerhythm';

import {IHttpSocketAdapter} from '@essential-projects/http_socket_adapter_contracts';
import {IIdentity, IIdentityService} from '@essential-projects/iam_contracts';
import {EndpointSocketScope} from '@essential-projects/websocket';
import {IEndpointSocketScope, OnConnectCallback} from '@essential-projects/websocket_contracts';

import * as WebSocket from 'ws';

const logger: Logger = Logger.createLogger('http:websocket_client');

interface VerifyClientCallback {
  (res: boolean, code?: number, message?: string, headers?: http.OutgoingHttpHeaders): void;
}

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: http.IncomingMessage;
}

export class WebsocketHttpSocketAdapter implements IHttpSocketAdapter, IEndpointSocketScope {

  private _identityService: IIdentityService;
  private _socketServer: WebSocket.Server = undefined;
  private _defaultNamespace: IEndpointSocketScope = undefined;

  public config: any = undefined;

  constructor(identityService: IIdentityService) {
    this._identityService = identityService;
  }

  private get socketServer(): WebSocket.Server {
    return this._socketServer;
  }

  private get defaultNamespace(): IEndpointSocketScope {
    return this._defaultNamespace;
  }

  private get identityService(): IIdentityService {
    return this._identityService;
  }

  public async initializeAdapter(httpServer: http.Server): Promise<void> {

    this._socketServer = new WebSocket.Server({
      server: httpServer,
      verifyClient: this._verifyClient.bind(this),
    });

    this.socketServer.on('connection', (socket: WebSocket, request: http.IncomingMessage) => {
      // This was removed in ws@3, so we need this to compensate.
      (socket as any).upgradeReq = request;
    });

    this._defaultNamespace = new EndpointSocketScope(undefined, this.socketServer);
  }

  public async dispose(): Promise<void> {
    this.socketServer.removeAllListeners();
    this.socketServer.close();
  }

  public getNamespace(namespaceIdentifier: string): IEndpointSocketScope {
    return new EndpointSocketScope(namespaceIdentifier, this.socketServer);
  }

  public onConnect(callback: OnConnectCallback): void {
    this.defaultNamespace.onConnect(callback);
  }

  public emit<TMessage>(eventType: string, message: TMessage): void {
    this.defaultNamespace.emit(eventType, message);
  }

  private async _verifyClient(info: VerifyClientInfo, done: VerifyClientCallback): Promise<void> {
    const bearerToken: string = info.req.headers['authorization'];
    const jwtToken: string = bearerToken.substr('Bearer '.length);

    const identityNotSet: boolean = jwtToken === undefined;
    if (identityNotSet) {
      logger.error('A WebSocket client attempted to connect without providing an Auth-Token!');

      const handshakeFailedStatusCode: number = 401;

      return done(false, handshakeFailedStatusCode, 'No auth token provided!');
    }

    const identity: IIdentity = await this.identityService.getIdentity(jwtToken);
    info.req['identity'] = identity; // pass through identity to onConnect

    const handshakeSucceededStatusCode: number = 200;

    return done(true, handshakeSucceededStatusCode);
  }
}
