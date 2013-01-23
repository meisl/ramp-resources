/*jslint maxlen:100*/
var buster = require("buster");
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

        "with no arg triggers a fail": function () {
            this.replaceBustersFail();
            h.shouldReject();
            var f = this.restoreBustersFail();

            assert.called(f);
            var m = f.args[0][0];
            assert.match(m, /should|expected/i, "failure message");
            assert.match(m, "reject", "failure message");
        },

        "with error arg triggers a fail and warns about possible misuse": function () {
            this.replaceBustersFail();
            h.shouldReject(new TypeError("Boom!"));
            var f = this.restoreBustersFail();

            assert.called(f);
            var m = f.args[0][0];
            assert.match(m, /should|expected/i, "failure message");
            assert.match(m, "reject", "failure message");
            assert.match(m, "TypeError", "should mention error type");
            assert.match(m, "Boom!", "should mention error message");
            assert.match(m, "check your test", "should give hint about possible bug in test");
            assert.match(m, "'shouldResolve'", "should mention its dual function");
        },

        "with non-error arg triggers a fail, WITHOUT possible-misuse-warning": function () {
            this.replaceBustersFail();
            h.shouldReject("NotAnError");
            var f = this.restoreBustersFail();

            assert.called(f);
            var m = f.args[0][0];
            assert.match(m, /should|expected/i, "failure message");
            assert.match(m, "reject", "failure message");
            refute.match(m, "NotAnError", "should not mention actual arg");
            refute.match(m, "check your test", "should not give hint about possible bug in test");
            refute.match(m, "'shouldResolve'", "should not mention its dual function");
        }
    },

    "shouldResolve": {

        "with no arg triggers a fail and warns about possible misuse": function () {
            this.replaceBustersFail();
            h.shouldResolve();
            var f = this.restoreBustersFail();

            assert.called(f);
            var m0 = f.args[0][0];
            assert.match(m0, /should|expected/i, "failure message");
            assert.match(m0, "resolve", "failure message");
            assert.match(m0, "check your test", "should give hint about possible bug in test");
            assert.match(m0, "'shouldReject'", "should mention its dual function");
            refute.match(m0, "undefined", "should not mention \"virtual\" arg ('undefined')");
        },

        "with non-error arg triggers a fail and warns about possible misuse": function () {
            this.replaceBustersFail();
            h.shouldResolve("NotAnError");
            var f = this.restoreBustersFail();

            assert.called(f);
            var m0 = f.args[0][0];
            assert.match(m0, /should|expected/i, "failure message");
            assert.match(m0, "resolve", "failure message");
            assert.match(m0, "check your test", "should give hint about possible bug in test");
            assert.match(m0, "'shouldReject'", "should mention its dual function");
            assert.match(m0, "NotAnError", "should mention actual arg");
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
                this.replaceBustersLog();
                var error = new TypeError("Crash!");
                h.shouldResolve(error);
                var f = this.restoreBustersFail();
                var l = this.restoreBustersLog();
                var m = l.args[0][0];

                assert.calledOnce(l);
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Crash!", "should mention error message");
                assert.match(m, error.stack, "should contain error stack");
            }
        }
    }
});