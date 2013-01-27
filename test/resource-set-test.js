/*jslint maxlen:100*/
var buster = require("buster");
var rr = require("../lib/ramp-resources");
var Path = require("path");
var when = require("when");
var h = require("./test-helper.js");
var shouldReject = h.shouldReject;
var shouldResolve = h.shouldResolve;

var FIXTURE_DIR = Path.join(__dirname, "fixtures");

buster.testCase("Resource sets", {
    setUp: function () {
        this.rs = rr.createResourceSet(FIXTURE_DIR);
    },

    "create": {
        "defaults root path to current working directory": function () {
            var rs = rr.createResourceSet();
            assert.equals(rs.rootPath, process.cwd());
        },

        "specifies root path": function () {
            var rs = rr.createResourceSet("/tmp");
            assert.equals(rs.rootPath, "/tmp");
        }
    },

    "adding resource": {
        "fails if resource is falsy": function () {
            var msg = "Resource must be a string, a resource object or " +
                "an object of resource properties";
            assert.invalidResource(this.rs, null, msg);
        },

        "fails with both file and backend": function () {
            assert.invalidResource(this.rs, {
                file: "something.js",
                backend: "http://localhost:8080"
            }, "Resource can only have one of content, file, backend, combine");
        },

        "fails with both file and combine": function () {
            assert.invalidResource(this.rs, {
                file: "something.js",
                combine: ["/a.js", "/b.js"]
            }, "Resource can only have one of content, file, backend, combine");
        },

        "fails with both content and combine": function () {
            assert.invalidResource(this.rs, {
                content: "Something",
                combine: ["/a.js", "/b.js"]
            }, "Resource can only have one of content, file, backend, combine");
        },

        "fails with both backend and combine": function () {
            assert.invalidResource(this.rs, {
                backend: "http://localhost",
                combine: ["/a.js", "/b.js"]
            }, "Resource can only have one of content, file, backend, combine");
        },

        "fails without path": function () {
            assert.invalidResource(this.rs, {
                content: "Hey"
            }, "Resource must have path");
        },

        "fails without content": function () {
            assert.invalidResource(this.rs, {
                path: "/here"
            }, "No content");
        },

        "does not fail with only combine": function () {
            var rs = this.rs;
            refute.exception(function () {
                rs.addResource({ path: "/path", combine: ["/a.js"] });
            });
        },

        "does not fail with only file": function () {
            var rs = this.rs;
            refute.exception(function () {
                rs.addResource({ path: "/path", file: "fixtures/foo.js" });
            });
        },

        "does not fail with only etag": function () {
            var rs = this.rs;
            refute.exception(function () {
                rs.addResource({ path: "/path", etag: "abcd" });
            });
        },

        "is gettable with URL path when added as system path": function (done) {
            var path = Path.join("test", "my-testish.js");
            this.rs.addFileResource(path).then(
                done(function (resource) {
                    assert.equals(resource.path, "/test/my-testish.js");
                }),
                done(shouldResolve)
            );
        }
    },

    "adding processor": {
        "adds processor to existing resources": function (done) {
            var rs = this.rs;
            rs.addResource(
                { path: "/buster.js", content: "Ok" }
            ).then(
                function () {
                    rs.addProcessor(function (resource, content) {
                        return content + "!";
                    });
                    // TODO: maybe better move the rs.get(..) outside .then()?
                    //       e.g. rs.get("/xxx") times out instead of ReferenceError
                    rs.get("/buster.js").content().then(
                        done(function (c) {
                            assert.equals(c, "Ok!");
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "adds processor to future resources": function (done) {
            var rs = this.rs;
            rs.addProcessor(function (resource, content) {
                return content + "!";
            });

            rs.addResource(
                { path: "/buster.js", content: "Ok" }
            ).then(
                function () {
                    // TODO: maybe better move the rs.get(..) outside .then()?
                    //       e.g. rs.get("/xxx") times out instead of ReferenceError
                    rs.get("/buster.js").content().then(
                        done(function (c) {
                            assert.equals(c, "Ok!");
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        }
    },

    "adding buster.resource objects": {
        setUp: function () {
            this.resource = rr.createResource("/buster.js", {
                content: "var buster = {};"
            });
        },

        "returns promise": function () {
            assert(when.isPromise(this.rs.addResource(this.resource)));
        },

        "resolves promise with resource": function (done) {
            var rs = this.rs;
            var resource = this.resource;
            rs.addResource(resource).then(
                done(function (actualResource) {
                    assert.equals(actualResource, resource);
                }),
                done(shouldResolve)
            );
        }
    },

    "as array-like": {
        setUp: function () {
            this.resource = rr.createResource("/buster.js", {
                content: "var buster = {};"
            });
        },

        "increments length when adding resource": function (done) {
            var rs = this.rs;
            rs.addResource(this.resource).then(
                done(function () {
                    assert.equals(rs.length, 1);
                }),
                done(shouldResolve)
            );
        },

        "does not increment length when overwriting": function (done) {
            var rs = this.rs;
            var path = this.resource.path;
            rs.addResource(this.resource).then(
                function () {
                    var resource = { path: path, content: "Ok" };
                    rs.addResource(resource).then(
                        done(function () {
                            assert.equals(rs.length, 1);
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "overwrites resource at numeric property": function (done) {
            var rs = this.rs;
            var path = this.resource.path;
            var add1 = rs.addResource({ path: "/meh", content: "Ok" });
            var add2 = rs.addResource(this.resource);
            var add3 = rs.addResource({ path: "/doh", content: "Ye" });
            when.all([add1, add2, add3]).then(
                function () {
                    var resource = { path: path, content: "Ok", etag: "9089" };
                    rs.addResource(resource).then(
                        done(function () {
                            assert.equals(rs[1].etag, "9089");
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "exposes added resource on numeric index": function (done) {
            var rs = this.rs;
            var resource0 = this.resource;
            var resource1 = rr.createResource("/sinon.js", {
                content: "var sinon;"
            });
            when.all([rs.addResource(resource0),
                      rs.addResource(resource1)]).then(
                done(function (resources) {
                    assert.equals(rs.length, 2);
                    assert.same(rs[0], resource0);
                    assert.same(rs[1], resource1);
                }),
                done(shouldResolve)
            );
        }
    },

    "string resources": {
        "resolves path from root path": function (done) {
            this.rs.addResource("foo.js").then(
                function (rs) {
                    assert.equals(rs[0].path, "/foo.js");
                    assert.content(rs[0], "var thisIsTheFoo = 5;", done);
                },
                done(shouldResolve)
            );
        },

        "adds etag to resource": function (done) {
            this.rs.addResource("./foo.js").then(
                done(function (rs) {
                    assert.defined(rs[0].etag);
                }),
                done(shouldResolve)
            );
        },

        "adds resource from glob pattern": function (done) {
            this.rs.addResource("*.js").then(
                done(function (rs) {
                    assert.equals(rs.length, 2);
                    assert.equals(rs[0].path, "/bar.js");
                    assert.equals(rs[1].path, "/foo.js");
                }),
                done(shouldResolve)
            );
        },

        "uses strict globbing": function (done) {
            this.rs.addResource("zyng.js").then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message, "zyng.js");
                })
            );
        },

        "uses strict globbing with multiple patterns": function (done) {
            this.rs.addResources(["zyng.js"]).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message, "zyng.js");
                })
            );
        },

        "uses strict globbing to catch non-matching pattern": function (done) {
            var patterns = ["foo.js", "zyng/*.js"];
            this.rs.addResources(patterns).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message, "zyng/*.js");
                })
            );
        },

        "adds resource from glob pattern and file path": function (done) {
            var rs = this.rs;
            rs.rootPath = Path.join(FIXTURE_DIR, "other-test");
            var patterns = ["some-test.js", "*-test.js"];
            rs.addResources(patterns).then(
                done(function () {
                    assert.equals(rs.length, 1);
                    assert.equals(rs[0].path, "/some-test.js");
                }),
                done(shouldResolve)
            );
        },

        "fails for missing file": function (done) {
            this.rs.addResource("oops.js").then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err.message, "'oops.js' matched no files");
                })
            );
        },

        "fails for file outside root path": function (done) {
            var rs = this.rs;
            rs.addResource("../resource-test.js").then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, Path.join("..", "resource-test.js"));
                    assert.match(err, "outside the project root");
                    assert.match(err, "set rootPath to the desired root");
                    assert.match(err, rs.rootPath, "should mention actual root path");
                })
            );
        }
    },

    "file resources": {
        "creates resource from file": function (done) {
            this.rs.addFileResource("./bar.js", {
                etag: "abc123"
            }).then(
                function (rs) {
                    assert.content(rs, "var helloFromBar = 1;", done);
                },
                done(shouldResolve)
            );
        },

        "does not override custom etag": function (done) {
            this.rs.addFileResource("./foo.js", {
                etag: "abc123"
            }).then(
                done(function (rs) {
                    assert.equals(rs.etag, "abc123");
                }),
                done(shouldResolve)
            );
        },

        "adds resource with custom path": function (done) {
            this.rs.addFileResource("./foo.js", {
                path: "/oh-my"
            }).then(
                done(function (rs) {
                    assert.equals(rs.path, "/oh-my");
                }),
                done(shouldResolve)
            );
        },

        "reads file with specified encoding": function (done) {
            this.rs.addFileResource("./foo.js", {
                encoding: "base64"
            }).then(
                function (rs) {
                    assert.content(rs, "dmFyIHRoaXNJc1RoZUZvbyA9IDU7", done);
                },
                done(shouldResolve)
            );
        }
    },

    "combine": {
        "fails if referenced resources don't exist": function (done) {
            this.rs.addResource({
                path: "buster.js",
                combine: ["a.js", "b.js"]
            }).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err, "Cannot build combined resource /buster.js");
                    assert.match(err, "a.js is not an available resource");
                })
            );
        },

        "combines content of referenced resources in order": function (done) {
            var rs = this.rs;
            rs.addResources(["foo.js", "bar.js"]).then(
                function () {
                    rs.addResource({
                        path: "buster.js",
                        combine: ["foo.js", "bar.js"]
                    }).then(
                        function (resource) {
                            var concat = "var thisIsTheFoo = 5;"
                                       + "var helloFromBar = 1;";
                            assert.content(resource, concat, done);
                        },
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "waits for pending adds before adding": function (done) {
            this.rs.addResources([
                "foo.js", "bar.js",
                { path: "baz.js", combine: ["/foo.js", "/bar.js"] }
            ]).then(
                function (resources) {
                    var concat = "var thisIsTheFoo = 5;var helloFromBar = 1;";
                    assert.content(resources[2], concat, done);
                },
                done(shouldResolve)
            );
        },

        "processes concatenated combined content": function (done) {
            var rs = this.rs;
            rs.addResources([
                "foo.js", { path: "/buster.js", combine: ["foo.js"] }
            ]).then(
                function () {
                    var resource = rs.get("/buster.js");
                    resource.addProcessor(function (resource, content) {
                        return "function () {" + content + "}";
                    });
                    rs.concat().then(
                        function (actualRs) {
                            var concat = "function () {var thisIsTheFoo = 5;}";
                            var resource = actualRs.get("/buster.js");
                            assert.content(resource, concat, done);
                        },
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        }
    },

    "process": {
        setUp: function () {
            this.resources = [
                rr.createResource("/a.txt", { content: "a", etag: "1234" }),
                rr.createResource("/b.txt", { content: "b", etag: "2345" })
            ];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(this.resources[0], "process").returns(deferred.promise);
            this.stub(this.resources[1], "process").returns(deferred.promise);
            this.rs.addResources(this.resources);
        },

        "processes all resources": function (done) {
            var resources = [rr.createResource("/a.txt", { content: "a" }),
                             rr.createResource("/b.txt", { content: "b" })];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(resources[0], "process").returns(deferred.promise);
            this.stub(resources[1], "process").returns(deferred.promise);
            this.rs.addResources(resources);

            this.rs.process().then(
                done(function () {
                    assert.calledOnce(resources[0].process);
                    assert.calledOnce(resources[1].process);
                }),
                done(shouldResolve)
            );
        },

        "skips resources in cache manifest": function (done) {
            var resources = [
                rr.createResource("/a.txt", { content: "a", etag: "1234" }),
                rr.createResource("/b.txt", { content: "b", etag: "2345" })
            ];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(resources[0], "process").returns(deferred.promise);
            this.stub(resources[1], "process").returns(deferred.promise);
            this.rs.addResources(resources);

            this.rs.process({ "/a.txt": ["1234"] }).then(
                done(function () {
                    refute.called(resources[0].process);
                    assert.calledOnce(resources[1].process);
                }),
                done(shouldResolve)
            );
        },

        "requires cache manifest etag match": function (done) {
            var resources = [
                rr.createResource("/a.txt", { content: "a", etag: "1234" }),
                rr.createResource("/b.txt", { content: "b", etag: "2345" })
            ];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(resources[0], "process").returns(deferred.promise);
            this.stub(resources[1], "process").returns(deferred.promise);
            this.rs.addResources(resources);

            this.rs.process({ "/a.txt": ["abcd"] }).then(
                done(function () {
                    assert.calledOnce(resources[0].process);
                    assert.calledOnce(resources[1].process);
                }),
                done(shouldResolve)
            );
        },

        "matches any cached version in manifest": function (done) {
            var resources = [
                rr.createResource("/a.txt", { content: "a", etag: "1234" }),
                rr.createResource("/b.txt", { content: "b", etag: "2345" })
            ];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(resources[0], "process").returns(deferred.promise);
            this.stub(resources[1], "process").returns(deferred.promise);
            this.rs.addResources(resources);

            this.rs.process({
                "/a.txt": ["abcd", "2341", "1234"]
            }).then(
                done(function () {
                    refute.called(resources[0].process);
                    assert.calledOnce(resources[1].process);
                }),
                done(shouldResolve)
            );
        },

        "resolves with cache manifest": function (done) {
            var resources = [
                rr.createResource("/a.txt", { content: "a", etag: "1234" }),
                rr.createResource("/b.txt", { content: "b", etag: "2345" })
            ];
            var deferred = when.defer();
            deferred.resolver.resolve(null);
            this.stub(resources[0], "process").returns(deferred.promise);
            this.stub(resources[1], "process").returns(deferred.promise);
            this.rs.addResources(resources);

            this.rs.process().then(
                done(function (manifest) {
                    assert.equals(manifest, {
                        "/a.txt": ["1234"],
                        "/b.txt": ["2345"]
                    });
                }),
                done(shouldResolve)
            );
        }
    },

    "remove": {
        "makes resource go away": function (done) {
            var rs = this.rs;
            var resource = { path: "/yo", content: "Ok" };
            rs.addResource(resource).then(
                done(function () {
                    rs.remove("/yo");
                    refute.defined(rs.get("/yo"));
                }),
                done(shouldResolve)
            );
        },

        "makes resource at normalized path go away": function (done) {
            var rs = this.rs;
            var resource = { path: "/yo", content: "Ok" };
            rs.addResource(resource).then(
                done(function () {
                    rs.remove("yo");
                    refute.defined(rs.get("yo"));
                }),
                done(shouldResolve)
            );
        },

        "readjusts numeric indices": function (done) {
            var rs = this.rs;
            var add1 = rs.addResource({ path: "/yo", content: "Ok" });
            var add2 = rs.addResource({ path: "/hey", content: "Not Ok" });

            when.all([add1, add2]).then(
                done(function () {
                    rs.remove("yo");
                    assert.equals(rs.length, 1);
                    assert.equals(rs[0], rs.get("/hey"));
                }),
                done(shouldResolve)
            );
        },

        "removes resource from load path": function (done) {
            var rs = this.rs;
            var add1 = rs.addResource({ path: "/yo", content: "Ok" });
            var add2 = rs.addResource({ path: "/hey", content: "Not Ok" });

            when.all([add1, add2]).then(
                done(function () {
                    rs.loadPath.append("/yo");
                    rs.remove("/yo");
                    assert.equals(rs.loadPath.paths(), []);
                }),
                done(shouldResolve)
            );
        }
    },

    "enumerability": {
        setUp: function (done) {
            when.all([
                this.rs.addResource({ path: "/1.js", content: "1.js" }),
                this.rs.addResource({ path: "/2.js", content: "2.js" }),
                this.rs.addResource({ path: "/3.js", content: "3.js" })
            ]).then(
                done,
                done(shouldResolve)
            );
        },

        "forEach": function () {
            var resources = [];
            this.rs.forEach(function (rs) { resources.push(rs.path); });

            assert.equals(resources, ["/1.js", "/2.js", "/3.js"]);
        },

        "map": function () {
            var resources = this.rs.map(function (rs) { return rs.path; });

            assert.equals(resources, ["/1.js", "/2.js", "/3.js"]);
        },

        "reduce": function () {
            var resources = this.rs.reduce(function (res, rs) {
                res.push(rs.path);
                return res;
            }, []);

            assert.equals(resources, ["/1.js", "/2.js", "/3.js"]);
        }
    },

    "serializing": {
        "resolves as object": function (done) {
            this.rs.serialize().then(
                done(function (serialized) {
                    assert.isObject(serialized);
                }),
                done(shouldResolve)
            );
        },

        "serializes content resource": function (done) {
            var rs = this.rs;
            var add = rs.addResource({
                path: "/buster.js",
                content: "var a = 42;"
            });

            add.then(
                function () {
                    rs.serialize().then(
                        done(function (serialized) {
                            assert.equals(serialized, {
                                loadPath: [],
                                resources: [{
                                    encoding: "utf-8",
                                    path: "/buster.js",
                                    content: "var a = 42;",
                                    cacheable: true
                                }]
                            });
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "serializes resource meta data": function (done) {
            var rs = this.rs;
            var add = rs.addResource({
                path: "/buster.js",
                content: "var a = 42;",
                etag: "1234abcd",
                headers: { "X-Buster": "Aww yeah" }
            });

            add.then(
                function () {
                    rs.serialize().then(
                        done(function (serialized) {
                            assert.equals(serialized, {
                                loadPath: [],
                                resources: [{
                                    encoding: "utf-8",
                                    path: "/buster.js",
                                    content: "var a = 42;",
                                    etag: "1234abcd",
                                    headers: { "X-Buster": "Aww yeah" },
                                    cacheable: true
                                }]
                            });
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "serializes backend resource": function (done) {
            var rs = this.rs;
            var add = rs.addResource({
                path: "/app",
                backend: "http://localhost:3000/app"
            });

            add.then(
                function () {
                    rs.serialize().then(
                        done(function (serialized) {
                            assert.equals(serialized, {
                                loadPath: [],
                                resources: [{
                                    path: "/app",
                                    backend: "http://localhost:3000/app"
                                }]
                            });
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "waits for pending added resource": function (done) {
            var rs = this.rs;
            rs.addResource("foo.js");
            rs.serialize().then(
                done(function (serialized) {
                    assert.match(serialized, {
                        resources: [{
                            path: "/foo.js",
                            content: "var thisIsTheFoo = 5;"
                        }]
                    });
                }),
                done(shouldResolve)
            );
        },

        "combine resource strips out content": function (done) {
            var rs = this.rs;
            rs.addResource({ path: "/buster.js", content: " Buster" });
            rs.addResource({ path: "/sinon.js", content: " Sinon" });
            rs.addResource({
                path: "/bundle.js",
                combine: ["/buster.js", "/sinon.js"]
            });

            rs.serialize().then(
                done(function (serialized) {
                    assert.equals(serialized.resources[2], {
                        encoding: "utf-8",
                        path: "/bundle.js",
                        combine: ["/buster.js", "/sinon.js"],
                        cacheable: true
                    });
                }),
                done(shouldResolve)
            );
        },

        "file resources": function (done) {
            this.rs.addResources(["foo.js", "bar.js"]);

            this.rs.serialize().then(
                done(function (serialized) {
                    assert.match(serialized.resources, [{
                        path: "/foo.js",
                        encoding: "utf-8",
                        content: "var thisIsTheFoo = 5;",
                        etag: /^[a-z0-9]+$/
                    }, {
                        path: "/bar.js",
                        encoding: "utf-8",
                        content: "var helloFromBar = 1;",
                        etag: /^[a-z0-9]+$/
                    }]);
                }),
                done(shouldResolve)
            );
        },

        "clears content for cached resources": function (done) {
            this.rs.addResource({
                path: "/foo.js",
                content: "Yeye",
                etag: "abc"
            });

            this.rs.addResource({
                path: "/bar.js",
                content: "Oh noes",
                etag: "123"
            });

            this.rs.serialize({
                "/foo.js": ["abc", "abd"],
                "/bar.js": ["ddd", "000", "123", "124"]
            }).then(
                done(function (serialized) {
                    assert.equals(serialized.resources[0].content, "");
                    assert.equals(serialized.resources[1].content, "");
                }),
                done(shouldResolve)
            );
        },

        "does not call content() at all for cached resources": function (done) {
            this.rs.addResource(
                { path: "/foo.js", content: this.stub().throws(), etag: "abc" }
            );
            this.rs.addResource(
                { path: "/bar.js", content: this.stub().throws(), etag: "123" }
            );

            this.rs.serialize({
                "/foo.js": ["abc", "abd"],
                "/bar.js": ["ddd", "000", "123", "124"]
            }).then(
                done(function (serialized) {
                    assert.equals(serialized.resources.length, 2);
                }),
                done(shouldResolve)
            );
        },

        "does not cache resources where etag does not match": function (done) {
            this.rs.addResource(
                { path: "/foo.js", content: "Ok", etag: "abc" }
            );
            this.rs.addResource(
                { path: "/bar.js", content: "Meh", etag: "123" }
            );

            this.rs.serialize({
                "/foo.js": ["acc", "abd"],
                "/baz.js": ["ddd", "000", "123", "124"]
            }).then(
                done(function (serialized) {
                    assert.equals(serialized.resources[0].content, "Ok");
                    assert.equals(serialized.resources[1].content, "Meh");
                }),
                done(shouldResolve)
            );
        },

        "includes load path": function (done) {
            var rs = this.rs;
            rs.addResources(["foo.js", "bar.js"]).then(
                function () {
                    rs.loadPath.append(["foo.js", "bar.js"]);
                },
                done(shouldResolve)
            );

            rs.serialize().then(
                done(function (serialized) {
                    assert.match(serialized.loadPath, ["/foo.js", "/bar.js"]);
                }),
                done(shouldResolve)
            );
        },

        "fails if a resource can not be serialized": function (done) {
            var rs = this.rs;
            rs.addResource({
                path: "/foo.js",
                content: function () { throw new Error("Oops"); }
            }).then(
                function () {
                    rs.serialize().then(
                        done(shouldReject),
                        done(function (err) {
                            assert.defined(err);
                            assert.match(err, "Oops");
                        })
                    );
                },
                done(shouldResolve)
            );
        }
    },

    "deserialize": {
        "resolves as resource set with single resource": function (done) {
            rr.deserialize({ resources: [{
                path: "/buster.js",
                content: "Hey mister"
            }] }).then(
                function (rs) {
                    assert.defined(rs.get("/buster.js"));
                    assert.content(rs.get("/buster.js"), "Hey mister", done);
                },
                done(shouldResolve)
            );
        },

        "resolves resource set with two resources": function (done) {
            rr.deserialize({ resources: [{
                path: "/buster.js",
                content: "Hey mister"
            }, {
                path: "/buster2.js",
                content: "Yo mister"
            }] }).then(
                done(function (rs) {
                    assert.equals(rs.length, 2);
                    assert.defined(rs.get("/buster.js"));
                    assert.defined(rs.get("/buster2.js"));
                }),
                done(shouldResolve)
            );
        },

        "resolves resource set with load path": function (done) {
            rr.deserialize({ loadPath: ["/buster.js"], resources: [{
                path: "/buster.js",
                content: "Hey mister"
            }, {
                path: "/buster2.js",
                content: "Yo mister"
            }] }).then(
                done(function (rs) {
                    assert.equals(rs.loadPath.paths(), ["/buster.js"]);
                }),
                done(shouldResolve)
            );
        },

        "deserializes serialized resource set": function (done) {
            var rs = rr.createResourceSet(FIXTURE_DIR);
            rs.addResources(["foo.js", "bar.js"]);
            var cb = buster.countdown(2, done);
            rs.serialize().then(
                function (serialized) {
                    rr.deserialize(serialized).then(
                        function (actualRs) {
                            assert.equals(actualRs.length, rs.length);
                            assert.equals(actualRs.loadPath.paths(), rs.loadPath.paths());
                            assert.resourceEqual(actualRs.get("/foo.js"),
                                                 rs.get("/foo.js"), cb);
                            assert.resourceEqual(actualRs.get("/bar.js"),
                                                 rs.get("/bar.js"), cb);
                        },
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "rejects if deserialized data is corrupt": function (done) {
            rr.deserialize({ loadPath: ["/buster.js"], resources: [{
                path: "/buster.js"
            }] }).then(
                done(shouldReject),
                done(function (err) {
                    assert.defined(err);
                    assert.match(err, "No content");
                })
            );
        },

        "deserializes cacheable flag": function (done) {
            rr.deserialize({ resources: [{
                path: "/buster.js",
                content: "Hey mister",
                cacheable: false
            }, {
                path: "/sinon.js",
                content: "Yo",
                cacheable: true
            }] }).then(
                done(function (rs) {
                    assert.isFalse(rs.get("/buster.js").cacheable);
                    assert.isTrue(rs.get("/sinon.js").cacheable);
                }),
                done(shouldResolve)
            );
        },

        "resolves resource with alternatives": function (done) {
            rr.deserialize({ resources: [{
                path: "/buster.js",
                content: "Hey mister",
                alternatives: [{
                    mimeType: "text/uppercase",
                    content: "YOYO"
                }]
            }] }).then(
                function (rs) {
                    var resource = rs.get("/buster.js");
                    var alternative = resource.getContentFor("text/uppercase");
                    assert(alternative);
                    assert.content(alternative, "YOYO", done);
                },
                done(shouldResolve)
            );
        }
    },

    "concat": {
        "creates new resource set": function () {
            var rs1 = rr.createResourceSet();
            var rs2 = rr.createResourceSet();

            var rs3 = rs1.concat(rs2);

            refute.same(rs1, rs3);
            refute.same(rs2, rs3);
        },

        "adds resources from all sources": function (done) {
            var rs1 = rr.createResourceSet();
            var add1 = rs1.addResource({ path: "/buster.js", content: "Ok" });
            var rs2 = rr.createResourceSet();
            var add2 = rs2.addResource({ path: "/sinon.js", content: "Nok" });
            var rs3 = rr.createResourceSet();
            var add3 = rs2.addResource({ path: "/when.js", content: "when()" });

            when.all([add1, add2, add3]).then(
                done(function () {
                    var rs4 = rs1.concat(rs2, rs3);
                    var cb = buster.countdown(3, done);

                    assert.content(rs4.get("/buster.js"), "Ok", cb);
                    assert.content(rs4.get("/sinon.js"), "Nok", cb);
                    assert.content(rs4.get("/when.js"), "when()", cb);
                }),
                done(shouldResolve)
            );
        },

        "resources overwrite from right to left": function (done) {
            var rs1 = rr.createResourceSet();
            var add1 = rs1.addResource({ path: "/buster.js", content: "Ok" });
            var rs2 = rr.createResourceSet();
            var add2 = rs2.addResource({ path: "/buster.js", content: "Nok" });

            when.all([add1, add2]).then(
                done(function () {
                    var rs3 = rs1.concat(rs2);
                    assert.content(rs3.get("/buster.js"), "Nok", done);
                }),
                done(shouldResolve)
            );
        },

        "appends load in order": function (done) {
            var rs1 = rr.createResourceSet();
            var add1 = rs1.addResource({ path: "/buster.js", content: "Ok" });
            var rs2 = rr.createResourceSet();
            var add2 = rs2.addResource({ path: "/sinon.js", content: "Nok" });

            when.all([add1, add2]).then(
                done(function () {
                    rs1.loadPath.append("/buster.js");
                    rs2.loadPath.append("/sinon.js");
                    var rs = rs1.concat(rs2);
                    var paths = rs.loadPath.paths();
                    assert.equals(rs.loadPath.paths(), ["/buster.js", "/sinon.js"]);
                }),
                done(shouldResolve)
            );
        },

        "concats backend resources": function (done) {
            var rs1 = rr.createResourceSet();

            rs1.addResource({
                path: "/buster",
                backend: "localhost:1111"
            }).then(
                done(function () {
                    var rs = rs1.concat();
                    assert.equals(rs.get("buster").backend, "localhost:1111");
                }),
                done(shouldResolve)
            );
        },

        "concats combine resources": function (done) {
            var rs1 = rr.createResourceSet();
            rs1.addResources([
                { path: "/a", content: "1" },
                { path: "/b", content: "2" },
                { path: "/c", combine: ["/a", "/b"] }
            ]).then(
                function () {
                    rs1.concat().then(
                        done(function (rs) {
                            assert.defined(rs.get("/c"));
                            assert.equals(rs.get("/c").combine, ["/a", "/b"]);
                        }),
                        done(shouldResolve)
                    );
                },
                done(shouldResolve)
            );
        },

        "uses rootpath of target resource set": function () {
            var rs1 = rr.createResourceSet("/tmp");
            var rs2 = rr.createResourceSet("/var");

            var rs3 = rs1.concat(rs2);

            assert.equals(rs3.rootPath, "/tmp");
        },

        "restricts length to unique resources": function (done) {
            var rs1 = rr.createResourceSet();
            var add1 = rs1.addResource({ path: "/buster.js", content: "Ok" });
            var add2 = rs1.addResource({ path: "/sinon.js", content: "Yep" });

            when.all([add1, add2]).then(
                done(function () {
                    var rs2 = rs1.concat();
                    var rs3 = rs1.concat();
                    var rs4 = rs1.concat(rs2, rs3);
                    assert.equals(rs4.length, 2);
                }),
                done(shouldResolve)
            );
        }
    },

    "appendLoad": {
        setUp: function (done) {
            this.rs = rr.createResourceSet(FIXTURE_DIR);
            var resource = { path: "/buster.js", content: "Ok" };
            this.rs.addResource(resource).then(
                done,
                done(shouldResolve)
            );
        },

        "adds existing resource to load path": function (done) {
            this.rs.addResource({ path: "/foo.js", content: "Yeah" });
            this.rs.appendLoad("foo.js").then(
                done(function (loadPath) {
                    assert.equals(loadPath.paths(), ["/foo.js"]);
                }),
                done(shouldResolve)
            );
        },

        "adds multiple existing resources to load path": function (done) {
            this.rs.addResource({ path: "/foo.js", content: "Yeah" });
            this.rs.addResource({ path: "/bar.js", content: "Hmm" });
            this.rs.appendLoad(["foo.js", "bar.js"]).then(
                done(function (lp) {
                    assert.equals(lp.paths(), ["/foo.js", "/bar.js"]);
                }),
                done(shouldResolve)
            );
        },

        "adds existing resources to load path using globs": function (done) {
            this.rs.addResource({ path: "/tmp/foo.js", content: "Yeah" });
            this.rs.addResource({ path: "/tmp/bar.js", content: "Hmm" });
            this.rs.appendLoad(["/tmp/*.js"]).then(
                done(function (loadPath) {
                    var expected = ["/tmp/foo.js", "/tmp/bar.js"];
                    assert.equals(loadPath.paths(), expected);
                }),
                done(shouldResolve)
            );
        },

        "adds non-existing resource": function (done) {
            var rs = this.rs;
            rs.appendLoad("foo.js").then(
                function (loadPath) {
                    assert.equals(loadPath.paths(), ["/foo.js"]);
                    var content = "var thisIsTheFoo = 5;";
                    assert.content(rs.get("/foo.js"), content, done);
                },
                done(shouldResolve)
            );
        },

        "adds non-existing resources": function (done) {
            var rs = this.rs;
            rs.appendLoad("*.js").then(
                function (lp) {
                    var cb = buster.countdown(2, done);
                    assert.equals(lp.paths(), ["/bar.js", "/foo.js", "/buster.js"]);
                    assert.content(rs.get("/bar.js"), "var helloFromBar = 1;", cb);
                    assert.content(rs.get("/foo.js"), "var thisIsTheFoo = 5;", cb);
                },
                done(shouldResolve)
            );
        },

        "does not add duplicate entries": function (done) {
            var rs = this.rs;
            rs.addResource({ path: "/foo.js", content: "Ok" });
            var paths = ["foo.js", "bar.js", "*.js"];
            rs.appendLoad(paths).then(
                done(function (lp) {
                    assert.equals(lp.paths(), ["/foo.js", "/bar.js", "/buster.js"]);
                }),
                done(shouldResolve)
            );
        },

        "fails for non-existent resource": function (done) {
            var paths = ["*.js", "*.txt"];
            this.rs.appendLoad(paths).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message,
                                 "'*.txt' matched no files or resources");
                })
            );
        },

        "fails for non-existent resource with leading slash": function (done) {
            var paths = ["/*.js", "/*.txt"];
            this.rs.appendLoad(paths).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message,
                                 "'/*.txt' matched no files or resources");
                })
            );
        }
    },

    "prependLoad": {
        setUp: function (done) {
            this.rs = rr.createResourceSet(FIXTURE_DIR);
            var resource = { path: "/buster.js", content: "Ok" };
            this.rs.addResource(resource).then(
                done,
                done(shouldResolve)
            );
        },

        "adds existing resource to load path": function (done) {
            this.rs.addResource({ path: "/foo.js", content: "Yeah" });
            this.rs.prependLoad("foo.js").then(
                done(function (loadPath) {
                    assert.equals(loadPath.paths(), ["/foo.js"]);
                }),
                done(shouldResolve)
            );
        },

        "adds multiple existing resources to load path": function (done) {
            this.rs.addResource({ path: "/foo.js", content: "Yeah" });
            this.rs.addResource({ path: "/bar.js", content: "Hmm" });
            this.rs.prependLoad(["foo.js", "bar.js"]).then(
                done(function (lp) {
                    assert.equals(lp.paths(), ["/foo.js", "/bar.js"]);
                }),
                done(shouldResolve)
            );
        },

        "adds existing resources to load path using globs": function (done) {
            this.rs.addResource({ path: "/tmp/foo.js", content: "Yeah" });
            this.rs.addResource({ path: "/tmp/bar.js", content: "Hmm" });
            this.rs.prependLoad(["/tmp/*.js"]).then(
                done(function (loadPath) {
                    var expected = ["/tmp/foo.js", "/tmp/bar.js"];
                    assert.equals(loadPath.paths(), expected);
                }),
                done(shouldResolve)
            );
        },

        "adds non-existing resource": function (done) {
            var rs = this.rs;
            rs.prependLoad("foo.js").then(
                function (loadPath) {
                    assert.equals(loadPath.paths(), ["/foo.js"]);
                    var content = "var thisIsTheFoo = 5;";
                    assert.content(rs.get("/foo.js"), content, done);
                },
                done(shouldResolve)
            );
        },

        "adds non-existing resources": function (done) {
            var rs = this.rs;
            rs.prependLoad("*.js").then(
                function (lp) {
                    var cb = buster.countdown(2, done);
                    assert.equals(lp.paths(), ["/bar.js", "/foo.js", "/buster.js"]);
                    assert.content(rs.get("/bar.js"), "var helloFromBar = 1;", cb);
                    assert.content(rs.get("/foo.js"), "var thisIsTheFoo = 5;", cb);
                },
                done(shouldResolve)
            );
        },

        "does not add duplicate entries": function (done) {
            var rs = this.rs;
            rs.addResource({ path: "/foo.js", content: "Ok" });
            var paths = ["foo.js", "bar.js", "*.js"];
            rs.prependLoad(paths).then(
                done(function (loadPath) {
                    assert.equals(loadPath.paths(),
                                  ["/bar.js", "/buster.js", "/foo.js"]);
                }),
                done(shouldResolve)
            );
        },

        "fails for non-existent resource": function (done) {
            var paths = ["*.js", "*.txt"];
            this.rs.prependLoad(paths).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message,
                                 "'*.txt' matched no files or resources");
                })
            );
        },

        "fails for non-existent resource with leading slash": function (done) {
            var paths = ["/*.js", "/*.txt"];
            this.rs.prependLoad(paths).then(
                done(shouldReject),
                done(function (err) {
                    assert.match(err.message,
                                 "'/*.txt' matched no files or resources");
                })
            );
        }
    },

    "then": {
        setUp: function () {
            this.rs = rr.createResourceSet(FIXTURE_DIR);
        },

        "calls callback after pending operations": function (done) {
            var rs = this.rs;
            rs.addResource("foo.js");
            rs.addResource("bar.js");

            rs.then(
                done(function () {
                    assert.equals(rs.length, 2);
                }),
                done(shouldResolve)
            );
        },

        "calls callback with resource set": function (done) {
            var rs = this.rs;
            rs.addResource("foo.js");
            rs.addResource("bar.js");

            rs.then(
                done(function (actualRs) {
                    assert.same(actualRs, rs);
                }),
                done(shouldResolve)
            );
        }
    }
});
