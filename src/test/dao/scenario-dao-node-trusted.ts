// Imports
import { assert } from "chai";
import Web3 from "web3";
import RocketPool from "../../rocketpool/rocketpool";
import { SendOptions } from "web3-eth-contract";
import { proposalStates, getDAOProposalState } from "./scenario-dao-proposal";

// Returns true if the address is a DAO member
export async function getDAOMemberIsValid(web3: Web3, rp: RocketPool, _nodeAddress: string) {
	return await rp.dao.node.trusted.node.getMemberIsValid(_nodeAddress);
}

// Get the total members
export async function getDAONodeMemberCount(web3: Web3, rp: RocketPool, options: SendOptions) {
	return await rp.dao.node.trusted.node.getMemberCount();
}

// Get the number of votes needed for a proposal to pass
export async function getDAONodeProposalQuorumVotesRequired(web3: Web3, rp: RocketPool, proposalID: string, txOptions: SendOptions) {
	return await rp.dao.node.trusted.node.getProposalQuorumVotesRequired();
}

// Create a proposal for this DAO
export async function daoNodeTrustedPropose(web3: Web3, rp: RocketPool, _proposalMessage: string, _payload: string, options: SendOptions) {
	// Get data about the tx
	function getTxData() {
		return Promise.all([rp.dao.proposals.getTotal()]).then(([proposalTotal]) => ({ proposalTotal }));
	}

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();
	options.gas = 10000000;

	// Capture data
	const ds1 = await getTxData();

	// Add a new proposal
	await rp.dao.node.trusted.proposals.propose(_proposalMessage, _payload, options);

	// Capture data
	const ds2 = await getTxData();

	// console.log(Number(ds1.proposalTotal), Number(ds2.proposalTotal));

	// Get the current state, new proposal should be in pending
	const state = Number(await getDAOProposalState(web3, rp, ds2.proposalTotal));

	const ds1ProposalTotal = web3.utils.toBN(ds1.proposalTotal);
	const ds2ProposalTotal = web3.utils.toBN(ds2.proposalTotal);

	// Check proposals
	assert(ds2ProposalTotal.eq(ds1ProposalTotal.add(web3.utils.toBN(1))), "Incorrect proposal total count");
	assert(state == proposalStates.Pending, "Incorrect proposal state, should be pending");

	// Return the proposal ID
	return Number(ds2.proposalTotal);
}

// Vote on a proposal for this DAO
export async function daoNodeTrustedVote(web3: Web3, rp: RocketPool, _proposalID: number, _vote: boolean, options: SendOptions) {
	// Get data about the tx
	function getTxData() {
		return Promise.all([
			rp.dao.proposals.getTotal(),
			rp.dao.proposals.getState(_proposalID),
			rp.dao.proposals.getVotesFor(_proposalID).then((value: any) => web3.utils.toBN(value)),
			rp.dao.proposals.getVotesRequired(_proposalID).then((value: any) => web3.utils.toBN(value)),
		]).then(([proposalTotal, proposalState, proposalVotesFor, proposalVotesRequired]) => ({
			proposalTotal,
			proposalState,
			proposalVotesFor,
			proposalVotesRequired,
		}));
	}

	// Capture data
	const ds1 = await getTxData();

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();
	options.gas = 1000000;

	// Add a new proposal
	await rp.dao.node.trusted.proposals.vote(_proposalID, _vote, options);

	// Capture data
	const ds2 = await getTxData();

	// Check proposals
	if (ds2.proposalState == proposalStates.Active)
		assert(ds2.proposalVotesFor.lt(ds2.proposalVotesRequired), "Proposal state is active, votes for proposal should be less than the votes required");
	if (ds2.proposalState == proposalStates.Succeeded)
		assert(ds2.proposalVotesFor.gte(ds2.proposalVotesRequired), "Proposal state is successful, yet does not have the votes required");
}

// Cancel a proposal for this DAO
export async function daoNodeTrustedCancel(web3: Web3, rp: RocketPool, _proposalID: number, options: SendOptions) {
	// Add a new proposal
	await rp.dao.node.trusted.proposals.cancel(_proposalID, options);

	// Get the current state
	const state = Number(await getDAOProposalState(web3, rp, _proposalID));

	// Check proposals
	assert(state == proposalStates.Cancelled, "Incorrect proposal state, should be cancelled");
}

// Execute a successful proposal
export async function daoNodeTrustedExecute(web3: Web3, rp: RocketPool, _proposalID: number, options: SendOptions) {
	// Get data about the tx
	function getTxData() {
		return Promise.all([rp.dao.proposals.getState(_proposalID).then((value: any) => web3.utils.toBN(value))]).then(([proposalState]) => ({
			proposalState,
		}));
	}

	// Capture data
	const ds1 = await getTxData();
	//console.log(Number(ds1.proposalState));

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();
	options.gas = 1000000;

	// Execute a proposal
	await rp.dao.node.trusted.proposals.execute(_proposalID, options);

	// Capture data
	const ds2 = await getTxData();

	// Check it was updated
	assert(ds2.proposalState.eq(web3.utils.toBN(6)), "Proposal is not in the executed state");
}

// Join the DAO after a successful invite proposal has passed
export async function daoNodeTrustedMemberJoin(web3: Web3, rp: RocketPool, options: SendOptions) {
	const rocketTokenRPLAddress = await rp.tokens.rpl.getAddress();

	// Get data about the tx
	function getTxData() {
		return Promise.all([
			rp.dao.node.trusted.node.getMemberCount().then((value: any) => web3.utils.toBN(value)),
			rp.tokens.rpl.balanceOf(options.from).then((value: any) => web3.utils.toBN(value)),
			rp.vault.balanceOfToken("rocketDAONodeTrustedActions", rocketTokenRPLAddress).then((value: any) => web3.utils.toBN(value)),
		]).then(([memberTotal, rplBalanceBond, rplBalanceVault]) => ({
			memberTotal,
			rplBalanceBond,
			rplBalanceVault,
		}));
	}

	// Capture data
	const ds1 = await getTxData();
	//console.log('Member Total', Number(ds1.memberTotal), web3.utils.fromWei(ds1.rplBalanceBond), web3.utils.fromWei(ds1.rplBalanceVault));

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();
	options.gas = 1000000;

	// Add a new proposal
	await rp.dao.node.trusted.actions.actionJoin(options);

	// Capture data
	const ds2 = await getTxData();
	//console.log('Member Total', Number(ds2.memberTotal), web3.utils.fromWei(ds2.rplBalanceBond), web3.utils.fromWei(ds2.rplBalanceVault));

	// Check member count has increased
	assert(ds2.memberTotal.eq(ds1.memberTotal.add(web3.utils.toBN(1))), "Member count has not increased");
	assert(ds2.rplBalanceVault.eq(ds1.rplBalanceVault.add(ds1.rplBalanceBond)), "RocketVault address does not contain the correct RPL bond amount");
}

// Leave the DAO after a successful leave proposal has passed
export async function daoNodeTrustedMemberLeave(web3: Web3, rp: RocketPool, _rplRefundAddress: string, options: SendOptions) {
	const rocketTokenRPLAddress = await rp.tokens.rpl.getAddress();

	// Get data about the tx
	function getTxData() {
		return Promise.all([
			rp.dao.node.trusted.node.getMemberCount().then((value: any) => web3.utils.toBN(value)),
			rp.tokens.rpl.balanceOf(_rplRefundAddress).then((value: any) => web3.utils.toBN(value)),
			rp.vault.balanceOfToken("rocketDAONodeTrustedActions", rocketTokenRPLAddress).then((value: any) => web3.utils.toBN(value)),
		]).then(([memberTotal, rplBalanceRefund, rplBalanceVault]) => ({
			memberTotal,
			rplBalanceRefund,
			rplBalanceVault,
		}));
	}

	// Capture data
	const ds1 = await getTxData();
	// console.log('Member Total', Number(ds1.memberTotal), web3.utils.fromWei(ds1.rplBalanceRefund), web3.utils.fromWei(ds1.rplBalanceVault));

	// Set gas price
	const gasPrice = web3.utils.toBN(web3.utils.toWei("20", "gwei"));
	options.gasPrice = gasPrice.toString();
	options.gas = 1000000;

	// Add a new proposal
	await rp.dao.node.trusted.actions.actionLeave(_rplRefundAddress, options);

	// Capture data
	const ds2 = await getTxData();
	// console.log('Member Total', Number(ds2.memberTotal), web3.utils.fromWei(ds2.rplBalanceRefund), web3.utils.fromWei(ds2.rplBalanceVault));

	// Verify
	assert(ds2.memberTotal.eq(ds1.memberTotal.sub(web3.utils.toBN(1))), "Member count has not decreased");
	assert(ds2.rplBalanceVault.eq(ds1.rplBalanceVault.sub(ds2.rplBalanceRefund)), "Member RPL refund address does not contain the correct RPL bond amount");
}

// Challenger a members node to respond and signal it is still alive
export async function daoNodeTrustedMemberChallengeMake(web3: Web3, rp: RocketPool, _nodeAddress: string, options: SendOptions) {
	// Get data about the tx
	function getTxData() {
		return Promise.all([rp.dao.node.trusted.node.getMemberIsValid(_nodeAddress), rp.dao.node.trusted.node.getMemberIsChallenged(_nodeAddress)]).then(
			([currentMemberStatus, memberChallengedStatus]) => ({
				currentMemberStatus,
				memberChallengedStatus,
			})
		);
	}

	// Capture data
	const ds1 = await getTxData();

	// Add a new proposal
	await rp.dao.node.trusted.actions.actionChallengeMake(_nodeAddress, options);

	// Capture data
	const ds2 = await getTxData();

	// Check member count has increased
	assert(ds1.currentMemberStatus == true, "Challenged member has had their membership removed");
	assert(ds1.memberChallengedStatus == false, "Challenged a member that was already challenged");
	assert(ds2.memberChallengedStatus == true, "Member did not become challenged");
}

// Decide a challenges outcome
export async function daoNodeTrustedMemberChallengeDecide(
	web3: Web3,
	rp: RocketPool,
	_nodeAddress: string,
	_expectedMemberStatus: boolean,
	options: SendOptions
) {
	// Get data about the tx
	function getTxData() {
		return Promise.all([rp.dao.node.trusted.node.getMemberIsValid(_nodeAddress), rp.dao.node.trusted.node.getMemberIsChallenged(_nodeAddress)]).then(
			([currentMemberStatus, memberChallengedStatus]) => ({
				currentMemberStatus,
				memberChallengedStatus,
			})
		);
	}

	// Capture data
	const ds1 = await getTxData();

	// Add a new proposal
	await rp.dao.node.trusted.actions.actionChallengeDecide(_nodeAddress, options);

	// Capture data
	const ds2 = await getTxData();

	// Check member count has increased
	assert(ds2.currentMemberStatus == _expectedMemberStatus, "Challenged member did not become their expected status");
}
