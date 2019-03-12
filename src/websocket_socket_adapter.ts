import {IContainer, IInstanceWrapper} from 'addict-ioc';
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

  private _container: IContainer<IInstanceWrapper<any>> = undefined;
  private _identityService: IIdentityService;
  private _httpServer: http.Server = undefined;
  private _socketServer: WebSocket.Server = undefined;
  private _defaultNamespace: IEndpointSocketScope = undefined;

  public config: any = undefined;

  constructor(container: IContainer<IInstanceWrapper<any>>, identityService: IIdentityService) {
    this._container = container;
    this._identityService = identityService;
  }

  public get container(): IContainer<IInstanceWrapper<any>> {
    return this._container;
  }

  public get httpServer(): http.Server {
    return this._httpServer;
  }

  public get defaultNamespace(): IEndpointSocketScope {
    return this._defaultNamespace;
  }

  public get identityService(): IIdentityService {
    return this._identityService;
  }

  public async initializeAdapter(httpServer: http.Server): Promise<void> {

    this._httpServer = httpServer;

    this._socketServer = new WebSocket.Server({
      server: this._httpServer,
      verifyClient: this._verifyClient.bind(this),
    });

    this._defaultNamespace = new EndpointSocketScope(undefined, this._socketServer);
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

    const identity: IIdentity = await this._identityService.getIdentity(jwtToken);
    info.req['identity'] = identity; // pass through identity to onConnect

    const handshakeSucceededStatusCode: number = 200;

    return done(true, handshakeSucceededStatusCode);
  }

  public async dispose(): Promise<void> {
    return;
  }

  public getNamespace(namespaceIdentifier: string): IEndpointSocketScope {
    return new EndpointSocketScope(namespaceIdentifier, this._socketServer);
  }

  public onConnect(callback: OnConnectCallback): void {
    this.defaultNamespace.onConnect(callback);
  }

  public emit<TMessage>(eventType: string, message: TMessage): void {
    this.defaultNamespace.emit(eventType, message);
  }
}
