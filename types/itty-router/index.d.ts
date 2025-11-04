declare module "itty-router" {
  export type RouterHandler<
    RequestType = Request,
    Params extends unknown[] = [],
    ReturnType = Response,
  > = (request: RequestType, ...params: Params) => ReturnType | Promise<ReturnType>;

  export interface RouterType<
    RequestType = Request,
    Params extends unknown[] = [],
    ReturnType = Response,
  > {
    get(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    post(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    put(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    patch(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    delete(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    all(path: string, handler: RouterHandler<RequestType, Params, ReturnType>): RouterType<RequestType, Params, ReturnType>;
    handle(request: RequestType, ...params: Params): Promise<ReturnType> | ReturnType;
    fetch(request: RequestType, ...params: unknown[]): Promise<ReturnType> | ReturnType;
  }

  export function Router<
    RequestType = Request,
    Params extends unknown[] = [],
    ReturnType = Response,
  >(): RouterType<RequestType, Params, ReturnType>;
}
