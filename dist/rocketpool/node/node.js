'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _transaction = require('../../utils/transaction');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Rocket Pool node manager
 */
var Node = function () {
    // Constructor
    function Node(web3, contracts) {
        _classCallCheck(this, Node);

        this.web3 = web3;
        this.contracts = contracts;
    }
    // Contract accessors


    _createClass(Node, [{
        key: 'getNodes',

        /**
         * Getters
         */
        // Get all node details
        value: function getNodes() {
            var _this = this;

            return this.getNodeAddresses().then(function (addresses) {
                return Promise.all(addresses.map(function (address) {
                    return _this.getNodeDetails(address);
                }));
            });
        }
        // Get all node addresses

    }, {
        key: 'getNodeAddresses',
        value: function getNodeAddresses() {
            var _this2 = this;

            return this.getNodeCount().then(function (count) {
                return Promise.all([].concat(_toConsumableArray(Array(count).keys())).map(function (index) {
                    return _this2.getNodeAt(index);
                }));
            });
        }
        // Get a node's details

    }, {
        key: 'getNodeDetails',
        value: function getNodeDetails(address) {
            return Promise.all([this.getNodeExists(address), this.getNodeTimezoneLocation(address)]).then(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 2),
                    exists = _ref2[0],
                    timezoneLocation = _ref2[1];

                return { address: address, exists: exists, timezoneLocation: timezoneLocation };
            });
        }
        // Get the total node count

    }, {
        key: 'getNodeCount',
        value: function getNodeCount() {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return rocketNodeManager.methods.getNodeCount().call();
            }).then(function (value) {
                return parseInt(value);
            });
        }
        // Get a node address by index

    }, {
        key: 'getNodeAt',
        value: function getNodeAt(index) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return rocketNodeManager.methods.getNodeAt(index).call();
            });
        }
        // Check whether a node exists

    }, {
        key: 'getNodeExists',
        value: function getNodeExists(address) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return rocketNodeManager.methods.getNodeExists(address).call();
            });
        }
        // Get a node's timezone location

    }, {
        key: 'getNodeTimezoneLocation',
        value: function getNodeTimezoneLocation(address) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return rocketNodeManager.methods.getNodeTimezoneLocation(address).call();
            });
        }
        // Check whether a node exists

    }, {
        key: 'getNodeWithdrawalAddress',
        value: function getNodeWithdrawalAddress(address) {
            return this.rocketStorage.then(function (rocketStorage) {
                return rocketStorage.methods.getNodeWithdrawalAddress(address).call();
            });
        }
        // Get Node RPL Stake

    }, {
        key: 'getNodeRPLStake',
        value: function getNodeRPLStake(address) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getNodeRPLStake(address).call();
            });
        }
        // Get Node Effective RPL Stake

    }, {
        key: 'getNodeEffectiveRPLStake',
        value: function getNodeEffectiveRPLStake(address) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getNodeEffectiveRPLStake(address).call();
            });
        }
        // Get Node Minipool Limit

    }, {
        key: 'getNodeMinipoolLimit',
        value: function getNodeMinipoolLimit(address) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getNodeMinipoolLimit(address).call();
            });
        }
        // Get Node Total Effective RPL Stake

    }, {
        key: 'getNodeTotalEffectiveRPLStake',
        value: function getNodeTotalEffectiveRPLStake() {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getTotalEffectiveRPLStake().call();
            });
        }
        // Get Node Minimum RPL Stake

    }, {
        key: 'getNodeMinimumRPLStake',
        value: function getNodeMinimumRPLStake(address) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getNodeMinimumRPLStake(address).call();
            });
        }
        // Get Node Pending Withdrawal Address

    }, {
        key: 'getNodePendingWithdrawalAddress',
        value: function getNodePendingWithdrawalAddress(address) {
            return this.rocketStorage.then(function (rocketStorage) {
                return rocketStorage.methods.getNodePendingWithdrawalAddress(address).call();
            });
        }
        // Get Total Effective RPL Stake

    }, {
        key: 'getTotalEffectiveRPLStake',
        value: function getTotalEffectiveRPLStake() {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getTotalEffectiveRPLStake().call();
            });
        }
        // Get Total RPL Stake

    }, {
        key: 'getTotalRPLStake',
        value: function getTotalRPLStake() {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.getTotalRPLStake().call();
            });
        }
        // Get Total Effective RPL Stake

    }, {
        key: 'calculateTotalEffectiveRPLStake',
        value: function calculateTotalEffectiveRPLStake(offset, limit, rplPrice) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return rocketNodeStaking.methods.calculateTotalEffectiveRPLStake(offset, limit, rplPrice).call();
            });
        }
        // Get a breakdown of the number of nodes per timezone

    }, {
        key: 'getNodeCountPerTimezone',
        value: function getNodeCountPerTimezone(offset, limit) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return rocketNodeManager.methods.getNodeCountPerTimezone(offset, limit).call();
            });
        }
        /**
         * Mutators - Public
         */
        // Register a node

    }, {
        key: 'registerNode',
        value: function registerNode(timezoneLocation, options, onConfirmation) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return (0, _transaction.handleConfirmations)(rocketNodeManager.methods.registerNode(timezoneLocation).send(options), onConfirmation);
            });
        }
    }, {
        key: 'setWithdrawalAddress',
        value: function setWithdrawalAddress(nodeAddress, withdrawalAddress, confirm, options, onConfirmation) {
            return this.rocketStorage.then(function (rocketStorage) {
                return (0, _transaction.handleConfirmations)(rocketStorage.methods.setWithdrawalAddress(nodeAddress, withdrawalAddress, confirm).send(options), onConfirmation);
            });
        }
    }, {
        key: 'stakeRPL',
        value: function stakeRPL(amount, options, onConfirmation) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return (0, _transaction.handleConfirmations)(rocketNodeStaking.methods.stakeRPL(amount).send(options), onConfirmation);
            });
        }
    }, {
        key: 'confirmWithdrawalAddress',
        value: function confirmWithdrawalAddress(nodeAddress, options, onConfirmation) {
            return this.rocketStorage.then(function (rocketStorage) {
                return (0, _transaction.handleConfirmations)(rocketStorage.methods.confirmWithdrawalAddress(nodeAddress).send(options), onConfirmation);
            });
        }
    }, {
        key: 'withdrawRPL',
        value: function withdrawRPL(amount, options, onConfirmation) {
            return this.rocketNodeStaking.then(function (rocketNodeStaking) {
                return (0, _transaction.handleConfirmations)(rocketNodeStaking.methods.withdrawRPL(amount).send(options), onConfirmation);
            });
        }
        /**
         * Mutators - Restricted to registered nodes
         */
        // Set the node's timezone location

    }, {
        key: 'setTimezoneLocation',
        value: function setTimezoneLocation(timezoneLocation, options, onConfirmation) {
            return this.rocketNodeManager.then(function (rocketNodeManager) {
                return (0, _transaction.handleConfirmations)(rocketNodeManager.methods.setTimezoneLocation(timezoneLocation).send(options), onConfirmation);
            });
        }
        // Make a node deposit

    }, {
        key: 'deposit',
        value: function deposit(minimumNodeFee, options, onConfirmation) {
            return this.rocketNodeDeposit.then(function (rocketNodeDeposit) {
                return (0, _transaction.handleConfirmations)(rocketNodeDeposit.methods.deposit(minimumNodeFee).send(options), onConfirmation);
            });
        }
    }, {
        key: 'rocketNodeDeposit',
        get: function get() {
            return this.contracts.get('rocketNodeDeposit');
        }
    }, {
        key: 'rocketNodeManager',
        get: function get() {
            return this.contracts.get('rocketNodeManager');
        }
    }, {
        key: 'rocketNodeStaking',
        get: function get() {
            return this.contracts.get('rocketNodeStaking');
        }
    }, {
        key: 'rocketStorage',
        get: function get() {
            return this.contracts.get("rocketStorage");
        }
    }]);

    return Node;
}();
// Exports


exports.default = Node;
//# sourceMappingURL=node.js.map