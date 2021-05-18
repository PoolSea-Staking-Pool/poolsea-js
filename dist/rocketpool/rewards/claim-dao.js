'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Rocket Pool Rewards
 */
var Rewards = function () {
    // Constructor
    function Rewards(web3, contracts) {
        _classCallCheck(this, Rewards);

        this.web3 = web3;
        this.contracts = contracts;
    }
    // Contract accessors


    _createClass(Rewards, [{
        key: 'rocketClaimDAO',
        get: function get() {
            return this.contracts.get('rocketClaimDAO');
        }
    }]);

    return Rewards;
}();
// Exports


exports.default = Rewards;
//# sourceMappingURL=claim-dao.js.map