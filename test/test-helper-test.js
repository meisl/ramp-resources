/*jslint maxlen:100*/
var buster = require("buster");
var h = require("./test-helper.js");

buster.testCase("Test helpers", {
    setUp: function () {
        var self = this;

        self.originalFail = buster.assertions.fail;
        self.replaceBustersFail = function () {
            return (buster.assertions.fail = self.spy());
        };
        self.restoreBustersFail = function () {
            buster.assertions.fail = self.originalFail;
        };

        self.originalLog = buster.log;
        self.replaceBustersLog = function () {
            return (buster.log = self.spy());
        };
        self.restoreBustersLog = function () {
            buster.log = self.originalLog;
        };
    },

    tearDown: function () {
        this.restoreBustersFail();
        this.restoreBustersLog();
    },

    "shouldProduceError": {

        "with no arg triggers 1 fail": function () {
            var f = this.replaceBustersFail();
            h.shouldProduceError();
            this.restoreBustersFail();
            var m = f.args[0][0];

            assert.calledOnce(f);
            assert.match(m, "Should produce error", "failure message");
        },

        "with error arg triggers 1 fail and warns about possible misuse": function () {
            var f = this.replaceBustersFail();
            h.shouldProduceError(new TypeError("Boom!"));
            this.restoreBustersFail();
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
            var f = this.replaceBustersFail();
            h.shouldNotProduceError();
            this.restoreBustersFail();
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
                var f = this.replaceBustersFail();
                var l = this.replaceBustersLog();
                h.shouldNotProduceError(new TypeError("Bang!"));
                this.restoreBustersFail();
                this.restoreBustersLog();
                var m = f.args[0][0];

                assert.calledOnce(f);
                assert.match(m, "Should not produce error", "failure message");
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Bang!", "should mention error message");
            },

            "writes error's stack to buster.log": function () {
                var f = this.replaceBustersFail();
                var l = this.replaceBustersLog();
                var error = new TypeError("Crash!");
                h.shouldNotProduceError(error);
                this.restoreBustersFail();
                this.restoreBustersLog();
                var m = l.args[0][0];

                assert.calledOnce(l);
                assert.match(m, "TypeError", "should mention error type");
                assert.match(m, "Crash!", "should mention error message");
                assert.match(m, error.stack, "should contain error stack");
            }
        }
    }
});