/**
 * Dare Game (challenges, submissions and stories) — public server entry point.
 *
 * Server helpers and pure rules used by API routes and server pages. Never import this
 * from a client component. Everything else in features/dare-game/ is internal.
 */

export { getChallengeById, isValidVisibility } from "./lib/challenges";
