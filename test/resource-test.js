/*jslint maxlen:100*/
var buster = require("buster");
var when = require("when");
var rr = require("../lib/ramp-resources");
var br = require("../lib/resource");
var h = require("./test-helper.js");
var shouldReject = h.shouldReject;
var shouldResolve = h.shouldResolve;

buster.testCase("Resources", {
    "create": {
        "fails without resource": function () {
            assert.invalidResource("/here", null, "No content");
        },

        "fails without content, or backend": function () {
            assert.invalidResource("/here", {}, "No content");
        },

        "fails with both content and backend": function () {
            assert.invalidResource("/here", {
                content: "Something",
                backend: "http://localhost:8080"
            }, "Resource cannot have both content and backend");
        },

        "fails with encoding and backend": function () {
            assert.invalidResource("/here", {
                encoding: "utf-8",
                backend: "http://localhost:8080"
            }, "Proxy resource cannot have hard-coded encoding");
        },

        "fails with invalid backend URL": function () {
            assert.invalidResource("/here", {
                backend: "::/::localhost"
            }, "Invalid proxy backend '::/::localhost'");
        },

        "does not fail with only etag": function () {
            var res = rr.createResource("/path", { etag: "abc123" });
            assert.defined(res);
        },

        "returns resource": function () {
            var res = rr.createResource("/path", {
                content: "Something"
            });

            assert.defined(res);
        },

        "creates cacheable resources by default": function () {
            var res = rr.createResource("/path", {
                content: "Something"
            });

            assert.isTrue(res.cacheable);
        },

        "creates uncacheable resource": function () {
            var res = rr.createResource("/path", {
                content: "Something",
                cacheable: false
            });

            assert.isFalse(res.cacheable);
        }
    },

    "headers": {
        "are never null": function () {
            var res = rr.createResource("/path", { content: "Hey" });
            refute.isNull(res.headers());
        },

        "are never undefined": function () {
            var res = rr.createResource("/path", { content: "Hey" });
            assert.defined(res.headers());
        },

        "reflect configured values": function () {
            var res = rr.createResource("/path", {
                content: "Hey",
                headers: {
                    "Content-Type": "application/xhtml",
                    "Content-Length": 3
                }
            });

            assert.equals(res.headers(), {
                "Content-Type": "application/xhtml",
                "Content-Length": "3"
            });
        },

        "has non-null default Content-Type": function () {
            var res = rr.createResource("/path", { content: "Hey" });
            var contentType = res.headers()["Content-Type"];

            assert.defined(contentType);
            refute.isNull(contentType);
        },

        "includes etag when set": function () {
            var res = rr.createResource("/path", {
                etag: "1234abc",
                content: "Hey"
            });

            assert.equals(res.header("ETag"), "1234abc");
        },

        "are empty for backend resource": function () {
            var res = rr.createResource("/api", { backend: "http://localhost" });

            assert.equals(res.headers(), {});
        }
    },

    "Content-Type": {
        "defaults to text/html and utf-8": function () {
            var res = rr.createResource("/path", { content: "<!DOCTYPE html>" });

            assert.equals(res.header("Content-Type"),
                          "text/html; charset=utf-8");
        },

        "defaults to text/html and set charset": function () {
            var res = rr.createResource("/path", {
                encoding: "iso-8859-1",
                content: "<!DOCTYPE html>"
            });

            assert.equals(res.header("Content-Type"),
                          "text/html; charset=iso-8859-1");
        },

        "defaults to text/css for CSS files": function () {
            var res = rr.createResource("/path.css", {
                content: "body {}"
            });

            assert.equals(res.header("Content-Type"),
                          "text/css; charset=utf-8");
        },

        "defaults to application/javascript for JS files": function () {
            var res = rr.createResource("/path.js", {
                content: "function () {}"
            });

            assert.equals(res.header("Content-Type"),
                          "application/javascript; charset=utf-8");
        },

        "does not include charset for binary files": function () {
            var res = rr.createResource("/file.png", {
                content: new Buffer([])
            });

            assert.equals(res.header("Content-Type"), "image/png");
        },

        "defaults encoding to base64 for binary files": function () {
            var res = rr.createResource("/file.png", {
                content: new Buffer([])
            });

            assert.equals(res.encoding, "base64");
        }
    },

    "with string content": {
        "serves string as content": function (done) {
            var res = rr.createResource("/path.js", {
                content: "console.log(42);"
            });

            assert.content(res, "console.log(42);", done);
        }
    },

    "with buffer content": {
        "assumes utf-8 encoded string": function (done) {
            var bytes = [231, 167, 129, 227, 129, 175, 227, 130, 172];
            var res = rr.createResource("/path.txt", {
                content: new Buffer(bytes)
            });

            assert.content(res, "私はガ", done);
        },

        "encodes png with base64": function (done) {
            var res = rr.createResource("/3x3-cross.png", {
                content: new Buffer([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0,
                                     13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0,
                                     3, 8, 6, 0, 0, 0, 86, 40, 181, 191, 0, 0,
                                     0, 1, 115, 82, 71, 66, 0, 174, 206, 28,
                                     233, 0, 0, 0, 6, 98, 75, 71, 68, 0, 104,
                                     0, 87, 0, 86, 187, 250, 75, 7, 0, 0, 0, 9,
                                     112, 72, 89, 115, 0, 0, 11, 19, 0, 0, 11,
                                     19, 1, 0, 154, 156, 24, 0, 0, 0, 7, 116,
                                     73, 77, 69, 7, 220, 1, 5, 22, 8, 8, 125,
                                     63, 114, 142, 0, 0, 0, 8, 116, 69, 88, 116,
                                     67, 111, 109, 109, 101, 110, 116, 0, 246,
                                     204, 150, 191, 0, 0, 0, 20, 73, 68, 65, 84,
                                     8, 215, 99, 96, 96, 96, 248, 207, 0, 1, 48,
                                     26, 147, 241, 31, 0, 89, 205, 4, 252, 43,
                                     130, 175, 235, 0, 0, 0, 0, 73, 69, 78, 68,
                                     174, 66, 96, 130]),
                encoding: "base64"
            });

            assert.content(res, "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYA" +
                           "AABWKLW/AAAAAXNSR0IArs4c6QAAAAZiS0dEAGgAVwBWu/pLB" +
                           "wAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wBBRYICH" +
                           "0/co4AAAAIdEVYdENvbW1lbnQA9syWvwAAABRJREFUCNdjYGB" +
                           "g+M8AATAak/EfAFnNBPwrgq/rAAAAAElFTkSuQmCC", done);
        }
    },

    "respondsTo returns": {
        "true when path matches resource path": function () {
            var res = rr.createResource("/file.js", { content: "Yo" });
            assert(res.respondsTo("/file.js"));
        },

        "true when path sans trailing slash == resource path": function () {
            var res = rr.createResource("/file", { content: "Yo" });
            assert(res.respondsTo("/file/"));
        },

        "true when path == resource path sans trailing slash": function () {
            var res = rr.createResource("/file/", { content: "Yo" });
            assert(res.respondsTo("/file"));
        },

        "false for different paths": function () {
            var res = rr.createResource("/styles.css", { content: "Yo" });
            refute(res.respondsTo("/"));
        },

        "false for partial path match": function () {
            var res = rr.createResource("/styles", { content: "Yo" });
            refute(res.respondsTo("/styles/page.css"));
        }
    },

    "with backend": {
        "content is proxy instance": function () {
            var res = rr.createResource("/api", { backend: "localhost" });

            assert.isObject(res.content());
            assert.isFunction(res.content().respond);
        },

        "content is always same proxy instance": function () {
            var res = rr.createResource("/api", { backend: "localhost" });

            assert.same(res.content(), res.content());  // WHUT?!
        },

        "defaults port to 80": function () {
            var res = rr.createResource("/api", { backend: "localhost" });

            assert.equals(res.content().port, 80);
        },

        "defaults path to nothing": function () {
            var res = rr.createResource("/api", { backend: "localhost" });

            assert.equals(res.content().path, "");
        },

        "overrides default port": function () {
            var res = rr.createResource("/api", { backend: "localhost:79" });

            assert.equals(res.content().port, 79);
        },

        "overrides default path": function () {
            var res = rr.createResource("/api", { backend: "localhost/yep" });

            assert.equals(res.content().path, "/yep");
            assert.equals(res.content().getProxyPath(), "/api");
        },

        "uses full URL": function () {
            var res = rr.createResource("/api", {
                backend: "http://something:8080/crowd/"
            });

            assert.match(res.content(), {
                host: "something",
                port: 8080,
                path: "/crowd"
            });
        },

        "respondsTo returns": {
            setUp: function () {
                this.res = rr.createResource("/api", { backend: "localhost" });
            },

            "true for root path": function () {
                assert(this.res.respondsTo("/api"));
            },

            "true for nested resource": function () {
                assert(this.res.respondsTo("/api/2.0/index"));
            },

            "false for requests outside root path": function () {
                refute(this.res.respondsTo("/2.0/index"));
            }
        }
    },

    "with function content": {
        "resolves with content function return value": function (done) {
            var res = rr.createResource("/api", { content: function () {
                return "42";
            } });

            assert.content(res, "42", done);
        },

        "resolves content() when function promise resolves": function (done) {
            var d = when.defer();
            var res = rr.createResource("/api", { content: function () {
                return d.promise;
            } });
            d.resolver.resolve("OMG");

            assert.content(res, "OMG", done);
        },

        "rejects content() when function promise rejects": function (done) {
            var d = when.defer();
            var res = rr.createResource("/api", { content: function () {
                return d.promise;
            } });
            d.resolver.reject("OMG");

            res.content().then(
                done(shouldReject),
                done(function (err) {
                    assert.equals(err, "OMG");
                })
            );
        },

        "calls content function with resource as this": function () {
            var content = this.spy();
            var res = rr.createResource("/api", { content: content });

            res.content();

            assert.calledOnce(content);
            assert.calledOn(content, res);
        }
    },

    "with fully qualified url as path": {
        "content is path": function (done) {
            var res = rr.createResource("file:///tmp/trash.txt");

            assert.content(res, "file:///tmp/trash.txt", done);
        }
    },

    "getContentFor": {
        "returns self for own MIME type": function () {
            var res = rr.createResource("/meh", { content: "Content" });
            assert.same(res.getContentFor("text/html"), res);
        },

        "returns null for unrecognized MIME type": function () {
            var res = rr.createResource("/meh", { content: "Content" });
            refute(res.getContentFor("text/css"));
        },

        "returns alternative with desired MIME type": function () {
            var res = rr.createResource("/meh", { content: "Content" });
            res.addAlternative({ mimeType: "text/css", content: "body {}" });
            assert(res.getContentFor("text/css"));
        }
    },

    "processors": {
        "process content": function (done) {
            var res = rr.createResource("/path", {
                content: "Hey"
            });

            res.addProcessor(function (resource, content) {
                return content + "!!";
            });

            assert.content(res, "Hey!!", done);
        },

        "process content in a chain": function (done) {
            var res = rr.createResource("/path", {
                content: "Hey"
            });

            res.addProcessor(function (resource, content) {
                return content + "!!";
            });
            res.addProcessor(function (resource, content) {
                return content + "??";
            });

            assert.content(res, "Hey!!??", done);
        },

        "processes deferred content": function (done) {
            var res = rr.createResource("/path", {
                content: function () { return "42"; }
            });

            res.addProcessor(function (resource, content) {
                return content + "!!";
            });
            res.addProcessor(function (resource, content) {
                return content + "??";
            });

            assert.content(res, "42!!??", done);
        },

        "leaves content untouched if processor returns undefined": function (done) {
            var res = rr.createResource("/path", {
                content: function () { return "42"; }
            });

            res.addProcessor(function (resource, content) {});

            assert.content(res, "42", done);
        },

        "blanks content by returning blank string": function (done) {
            var res = rr.createResource("/path", {
                content: function () { return "42"; }
            });

            res.addProcessor(function (resource, content) { return ""; });

            assert.content(res, "", done);
        },

        "rejects if string content processor throws": function (done) {
            var res = rr.createResource("/path", { content: "Hey" });
            res.addProcessor(function () { throw new Error("Process fail"); });

            res.content().then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message, "Process fail");
                })
            );
        },

        "rejects if function content processor throws": function (done) {
            var res = rr.createResource("/path", {
                content: this.stub().returns("Hey")
            });
            res.addProcessor(function () { throw new Error("Process fail"); });

            res.content().then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message, "Process fail");
                })
            );
        },

        "creates etag hash": function () {
            var res = rr.createResource("/path", {
                content: "Hey"
            });

            res.addProcessor(function () {});

            assert.equals(res.etag, "e4575dc296fb6f90f3d605701361e143b2ac55b9");
        },

        "updates existing etag": function () {
            var res = rr.createResource("/path", {
                etag: "123",
                content: "Hey"
            });

            res.addProcessor(function () {});

            assert.equals(res.etag, "5f46fdd28899bea84ebb9af2a1d0ffa32c0cca05");
        },

        "always update existing etag": function () {
            var res = rr.createResource("/path", {
                etag: "123",
                content: "Hey"
            });

            res.addProcessor(function () {});
            res.addProcessor(function () { return "OK"; });

            assert.equals(res.etag, "4b0b20e81e9db06b84fc7589e22507eb3d3db04c");
        },

        "does not process content for alternatives": function (done) {
            var res = rr.createResource("/path", { content: "Hey" });
            res.addAlternative({ content: "Haha", mimeType: "text/css" });

            res.addProcessor(function (resource, content) {
                return content + "!!";
            });

            assert.content(res.getContentFor("text/css"), "Haha", done);
        }
    },

    "process": {
        setUp: function () {
            this.content = this.stub().returns("Something");
            this.res = rr.createResource("/path", { content: this.content });
        },

        "does not resolve content if no processors": function (done) {
            var contentFn = this.content;

            this.res.process().then(
                done(function () {
                    refute.called(contentFn);
                }),
                done(shouldResolve)
            );
        },

        "resolves and processes content with one processor": function (done) {
            var res = this.res;
            var contentFn = this.content;
            var processor = this.stub().returns("");
            res.addProcessor(processor);

            res.process().then(
                done(function () {
                    assert.calledOnce(contentFn);
                    assert.calledOnceWith(processor, res, "Something");
                }),
                done(shouldResolve)
            );
        },

        "yields null when not processing": function (done) {
            this.res.process().then(
                done(function (content) {
                    assert.isNull(content);
                }),
                done(shouldResolve)
            );
        },

        "yields processed content": function (done) {
            var res = this.res;
            var processor = this.stub().returns("\\m/");
            res.addProcessor(processor);

            res.process().then(
                done(function (content) {
                    assert.equals(content, "\\m/");
                }),
                done(shouldResolve)
            );
        },

        "rejects if processor throws": function (done) {
            var res = this.res;
            var expectedError = new Error("Bang!");
            res.addProcessor(this.stub().throws(expectedError));

            res.process().then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, "Bang!");
                })
            );
        }
    },

    "enclose": {
        "wraps content in an IIFE": function (done) {
            var res = rr.createResource("/path", {
                content: this.stub().returns("var a = 42;"),
                enclose: true
            });

            assert.content(res, "(function () {var a = 42;}.call(this));", done);
        },

        "adds exports to IIFE": function (done) {
            var res = rr.createResource("/path", {
                content: this.stub().returns("var a = 42;"),
                enclose: true,
                exports: ["a"]
            });
            var expected = "(function (global) {var a = 42;global.a=a;}"
                           + ".call(this, typeof global != \"undefined\" ? "
                           + "global : this));";

            assert.content(res, expected, done);
        }
    },

    "serialize": {
        "rejects if content rejects": function (done) {
            var d = when.defer();
            d.resolver.reject("MEH");
            var res = rr.createResource("/meh", {
                content: function () { return d.promise; }
            });

            res.serialize().then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, "MEH");
                })
            );
        },

        "rejects if content throws": function (done) {
            var res = rr.createResource("/meh", {
                content: function () { throw new Error("MEH"); }
            });

            res.serialize().then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, "MEH");
                })
            );
        },

        "includes enclose property if true": function (done) {
            var res = rr.createResource("/meh", {
                content: "Hey",
                enclose: true
            });

            res.serialize().then(
                done(function (serialized) {
                    assert.isTrue(serialized.enclose);
                }),
                done(shouldResolve)
            );
        },

        "includes exports if set": function (done) {
            var res = rr.createResource("/meh", {
                content: "Hey",
                enclose: true,
                exports: ["a", "b"]
            });

            res.serialize().then(
                done(function (serialized) {
                    assert.equals(serialized.exports, ["a", "b"]);
                }),
                done(shouldResolve)
            );
        },

        "rejects if content processor throws": function (done) {
            var res = rr.createResource("/meh", {
                content: function () { return "Content"; }
            });

            res.addProcessor(function () { throw new Error("Meh"); });

            res.serialize().then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, "Meh");
                })
            );
        },

        "includes cacheable flag": function (done) {
            var res = rr.createResource("/meh", {
                content: function () { return "Content"; }
            });

            res.serialize().then(
                done(function (serialized) {
                    assert(serialized.cacheable);
                }),
                done(shouldResolve)
            );
        },

        "includes alternatives": function (done) {
            var res = rr.createResource("/meh", { content: "Content" });
            res.addAlternative({
                content: "CONTENT",
                mimeType: "text/uppercase"
            });

            res.serialize().then(
                done(function (serialized) {
                    assert.match(serialized.alternatives, [{
                        content: "CONTENT",
                        mimeType: "text/uppercase"
                    }]);
                }),
                done(shouldResolve)
            );
        },

        "does not include alternatives when skipping content": function (done) {
            var res = rr.createResource("/meh", { content: "Content" });
            res.addAlternative({
                content: "CONTENT",
                mimeType: "text/uppercase"
            });

            res.serialize({ includeContent: false }).then(
                done(function (s) {
                    refute(s.content);
                    refute.defined(s.alternatives);
                }),
                done(shouldResolve)
            );
        },

        "does not include content for fully qualified path": function (done) {
            var res = rr.createResource("http://cdn/thing.js");

            res.serialize({ includeContent: false }).then(
                done(function (serialized) {
                    refute(serialized.content);
                    assert.equals(serialized.path, "http://cdn/thing.js");
                }),
                done(shouldResolve)
            );
        }
    },

    "addAlternative": {
        "updates etag": function () {
            var res = rr.createResource("/meh", { content: "Ok", etag: "1" });
            res.addAlternative({
                content: "CONTENT",
                mimeType: "text/uppercase"
            });

            assert.equals(res.etag, "d24ea95e25ef1cfbb7c7ee4187eae88695b13729");
        },

        "updates etag for every additional mime type alternative": function () {
            var res = rr.createResource("/meh", { content: "Ok", etag: "1" });
            res.addAlternative({ content: "CONTENT", mimeType: "text/upcase" });
            res.addAlternative({ content: "CONTENT", mimeType: "text/locase" });

            assert.equals(res.etag, "dec94ef5d39fff3bc911f4a16409d573238ea497");
        },

        "does not update etag when overriding existing alt": function () {
            var res = rr.createResource("/meh", { content: "Ok", etag: "1" });
            res.addAlternative({ content: "CONTENT", mimeType: "text/upcase" });
            res.addAlternative({ content: "CONTENT", mimeType: "text/locase" });
            res.addAlternative({ content: "OTHER", mimeType: "text/upcase" });

            assert.equals(res.etag, "dec94ef5d39fff3bc911f4a16409d573238ea497");
        },

        "alternative ordering does not affect etag": function () {
            var res = rr.createResource("/meh", { content: "Ok" });
            res.addAlternative({ content: "A", mimeType: "text/upcase" });
            res.addAlternative({ content: "B", mimeType: "text/locase" });

            var res2 = rr.createResource("/meh", { content: "Ok" });
            res2.addAlternative({ content: "A", mimeType: "text/locase" });
            res2.addAlternative({ content: "B", mimeType: "text/upcase" });

            assert.equals(res.etag, res2.etag);
        },

        "uses alternative custom etag for etag generation": function () {
            var res = rr.createResource("/meh", { content: "Ok" });
            res.addAlternative({ content: "A", mimeType: "text/a", etag: "A" });

            var res2 = rr.createResource("/meh", { content: "Ok" });
            res2.addAlternative({ content: "A", mimeType: "text/a" });

            refute.equals(res.etag, res2.etag);
        }
    },

    "normalizePath": {
        "windows path with more than one path separator": function () {
            var path = br.normalizePath("test\\other\\1.js");
            assert.equals(path, "/test/other/1.js");
        }
    }
});
