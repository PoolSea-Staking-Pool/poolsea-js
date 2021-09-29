// Imports
import { assert } from "chai";
import Web3 from "web3";
import RocketPool from "../../rocketpool/rocketpool";
import { printTitle } from "../_utils/formatting";

// Tests
export default function runContractsTests(web3: Web3, rp: RocketPool) {
	describe("Contracts", () => {
		describe("Addresses", () => {
			it(printTitle("User", "Can load a single address"), async () => {
				const minipoolManagerAddress = await rp.contracts.address("rocketMinipoolManager");
				assert.notEqual(minipoolManagerAddress, "0x0000000000000000000000000000000000000000", "Loaded address is invalid");
			});

			it(printTitle("User", "Can load multiple addresses"), async () => {
				const [rocketMinipoolQueueAddress, rocketMinipoolStatusAddress] = await rp.contracts.address(["rocketMinipoolQueue", "rocketMinipoolStatus"]);
				assert.notEqual(rocketMinipoolQueueAddress, "0x0000000000000000000000000000000000000000", "Loaded address is invalid");
				assert.notEqual(rocketMinipoolStatusAddress, "0x0000000000000000000000000000000000000000", "Loaded address is invalid");
			});
		});

		describe("ABIs", () => {
			it(printTitle("User", "Can load single ABIs"), async () => {
				const minipoolManagerAbi = await rp.contracts.abi("rocketMinipoolManager");
				assert.isArray(minipoolManagerAbi, "Loaded ABI is invalid");
			});

			it(printTitle("User", "Can load multiple ABIs"), async () => {
				const [rocketMinipoolQueueAbi, rocketMinipoolStatusAbi] = await rp.contracts.abi(["rocketMinipoolQueue", "rocketMinipoolStatus"]);
				assert.isArray(rocketMinipoolQueueAbi, "Loaded ABI is invalid");
				assert.isArray(rocketMinipoolStatusAbi, "Loaded ABI is invalid");
			});
		});

		describe("Contracts", () => {
			it(printTitle("User", "Can load a single contract"), async () => {
				const rocketNetworkBalances = await rp.contracts.get("rocketNetworkBalances");
				assert.property(rocketNetworkBalances, "methods", "Loaded contract is invalid");
			});

			it(printTitle("User", "Can load multiple contracts"), async () => {
				const [rocketNetworkFees, rocketNetworkPrices] = await rp.contracts.get(["rocketNetworkFees", "rocketNetworkPrices"]);
				assert.property(rocketNetworkFees, "methods", "Loaded contract is invalid");
				assert.property(rocketNetworkPrices, "methods", "Loaded contract is invalid");
			});

			it(printTitle("User", "Can create a new contract instance"), async () => {
				const minipool = await rp.contracts.make("rocketMinipoolDelegate", "0x1111111111111111111111111111111111111111");
				assert.property(minipool, "methods", "Created contract is invalid");
			});
		});
	});
}
