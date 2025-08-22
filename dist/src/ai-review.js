#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const config_1 = require("./config");
const review_service_1 = require("./review-service");
const debug_1 = require("./debug");
async function main() {
    try {
        const config = (0, config_1.getReviewConfig)();
        (0, debug_1.setDebugMode)(config.debug);
        const reviewService = new review_service_1.ReviewService(config);
        await reviewService.execute();
    }
    catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=ai-review.js.map