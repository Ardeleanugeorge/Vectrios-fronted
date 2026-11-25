/**
 * The size of the benchmark, in words, for every page that mentions it.
 *
 * One place, so the pages cannot disagree with each other. It must stay true
 * for the current benchmark generation: 497 sites (2026-11-25-c7-page-roles).
 * The exact live number is shown on the landing page from the API
 * (/public/index-stats -> benchmark_sites), which counts that generation.
 * When a new generation changes the count, change this line with it.
 */
export const BENCHMARK_SIZE = "nearly 500"
