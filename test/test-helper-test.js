/*jslint maxlen:100*/
var buster = require("buster");
var rr = require("../lib/ramp-resources");

var h = require("./test-helper.js");

buster.testCase("Test helpers", {
    setUp: function () {
        var self = this;

        var f;
        self.replaceBustersFail = function () {
            if (self.failStubbed) {
                throw new Error("Buster's fail has already been replaced!");
            }
            f = self.stub(buster.assertions, "fail");
            self.failStubbed = true;
        };
        self.restoreBustersFail = function () {
            if (!self.failStubbed) {
                throw new Error("Buster's fail was never replaced!");
            }
            f.restore();
            self.failStubbed = false;
            return f;
        };

        var l;
        self.replaceBustersLog = function () {
            if (self.logStubbed) {
                throw new Error("Buster's log has already been replaced!");
            }
            l = self.stub(buster, "log");
            self.logStubbed = true;
        };
        self.restoreBustersLog = function () {
            if (!self.logStubbed) {
                throw new Error("Buster's log was never replaced!");
            }
            l.restore();
            self.logStubbed = false;
            return l;
        };
    },

    tearDown: function () {
        if (this.failStubbed) {
            throw new Error("Check your test - must call this.restoreBustersFail()!");
        }
        if (this.logStubbed) {
            throw new Error("Check your test - must call this.restoreBustersLog()!");
        }
    },

    "shouldReject": {

        "with no arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                h.shouldReject();
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, "reject", "failure message");
            },

            "does NOT warn about possible misuse": function () {
                this.replaceBustersFail();
                h.shouldReject();
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                refute.match(m, "check your test", "should NOT give hint about possible test bug");
                refute.match(m, "'shouldResolve'", "should NOT mention its dual function");
            }
        },

        "with error arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                h.shouldReject(new TypeError("Boom!"));
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, "reject", "failure message");
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Boom!", "should mention error message");
            },

            "warns about possible misuse": function () {
                this.replaceBustersFail();
                h.shouldReject(new TypeError("Boom!"));
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, "check your test", "should give hint about possible bug in test");
                assert.match(m, "'shouldResolve'", "should mention its dual function");
            }
        },

        "with non-error arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                h.shouldReject("NotAnError");
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, "reject", "failure message");
                refute.match(m, "NotAnError", "should NOT mention actual arg");
            },

            "does NOT warn about possible": function () {
                this.replaceBustersFail();
                h.shouldReject("NotAnError");
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                refute.match(m, "check your test", "should NOT give hint about possible test bug");
                refute.match(m, "'shouldResolve'", "should NOT mention its dual function");
            }
        }
    },

    "shouldResolve": {

        "with no arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                h.shouldResolve();
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, "resolve", "failure message");
                refute.match(m, "undefined", "should NOT mention \"virtual\" arg ('undefined')");
            },

            "warns about possible misuse": function () {
                this.replaceBustersFail();
                h.shouldResolve();
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, "check your test", "should give hint about possible bug in test");
                assert.match(m, "'shouldReject'", "should mention its dual function");
            }
        },

        "with non-error arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                h.shouldResolve("NotAnError");
                var f = this.restoreBustersFail();

                assert.called(f);
                var m0 = f.args[0][0];
                assert.match(m0, /should|expected/i, "failure message");
                assert.match(m0, "resolve", "failure message");
                assert.match(m0, "NotAnError", "should mention actual arg");
            },

            "warns about possible misuse": function () {
                this.replaceBustersFail();
                h.shouldResolve("NotAnError");
                var f = this.restoreBustersFail();

                assert.called(f);
                var m0 = f.args[0][0];
                assert.match(m0, "check your test", "should give hint about possible bug in test");
                assert.match(m0, "'shouldReject'", "should mention its dual function");
            }
        },

        "with error arg": {

            "triggers a fail": function () {
                this.replaceBustersFail();
                this.replaceBustersLog(); // suppress log output
                h.shouldResolve(new TypeError("Bang!"));
                var f = this.restoreBustersFail();
                var l = this.restoreBustersLog();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, "resolve", "failure message");
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Bang!", "should mention error message");
            },

            "writes error's stack to buster.log": function () {
                this.replaceBustersFail();
                this.replaceBustersLog(); // log output is under test
                var error = new TypeError("Crash!");
                h.shouldResolve(error);
                var f = this.restoreBustersFail();
                var l = this.restoreBustersLog();

                assert.called(l);
                var m = l.args[0][0];
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Crash!", "should mention error message");
                assert.match(m, error.stack, "should contain error stack");
            },

            "does NOT warn about possible misuse": function () {
                this.replaceBustersFail();
                this.replaceBustersLog(); // suppress log output
                h.shouldResolve(new Error());
                var f = this.restoreBustersFail();
                var l = this.restoreBustersLog();

                assert.called(f);
                var m = f.args[0][0];
                refute.match(m, "check your test", "should NOT give hint about possible test bug");
                refute.match(m, "'shouldReject'", "should NOT mention its dual function");
            }
        }
    },

    "=>resourceEqual": {

        setUp: function () {
            var rs1 = rr.createResourceSet();
            // TODO: why ain't addResource*s* working?
            rs1.addResource({ path: "/foo", content: "da foo" });
            rs1.addResource({ path: "/bar", content: "da bar" });
            this.res1a = rs1.get("/foo");
            this.res1b = rs1.get("/bar");

            var rs2 = rr.createResourceSet();
            rs2.addResource({ path: "/foo", content: "other foo" });
            this.res2a = rs2.get("/foo");
        },

        "passes with equal resources": function (done) {
            assert.resourceEqual(this.res1a, this.res1a, done);
            // this also tests if resourceEquals calls 'done', as we don't here
        },


        "with resources differing in path": {

            "fails": function (done) {
                var doneSpy = this.spy(); // just some function that does nothing

                this.replaceBustersFail();
                assert.resourceEqual(this.res1a, this.res1b, doneSpy);
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, /to( be)? equal/i, "failure message should require equality");
                done();
            },

            // This test is a little too specific w.r.t the use of 'done' in that
            // it prescribes how *exactly* it's being used: as `done()`.
            // However, more important than full generality is to test that the
            // the async test callback is indeed called to indicate end of test.
            "calls its 'done' arg": function (done) {
                var doneSpy = this.spy();

                this.replaceBustersFail();
                assert.resourceEqual(this.res1a, this.res1b, doneSpy);
                this.restoreBustersFail();

                assert.equals(doneSpy.callCount, 1, "should have called its 'done' exactly once");
                assert.equals(doneSpy.args[0], [], "should have called its 'done' without args");
                done();
            }

        },

        "with resources differing only in content": {

            "fails": function (done) {
                this.replaceBustersFail();
                assert.resourceEqual(this.res1a, this.res2a, done);
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /should|expected/i, "failure message");
                assert.match(m, /to( be)? equal/i, "failure message should require equality");

                // Note: we DO NOT call 'done' ourselves, thereby implicitly requiring
                //       resourceEquals to do it properly
            },

            "guards against unexpected promise reject": function (done) {
                var err = new Error("I'm only here to make the promise reject!");
                this.res2a.content = function () {
                    return { then: function() {
                        throw err;
                    }};
                };

                this.replaceBustersFail();
                this.replaceBustersLog();   // silence log
                assert.resourceEqual(this.res1a, this.res2a, done);
                this.restoreBustersLog();
                var f = this.restoreBustersFail();

                assert.called(f);
                var m = f.args[0][0];
                assert.match(m, /(should|expected)(.+)resolve/i, "should report reject");
                assert.match(m, err.name, "should mention actual error type");
                assert.match(m, err.message, "should mention actual error message");

                // Note: we DO NOT call 'done' ourselves, thereby implicitly requiring
                //       resourceEquals to do it properly
            }
        }
    }
});