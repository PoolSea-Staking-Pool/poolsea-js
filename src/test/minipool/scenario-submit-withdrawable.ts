// Imports
import { assert } from "chai";
import Web3 from "web3";
import { SendOptions } from "web3-eth-contract";
import RocketPool from "../../rocketpool/rocketpool";
import MinipoolContract from "../../rocketpool/minipool/minipool-contract";

// Submit a minipool withdrawable event
export async function submitWithdrawable(web3: Web3, rp: RocketPool, minipoolAddress: string, options: SendOptions) {
	// Load contracts
	const rocketDAONodeTrusted = await rp.contracts.get("poolseaDAONodeTrusted");
	const rocketNodeStaking = await rp.contracts.get("poolseaNodeStaking");
	const rocketStorage = await rp.contracts.get("poolseaStorage");
	const rocketMinipoolStatus = await rp.contracts.get("poolseaMinipoolStatus");

	// Get parameters
	const trustedNodeCount = await rocketDAONodeTrusted.methods
		.getMemberCount()
		.call()
		.then((value: any) => web3.utils.toBN(value));

	// Get submission keys
	const nodeSubmissionKey = web3.utils.soliditySha3("minipool.withdrawable.submitted.node", options.from, minipoolAddress);
	const submissionCountKey = web3.utils.soliditySha3("minipool.withdrawable.submitted.count", minipoolAddress);

	// Get submission details
	function getSubmissionDetails() {
		return Promise.all([
			rocketStorage.methods.getBool(nodeSubmissionKey).call(),
			rocketStorage.methods
				.getUint(submissionCountKey)
				.call()
				.then((value: any) => web3.utils.toBN(value)),
		]).then(([nodeSubmitted, count]) => ({ nodeSubmitted, count }));
	}

	// Get minipool details
	function getMinipoolDetails() {
		return rp.minipool
			.getMinipoolContract(minipoolAddress)
			.then((minipool: MinipoolContract) =>
				Promise.all([
					minipool.getStatus().then((value: any) => web3.utils.toBN(value)),
					minipool.getUserDepositBalance().then((value: any) => web3.utils.toBN(value)),
				])
			)
			.then(([status, userDepositBalance]) => ({ status, userDepositBalance }));
	}

	// Get node details
	function getNodeDetails() {
		return rp.minipool
			.getMinipoolContract(minipoolAddress)
			.then((minipool: MinipoolContract) => minipool.getNodeAddress())
			.then((nodeAddress: string) => rocketNodeStaking.methods.getNodeRPLStake(nodeAddress).call())
			.then((rplStake: string) => web3.utils.toBN(rplStake));
	}

	// Get initial details
	const [submission1, node1RplStake] = await Promise.all([getSubmissionDetails(), getNodeDetails().catch((e: any) => web3.utils.toBN(0))]);

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();

	// Submit
	await rp.minipool.submitMinipoolWithdrawable(minipoolAddress, options);

	// Get updated details
	const [submission2, node2RplStake, minipoolDetails] = await Promise.all([getSubmissionDetails(), getNodeDetails(), getMinipoolDetails()]);

	// Check if minipool should be withdrawable
	const expectWithdrawable = submission2.count.mul(web3.utils.toBN(2)).gt(trustedNodeCount);

	// Check submission details
	assert.isFalse(submission1.nodeSubmitted, "Incorrect initial node submitted status");
	assert.isTrue(submission2.nodeSubmitted, "Incorrect updated node submitted status");
	assert(submission2.count.eq(submission1.count.add(web3.utils.toBN(1))), "Incorrect updated submission count");

	// Check minipool details
	const withdrawable = web3.utils.toBN(3);
	if (expectWithdrawable) {
		assert(minipoolDetails.status.eq(withdrawable), "Incorrect updated minipool status");
	} else {
		assert(!minipoolDetails.status.eq(withdrawable), "Incorrect updated minipool status");
	}
}

// Execute a minipool withdrawable update event
export async function executeSetWithdrawable(web3: Web3, rp: RocketPool, minipoolAddress: string, options: SendOptions) {
	// Load contracts
	const rocketNodeStaking = await rp.contracts.get("poolseaNodeStaking");
	const rocketMinipoolStatus = await rp.contracts.get("poolseaMinipoolStatus");

	// Get minipool details
	function getMinipoolDetails() {
		return rp.minipool
			.getMinipoolContract(minipoolAddress)
			.then((minipool: MinipoolContract) =>
				Promise.all([
					minipool.getStatus().then((value: any) => web3.utils.toBN(value)),
					minipool.getUserDepositBalance().then((value: any) => web3.utils.toBN(value)),
				])
			)
			.then(([status, userDepositBalance]) => ({ status, userDepositBalance }));
	}

	// Get node details
	function getNodeDetails() {
		return rp.minipool
			.getMinipoolContract(minipoolAddress)
			.then((minipool: MinipoolContract) => minipool.getNodeAddress())
			.then((nodeAddress: string) => rocketNodeStaking.methods.getNodeRPLStake(nodeAddress).call())
			.then((rplStake: string) => web3.utils.toBN(rplStake));
	}

	// Get initial details
	const node1RplStake = await getNodeDetails().catch((e: any) => web3.utils.toBN(0));

	// Submit
	await rocketMinipoolStatus.methods.executeMinipoolWithdrawable(minipoolAddress).send(options);

	// Get updated details
	const [node2RplStake, minipoolDetails] = await Promise.all([getNodeDetails(), getMinipoolDetails()]);

	// Check minipool details
	const withdrawable = web3.utils.toBN(3);
	assert(minipoolDetails.status.eq(withdrawable), "Incorrect updated minipool status");
}
