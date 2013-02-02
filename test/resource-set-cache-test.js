var buster = require("buster");
var when = require("when");
var rr = require("../lib/ramp-resources");
require("./test-helper");

function add(rs, path, content, options) {
    return rs.addResource(buster.extend({
        path: path,
        content: content
    }, options));
}

function addResourcesAndInflate(cache, resourceSet, resources, done) {
    var promises = resources.map(function (r) {
        add.apply(this, [resourceSet].concat(r));
    });
    when.all(promises).then(
        function () {
            cache.inflate(resourceSet).then(
                done
            );
        }
    );
}

function maxSizeSetUp(done) {
    this.rs = rr.createResourceSet();
    this.rs2 = rr.createResourceSet();
    this.cache = rr.createCache({ ttl: 250, maxSize: 150 });

    when.all([
        add(this.rs, "/buster.js", "Yo!", { etag: "abcd" }),
        add(this.rs, "/sinon.js", "Hey", { etag: "1234" }),
        add(this.rs, "/when.js", "Hm", { etag: "0123" }),
        add(this.rs2, "/jquery.js", "Eh", { etag: "zxcv" })
    ], function () { done(); });
}

buster.testCase("Resource set cache", {
    setUp: function (done) {
        this.clock = this.useFakeTimers();
        this.rs = rr.createResourceSet();

        var cache = this.cache = rr.createCache({ ttl: 250 });
        var rs = rr.createResourceSet();
        when.all([
            add(rs, "/buster.js", "Yo!", { etag: "abcd1234" }),
            add(rs, "/sinon.js", "Hey!", {})
        ], function () {
            cache.inflate(rs).then(
                function () { done(); }
            );
        });
    },

    "inflate": {
        setUp: function (done) {
            var cache = this.cache;
            var rs = rr.createResourceSet();
            add(rs, "/buster.coffee", "Yoo!", {
                etag: "dedede",
                alternatives: [{
                    content: "HAHA",
                    mimeType: "text/uppercase"
                }]
            }).then(
                function () {
                    cache.inflate(rs).then(
                        function () { done(); }
                    );
                }
            );
        },

        "resolves with resource set": function (done) {
            var rs = this.rs;
            this.cache.inflate(rs).then(
                done(function (actualRs) {
                    assert.same(actualRs, rs);
                })
            );
        },

        "uses cached content for empty-content resource": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/buster.js", "", { etag: "abcd1234" }]
            ], function (rs) {
                assert.content(rs.get("/buster.js"), "Yo!", done);
            });
        },

        "uses cached alternatives for empty-content resource": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/buster.coffee", "", {
                    etag: "13ae76a598b2aa2cad2c7fd1f4954fff745835d1"
                }]
            ], function (rs) {
                var resource = rs.get("/buster.coffee");
                var alternative = resource.getContentFor("text/uppercase");
                assert.defined(alternative);
                assert.content(alternative, "HAHA", done);
            });
        },

        "does not use cache when etag does not match": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/buster.js", "", { etag: "abcd12345" }]
            ], function (rs) {
                assert.content(rs.get("/buster.js"), "", done);
            });
        },

        "does not use cached content when content not empty": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/buster.js", "Huh", { etag: "abcd1234" }]
            ], function (rs) {
                assert.content(rs.get("/buster.js"), "Huh", done);
            });
        },

        "does not use cached content for wrong path": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/sinon.js", "Huh", { etag: "abcd1234" }]
            ], function (rs) {
                assert.content(rs.get("/sinon.js"), "Huh", done);
            });
        },

        "does not cache resources without etag": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/sinon.js", "Huh", {}]
            ], function (rs) {
                assert.content(rs.get("/sinon.js"), "Huh", done);
            });
        },

        "does not cache identical versions multiple times": function (done) {
            var rs = this.rs;
            var cache = this.cache;
            addResourcesAndInflate(cache, rs, [
                ["/sinon.js", "Huh", { etag: "123" }]
            ], function () {
                var cacheSize = cache.size();
                addResourcesAndInflate(cache, rs, [
                    ["/sinon.js", "Huh", { etag: "123" }]
                ], done(function () {
                    assert.equals(cacheSize, cache.size());
                }));
            });
        },

        "does not cache uncacheable resource": function (done) {
            var cache = this.cache;
            var rs2 = rr.createResourceSet();
            addResourcesAndInflate(cache, this.rs, [
                ["/uncacheable.js", "Stuff", { cacheable: false, etag: "1" }]
            ], function () {
                addResourcesAndInflate(cache, rs2, [
                    ["/uncacheable.js", "", { etag: "1" }]
                ], function (rs) {
                    assert.content(rs.get("/uncacheable.js"), "", done);
                });
            });
        },

        "does not cache resources when content() rejects": function (done) {
            var cache = this.cache;
            var rs2 = rr.createResourceSet();
            var d = when.defer();
            d.resolver.reject("Oh noes");
            addResourcesAndInflate(cache, this.rs, [
                ["/sinon.js", function () { return d.promise; }, { etag: "1" }]
            ], function () {
                addResourcesAndInflate(cache, rs2, [
                    ["/sinon.js", "", { etag: "1" }]
                ], function (rs) {
                    assert.content(rs.get("/sinon.js"), "", done);
                });
            });
        },

        // TODO: how does this validate that there's no lookup?
        "does not look up from cache when content() rejects": function (done) {
            var cache = this.cache;
            var rs2 = rr.createResourceSet();
            var d = when.defer();
            d.resolver.reject("Oh noes");
            addResourcesAndInflate(cache, this.rs, [
                ["/a.js", "Cached", { etag: "1" }]
            ], function () {
                addResourcesAndInflate(cache, rs2, [
                    ["/a.js", function () { return d.promise; }, { etag: "1" }]
                ], function (rs) {
                    rs.get("/a.js").content().then(
                        function () {},
                        done(function (err) {
                            assert.equals(err, "Oh noes");
                        })
                    );
                });
            });
        },

        // TODO: how does this validate that there's no lookup?
        "does not look up from cache when content() throws": function (done) {
            var cache = this.cache;
            var rs2 = rr.createResourceSet();
            addResourcesAndInflate(cache, this.rs, [
                ["/a.js", "Cached", { etag: "1" }]
            ], function () {
                addResourcesAndInflate(cache, rs2, [
                    ["/a.js", function () { throw "WOW"; }, { etag: "1" }]
                ], done(function (rs) {
                    assert.exception(function () {
                        rs.get("/a.js").content();
                    });
                }));
            });
        },

        "uses entire cached resource": function (done) {
            addResourcesAndInflate(this.cache, this.rs, [
                ["/sinon.js", "Huh", {
                    etag: "abcd1234",
                    headers: { "Content-Type": "application/json" }
                }]
            ], done(function (rs) {
                assert.equals(rs.get("/sinon.js").header("Content-Type"),
                              "application/json");
            }));
        },

        "removes resource from cache after ttl ms": function () {
            this.clock.tick(250);
            assert.equals(this.cache.resourceVersions(), {});
        },

        "keeps resources indefinitely with -1 ttl": function (done) {
            var rs = rr.createResourceSet();
            var cache = rr.createCache({ ttl: -1 });
            var clock = this.clock;

            add(rs, "/buster.js", "Yo!", { etag: "abcd" }).then(
                function () {
                    cache.inflate(rs).then(
                        done(function () {
                            clock.tick(30 * 24 * 60 * 60 * 1000);

                            assert.equals(cache.resourceVersions(), {
                                "/buster.js": ["abcd"]
                            });
                        })
                    );
                }
            );
        }
    },

    "resource versions": {
        "returns cached resource version": function () {
            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd1234"]
            });
        },

        "returns all cached resource version": function () {
            add(this.rs, "/sinon.js", "Yeah", { etag: "123" });
            add(this.rs, "/buster.js", "Heh", { etag: "666" });
            add(this.rs, "/when.js", "When??!?", {});
            this.cache.inflate(this.rs);

            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd1234", "666"],
                "/sinon.js": ["123"]
            });
        }
    },

    "freeze": {
        "guarantees resource is available for provided period": function () {
            this.cache.inflate(this.rs);
            this.cache.freeze(300);
            this.clock.tick(299);

            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd1234"]
            });
        },

        "should not shorten a resource's life-span": function () {
            this.cache.inflate(this.rs);
            this.cache.freeze(100);
            this.clock.tick(200);

            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd1234"]
            });
        }
    },

    "size": {
        "returns cache byte size approximation": function () {
            // Content OK! 3 bytes
            // Etag abcd1234 8 bytes
            // Default headers (names and values) 66 bytes
            assert.equals(this.cache.size(), 77);
        },

        "adjusts cache byte size approximation when adding": function () {
            var cache = this.cache;
            var rs = this.rs;
            add(rs, "/sinon.js", "Yeah", { etag: "1" }).then(
                function () {
                    cache.inflate(rs);
                    assert.equals(cache.size(), 148);
                }
            );
        }
    },

    "max size": {
        setUp: maxSizeSetUp,

        "purges oldest content when growing too large": function () {
            this.cache.inflate(this.rs);

            assert.equals(this.cache.resourceVersions(), {
                "/sinon.js": ["1234"],
                "/when.js": ["0123"]
            });
        },

        "does not purge oldest content when in freeze": function () {
            this.cache.maxSize(250);
            this.cache.inflate(this.rs);
            this.cache.freeze(50);
            this.cache.inflate(this.rs2);

            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd"],
                "/sinon.js": ["1234"],
                "/when.js": ["0123"],
                "/jquery.js": ["zxcv"]
            });
        },

        "purges oldest content after current freeze": function () {
            this.cache.maxSize(250);
            this.cache.inflate(this.rs);
            this.cache.freeze(50);
            this.cache.inflate(this.rs2);
            this.clock.tick(50);

            assert.equals(this.cache.resourceVersions(), {
                "/sinon.js": ["1234"],
                "/when.js": ["0123"],
                "/jquery.js": ["zxcv"]
            });
        }
    },

    "purgeAll": {
        setUp: function (done) {
            maxSizeSetUp.call(this, done);
            this.cache.maxSize(300);
        },

        "purges everything": function () {
            this.cache.inflate(this.rs);
            this.cache.purgeAll();

            assert.equals(this.cache.resourceVersions(), {});
        },

        "does not purge everything when in freeze": function () {
            this.cache.inflate(this.rs);
            this.cache.freeze(100);
            this.cache.purgeAll();

            assert.equals(this.cache.resourceVersions(), {
                "/buster.js": ["abcd"],
                "/sinon.js": ["1234"],
                "/when.js": ["0123"]
            });
        },

        "purges everything after current freeze": function () {
            this.cache.inflate(this.rs);
            this.cache.freeze(100);
            this.clock.tick(50);
            this.cache.purgeAll();
            this.clock.tick(50);

            assert.equals(this.cache.resourceVersions(), {});
        }
    }
});
