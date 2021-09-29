// Imports
import { assert } from "chai";
import Web3 from "web3";
import { SendOptions } from "web3-eth-contract";
import RocketPool from "../../rocketpool/rocketpool";

// Assign deposits
export async function assignDeposits(web3: Web3, rp: RocketPool, options: SendOptions) {
	// Load contracts
	const rocketDAOProtocolSettingsDeposit = await rp.contracts.get("rocketDAOProtocolSettingsDeposit");
	const rocketDAOProtocolSettingsMinipool = await rp.contracts.get("rocketDAOProtocolSettingsMinipool");
	const rocketVault = await rp.contracts.get("rocketVault");

	// Get parameters
	const [
		depositPoolBalance,
		maxDepositAssignments,
		fullMinipoolQueueLength,
		halfMinipoolQueueLength,
		emptyMinipoolQueueLength,
		fullDepositUserAmount,
		halfDepositUserAmount,
		emptyDepositUserAmount,
	] = await Promise.all([
		rp.deposit.getBalance(),
		rocketDAOProtocolSettingsDeposit.methods.getMaximumDepositAssignments().call(),
		rp.minipool.getQueueLength(1),
		rp.minipool.getQueueLength(2),
		rp.minipool.getQueueLength(3),
		rocketDAOProtocolSettingsMinipool.methods.getDepositUserAmount(1).call(),
		rocketDAOProtocolSettingsMinipool.methods.getDepositUserAmount(2).call(),
		rocketDAOProtocolSettingsMinipool.methods.getDepositUserAmount(3).call(),
	]);

	// Get queued minipool capacities
	const minipoolCapacities = [];
	for (let i = 0; i < halfMinipoolQueueLength; ++i) minipoolCapacities.push(halfDepositUserAmount);
	for (let i = 0; i < fullMinipoolQueueLength; ++i) minipoolCapacities.push(fullDepositUserAmount);
	for (let i = 0; i < emptyMinipoolQueueLength; ++i) minipoolCapacities.push(emptyDepositUserAmount);

	// Get expected deposit assignment parameters
	let expectedDepositAssignments = 0;
	let expectedEthAssigned = web3.utils.toBN(0);
	let depositBalanceRemaining = web3.utils.toBN(depositPoolBalance);
	const depositAssignmentsRemaining = web3.utils.toBN(maxDepositAssignments);
	while (minipoolCapacities.length > 0 && depositBalanceRemaining.gte(minipoolCapacities[0]) && depositAssignmentsRemaining.gt(web3.utils.toBN(0))) {
		const capacity = web3.utils.toBN(minipoolCapacities.shift());
		++expectedDepositAssignments;
		expectedEthAssigned = expectedEthAssigned.add(capacity);
		depositBalanceRemaining = depositBalanceRemaining.sub(capacity);
		depositAssignmentsRemaining.sub(depositAssignmentsRemaining);
	}

	// Get balances
	function getBalances() {
		return Promise.all([
			rp.deposit.getBalance().then((value: any) => web3.utils.toBN(value)),
			web3.eth.getBalance(rocketVault.options.address).then((value: any) => web3.utils.toBN(value)),
		]).then(([depositPoolEth, vaultEth]) => ({ depositPoolEth, vaultEth }));
	}

	// Get minipool queue details
	function getMinipoolQueueDetails() {
		return Promise.all([
			rp.minipool.getQueueTotalLength().then((value: any) => web3.utils.toBN(value)),
			rp.minipool.getQueueTotalCapacity().then((value: any) => web3.utils.toBN(value)),
		]).then(([totalLength, totalCapacity]) => ({ totalLength, totalCapacity }));
	}

	// Get initial balances & minipool queue details
	const [balances1, queue1] = await Promise.all([getBalances(), getMinipoolQueueDetails()]);

	// Assign deposits
	await rp.deposit.assignDeposits(options);

	// Get updated balances & minipool queue details
	const [balances2, queue2] = await Promise.all([getBalances(), getMinipoolQueueDetails()]);

	// Check balances
	assert(balances2.depositPoolEth.eq(balances1.depositPoolEth.sub(expectedEthAssigned)), "Incorrect updated deposit pool ETH balance");
	assert(balances2.vaultEth.eq(balances1.vaultEth.sub(expectedEthAssigned)), "Incorrect updated vault ETH balance");

	// Check minipool queues
	assert(queue2.totalLength.eq(queue1.totalLength.sub(web3.utils.toBN(expectedDepositAssignments))), "Incorrect updated minipool queue length");
	assert(queue2.totalCapacity.eq(queue1.totalCapacity.sub(expectedEthAssigned)), "Incorrect updated minipool queue capacity");
}
