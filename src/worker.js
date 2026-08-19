const ROUTE_PATH = "/y2k-type-lab";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === ROUTE_PATH) {
      url.pathname = `${ROUTE_PATH}/`;
      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};
