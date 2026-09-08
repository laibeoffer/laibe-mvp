type EdgeHandler = (request: Request) => Response | Promise<Response>;

export function withEdgeRequestBoundary(slug: string, handler: EdgeHandler) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw new Error("Invalid function slug");
  }
  const gatewayPath = "/" + slug;
  const canonicalPath = "/functions/v1/" + slug;
  return (request: Request): Response | Promise<Response> => {
    const url = new URL(request.url);
    if (
      request.url.includes("?") || url.hash ||
      (url.pathname !== gatewayPath && url.pathname !== canonicalPath)
    ) {
      return Response.json({ state: "INVALID_REQUEST" }, {
        status: 400,
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (url.pathname === canonicalPath) return handler(request);
    url.pathname = canonicalPath;
    return handler(new Request(url, request));
  };
}
