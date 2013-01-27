var B = require("buster");
var rr = require("../lib/ramp-resources");
var when = require("when");
var http = require("http");
var util = require("util");

/* internal functions ------------------------------------------------------ */

function verifyResourceError(message, e) {
    if (e.name !== "InvalidResourceError") {
        B.assertions.fail("Expected rr.createResource to fail with " +
                  "InvalidResourceError, but failed with " + e.name);
    }
    if (!new RegExp(message).test(e.message)) {
        B.assertions.fail("Expected InvalidResourceError message (" +
                  e.message + ") to match " + message);
    }
    return true;
}

/* additional assertions on buster object ---------------------------------- */

B.assertions.add("invalidResource", {
    assert: function (path, res, message) {
        var ret;
        try {
            if (typeof path === "string") {
                rr.createResource(path, res);
                ret = false;
            } else {
                path.addResource(res).then(
                    function () {},
                    function (err) {
                        ret = verifyResourceError(message, err);
                    }
                );
                return ret;
            }
        } catch (e) {
            ret = verifyResourceError(message, e);
        }
        return ret;
    },
    assertMessage: "Expected to fail"
});

B.assertions.add("content", {
    assert: function (resource, expected, done) {
        resource.content().then(
            done(function (actual) {
                assert.same(actual, expected);
            }),
            done(function (err) {
                buster.log(err.stack);
                B.assertions.fail("content() rejected");
            })
        );
        return true;
    }
});

B.assertions.add("resourceEqual", {
    assert: function (res1, res2, done) {
        var equal = res1.path === res2.path
                 && res1.etag === res2.etag
                 && res1.encoding === res2.encoding
                 && B.assertions.deepEqual(res1.headers(), res2.headers());
        if (!equal) {
            done();
            return false;
        }

        when.all([res1.content(), res2.content()]).then(
            done(function (contents) {
                assert.equals(contents[0], contents[1]);
            })
        );
        return true;
    },
    assertMessage: "Expected resources ${0} and ${1} to be equal"
});

/* exported functions ------------------------------------------------------ */

/**
 * Use in tests of promises-based code, to guard the unexpected code path.
 * Wrap with `done` and drop in as *non-error* callback if you expect the
 * promise to reject.
 * Example:
 *   promise.then(
 *       done(shouldReject),    // <- non-error callback guard
 *       done(function(err) {
 *           // assert on err
 *       })
 *   );
 */
function shouldReject(arg) {
    var msg = "Expected promise to reject";
    if (util.isError(arg)) { // possible misuse: maybe we are the error-cb?
        msg += " [check your test - did you mean 'shouldResolve'?] Got " + arg;
    }
    B.assertions.fail(msg);
}

/**
 * Use in tests of promises-based code, to guard the unexpected code path.
 * Wrap with `done` and drop in as *error* callback if you expect the
 * promise to resolve.
 * Example:
 *   promise.then(
 *       done(function(val) {
 *           // assert on val
 *       }),
 *       done(shouldResolve)    // <- error callback guard
 *   );
 */
function shouldResolve(err) {
    var msg = "Expected promise to resolve";
    if (!util.isError(err)) { // possible misuse: maybe we are the non-error-cb?
        msg += " [check your test - did you mean 'shouldReject'?]";
        msg += (arguments.length > 0)
                ? " Got non-error arg '" + err + "'"
                : " Got no args";
    } else {
        msg += " but yielded " + err;
        var logMsg = err && (err.stack || err.message);
        if (logMsg) {
            B.log(logMsg);
        }
    }
    B.assertions.fail(msg);
}

function reqBody(res, encoding, callback) {
    var data = "";
    res.setEncoding(encoding);
    res.on("data", function (chunk) { data += chunk; });
    res.on("end", function () { callback(data); });
}

function req(opt, callback) {
    opt = opt || {};
    var encoding = opt.encoding || "utf-8";
    delete opt.encoding;
    var resultReq = http.request(buster.extend({
        method: "GET",
        host: "localhost",
        port: 2233
    }, opt));
    resultReq.on("response", function (res) {
        reqBody(res, encoding, function (data) {
            if (callback) {
                callback(resultReq, res, data);
            }
        });
    });
    return resultReq;
}

// maybe rename to serverSetUp? there's serverTearDown, at last
function createServer(middleware, done) {
    var server = http.createServer(function (req, res) {
        if (!middleware.respond(req, res)) {
            res.writeHead(418);
            res.end("Short and stout");
        }
    });
    server.listen(2233, done);
    return server;
}

function serverTearDown(done) {
    this.server.on("close", done);
    this.server.close();
}

// would be nicer to have it just like createServer / serverTearDown
function createProxyBackend(port) {
    var backend = { requests: [] };

    var server = http.createServer(function (req, res) {
        backend.requests.push({ req: req, res: res });
        if (backend.onRequest) {
            reqBody(req, "utf-8", function (body) {
                backend.onRequest(req, res, body);
            });
        }
    });
    server.listen(port);

    backend.close = function (done) { // to be called in tearDown
        var i, l;
        for (i = 0, l = backend.requests.length; i < l; ++i) {
            if (!backend.requests[i].res.ended) {
                backend.requests[i].res.end();
            }
        }
        server.on("close", done);
        server.close();
    };

    return backend;
}

module.exports = {
    shouldReject: shouldReject,
    shouldResolve: shouldResolve,
    reqBody: reqBody,
    req: req,
    createServer: createServer,
    serverTearDown: serverTearDown,
    createProxyBackend: createProxyBackend
};