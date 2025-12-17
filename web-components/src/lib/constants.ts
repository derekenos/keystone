import { CollectionType, ProcessingState } from "./types";

// SURTs can either be either a prefix:
//   com,example            (would match example*.com and all related subdomains)
//   com,example,           (would match example.com and all subdomains)
// or fully qualified:
//   com,example,)/         (would match example.com/* and NO subdomains)
//   com,example,)/products (would match example.com/products* and NO subdomains)
const ValidLabelChars = "[a-zA-Z0-9\\-]";
const SurtDomain = `(?<domain>(${ValidLabelChars}+,)+(${ValidLabelChars}+))`;
export const SurtPrefixRegex = new RegExp(`^${SurtDomain},?$`);
const SurtPort = "(:(?<port>\\d+))?";
const SurtUserinfo = "(@(?<userinfo>[^\\)]+))?";
// Valid 'pchar'characters per https://datatracker.ietf.org/doc/html/rfc3986
// plus gen-delims for query and fragment support.
const pcharChars = "a-zA-Z0-9.\\-_~!$&'()*+,;=:@";
const gendelimsChars = "/?#\\[\\]"; // ":" and "@" ommitted due to inclusion in pchars
const ValidPathnameChars = `[${pcharChars}${gendelimsChars}]`;
export const SurtFullRegex = new RegExp(
  [
    "^",
    SurtDomain,
    SurtPort,
    SurtUserinfo,
    `(\\)(?<pathname>/${ValidPathnameChars}*)?)`,
    "\\s?", // Single trailing whitespace signals verbatim match to ARCH
    "$",
  ].join("")
);

export const BoolDisplayMap: Record<string, string> = {
  true: "Yes",
  false: "No",
};

export const EventTypeDisplayMap: Record<ProcessingState, string> = {
  SUBMITTED: "Submitted",
  QUEUED: "Queued",
  RUNNING: "Running",
  FINISHED: "Finished",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const CollectionTypeDisplayMap: Record<CollectionType, string> = {
  AIT: "Archive-It",
  CUSTOM: "Custom",
  SPECIAL: "Special",
};

// The URL params to use for specifying a single Collection.id value.
export const UrlCollectionParamName = "cid";

// The URL params to use for specifying an array of Collection.id values.
export const UrlCollectionsParamName = "cid[]";

export const DefaultSelectElementPromptText = "Please select...";
