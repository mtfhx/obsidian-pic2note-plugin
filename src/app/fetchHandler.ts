import { requestUrl } from "obsidian";

export async function requestUrlFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : undefined;
  const headers = mergeHeaders(request?.headers, init?.headers);
  const body = await getRequestBody(request, init);
  const response = await requestUrl({
    url: getRequestUrl(input, request),
    method: init?.method ?? request?.method ?? "GET",
    headers,
    body,
    throw: false,
  });

  return new Response(response.arrayBuffer, {
    status: response.status,
    headers: response.headers,
  });
}

function getRequestUrl(input: string | URL | Request, request: Request | undefined): string {
  if (request) {
    return request.url;
  }

  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function mergeHeaders(...headersList: Array<HeadersInit | undefined>): Record<string, string> {
  const headers = new Headers();
  const result: Record<string, string> = {};

  for (const headersInit of headersList) {
    if (!headersInit) {
      continue;
    }

    new Headers(headersInit).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

async function getRequestBody(request: Request | undefined, init: RequestInit | undefined): Promise<string | ArrayBuffer | undefined> {
  if (init?.body) {
    return bodyToRequestUrlBody(init.body);
  }

  if (request && request.method !== "GET" && request.method !== "HEAD") {
    return request.clone().text();
  }

  return undefined;
}

async function bodyToRequestUrlBody(body: BodyInit): Promise<string | ArrayBuffer> {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return body;
  }

  if (body instanceof Blob) {
    return body.arrayBuffer();
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  throw new Error("Unsupported request body type.");
}

