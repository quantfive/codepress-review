"use strict";
exports.id = 872;
exports.ids = [872];
exports.modules = {

/***/ 6872:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AudioContentSchema: () => (/* binding */ AudioContentSchema),
/* harmony export */   BlobResourceContentsSchema: () => (/* binding */ BlobResourceContentsSchema),
/* harmony export */   CallToolRequestSchema: () => (/* binding */ CallToolRequestSchema),
/* harmony export */   CallToolResultSchema: () => (/* binding */ CallToolResultSchema),
/* harmony export */   CancelledNotificationSchema: () => (/* binding */ CancelledNotificationSchema),
/* harmony export */   ClientCapabilitiesSchema: () => (/* binding */ ClientCapabilitiesSchema),
/* harmony export */   ClientNotificationSchema: () => (/* binding */ ClientNotificationSchema),
/* harmony export */   ClientRequestSchema: () => (/* binding */ ClientRequestSchema),
/* harmony export */   ClientResultSchema: () => (/* binding */ ClientResultSchema),
/* harmony export */   CompatibilityCallToolResultSchema: () => (/* binding */ CompatibilityCallToolResultSchema),
/* harmony export */   CompleteRequestSchema: () => (/* binding */ CompleteRequestSchema),
/* harmony export */   CompleteResultSchema: () => (/* binding */ CompleteResultSchema),
/* harmony export */   CreateMessageRequestSchema: () => (/* binding */ CreateMessageRequestSchema),
/* harmony export */   CreateMessageResultSchema: () => (/* binding */ CreateMessageResultSchema),
/* harmony export */   CursorSchema: () => (/* binding */ CursorSchema),
/* harmony export */   EmbeddedResourceSchema: () => (/* binding */ EmbeddedResourceSchema),
/* harmony export */   EmptyResultSchema: () => (/* binding */ EmptyResultSchema),
/* harmony export */   ErrorCode: () => (/* binding */ ErrorCode),
/* harmony export */   GetPromptRequestSchema: () => (/* binding */ GetPromptRequestSchema),
/* harmony export */   GetPromptResultSchema: () => (/* binding */ GetPromptResultSchema),
/* harmony export */   ImageContentSchema: () => (/* binding */ ImageContentSchema),
/* harmony export */   ImplementationSchema: () => (/* binding */ ImplementationSchema),
/* harmony export */   InitializeRequestSchema: () => (/* binding */ InitializeRequestSchema),
/* harmony export */   InitializeResultSchema: () => (/* binding */ InitializeResultSchema),
/* harmony export */   InitializedNotificationSchema: () => (/* binding */ InitializedNotificationSchema),
/* harmony export */   JSONRPCErrorSchema: () => (/* binding */ JSONRPCErrorSchema),
/* harmony export */   JSONRPCMessageSchema: () => (/* binding */ JSONRPCMessageSchema),
/* harmony export */   JSONRPCNotificationSchema: () => (/* binding */ JSONRPCNotificationSchema),
/* harmony export */   JSONRPCRequestSchema: () => (/* binding */ JSONRPCRequestSchema),
/* harmony export */   JSONRPCResponseSchema: () => (/* binding */ JSONRPCResponseSchema),
/* harmony export */   JSONRPC_VERSION: () => (/* binding */ JSONRPC_VERSION),
/* harmony export */   LATEST_PROTOCOL_VERSION: () => (/* binding */ LATEST_PROTOCOL_VERSION),
/* harmony export */   ListPromptsRequestSchema: () => (/* binding */ ListPromptsRequestSchema),
/* harmony export */   ListPromptsResultSchema: () => (/* binding */ ListPromptsResultSchema),
/* harmony export */   ListResourceTemplatesRequestSchema: () => (/* binding */ ListResourceTemplatesRequestSchema),
/* harmony export */   ListResourceTemplatesResultSchema: () => (/* binding */ ListResourceTemplatesResultSchema),
/* harmony export */   ListResourcesRequestSchema: () => (/* binding */ ListResourcesRequestSchema),
/* harmony export */   ListResourcesResultSchema: () => (/* binding */ ListResourcesResultSchema),
/* harmony export */   ListRootsRequestSchema: () => (/* binding */ ListRootsRequestSchema),
/* harmony export */   ListRootsResultSchema: () => (/* binding */ ListRootsResultSchema),
/* harmony export */   ListToolsRequestSchema: () => (/* binding */ ListToolsRequestSchema),
/* harmony export */   ListToolsResultSchema: () => (/* binding */ ListToolsResultSchema),
/* harmony export */   LoggingLevelSchema: () => (/* binding */ LoggingLevelSchema),
/* harmony export */   LoggingMessageNotificationSchema: () => (/* binding */ LoggingMessageNotificationSchema),
/* harmony export */   McpError: () => (/* binding */ McpError),
/* harmony export */   ModelHintSchema: () => (/* binding */ ModelHintSchema),
/* harmony export */   ModelPreferencesSchema: () => (/* binding */ ModelPreferencesSchema),
/* harmony export */   NotificationSchema: () => (/* binding */ NotificationSchema),
/* harmony export */   PaginatedRequestSchema: () => (/* binding */ PaginatedRequestSchema),
/* harmony export */   PaginatedResultSchema: () => (/* binding */ PaginatedResultSchema),
/* harmony export */   PingRequestSchema: () => (/* binding */ PingRequestSchema),
/* harmony export */   ProgressNotificationSchema: () => (/* binding */ ProgressNotificationSchema),
/* harmony export */   ProgressSchema: () => (/* binding */ ProgressSchema),
/* harmony export */   ProgressTokenSchema: () => (/* binding */ ProgressTokenSchema),
/* harmony export */   PromptArgumentSchema: () => (/* binding */ PromptArgumentSchema),
/* harmony export */   PromptListChangedNotificationSchema: () => (/* binding */ PromptListChangedNotificationSchema),
/* harmony export */   PromptMessageSchema: () => (/* binding */ PromptMessageSchema),
/* harmony export */   PromptReferenceSchema: () => (/* binding */ PromptReferenceSchema),
/* harmony export */   PromptSchema: () => (/* binding */ PromptSchema),
/* harmony export */   ReadResourceRequestSchema: () => (/* binding */ ReadResourceRequestSchema),
/* harmony export */   ReadResourceResultSchema: () => (/* binding */ ReadResourceResultSchema),
/* harmony export */   RequestIdSchema: () => (/* binding */ RequestIdSchema),
/* harmony export */   RequestSchema: () => (/* binding */ RequestSchema),
/* harmony export */   ResourceContentsSchema: () => (/* binding */ ResourceContentsSchema),
/* harmony export */   ResourceListChangedNotificationSchema: () => (/* binding */ ResourceListChangedNotificationSchema),
/* harmony export */   ResourceReferenceSchema: () => (/* binding */ ResourceReferenceSchema),
/* harmony export */   ResourceSchema: () => (/* binding */ ResourceSchema),
/* harmony export */   ResourceTemplateSchema: () => (/* binding */ ResourceTemplateSchema),
/* harmony export */   ResourceUpdatedNotificationSchema: () => (/* binding */ ResourceUpdatedNotificationSchema),
/* harmony export */   ResultSchema: () => (/* binding */ ResultSchema),
/* harmony export */   RootSchema: () => (/* binding */ RootSchema),
/* harmony export */   RootsListChangedNotificationSchema: () => (/* binding */ RootsListChangedNotificationSchema),
/* harmony export */   SUPPORTED_PROTOCOL_VERSIONS: () => (/* binding */ SUPPORTED_PROTOCOL_VERSIONS),
/* harmony export */   SamplingMessageSchema: () => (/* binding */ SamplingMessageSchema),
/* harmony export */   ServerCapabilitiesSchema: () => (/* binding */ ServerCapabilitiesSchema),
/* harmony export */   ServerNotificationSchema: () => (/* binding */ ServerNotificationSchema),
/* harmony export */   ServerRequestSchema: () => (/* binding */ ServerRequestSchema),
/* harmony export */   ServerResultSchema: () => (/* binding */ ServerResultSchema),
/* harmony export */   SetLevelRequestSchema: () => (/* binding */ SetLevelRequestSchema),
/* harmony export */   SubscribeRequestSchema: () => (/* binding */ SubscribeRequestSchema),
/* harmony export */   TextContentSchema: () => (/* binding */ TextContentSchema),
/* harmony export */   TextResourceContentsSchema: () => (/* binding */ TextResourceContentsSchema),
/* harmony export */   ToolAnnotationsSchema: () => (/* binding */ ToolAnnotationsSchema),
/* harmony export */   ToolListChangedNotificationSchema: () => (/* binding */ ToolListChangedNotificationSchema),
/* harmony export */   ToolSchema: () => (/* binding */ ToolSchema),
/* harmony export */   UnsubscribeRequestSchema: () => (/* binding */ UnsubscribeRequestSchema),
/* harmony export */   isInitializeRequest: () => (/* binding */ isInitializeRequest),
/* harmony export */   isInitializedNotification: () => (/* binding */ isInitializedNotification),
/* harmony export */   isJSONRPCError: () => (/* binding */ isJSONRPCError),
/* harmony export */   isJSONRPCNotification: () => (/* binding */ isJSONRPCNotification),
/* harmony export */   isJSONRPCRequest: () => (/* binding */ isJSONRPCRequest),
/* harmony export */   isJSONRPCResponse: () => (/* binding */ isJSONRPCResponse)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9035);

const LATEST_PROTOCOL_VERSION = "2025-03-26";
const SUPPORTED_PROTOCOL_VERSIONS = [
    LATEST_PROTOCOL_VERSION,
    "2024-11-05",
    "2024-10-07",
];
/* JSON-RPC types */
const JSONRPC_VERSION = "2.0";
/**
 * A progress token, used to associate progress notifications with the original request.
 */
const ProgressTokenSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([zod__WEBPACK_IMPORTED_MODULE_0__.z.string(), zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()]);
/**
 * An opaque token used to represent a cursor for pagination.
 */
const CursorSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.string();
const RequestMetaSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(ProgressTokenSchema),
})
    .passthrough();
const BaseRequestParamsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    _meta: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(RequestMetaSchema),
})
    .passthrough();
const RequestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    params: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(BaseRequestParamsSchema),
});
const BaseNotificationParamsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * This parameter name is reserved by MCP to allow clients and servers to attach additional metadata to their notifications.
     */
    _meta: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
})
    .passthrough();
const NotificationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    params: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(BaseNotificationParamsSchema),
});
const ResultSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * This result property is reserved by the protocol to allow clients and servers to attach additional metadata to their responses.
     */
    _meta: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
})
    .passthrough();
/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
const RequestIdSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([zod__WEBPACK_IMPORTED_MODULE_0__.z.string(), zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()]);
/**
 * A request that expects a response.
 */
const JSONRPCRequestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    jsonrpc: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal(JSONRPC_VERSION),
    id: RequestIdSchema,
})
    .merge(RequestSchema)
    .strict();
const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
/**
 * A notification which does not expect a response.
 */
const JSONRPCNotificationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    jsonrpc: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal(JSONRPC_VERSION),
})
    .merge(NotificationSchema)
    .strict();
const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
/**
 * A successful (non-error) response to a request.
 */
const JSONRPCResponseSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    jsonrpc: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema,
})
    .strict();
const isJSONRPCResponse = (value) => JSONRPCResponseSchema.safeParse(value).success;
/**
 * Error codes defined by the JSON-RPC specification.
 */
var ErrorCode;
(function (ErrorCode) {
    // SDK error codes
    ErrorCode[ErrorCode["ConnectionClosed"] = -32000] = "ConnectionClosed";
    ErrorCode[ErrorCode["RequestTimeout"] = -32001] = "RequestTimeout";
    // Standard JSON-RPC error codes
    ErrorCode[ErrorCode["ParseError"] = -32700] = "ParseError";
    ErrorCode[ErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    ErrorCode[ErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    ErrorCode[ErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    ErrorCode[ErrorCode["InternalError"] = -32603] = "InternalError";
})(ErrorCode || (ErrorCode = {}));
/**
 * A response to a request that indicates an error occurred.
 */
const JSONRPCErrorSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    jsonrpc: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    error: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * The error type that occurred.
         */
        code: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int(),
        /**
         * A short description of the error. The message SHOULD be limited to a concise single sentence.
         */
        message: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        /**
         * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
         */
        data: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.unknown()),
    }),
})
    .strict();
const isJSONRPCError = (value) => JSONRPCErrorSchema.safeParse(value).success;
const JSONRPCMessageSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    JSONRPCRequestSchema,
    JSONRPCNotificationSchema,
    JSONRPCResponseSchema,
    JSONRPCErrorSchema,
]);
/* Empty result */
/**
 * A response that indicates success but carries no data.
 */
const EmptyResultSchema = ResultSchema.strict();
/* Cancellation */
/**
 * This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
 *
 * The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
 *
 * This notification indicates that the result will be unused, so any associated processing SHOULD cease.
 *
 * A client MUST NOT attempt to cancel its `initialize` request.
 */
const CancelledNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/cancelled"),
    params: BaseNotificationParamsSchema.extend({
        /**
         * The ID of the request to cancel.
         *
         * This MUST correspond to the ID of a request previously issued in the same direction.
         */
        requestId: RequestIdSchema,
        /**
         * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
         */
        reason: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
    }),
});
/* Initialization */
/**
 * Describes the name and version of an MCP implementation.
 */
const ImplementationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    version: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
 */
const ClientCapabilitiesSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * Experimental, non-standard capabilities that the client supports.
     */
    experimental: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
    /**
     * Present if the client supports sampling from an LLM.
     */
    sampling: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
    /**
     * Present if the client supports listing roots.
     */
    roots: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * Whether the client supports issuing notifications for changes to the roots list.
         */
        listChanged: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    })
        .passthrough()),
})
    .passthrough();
/**
 * This request is sent from the client to the server when it first connects, asking it to begin initialization.
 */
const InitializeRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("initialize"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
         */
        protocolVersion: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        capabilities: ClientCapabilitiesSchema,
        clientInfo: ImplementationSchema,
    }),
});
const isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
const ServerCapabilitiesSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    experimental: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
    /**
     * Present if the server supports sending log messages to the client.
     */
    logging: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
    /**
     * Present if the server supports sending completions to the client.
     */
    completions: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
    /**
     * Present if the server offers any prompt templates.
     */
    prompts: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * Whether this server supports issuing notifications for changes to the prompt list.
         */
        listChanged: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    })
        .passthrough()),
    /**
     * Present if the server offers any resources to read.
     */
    resources: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * Whether this server supports clients subscribing to resource updates.
         */
        subscribe: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
        /**
         * Whether this server supports issuing notifications for changes to the resource list.
         */
        listChanged: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    })
        .passthrough()),
    /**
     * Present if the server offers any tools to call.
     */
    tools: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * Whether this server supports issuing notifications for changes to the tool list.
         */
        listChanged: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    })
        .passthrough()),
})
    .passthrough();
/**
 * After receiving an initialize request from the client, the server sends this response.
 */
const InitializeResultSchema = ResultSchema.extend({
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    protocolVersion: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    instructions: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
});
/**
 * This notification is sent from the client to the server after initialization has finished.
 */
const InitializedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/initialized"),
});
const isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success;
/* Ping */
/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
const PingRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("ping"),
});
/* Progress notifications */
const ProgressSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number()),
    /**
     * An optional message describing the current progress.
     */
    message: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
})
    .passthrough();
/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 */
const ProgressNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/progress"),
    params: BaseNotificationParamsSchema.merge(ProgressSchema).extend({
        /**
         * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
         */
        progressToken: ProgressTokenSchema,
    }),
});
/* Pagination */
const PaginatedRequestSchema = RequestSchema.extend({
    params: BaseRequestParamsSchema.extend({
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        cursor: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(CursorSchema),
    }).optional(),
});
const PaginatedResultSchema = ResultSchema.extend({
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    nextCursor: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(CursorSchema),
});
/* Resources */
/**
 * The contents of a specific resource or sub-resource.
 */
const ResourceContentsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The URI of this resource.
     */
    uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
})
    .passthrough();
const TextResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
});
const BlobResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    blob: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().base64(),
});
/**
 * A known resource that the server is capable of reading.
 */
const ResourceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The URI of this resource.
     */
    uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A human-readable name for this resource.
     *
     * This can be used by clients to populate UI elements.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
})
    .passthrough();
/**
 * A template description for resources available on the server.
 */
const ResourceTemplateSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    uriTemplate: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A human-readable name for the type of resource this template refers to.
     *
     * This can be used by clients to populate UI elements.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    mimeType: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
})
    .passthrough();
/**
 * Sent from the client to request a list of resources the server has.
 */
const ListResourcesRequestSchema = PaginatedRequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resources/list"),
});
/**
 * The server's response to a resources/list request from the client.
 */
const ListResourcesResultSchema = PaginatedResultSchema.extend({
    resources: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(ResourceSchema),
});
/**
 * Sent from the client to request a list of resource templates the server has.
 */
const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resources/templates/list"),
});
/**
 * The server's response to a resources/templates/list request from the client.
 */
const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
    resourceTemplates: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(ResourceTemplateSchema),
});
/**
 * Sent from the client to the server, to read a specific resource URI.
 */
const ReadResourceRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resources/read"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
         */
        uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    }),
});
/**
 * The server's response to a resources/read request from the client.
 */
const ReadResourceResultSchema = ResultSchema.extend({
    contents: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.union([TextResourceContentsSchema, BlobResourceContentsSchema])),
});
/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
const ResourceListChangedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/resources/list_changed"),
});
/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
const SubscribeRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resources/subscribe"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
         */
        uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    }),
});
/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
const UnsubscribeRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resources/unsubscribe"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The URI of the resource to unsubscribe from.
         */
        uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    }),
});
/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/resources/updated"),
    params: BaseNotificationParamsSchema.extend({
        /**
         * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
         */
        uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    }),
});
/* Prompts */
/**
 * Describes an argument that a prompt can accept.
 */
const PromptArgumentSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The name of the argument.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A human-readable description of the argument.
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * Whether this argument must be provided.
     */
    required: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
})
    .passthrough();
/**
 * A prompt or prompt template that the server offers.
 */
const PromptSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The name of the prompt or prompt template.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * An optional description of what this prompt provides
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * A list of arguments to use for templating the prompt.
     */
    arguments: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.array(PromptArgumentSchema)),
})
    .passthrough();
/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
const ListPromptsRequestSchema = PaginatedRequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("prompts/list"),
});
/**
 * The server's response to a prompts/list request from the client.
 */
const ListPromptsResultSchema = PaginatedResultSchema.extend({
    prompts: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(PromptSchema),
});
/**
 * Used by the client to get a prompt provided by the server.
 */
const GetPromptRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("prompts/get"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The name of the prompt or prompt template.
         */
        name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        /**
         * Arguments to use for templating the prompt.
         */
        arguments: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string())),
    }),
});
/**
 * Text provided to or from an LLM.
 */
const TextContentSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("text"),
    /**
     * The text content of the message.
     */
    text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * An image provided to or from an LLM.
 */
const ImageContentSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("image"),
    /**
     * The base64-encoded image data.
     */
    data: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().base64(),
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    mimeType: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * An Audio provided to or from an LLM.
 */
const AudioContentSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("audio"),
    /**
     * The base64-encoded audio data.
     */
    data: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().base64(),
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    mimeType: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
const EmbeddedResourceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("resource"),
    resource: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
})
    .passthrough();
/**
 * Describes a message returned as part of a prompt.
 */
const PromptMessageSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    role: zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"](["user", "assistant"]),
    content: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
        TextContentSchema,
        ImageContentSchema,
        AudioContentSchema,
        EmbeddedResourceSchema,
    ]),
})
    .passthrough();
/**
 * The server's response to a prompts/get request from the client.
 */
const GetPromptResultSchema = ResultSchema.extend({
    /**
     * An optional description for the prompt.
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    messages: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(PromptMessageSchema),
});
/**
 * An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
const PromptListChangedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/prompts/list_changed"),
});
/* Tools */
/**
 * Additional properties describing a Tool to clients.
 *
 * NOTE: all properties in ToolAnnotations are **hints**.
 * They are not guaranteed to provide a faithful description of
 * tool behavior (including descriptive properties like `title`).
 *
 * Clients should never make tool use decisions based on ToolAnnotations
 * received from untrusted servers.
 */
const ToolAnnotationsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * A human-readable title for the tool.
     */
    title: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * If true, the tool does not modify its environment.
     *
     * Default: false
     */
    readOnlyHint: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    /**
     * If true, the tool may perform destructive updates to its environment.
     * If false, the tool performs only additive updates.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: true
     */
    destructiveHint: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    /**
     * If true, calling the tool repeatedly with the same arguments
     * will have no additional effect on the its environment.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: false
     */
    idempotentHint: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    /**
     * If true, this tool may interact with an "open world" of external
     * entities. If false, the tool's domain of interaction is closed.
     * For example, the world of a web search tool is open, whereas that
     * of a memory tool is not.
     *
     * Default: true
     */
    openWorldHint: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
})
    .passthrough();
/**
 * Definition for a tool the client can call.
 */
const ToolSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The name of the tool.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * A human-readable description of the tool.
     */
    description: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
    /**
     * A JSON Schema object defining the expected parameters for the tool.
     */
    inputSchema: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("object"),
        properties: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
        required: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string())),
    })
        .passthrough(),
    /**
     * An optional JSON Schema object defining the structure of the tool's output returned in
     * the structuredContent field of a CallToolResult.
     */
    outputSchema: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("object"),
        properties: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
        required: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string())),
    })
        .passthrough()),
    /**
     * Optional additional tool information.
     */
    annotations: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(ToolAnnotationsSchema),
})
    .passthrough();
/**
 * Sent from the client to request a list of tools the server has.
 */
const ListToolsRequestSchema = PaginatedRequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("tools/list"),
});
/**
 * The server's response to a tools/list request from the client.
 */
const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(ToolSchema),
});
/**
 * The server's response to a tool call.
 */
const CallToolResultSchema = ResultSchema.extend({
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    content: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
        TextContentSchema,
        ImageContentSchema,
        AudioContentSchema,
        EmbeddedResourceSchema,
    ])).default([]),
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    structuredContent: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough().optional(),
    /**
     * Whether the tool call ended in an error.
     *
     * If not set, this is assumed to be false (the call was successful).
     *
     * Any errors that originate from the tool SHOULD be reported inside the result
     * object, with `isError` set to true, _not_ as an MCP protocol-level error
     * response. Otherwise, the LLM would not be able to see that an error occurred
     * and self-correct.
     *
     * However, any errors in _finding_ the tool, an error indicating that the
     * server does not support tool calls, or any other exceptional conditions,
     * should be reported as an MCP error response.
     */
    isError: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
});
/**
 * CallToolResultSchema extended with backwards compatibility to protocol version 2024-10-07.
 */
const CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({
    toolResult: zod__WEBPACK_IMPORTED_MODULE_0__.z.unknown(),
}));
/**
 * Used by the client to invoke a tool provided by the server.
 */
const CallToolRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("tools/call"),
    params: BaseRequestParamsSchema.extend({
        name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        arguments: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.unknown())),
    }),
});
/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
const ToolListChangedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/tools/list_changed"),
});
/* Logging */
/**
 * The severity of a log message.
 */
const LoggingLevelSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"]([
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency",
]);
/**
 * A request from the client to the server, to enable or adjust logging.
 */
const SetLevelRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("logging/setLevel"),
    params: BaseRequestParamsSchema.extend({
        /**
         * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
         */
        level: LoggingLevelSchema,
    }),
});
/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
const LoggingMessageNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/message"),
    params: BaseNotificationParamsSchema.extend({
        /**
         * The severity of this log message.
         */
        level: LoggingLevelSchema,
        /**
         * An optional name of the logger issuing this message.
         */
        logger: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
        /**
         * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
         */
        data: zod__WEBPACK_IMPORTED_MODULE_0__.z.unknown(),
    }),
});
/* Sampling */
/**
 * Hints to use for model selection.
 */
const ModelHintSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * A hint for a model name.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
})
    .passthrough();
/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
const ModelPreferencesSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * Optional hints to use for model selection.
     */
    hints: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.array(ModelHintSchema)),
    /**
     * How much to prioritize cost when selecting a model.
     */
    costPriority: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().min(0).max(1)),
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    speedPriority: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().min(0).max(1)),
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    intelligencePriority: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().min(0).max(1)),
})
    .passthrough();
/**
 * Describes a message issued to or received from an LLM API.
 */
const SamplingMessageSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    role: zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"](["user", "assistant"]),
    content: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([TextContentSchema, ImageContentSchema, AudioContentSchema]),
})
    .passthrough();
/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
const CreateMessageRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("sampling/createMessage"),
    params: BaseRequestParamsSchema.extend({
        messages: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(SamplingMessageSchema),
        /**
         * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
         */
        systemPrompt: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
        /**
         * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
         */
        includeContext: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"](["none", "thisServer", "allServers"])),
        temperature: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number()),
        /**
         * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
         */
        maxTokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int(),
        stopSequences: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string())),
        /**
         * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
         */
        metadata: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.object({}).passthrough()),
        /**
         * The server's preferences for which model to select.
         */
        modelPreferences: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(ModelPreferencesSchema),
    }),
});
/**
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
const CreateMessageResultSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    /**
     * The reason why sampling stopped.
     */
    stopReason: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"](["endTurn", "stopSequence", "maxTokens"]).or(zod__WEBPACK_IMPORTED_MODULE_0__.z.string())),
    role: zod__WEBPACK_IMPORTED_MODULE_0__.z["enum"](["user", "assistant"]),
    content: zod__WEBPACK_IMPORTED_MODULE_0__.z.discriminatedUnion("type", [
        TextContentSchema,
        ImageContentSchema,
        AudioContentSchema
    ]),
});
/* Autocomplete */
/**
 * A reference to a resource or resource template definition.
 */
const ResourceReferenceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("ref/resource"),
    /**
     * The URI or URI template of the resource.
     */
    uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * Identifies a prompt.
 */
const PromptReferenceSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("ref/prompt"),
    /**
     * The name of the prompt or prompt template
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
})
    .passthrough();
/**
 * A request from the client to the server, to ask for completion options.
 */
const CompleteRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("completion/complete"),
    params: BaseRequestParamsSchema.extend({
        ref: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([PromptReferenceSchema, ResourceReferenceSchema]),
        /**
         * The argument's information
         */
        argument: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
            /**
             * The name of the argument
             */
            name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
            /**
             * The value of the argument to use for completion matching.
             */
            value: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        })
            .passthrough(),
    }),
});
/**
 * The server's response to a completion/complete request
 */
const CompleteResultSchema = ResultSchema.extend({
    completion: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        /**
         * An array of completion values. Must not exceed 100 items.
         */
        values: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).max(100),
        /**
         * The total number of completion options available. This can exceed the number of values actually sent in the response.
         */
        total: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()),
        /**
         * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
         */
        hasMore: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean()),
    })
        .passthrough(),
});
/* Roots */
/**
 * Represents a root directory or file that the server can operate on.
 */
const RootSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    uri: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().startsWith("file://"),
    /**
     * An optional name for the root.
     */
    name: zod__WEBPACK_IMPORTED_MODULE_0__.z.optional(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()),
})
    .passthrough();
/**
 * Sent from the server to request a list of root URIs from the client.
 */
const ListRootsRequestSchema = RequestSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("roots/list"),
});
/**
 * The client's response to a roots/list request from the server.
 */
const ListRootsResultSchema = ResultSchema.extend({
    roots: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(RootSchema),
});
/**
 * A notification from the client to the server, informing it that the list of roots has changed.
 */
const RootsListChangedNotificationSchema = NotificationSchema.extend({
    method: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("notifications/roots/list_changed"),
});
/* Client messages */
const ClientRequestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    PingRequestSchema,
    InitializeRequestSchema,
    CompleteRequestSchema,
    SetLevelRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    SubscribeRequestSchema,
    UnsubscribeRequestSchema,
    CallToolRequestSchema,
    ListToolsRequestSchema,
]);
const ClientNotificationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
]);
const ClientResultSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    EmptyResultSchema,
    CreateMessageResultSchema,
    ListRootsResultSchema,
]);
/* Server messages */
const ServerRequestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ListRootsRequestSchema,
]);
const ServerNotificationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
]);
const ServerResultSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([
    EmptyResultSchema,
    InitializeResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema,
]);
class McpError extends Error {
    constructor(code, message, data) {
        super(`MCP error ${code}: ${message}`);
        this.code = code;
        this.data = data;
        this.name = "McpError";
    }
}
//# sourceMappingURL=types.js.map

/***/ })

};
;