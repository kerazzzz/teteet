/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as chats from "../chats.js";
import type * as compare from "../compare.js";
import type * as documents from "../documents.js";
import type * as documentsInternal from "../documentsInternal.js";
import type * as financing from "../financing.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_documents from "../lib/documents.js";
import type * as lib_time from "../lib/time.js";
import type * as news from "../news.js";
import type * as payments from "../payments.js";
import type * as pricing from "../pricing.js";
import type * as reviews from "../reviews.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  chats: typeof chats;
  compare: typeof compare;
  documents: typeof documents;
  documentsInternal: typeof documentsInternal;
  financing: typeof financing;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/documents": typeof lib_documents;
  "lib/time": typeof lib_time;
  news: typeof news;
  payments: typeof payments;
  pricing: typeof pricing;
  reviews: typeof reviews;
  search: typeof search;
  seed: typeof seed;
  transactions: typeof transactions;
  users: typeof users;
  vehicles: typeof vehicles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
