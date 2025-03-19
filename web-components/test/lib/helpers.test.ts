import { assert } from "@open-wc/testing";

import {
  assertIsValidWildcardPatternUrl,
  checkSurt,
  stripSurtTrailingComma,
  surtToUrl,
  urlToExpandedSurts,
  urlToSurt,
} from "../../src/lib/helpers";

describe("helpers", () => {
  describe("assertIsValidWildcardPatternUrl", () => {
    it("Returns true for URLs containing no, or a valid, wildcard pattern", () => {
      for (const url of [
        "http://example.com",
        "http://example.com?q=1",
        "http://example.com/",
        "http://example.com/test",
        "http://example.com/testq?=1#hash",
        "http://example.com/test*",
        "http://example.com/1/2*",
      ]) {
        assert.isTrue(assertIsValidWildcardPatternUrl(new URL(url)));
      }
    });

    it("Throws an Error for URLs containing an invalid wildcard pattern", () => {
      const BAD_HOST = "Hostname wildcards are not supported";
      const BAD_PATH =
        "URL pathname can include at most one trailing wildcard (*) character, and only in the absence of '?' and '#' characters";
      for (const [url, msg] of [
        ["http://example.com*", BAD_HOST],
        ["http://example.*.com/", BAD_HOST],
        ["http://example.com/*", BAD_PATH],
        ["http://example.com/1/*", BAD_PATH],
        ["http://example.com/1*/", BAD_PATH],
        ["http://example.com?q=1*", BAD_PATH],
        ["http://example.com#hash*", BAD_PATH],
        ["http://example.com/1?q=1#hash*", BAD_PATH],
      ]) {
        assert.throws(() => assertIsValidWildcardPatternUrl(new URL(url)), msg);
      }
    });
  });

  describe("checkSurt", () => {
    it("Returns isValid=true for valid SURTs", () => {
      for (const [surt, expectIsPrefix] of [
        ["com,example", true],
        ["com,example,", true],
        ["com,example)", false],
        ["com,example)/", false],
        ["com,example,subdomain)/", false],
        ["com,example)/1", false],
        ["com,example)/1?test=yes#hash", false],
        ["com,example:1234)/", false],
        ["com,example@user)/", false],
        ["com,example:1234@user:pass)/", false],
      ]) {
        const { isValid, isPrefix } = checkSurt(surt);
        assert.isTrue(isValid);
        assert.equal(isPrefix, expectIsPrefix);
      }
    });

    it("Returns isValid=false for invalid SURTs", () => {
      for (const invalidSurt of ["", "com", "com,"]) {
        assert.isFalse(checkSurt(invalidSurt).isValid);
      }
    });
  });

  describe("urlToSurl", () => {
    it("Converts a URL to a SURT", () => {
      for (const [url, surt] of [
        ["http://example.com", "com,example,"],
        ["http://www.example.com", "com,example,"],
        ["http://example.com?q=1", "com,example)/?q=1"],
        ["http://example.com/?q=1", "com,example)/?q=1"],
        ["http://example.com#hash", "com,example)/#hash"],
        ["http://example.com/#hash", "com,example)/#hash"],
        ["http://example.com/", "com,example)"],
        ["http://example.com/1", "com,example)/1"],
        ["http://example.com/1?test=yes#hash", "com,example)/1?test=yes#hash"],
        ["http://example.com:1234", "com,example:1234)"],
        ["http://user@example.com", "com,example@user)"],
        ["http://user:pass@example.com:1234", "com,example:1234@user:pass)"],
        // Adapted from Heritrix test cases: https://github.com/internetarchive/heritrix3/blob/bc9b21e2ee4d44feb94b98ab264dd5caf269cf6a/commons/src/test/java/org/archive/util/SURTTest.java#L63
        // Modifications to original expected results:
        //  - Dropped scheme, i.e. "http://("
        //  - Stripped trailing ",www"
        //  - Removed trailing ")" to arrive at the implied SURT prefix
        //  - Stripped trailing "," from non-prefix domain part
        ["http://www.archive.org", "org,archive,"],
        [
          "http://www.archive.org/movies/movies.php",
          "org,archive)/movies/movies.php",
        ],
        [
          "http://www.archive.org:8080/movies/movies.php",
          "org,archive:8080)/movies/movies.php",
        ],
        [
          "http://user:pass@www.archive.org/movies/movies.php",
          "org,archive@user:pass)/movies/movies.php",
        ],
        [
          "http://user:pass@www.archive.org:8080/movies/movies.php",
          "org,archive:8080@user:pass)/movies/movies.php",
        ],
        [
          "http://www.archive.org/movies/movies.php#top",
          "org,archive)/movies/movies.php#top",
        ],
        ["http://www.example.com/foo@bar", "com,example)/foo@bar"],
      ]) {
        assert.equal(urlToSurt(url), surt);
      }
    });
  });

  describe("urlToExpandedSurts", () => {
    it("Converts a URL to an array of expanded SURTs", () => {
      for (const [url, surts] of [
        [
          "http://example.com",
          ["com,example,", "com,example:443)", "com,example:80)"],
        ],
        [
          "http://example.com/abc",
          [
            "com,example)/abc ",
            "com,example)/abc#",
            "com,example)/abc/",
            "com,example)/abc?",
            "com,example:443)/abc ",
            "com,example:443)/abc#",
            "com,example:443)/abc/",
            "com,example:443)/abc?",
            "com,example:80)/abc ",
            "com,example:80)/abc#",
            "com,example:80)/abc/",
            "com,example:80)/abc?",
          ],
        ],
        // Trailing wildcard results in exact prefix match
        [
          "http://example.com/abc*",
          ["com,example)/abc", "com,example:443)/abc", "com,example:80)/abc"],
        ],
        [
          "http://example.com?q=1",
          [
            "com,example)/?q=1 ",
            "com,example:443)/?q=1 ",
            "com,example:80)/?q=1 ",
          ],
        ],
        [
          "http://example.com/?q=1",
          [
            "com,example)/?q=1 ",
            "com,example:443)/?q=1 ",
            "com,example:80)/?q=1 ",
          ],
        ],
        [
          "http://example.com#hash",
          [
            "com,example)/#hash ",
            "com,example:443)/#hash ",
            "com,example:80)/#hash ",
          ],
        ],
        [
          "http://example.com/#hash",
          [
            "com,example)/#hash ",
            "com,example:443)/#hash ",
            "com,example:80)/#hash ",
          ],
        ],
        // Covered in CdxServerIndex.urlToPrefix() tests cases below.
        // ["http://example.com/", [...]],
        [
          "http://example.com/1",
          [
            "com,example)/1 ",
            "com,example)/1#",
            "com,example)/1/",
            "com,example)/1?",
            "com,example:443)/1 ",
            "com,example:443)/1#",
            "com,example:443)/1/",
            "com,example:443)/1?",
            "com,example:80)/1 ",
            "com,example:80)/1#",
            "com,example:80)/1/",
            "com,example:80)/1?",
          ],
        ],
        [
          "http://example.com/1?test=yes#hash",
          [
            "com,example)/1?test=yes#hash ",
            "com,example:443)/1?test=yes#hash ",
            "com,example:80)/1?test=yes#hash ",
          ],
        ],
        ["http://example.com:1234", ["com,example:1234)"]],
        [
          "http://user@example.com",
          [
            "com,example:443@user)",
            "com,example:80@user)",
            "com,example@user)",
          ],
        ],
        ["http://user:pass@example.com:1234", ["com,example:1234@user:pass)"]],

        // CdxServerIndex.urlToPrefix() tests cases from:
        // https://webarchive.jira.com/browse/ARCH-295
        [
          "http://example.com/",
          [
            "com,example)",
            "com,example:443)",
            "com,example:80)",
            // I've chosen not to expand this to a subdomain wildcard.
            // "com,example,"
          ],
        ],
        [
          "http://example.com/1/2/3",
          [
            "com,example)/1/2/3 ",
            "com,example)/1/2/3#",
            "com,example)/1/2/3/",
            "com,example)/1/2/3?",
            "com,example:443)/1/2/3 ",
            "com,example:443)/1/2/3#",
            "com,example:443)/1/2/3/",
            "com,example:443)/1/2/3?",
            "com,example:80)/1/2/3 ",
            "com,example:80)/1/2/3#",
            "com,example:80)/1/2/3/",
            "com,example:80)/1/2/3?",
          ],
        ],
        [
          "http://example.com/1/2/3?q=seaech",
          [
            "com,example)/1/2/3?q=seaech ",
            "com,example:443)/1/2/3?q=seaech ",
            "com,example:80)/1/2/3?q=seaech ",
          ],
        ],

        // Adapted from Heritrix test cases: https://github.com/internetarchive/heritrix3/blob/bc9b21e2ee4d44feb94b98ab264dd5caf269cf6a/commons/src/test/java/org/archive/util/SURTTest.java#L63
        [
          "http://www.archive.org",
          ["org,archive,", "org,archive:443)", "org,archive:80)"],
        ],
        [
          "http://www.archive.org/movies/movies.php",
          [
            "org,archive)/movies/movies.php ",
            "org,archive)/movies/movies.php#",
            "org,archive)/movies/movies.php/",
            "org,archive)/movies/movies.php?",
            "org,archive:443)/movies/movies.php ",
            "org,archive:443)/movies/movies.php#",
            "org,archive:443)/movies/movies.php/",
            "org,archive:443)/movies/movies.php?",
            "org,archive:80)/movies/movies.php ",
            "org,archive:80)/movies/movies.php#",
            "org,archive:80)/movies/movies.php/",
            "org,archive:80)/movies/movies.php?",
          ],
        ],
        [
          "http://www.archive.org:8080/movies/movies.php",
          [
            "org,archive:8080)/movies/movies.php ",
            "org,archive:8080)/movies/movies.php#",
            "org,archive:8080)/movies/movies.php/",
            "org,archive:8080)/movies/movies.php?",
          ],
        ],
        [
          "http://user:pass@www.archive.org/movies/movies.php",
          [
            "org,archive:443@user:pass)/movies/movies.php ",
            "org,archive:443@user:pass)/movies/movies.php#",
            "org,archive:443@user:pass)/movies/movies.php/",
            "org,archive:443@user:pass)/movies/movies.php?",
            "org,archive:80@user:pass)/movies/movies.php ",
            "org,archive:80@user:pass)/movies/movies.php#",
            "org,archive:80@user:pass)/movies/movies.php/",
            "org,archive:80@user:pass)/movies/movies.php?",
            "org,archive@user:pass)/movies/movies.php ",
            "org,archive@user:pass)/movies/movies.php#",
            "org,archive@user:pass)/movies/movies.php/",
            "org,archive@user:pass)/movies/movies.php?",
          ],
        ],
        [
          "http://user:pass@www.archive.org:8080/movies/movies.php",
          [
            "org,archive:8080@user:pass)/movies/movies.php ",
            "org,archive:8080@user:pass)/movies/movies.php#",
            "org,archive:8080@user:pass)/movies/movies.php/",
            "org,archive:8080@user:pass)/movies/movies.php?",
          ],
        ],
        [
          "http://www.archive.org/movies/movies.php#top",
          [
            "org,archive)/movies/movies.php#top ",
            "org,archive:443)/movies/movies.php#top ",
            "org,archive:80)/movies/movies.php#top ",
          ],
        ],
        [
          "http://www.example.com/foo@bar",
          [
            "com,example)/foo@bar ",
            "com,example)/foo@bar#",
            "com,example)/foo@bar/",
            "com,example)/foo@bar?",
            "com,example:443)/foo@bar ",
            "com,example:443)/foo@bar#",
            "com,example:443)/foo@bar/",
            "com,example:443)/foo@bar?",
            "com,example:80)/foo@bar ",
            "com,example:80)/foo@bar#",
            "com,example:80)/foo@bar/",
            "com,example:80)/foo@bar?",
          ],
        ],
      ]) {
        assert.deepEqual(urlToExpandedSurts(url), surts);
      }
    });
  });

  describe("surtToUrl", () => {
    it("Converts a SURT to a URL", () => {
      for (const [surt, url] of [
        ["com,example)/", "http://example.com/"],
        ["com,example,subdomain)/", "http://subdomain.example.com/"],
        ["com,example)/1", "http://example.com/1"],
        ["com,example)/1?test=yes#hash", "http://example.com/1?test=yes#hash"],
        ["com,example:1234)/", "http://example.com:1234/"],
        ["com,example@user)/", "http://user@example.com/"],
        ["com,example:1234@user:pass)/", "http://user:pass@example.com:1234/"],
      ]) {
        assert.equal(surtToUrl(surt), url);
      }
    });

    it("Can not convert domain prefix SURTs to URLs", () => {
      for (const [surt, url] of [
        ["com,example", null],
        ["com,example,", null],
      ]) {
        assert.equal(surtToUrl(surt), url);
      }
    });

    it("Returns null for invalid SURT values", () => {
      for (const invalidSurt of ["", "com", "com,"]) {
        assert.isNull(surtToUrl(invalidSurt));
      }
    });
  });
});
