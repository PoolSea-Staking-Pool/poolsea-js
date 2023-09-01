"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _bn = require("bn.js");

var _bn2 = _interopRequireDefault(_bn);

var _buffer = require("buffer");

var _buffer2 = _interopRequireDefault(_buffer);

var _keccak = require("keccak");

var _keccak2 = _interopRequireDefault(_keccak);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Buffer = _buffer2.default.Buffer;
function keccak256(value) {
    value = toBuffer(value);
    return (0, _keccak2.default)("keccak256").update(value).digest();
}
function toBuffer(value) {
    if (!Buffer.isBuffer(value)) {
        if (Array.isArray(value)) {
            value = Buffer.from(value);
        } else if (typeof value === "string") {
            if (isHexString(value)) {
                value = Buffer.from(padToEven(stripHexPrefix(value)), "hex");
            } else {
                value = Buffer.from(value);
            }
        } else if (typeof value === "number") {
            value = intToBuffer(value);
        } else if (value === null || value === undefined) {
            value = Buffer.allocUnsafe(0);
        } else if (_bn2.default.isBN(value)) {
            value = value.toArrayLike(Buffer);
        } else if (value.toArray) {
            // converts a BN to a Buffer
            value = Buffer.from(value.toArray());
        } else {
            throw new Error("invalid type");
        }
    }
    return value;
}
function isHexString(value, length) {
    if (typeof value !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
    }
    if (length && value.length !== 2 + 2 * length) {
        return false;
    }
    return true;
}
function padToEven(value) {
    if (typeof value !== "string") {
        throw new Error("while padding to even, value must be string, is currently " + (typeof value === "undefined" ? "undefined" : _typeof(value)) + ", while padToEven.");
    }
    if (value.length % 2) {
        value = "0" + value;
    }
    return value;
}
function stripHexPrefix(value) {
    if (typeof value !== "string") {
        return value;
    }
    return isHexPrefixed(value) ? value.slice(2) : value;
}
function isHexPrefixed(value) {
    if (typeof value !== "string") {
        throw new Error("value must be type 'string', is currently type " + (typeof value === "undefined" ? "undefined" : _typeof(value)) + ", while checking isHexPrefixed.");
    }
    return value.slice(0, 2) === "0x";
}
function intToBuffer(i) {
    var hex = intToHex(i);
    return Buffer.from(padToEven(hex.slice(2)), "hex");
}
function intToHex(i) {
    var hex = i.toString(16);
    return "0x" + hex;
}
exports.default = keccak256;
//# sourceMappingURL=keccak256.js.map