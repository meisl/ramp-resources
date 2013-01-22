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

    "shouldProduceError": {

        "with no arg triggers 1 fail": function () {
            this.replaceBustersFail();
            h.shouldProduceError();
            var f = this.restoreBustersFail();
            var m = f.args[0][0];

            assert.calledOnce(f);
            assert.match(m, "Should produce error", "failure message");
            assert(true);
        },

        "with error arg triggers 1 fail and warns about possible misuse": function () {
            this.replaceBustersFail();
            h.shouldProduceError(new TypeError("Boom!"));
            var f = this.restoreBustersFail();
            var m = f.args[0][0];

            assert.calledOnce(f);
            assert.match(m, "Should produce error", "failure message");
            assert.match(m, "TypeError", "should mention error type");
            assert.match(m, "Boom!", "should mention error message");
            assert.match(m, "check your test", "should give hint about possible bug in test");
            assert.match(m, "'shouldNotProduceError'", "should mention its dual function");
        }
    },

    "shouldNotProduceError": {

        "with no arg triggers 2 fails and warns about possible misuse": function () {
            this.replaceBustersFail();
            h.shouldNotProduceError();
            var f = this.restoreBustersFail();
            var m0 = f.args[0][0];
            var m1 = f.args[1][0];

            assert.calledTwice(f);
            assert.match(m0, "should not be called", "should give explanation");
            assert.match(m0, "undefined", "should mention actual arg ('undefined')");
            assert.match(m0, "check your test", "should give hint about possible bug in test");
            assert.match(m0, "'shouldProduceError'", "should mention its dual function");
            assert.match(m1, "Should not produce error", "failure message");
        },

        "with error arg": {
            "triggers 1 fail": function () {
                this.replaceBustersFail();
                this.replaceBustersLog(); // suppress log output
                h.shouldNotProduceError(new TypeError("Bang!"));
                var f = this.restoreBustersFail();
                var l = this.restoreBustersLog();
                var m = f.args[0][0];

                assert.calledOnce(f);
                assert.match(m, "Should not produce error", "failure message");
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Bang!", "should mention error message");
            },

            "writes error's stack to buster.log": function () {
                this.replaceBustersFail();
                this.replaceBustersLog();
                var error = new TypeError("Crash!");
                h.shouldNotProduceError(error);
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