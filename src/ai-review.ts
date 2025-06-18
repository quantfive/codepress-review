#!/usr/bin/env node
import { getReviewConfig } from "./config";
import { ReviewService } from "./review-service";
import { setDebugMode } from "./debug";

export async function main() {
  try {
    const config = getReviewConfig();
    setDebugMode(config.debug);
    const reviewService = new ReviewService(config);
    await reviewService.execute();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
