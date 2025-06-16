"use strict";
exports.id = 601;
exports.ids = [601];
exports.modules = {

/***/ 2982:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  StreamableHTTPClientTransport: () => (/* binding */ StreamableHTTPClientTransport),
  StreamableHTTPError: () => (/* binding */ StreamableHTTPError)
});

// EXTERNAL MODULE: ./node_modules/.pnpm/@modelcontextprotocol+sdk@1.12.1/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
var types = __webpack_require__(6872);
;// CONCATENATED MODULE: ./node_modules/.pnpm/pkce-challenge@5.0.0/node_modules/pkce-challenge/dist/index.node.js
let index_node_crypto;
index_node_crypto =
    globalThis.crypto?.webcrypto ?? // Node.js [18-16] REPL
        globalThis.crypto ?? // Node.js >18
        Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 7598, 19)).then(m => m.webcrypto); // Node.js <18 Non-REPL
/**
 * Creates an array of length `size` of random bytes
 * @param size
 * @returns Array of random ints (0 to 255)
 */
async function getRandomValues(size) {
    return (await index_node_crypto).getRandomValues(new Uint8Array(size));
}
/** Generate cryptographically strong random string
 * @param size The desired length of the string
 * @returns The random string
 */
async function random(size) {
    const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
    let result = "";
    const randomUints = await getRandomValues(size);
    for (let i = 0; i < size; i++) {
        // cap the value of the randomIndex to mask.length - 1
        const randomIndex = randomUints[i] % mask.length;
        result += mask[randomIndex];
    }
    return result;
}
/** Generate a PKCE challenge verifier
 * @param length Length of the verifier
 * @returns A random verifier `length` characters long
 */
async function generateVerifier(length) {
    return await random(length);
}
/** Generate a PKCE code challenge from a code verifier
 * @param code_verifier
 * @returns The base64 url encoded code challenge
 */
async function generateChallenge(code_verifier) {
    const buffer = await (await index_node_crypto).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
    // Generate base64url string
    // btoa is deprecated in Node.js but is used here for web browser compatibility
    // (which has no good replacement yet, see also https://github.com/whatwg/html/issues/6811)
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=/g, '');
}
/** Generate a PKCE challenge pair
 * @param length Length of the verifer (between 43-128). Defaults to 43.
 * @returns PKCE challenge pair
 */
async function pkceChallenge(length) {
    if (!length)
        length = 43;
    if (length < 43 || length > 128) {
        throw `Expected a length between 43 and 128. Received ${length}.`;
    }
    const verifier = await generateVerifier(length);
    const challenge = await generateChallenge(verifier);
    return {
        code_verifier: verifier,
        code_challenge: challenge,
    };
}
/** Verify that a code_verifier produces the expected code challenge
 * @param code_verifier
 * @param expectedChallenge The code challenge to verify
 * @returns True if challenges are equal. False otherwise.
 */
async function verifyChallenge(code_verifier, expectedChallenge) {
    const actualChallenge = await generateChallenge(code_verifier);
    return actualChallenge === expectedChallenge;
}

// EXTERNAL MODULE: ./node_modules/.pnpm/zod@3.25.63/node_modules/zod/dist/esm/index.js + 9 modules
var esm = __webpack_require__(9035);
;// CONCATENATED MODULE: ./node_modules/.pnpm/@modelcontextprotocol+sdk@1.12.1/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/auth.js

/**
 * RFC 9728 OAuth Protected Resource Metadata
 */
const OAuthProtectedResourceMetadataSchema = esm.z.object({
    resource: esm.z.string().url(),
    authorization_servers: esm.z.array(esm.z.string().url()).optional(),
    jwks_uri: esm.z.string().url().optional(),
    scopes_supported: esm.z.array(esm.z.string()).optional(),
    bearer_methods_supported: esm.z.array(esm.z.string()).optional(),
    resource_signing_alg_values_supported: esm.z.array(esm.z.string()).optional(),
    resource_name: esm.z.string().optional(),
    resource_documentation: esm.z.string().optional(),
    resource_policy_uri: esm.z.string().url().optional(),
    resource_tos_uri: esm.z.string().url().optional(),
    tls_client_certificate_bound_access_tokens: esm.z.boolean().optional(),
    authorization_details_types_supported: esm.z.array(esm.z.string()).optional(),
    dpop_signing_alg_values_supported: esm.z.array(esm.z.string()).optional(),
    dpop_bound_access_tokens_required: esm.z.boolean().optional(),
})
    .passthrough();
/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata
 */
const OAuthMetadataSchema = esm.z.object({
    issuer: esm.z.string(),
    authorization_endpoint: esm.z.string(),
    token_endpoint: esm.z.string(),
    registration_endpoint: esm.z.string().optional(),
    scopes_supported: esm.z.array(esm.z.string()).optional(),
    response_types_supported: esm.z.array(esm.z.string()),
    response_modes_supported: esm.z.array(esm.z.string()).optional(),
    grant_types_supported: esm.z.array(esm.z.string()).optional(),
    token_endpoint_auth_methods_supported: esm.z.array(esm.z.string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: esm.z.array(esm.z.string())
        .optional(),
    service_documentation: esm.z.string().optional(),
    revocation_endpoint: esm.z.string().optional(),
    revocation_endpoint_auth_methods_supported: esm.z.array(esm.z.string()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: esm.z.array(esm.z.string())
        .optional(),
    introspection_endpoint: esm.z.string().optional(),
    introspection_endpoint_auth_methods_supported: esm.z.array(esm.z.string())
        .optional(),
    introspection_endpoint_auth_signing_alg_values_supported: esm.z.array(esm.z.string())
        .optional(),
    code_challenge_methods_supported: esm.z.array(esm.z.string()).optional(),
})
    .passthrough();
/**
 * OAuth 2.1 token response
 */
const OAuthTokensSchema = esm.z.object({
    access_token: esm.z.string(),
    token_type: esm.z.string(),
    expires_in: esm.z.number().optional(),
    scope: esm.z.string().optional(),
    refresh_token: esm.z.string().optional(),
})
    .strip();
/**
 * OAuth 2.1 error response
 */
const OAuthErrorResponseSchema = esm.z.object({
    error: esm.z.string(),
    error_description: esm.z.string().optional(),
    error_uri: esm.z.string().optional(),
});
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration metadata
 */
const OAuthClientMetadataSchema = esm.z.object({
    redirect_uris: esm.z.array(esm.z.string()).refine((uris) => uris.every((uri) => URL.canParse(uri)), { message: "redirect_uris must contain valid URLs" }),
    token_endpoint_auth_method: esm.z.string().optional(),
    grant_types: esm.z.array(esm.z.string()).optional(),
    response_types: esm.z.array(esm.z.string()).optional(),
    client_name: esm.z.string().optional(),
    client_uri: esm.z.string().optional(),
    logo_uri: esm.z.string().optional(),
    scope: esm.z.string().optional(),
    contacts: esm.z.array(esm.z.string()).optional(),
    tos_uri: esm.z.string().optional(),
    policy_uri: esm.z.string().optional(),
    jwks_uri: esm.z.string().optional(),
    jwks: esm.z.any().optional(),
    software_id: esm.z.string().optional(),
    software_version: esm.z.string().optional(),
}).strip();
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration client information
 */
const OAuthClientInformationSchema = esm.z.object({
    client_id: esm.z.string(),
    client_secret: esm.z.string().optional(),
    client_id_issued_at: esm.z.number().optional(),
    client_secret_expires_at: esm.z.number().optional(),
}).strip();
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration full response (client information plus metadata)
 */
const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration error response
 */
const OAuthClientRegistrationErrorSchema = esm.z.object({
    error: esm.z.string(),
    error_description: esm.z.string().optional(),
}).strip();
/**
 * RFC 7009 OAuth 2.0 Token Revocation request
 */
const OAuthTokenRevocationRequestSchema = esm.z.object({
    token: esm.z.string(),
    token_type_hint: esm.z.string().optional(),
}).strip();
//# sourceMappingURL=auth.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/@modelcontextprotocol+sdk@1.12.1/node_modules/@modelcontextprotocol/sdk/dist/esm/client/auth.js



class UnauthorizedError extends Error {
    constructor(message) {
        super(message !== null && message !== void 0 ? message : "Unauthorized");
    }
}
/**
 * Orchestrates the full auth flow with a server.
 *
 * This can be used as a single entry point for all authorization functionality,
 * instead of linking together the other lower-level functions in this module.
 */
async function auth(provider, { serverUrl, authorizationCode, scope, resourceMetadataUrl }) {
    let authorizationServerUrl = serverUrl;
    try {
        const resourceMetadata = await discoverOAuthProtectedResourceMetadata(resourceMetadataUrl || serverUrl);
        if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) {
            authorizationServerUrl = resourceMetadata.authorization_servers[0];
        }
    }
    catch (error) {
        console.warn("Could not load OAuth Protected Resource metadata, falling back to /.well-known/oauth-authorization-server", error);
    }
    const metadata = await discoverOAuthMetadata(authorizationServerUrl);
    // Handle client registration if needed
    let clientInformation = await Promise.resolve(provider.clientInformation());
    if (!clientInformation) {
        if (authorizationCode !== undefined) {
            throw new Error("Existing OAuth client information is required when exchanging an authorization code");
        }
        if (!provider.saveClientInformation) {
            throw new Error("OAuth client information must be saveable for dynamic registration");
        }
        const fullInformation = await registerClient(authorizationServerUrl, {
            metadata,
            clientMetadata: provider.clientMetadata,
        });
        await provider.saveClientInformation(fullInformation);
        clientInformation = fullInformation;
    }
    // Exchange authorization code for tokens
    if (authorizationCode !== undefined) {
        const codeVerifier = await provider.codeVerifier();
        const tokens = await exchangeAuthorization(authorizationServerUrl, {
            metadata,
            clientInformation,
            authorizationCode,
            codeVerifier,
            redirectUri: provider.redirectUrl,
        });
        await provider.saveTokens(tokens);
        return "AUTHORIZED";
    }
    const tokens = await provider.tokens();
    // Handle token refresh or new authorization
    if (tokens === null || tokens === void 0 ? void 0 : tokens.refresh_token) {
        try {
            // Attempt to refresh the token
            const newTokens = await refreshAuthorization(authorizationServerUrl, {
                metadata,
                clientInformation,
                refreshToken: tokens.refresh_token,
            });
            await provider.saveTokens(newTokens);
            return "AUTHORIZED";
        }
        catch (error) {
            console.error("Could not refresh OAuth tokens:", error);
        }
    }
    const state = provider.state ? await provider.state() : undefined;
    // Start new authorization flow
    const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        state,
        redirectUrl: provider.redirectUrl,
        scope: scope || provider.clientMetadata.scope,
    });
    await provider.saveCodeVerifier(codeVerifier);
    await provider.redirectToAuthorization(authorizationUrl);
    return "REDIRECT";
}
/**
 * Extract resource_metadata from response header.
 */
function extractResourceMetadataUrl(res) {
    const authenticateHeader = res.headers.get("WWW-Authenticate");
    if (!authenticateHeader) {
        return undefined;
    }
    const [type, scheme] = authenticateHeader.split(' ');
    if (type.toLowerCase() !== 'bearer' || !scheme) {
        console.log("Invalid WWW-Authenticate header format, expected 'Bearer'");
        return undefined;
    }
    const regex = /resource_metadata="([^"]*)"/;
    const match = regex.exec(authenticateHeader);
    if (!match) {
        return undefined;
    }
    try {
        return new URL(match[1]);
    }
    catch (_a) {
        console.log("Invalid resource metadata url: ", match[1]);
        return undefined;
    }
}
/**
 * Looks up RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 */
async function discoverOAuthProtectedResourceMetadata(serverUrl, opts) {
    var _a;
    let url;
    if (opts === null || opts === void 0 ? void 0 : opts.resourceMetadataUrl) {
        url = new URL(opts === null || opts === void 0 ? void 0 : opts.resourceMetadataUrl);
    }
    else {
        url = new URL("/.well-known/oauth-protected-resource", serverUrl);
    }
    let response;
    try {
        response = await fetch(url, {
            headers: {
                "MCP-Protocol-Version": (_a = opts === null || opts === void 0 ? void 0 : opts.protocolVersion) !== null && _a !== void 0 ? _a : types.LATEST_PROTOCOL_VERSION
            }
        });
    }
    catch (error) {
        // CORS errors come back as TypeError
        if (error instanceof TypeError) {
            response = await fetch(url);
        }
        else {
            throw error;
        }
    }
    if (response.status === 404) {
        throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`);
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
    }
    return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
/**
 * Looks up RFC 8414 OAuth 2.0 Authorization Server Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 */
async function discoverOAuthMetadata(authorizationServerUrl, opts) {
    var _a;
    const url = new URL("/.well-known/oauth-authorization-server", authorizationServerUrl);
    let response;
    try {
        response = await fetch(url, {
            headers: {
                "MCP-Protocol-Version": (_a = opts === null || opts === void 0 ? void 0 : opts.protocolVersion) !== null && _a !== void 0 ? _a : types.LATEST_PROTOCOL_VERSION
            }
        });
    }
    catch (error) {
        // CORS errors come back as TypeError
        if (error instanceof TypeError) {
            response = await fetch(url);
        }
        else {
            throw error;
        }
    }
    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} trying to load well-known OAuth metadata`);
    }
    return OAuthMetadataSchema.parse(await response.json());
}
/**
 * Begins the authorization flow with the given server, by generating a PKCE challenge and constructing the authorization URL.
 */
async function startAuthorization(authorizationServerUrl, { metadata, clientInformation, redirectUrl, scope, state, }) {
    const responseType = "code";
    const codeChallengeMethod = "S256";
    let authorizationUrl;
    if (metadata) {
        authorizationUrl = new URL(metadata.authorization_endpoint);
        if (!metadata.response_types_supported.includes(responseType)) {
            throw new Error(`Incompatible auth server: does not support response type ${responseType}`);
        }
        if (!metadata.code_challenge_methods_supported ||
            !metadata.code_challenge_methods_supported.includes(codeChallengeMethod)) {
            throw new Error(`Incompatible auth server: does not support code challenge method ${codeChallengeMethod}`);
        }
    }
    else {
        authorizationUrl = new URL("/authorize", authorizationServerUrl);
    }
    // Generate PKCE challenge
    const challenge = await pkceChallenge();
    const codeVerifier = challenge.code_verifier;
    const codeChallenge = challenge.code_challenge;
    authorizationUrl.searchParams.set("response_type", responseType);
    authorizationUrl.searchParams.set("client_id", clientInformation.client_id);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
    authorizationUrl.searchParams.set("redirect_uri", String(redirectUrl));
    if (state) {
        authorizationUrl.searchParams.set("state", state);
    }
    if (scope) {
        authorizationUrl.searchParams.set("scope", scope);
    }
    return { authorizationUrl, codeVerifier };
}
/**
 * Exchanges an authorization code for an access token with the given server.
 */
async function exchangeAuthorization(authorizationServerUrl, { metadata, clientInformation, authorizationCode, codeVerifier, redirectUri, }) {
    const grantType = "authorization_code";
    let tokenUrl;
    if (metadata) {
        tokenUrl = new URL(metadata.token_endpoint);
        if (metadata.grant_types_supported &&
            !metadata.grant_types_supported.includes(grantType)) {
            throw new Error(`Incompatible auth server: does not support grant type ${grantType}`);
        }
    }
    else {
        tokenUrl = new URL("/token", authorizationServerUrl);
    }
    // Exchange code for tokens
    const params = new URLSearchParams({
        grant_type: grantType,
        client_id: clientInformation.client_id,
        code: authorizationCode,
        code_verifier: codeVerifier,
        redirect_uri: String(redirectUri),
    });
    if (clientInformation.client_secret) {
        params.set("client_secret", clientInformation.client_secret);
    }
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });
    if (!response.ok) {
        throw new Error(`Token exchange failed: HTTP ${response.status}`);
    }
    return OAuthTokensSchema.parse(await response.json());
}
/**
 * Exchange a refresh token for an updated access token.
 */
async function refreshAuthorization(authorizationServerUrl, { metadata, clientInformation, refreshToken, }) {
    const grantType = "refresh_token";
    let tokenUrl;
    if (metadata) {
        tokenUrl = new URL(metadata.token_endpoint);
        if (metadata.grant_types_supported &&
            !metadata.grant_types_supported.includes(grantType)) {
            throw new Error(`Incompatible auth server: does not support grant type ${grantType}`);
        }
    }
    else {
        tokenUrl = new URL("/token", authorizationServerUrl);
    }
    // Exchange refresh token
    const params = new URLSearchParams({
        grant_type: grantType,
        client_id: clientInformation.client_id,
        refresh_token: refreshToken,
    });
    if (clientInformation.client_secret) {
        params.set("client_secret", clientInformation.client_secret);
    }
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });
    if (!response.ok) {
        throw new Error(`Token refresh failed: HTTP ${response.status}`);
    }
    return OAuthTokensSchema.parse({ refresh_token: refreshToken, ...(await response.json()) });
}
/**
 * Performs OAuth 2.0 Dynamic Client Registration according to RFC 7591.
 */
async function registerClient(authorizationServerUrl, { metadata, clientMetadata, }) {
    let registrationUrl;
    if (metadata) {
        if (!metadata.registration_endpoint) {
            throw new Error("Incompatible auth server: does not support dynamic client registration");
        }
        registrationUrl = new URL(metadata.registration_endpoint);
    }
    else {
        registrationUrl = new URL("/register", authorizationServerUrl);
    }
    const response = await fetch(registrationUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(clientMetadata),
    });
    if (!response.ok) {
        throw new Error(`Dynamic client registration failed: HTTP ${response.status}`);
    }
    return OAuthClientInformationFullSchema.parse(await response.json());
}
//# sourceMappingURL=auth.js.map
;// CONCATENATED MODULE: ./node_modules/.pnpm/eventsource-parser@3.0.2/node_modules/eventsource-parser/dist/index.js
class ParseError extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
}
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = !0, id, data = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = !1;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
      processField(field, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data.endsWith(`
`) ? data.slice(0, -1) : data
    }), id = void 0, data = "", eventType = "";
  }
  function reset(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = !0, id = void 0, data = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}

//# sourceMappingURL=index.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/eventsource-parser@3.0.2/node_modules/eventsource-parser/dist/stream.js


class EventSourceParserStream extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
}

//# sourceMappingURL=stream.js.map

;// CONCATENATED MODULE: ./node_modules/.pnpm/@modelcontextprotocol+sdk@1.12.1/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js



// Default reconnection options for StreamableHTTP connections
const DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
    initialReconnectionDelay: 1000,
    maxReconnectionDelay: 30000,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2,
};
class StreamableHTTPError extends Error {
    constructor(code, message) {
        super(`Streamable HTTP error: ${message}`);
        this.code = code;
    }
}
/**
 * Client transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It will connect to a server using HTTP POST for sending messages and HTTP GET with Server-Sent Events
 * for receiving messages.
 */
class StreamableHTTPClientTransport {
    constructor(url, opts) {
        var _a;
        this._url = url;
        this._resourceMetadataUrl = undefined;
        this._requestInit = opts === null || opts === void 0 ? void 0 : opts.requestInit;
        this._authProvider = opts === null || opts === void 0 ? void 0 : opts.authProvider;
        this._sessionId = opts === null || opts === void 0 ? void 0 : opts.sessionId;
        this._reconnectionOptions = (_a = opts === null || opts === void 0 ? void 0 : opts.reconnectionOptions) !== null && _a !== void 0 ? _a : DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
    }
    async _authThenStart() {
        var _a;
        if (!this._authProvider) {
            throw new UnauthorizedError("No auth provider");
        }
        let result;
        try {
            result = await auth(this._authProvider, { serverUrl: this._url, resourceMetadataUrl: this._resourceMetadataUrl });
        }
        catch (error) {
            (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
            throw error;
        }
        if (result !== "AUTHORIZED") {
            throw new UnauthorizedError();
        }
        return await this._startOrAuthSse({ resumptionToken: undefined });
    }
    async _commonHeaders() {
        var _a;
        const headers = {};
        if (this._authProvider) {
            const tokens = await this._authProvider.tokens();
            if (tokens) {
                headers["Authorization"] = `Bearer ${tokens.access_token}`;
            }
        }
        if (this._sessionId) {
            headers["mcp-session-id"] = this._sessionId;
        }
        return new Headers({ ...headers, ...(_a = this._requestInit) === null || _a === void 0 ? void 0 : _a.headers });
    }
    async _startOrAuthSse(options) {
        var _a, _b;
        const { resumptionToken } = options;
        try {
            // Try to open an initial SSE stream with GET to listen for server messages
            // This is optional according to the spec - server may not support it
            const headers = await this._commonHeaders();
            headers.set("Accept", "text/event-stream");
            // Include Last-Event-ID header for resumable streams if provided
            if (resumptionToken) {
                headers.set("last-event-id", resumptionToken);
            }
            const response = await fetch(this._url, {
                method: "GET",
                headers,
                signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal,
            });
            if (!response.ok) {
                if (response.status === 401 && this._authProvider) {
                    // Need to authenticate
                    return await this._authThenStart();
                }
                // 405 indicates that the server does not offer an SSE stream at GET endpoint
                // This is an expected case that should not trigger an error
                if (response.status === 405) {
                    return;
                }
                throw new StreamableHTTPError(response.status, `Failed to open SSE stream: ${response.statusText}`);
            }
            this._handleSseStream(response.body, options);
        }
        catch (error) {
            (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
            throw error;
        }
    }
    /**
     * Calculates the next reconnection delay using  backoff algorithm
     *
     * @param attempt Current reconnection attempt count for the specific stream
     * @returns Time to wait in milliseconds before next reconnection attempt
     */
    _getNextReconnectionDelay(attempt) {
        // Access default values directly, ensuring they're never undefined
        const initialDelay = this._reconnectionOptions.initialReconnectionDelay;
        const growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
        const maxDelay = this._reconnectionOptions.maxReconnectionDelay;
        // Cap at maximum delay
        return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
    }
    /**
     * Schedule a reconnection attempt with exponential backoff
     *
     * @param lastEventId The ID of the last received event for resumability
     * @param attemptCount Current reconnection attempt count for this specific stream
     */
    _scheduleReconnection(options, attemptCount = 0) {
        var _a;
        // Use provided options or default options
        const maxRetries = this._reconnectionOptions.maxRetries;
        // Check if we've exceeded maximum retry attempts
        if (maxRetries > 0 && attemptCount >= maxRetries) {
            (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, new Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
            return;
        }
        // Calculate next delay based on current attempt count
        const delay = this._getNextReconnectionDelay(attemptCount);
        // Schedule the reconnection
        setTimeout(() => {
            // Use the last event ID to resume where we left off
            this._startOrAuthSse(options).catch(error => {
                var _a;
                (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, new Error(`Failed to reconnect SSE stream: ${error instanceof Error ? error.message : String(error)}`));
                // Schedule another attempt if this one failed, incrementing the attempt counter
                this._scheduleReconnection(options, attemptCount + 1);
            });
        }, delay);
    }
    _handleSseStream(stream, options) {
        if (!stream) {
            return;
        }
        const { onresumptiontoken, replayMessageId } = options;
        let lastEventId;
        const processStream = async () => {
            var _a, _b, _c, _d;
            // this is the closest we can get to trying to catch network errors
            // if something happens reader will throw
            try {
                // Create a pipeline: binary stream -> text decoder -> SSE parser
                const reader = stream
                    .pipeThrough(new TextDecoderStream())
                    .pipeThrough(new EventSourceParserStream())
                    .getReader();
                while (true) {
                    const { value: event, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    // Update last event ID if provided
                    if (event.id) {
                        lastEventId = event.id;
                        onresumptiontoken === null || onresumptiontoken === void 0 ? void 0 : onresumptiontoken(event.id);
                    }
                    if (!event.event || event.event === "message") {
                        try {
                            const message = types.JSONRPCMessageSchema.parse(JSON.parse(event.data));
                            if (replayMessageId !== undefined && (0,types.isJSONRPCResponse)(message)) {
                                message.id = replayMessageId;
                            }
                            (_a = this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, message);
                        }
                        catch (error) {
                            (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
                        }
                    }
                }
            }
            catch (error) {
                // Handle stream errors - likely a network disconnect
                (_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, new Error(`SSE stream disconnected: ${error}`));
                // Attempt to reconnect if the stream disconnects unexpectedly and we aren't closing
                if (this._abortController && !this._abortController.signal.aborted) {
                    // Use the exponential backoff reconnection strategy
                    if (lastEventId !== undefined) {
                        try {
                            this._scheduleReconnection({
                                resumptionToken: lastEventId,
                                onresumptiontoken,
                                replayMessageId
                            }, 0);
                        }
                        catch (error) {
                            (_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, new Error(`Failed to reconnect: ${error instanceof Error ? error.message : String(error)}`));
                        }
                    }
                }
            }
        };
        processStream();
    }
    async start() {
        if (this._abortController) {
            throw new Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
        }
        this._abortController = new AbortController();
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
        if (!this._authProvider) {
            throw new UnauthorizedError("No auth provider");
        }
        const result = await auth(this._authProvider, { serverUrl: this._url, authorizationCode, resourceMetadataUrl: this._resourceMetadataUrl });
        if (result !== "AUTHORIZED") {
            throw new UnauthorizedError("Failed to authorize");
        }
    }
    async close() {
        var _a, _b;
        // Abort any pending requests
        (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort();
        (_b = this.onclose) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    async send(message, options) {
        var _a, _b, _c;
        try {
            const { resumptionToken, onresumptiontoken } = options || {};
            if (resumptionToken) {
                // If we have at last event ID, we need to reconnect the SSE stream
                this._startOrAuthSse({ resumptionToken, replayMessageId: (0,types.isJSONRPCRequest)(message) ? message.id : undefined }).catch(err => { var _a; return (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, err); });
                return;
            }
            const headers = await this._commonHeaders();
            headers.set("content-type", "application/json");
            headers.set("accept", "application/json, text/event-stream");
            const init = {
                ...this._requestInit,
                method: "POST",
                headers,
                body: JSON.stringify(message),
                signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal,
            };
            const response = await fetch(this._url, init);
            // Handle session ID received during initialization
            const sessionId = response.headers.get("mcp-session-id");
            if (sessionId) {
                this._sessionId = sessionId;
            }
            if (!response.ok) {
                if (response.status === 401 && this._authProvider) {
                    this._resourceMetadataUrl = extractResourceMetadataUrl(response);
                    const result = await auth(this._authProvider, { serverUrl: this._url, resourceMetadataUrl: this._resourceMetadataUrl });
                    if (result !== "AUTHORIZED") {
                        throw new UnauthorizedError();
                    }
                    // Purposely _not_ awaited, so we don't call onerror twice
                    return this.send(message);
                }
                const text = await response.text().catch(() => null);
                throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
            }
            // If the response is 202 Accepted, there's no body to process
            if (response.status === 202) {
                // if the accepted notification is initialized, we start the SSE stream
                // if it's supported by the server
                if ((0,types.isInitializedNotification)(message)) {
                    // Start without a lastEventId since this is a fresh connection
                    this._startOrAuthSse({ resumptionToken: undefined }).catch(err => { var _a; return (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, err); });
                }
                return;
            }
            // Get original message(s) for detecting request IDs
            const messages = Array.isArray(message) ? message : [message];
            const hasRequests = messages.filter(msg => "method" in msg && "id" in msg && msg.id !== undefined).length > 0;
            // Check the response type
            const contentType = response.headers.get("content-type");
            if (hasRequests) {
                if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("text/event-stream")) {
                    // Handle SSE stream responses for requests
                    // We use the same handler as standalone streams, which now supports
                    // reconnection with the last event ID
                    this._handleSseStream(response.body, { onresumptiontoken });
                }
                else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/json")) {
                    // For non-streaming servers, we might get direct JSON responses
                    const data = await response.json();
                    const responseMessages = Array.isArray(data)
                        ? data.map(msg => types.JSONRPCMessageSchema.parse(msg))
                        : [types.JSONRPCMessageSchema.parse(data)];
                    for (const msg of responseMessages) {
                        (_b = this.onmessage) === null || _b === void 0 ? void 0 : _b.call(this, msg);
                    }
                }
                else {
                    throw new StreamableHTTPError(-1, `Unexpected content type: ${contentType}`);
                }
            }
        }
        catch (error) {
            (_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, error);
            throw error;
        }
    }
    get sessionId() {
        return this._sessionId;
    }
    /**
     * Terminates the current session by sending a DELETE request to the server.
     *
     * Clients that no longer need a particular session
     * (e.g., because the user is leaving the client application) SHOULD send an
     * HTTP DELETE to the MCP endpoint with the Mcp-Session-Id header to explicitly
     * terminate the session.
     *
     * The server MAY respond with HTTP 405 Method Not Allowed, indicating that
     * the server does not allow clients to terminate sessions.
     */
    async terminateSession() {
        var _a, _b;
        if (!this._sessionId) {
            return; // No session to terminate
        }
        try {
            const headers = await this._commonHeaders();
            const init = {
                ...this._requestInit,
                method: "DELETE",
                headers,
                signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal,
            };
            const response = await fetch(this._url, init);
            // We specifically handle 405 as a valid response according to the spec,
            // meaning the server does not support explicit session termination
            if (!response.ok && response.status !== 405) {
                throw new StreamableHTTPError(response.status, `Failed to terminate session: ${response.statusText}`);
            }
            this._sessionId = undefined;
        }
        catch (error) {
            (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
            throw error;
        }
    }
}
//# sourceMappingURL=streamableHttp.js.map

/***/ })

};
;