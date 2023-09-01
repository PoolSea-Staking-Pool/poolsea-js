"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _erc = require("./erc20");

var _erc2 = _interopRequireDefault(_erc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Rocket Pool Legacy RPL Token Manager
 */
var LegacyRPL = function (_ERC) {
    _inherits(LegacyRPL, _ERC);

    /**
     * Create a new LegacyRPL instance.
     *
     * @param web3 A valid Web3 instance
     * @param contracts A Rocket Pool contract manager instance
     */
    function LegacyRPL(web3, contracts) {
        _classCallCheck(this, LegacyRPL);

        return _possibleConstructorReturn(this, (LegacyRPL.__proto__ || Object.getPrototypeOf(LegacyRPL)).call(this, web3, contracts, "poolseaTokenRPLFixedSupply"));
    }
    /**
     * Get the contract address
     * @returns a Promise<string\> that resolves to a string representing the contract address of the token
     *
     * @example using Typescript
     * ```ts
     * const address = rp.tokens.legacyrpl.getAddress().then((val: string) => { val };
     * ```
     */


    _createClass(LegacyRPL, [{
        key: "getAddress",
        value: function getAddress() {
            return this.tokenContract.then(function (tokenContract) {
                return tokenContract.options.address;
            });
        }
    }]);

    return LegacyRPL;
}(_erc2.default);
// Exports


exports.default = LegacyRPL;
//# sourceMappingURL=legacyrpl.js.map