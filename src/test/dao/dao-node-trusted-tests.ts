// Imports
import { assert } from "chai";
import { takeSnapshot, revertSnapshot, mineBlocks, getCurrentTime, increaseTime } from "../_utils/evm";
import { printTitle } from "../_utils/formatting";
import { shouldRevert } from "../_utils/testing";
import { compressABI } from "../_utils/contract";
import Web3 from "web3";
import RocketPool from "../../rocketpool/rocketpool";
import { setNodeTrusted } from "../_helpers/node";
import {
	setDAONodeTrustedBootstrapMember,
	setDAONodeTrustedBootstrapSetting,
	setDaoNodeTrustedBootstrapModeDisabled,
	setDaoNodeTrustedMemberRequired,
	setDaoNodeTrustedBootstrapUpgrade,
} from "../dao/scenario-dao-node-trusted-bootstrap";
import {
	daoNodeTrustedExecute,
	daoNodeTrustedPropose,
	daoNodeTrustedVote,
	daoNodeTrustedMemberJoin,
	daoNodeTrustedMemberLeave,
	daoNodeTrustedCancel,
	getDAOMemberIsValid,
	daoNodeTrustedMemberChallengeMake,
	daoNodeTrustedMemberChallengeDecide,
} from "./scenario-dao-node-trusted";
import { getDAOProposalEndTime, getDAOProposalStartTime, getDAOProposalState, proposalStates, getDAOProposalExpires } from "./scenario-dao-proposal";
import { mintRPL } from "../tokens/scenario-rpl-mint";
import { Contract } from "web3-eth-contract";

export default function runDAONodeTrusted(web3: Web3, rp: RocketPool) {
	describe("DAO Node Trusted", () => {
		// settings
		const gasLimit = 8000000;

		// Accounts
		let guardian: string;
		let userOne: string;
		let registeredNode1: string;
		let registeredNode2: string;
		let registeredNode3: string;
		let registeredNodeTrusted1: string;
		let registeredNodeTrusted2: string;
		let registeredNodeTrusted3: string;

		// Contracts
		let rocketMinipoolManagerNew: Contract;
		let rocketDAONodeTrustedUpgradeNew: Contract;

		// State snapshotting
		let suiteSnapshotId: string, testSnapshotId: string;
		before(async () => {
			suiteSnapshotId = await takeSnapshot(web3);
		});
		after(async () => {
			await revertSnapshot(web3, suiteSnapshotId);
		});
		beforeEach(async () => {
			testSnapshotId = await takeSnapshot(web3);
		});
		afterEach(async () => {
			await revertSnapshot(web3, testSnapshotId);
		});

		// Setup
		before(async () => {
			// Get accounts
			[guardian, userOne, registeredNode1, registeredNode2, registeredNode3, registeredNodeTrusted1, registeredNodeTrusted2, registeredNodeTrusted3] =
				await web3.eth.getAccounts();

			const rocketStorage = await rp.contracts.get("poolseaStorage");

			// Register nodes
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNode1,
				gas: gasLimit,
			});
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNode2,
				gas: gasLimit,
			});
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNode3,
				gas: gasLimit,
			});
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			await rp.node.registerNode("Australia/Brisbane", {
				from: registeredNodeTrusted3,
				gas: gasLimit,
			});

			// Add members to the DAO
			await setNodeTrusted(web3, rp, registeredNodeTrusted1, "poolseapool_1", "node@home.com", guardian);
			await setNodeTrusted(web3, rp, registeredNodeTrusted2, "poolseapool_2", "node@home.com", guardian);

			// Deploy new contracts
			rocketMinipoolManagerNew = await rp.contracts.make("poolseaMinipoolManager", guardian);
			rocketDAONodeTrustedUpgradeNew = await rp.contracts.make("poolseaDAONodeTrustedUpgrade", guardian);

			// Set a small proposal cooldown
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsProposals", "proposal.cooldown", 10, {
				from: guardian,
				gas: gasLimit,
			});
			// Set a small vote delay
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsProposals", "proposal.vote.delay.blocks", 4, {
				from: guardian,
				gas: gasLimit,
			});
		});

		//
		// Start Tests
		//
		it(printTitle("userOne", "fails to be added as a trusted node dao member as they are not a registered node"), async () => {
			// Set as trusted dao member via bootstrapping
			await shouldRevert(
				setDAONodeTrustedBootstrapMember(web3, rp, "poolseapool", "node@home.com", userOne, {
					from: guardian,
					gas: gasLimit,
				}),
				"Non registered node added to trusted node DAO",
				"Invalid node"
			);
		});

		it(printTitle("userOne", "fails to add a bootstrap trusted node DAO member as non guardian"), async () => {
			// Set as trusted dao member via bootstrapping
			await shouldRevert(
				setDAONodeTrustedBootstrapMember(web3, rp, "poolseapool", "node@home.com", registeredNode1, {
					from: userOne,
					gas: gasLimit,
				}),
				"Non guardian registered node to trusted node DAO",
				"Account is not a temporary guardian"
			);
		});

		it(printTitle("guardian", "cannot add the same member twice"), async () => {
			// Set as trusted dao member via bootstrapping
			await shouldRevert(
				setDAONodeTrustedBootstrapMember(web3, rp, "poolseapool", "node@home.com", registeredNodeTrusted2, {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian the same DAO member twice",
				"This node is already part of the trusted node DAO"
			);
		});

		it(printTitle("guardian", "updates quorum setting while bootstrap mode is enabled"), async () => {
			// Set as trusted dao member via bootstrapping
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.quorum", web3.utils.toWei("0.55"), {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("guardian", "updates RPL bond setting while bootstrap mode is enabled"), async () => {
			// Set RPL Bond at 10K RPL
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.rplbond", web3.utils.toWei("10000"), {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("userOne", "fails to update RPL bond setting while bootstrap mode is enabled as they are not the guardian"), async () => {
			// Update setting
			await shouldRevert(
				setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.rplbond", web3.utils.toWei("10000"), {
					from: userOne,
					gas: gasLimit,
				}),
				"UserOne changed RPL bond setting",
				"Account is not a temporary guardian"
			);
		});

		it(printTitle("guardian", "fails to update setting after bootstrap mode is disabled"), async () => {
			// Disable bootstrap mode
			await setDaoNodeTrustedBootstrapModeDisabled(web3, rp, {
				from: guardian,
				gas: gasLimit,
			});
			// Update setting
			await shouldRevert(
				setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsProposals", "members.quorum", web3.utils.toWei("0.55"), {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian updated setting after bootstrap mode is disabled",
				"Bootstrap mode not engaged"
			);
		});

		it(printTitle("guardian", "fails to set quorum setting as 0% while bootstrap mode is enabled"), async () => {
			// Update setting
			await shouldRevert(
				setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.quorum", web3.utils.toWei("0"), {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian changed quorum setting to invalid value",
				"Quorum setting must be > 0 & <= 90%"
			);
		});

		it(printTitle("guardian", "fails to set quorum setting above 90% while bootstrap mode is enabled"), async () => {
			// Update setting
			await shouldRevert(
				setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.quorum", web3.utils.toWei("0.91"), {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian changed quorum setting to invalid value",
				"Quorum setting must be > 0 & <= 90%"
			);
		});

		it(printTitle("registeredNode1", "verify trusted node quorum votes required is correct"), async () => {
			// Load contracts
			const rocketDAONodeTrusted = await rp.contracts.get("poolseaDAONodeTrusted");
			const rocketDAONodeTrustedSettings = await rp.contracts.get("poolseaDAONodeTrustedSettingsMembers");

			// How many trusted nodes do we have?
			const trustedNodeCount = await rocketDAONodeTrusted.methods.getMemberCount().call();
			// Get the current quorum threshold
			const quorumThreshold = await rocketDAONodeTrustedSettings.methods.getQuorum().call();
			// Calculate the expected vote threshold
			const expectedVotes = (Number(web3.utils.fromWei(quorumThreshold)) * Number(trustedNodeCount)).toFixed(2);
			// Calculate it now on the contracts
			const quorumVotes = await rocketDAONodeTrusted.methods.getMemberQuorumVotesRequired().call();
			// Verify
			assert(expectedVotes == Number(web3.utils.fromWei(quorumVotes)).toFixed(2), "Expected vote threshold does not match contracts");
		});

		// The big test
		it(
			printTitle("registeredNodeTrusted1&2", "create two proposals for two new members that are voted in, one then chooses to leave and is allowed to"),
			async () => {
				// Get the DAO settings
				const daoNodesettings = await rp.contracts.get("poolseaDAONodeTrustedSettingsMembers");
				// How much RPL is required for a trusted node bond?
				const rplBondAmount = web3.utils.fromWei(await daoNodesettings.methods.getRPLBond().call());
				// Disable bootstrap mode
				await setDaoNodeTrustedBootstrapModeDisabled(web3, rp, {
					from: guardian,
					gas: gasLimit,
				});
				// We'll allow the DAO to transfer our RPL bond before joining
				// We only have 2 members now that bootstrap mode is disabled and proposals can only be made with 3, lets get a regular node to join via the emergency method
				const rocketTokenRPL = await rp.contracts.get("poolseaTokenRPL");
				const rocketDAONodeTrustedActions = await rp.contracts.get("poolseaDAONodeTrustedActions");
				const _amount = web3.utils.toWei(rplBondAmount.toString(), "ether");
				await mintRPL(web3, rp, registeredNode3, rplBondAmount, guardian);
				await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode3, gas: gasLimit });
				await setDaoNodeTrustedMemberRequired(web3, rp, "poolseapool_emergency_node_op", "node3@home.com", {
					from: registeredNode3,
					gas: gasLimit,
				});
				// New Member 1
				// Encode the calldata for the proposal
				const proposalCalldata1 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider1", "test@sass.com", registeredNode1]
				);
				// Add the proposal
				const proposalID_1 = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// New Member 2
				// Encode the calldata for the proposal
				const proposalCalldata2 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider2", "test2@sass.com", registeredNode2]
				);
				// Add the proposal
				const proposalID_2 = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata2, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Current time
				let timeCurrent = await getCurrentTime(web3);
				// Now increase time until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID_1)) - timeCurrent + 2);
				// Now lets vote for the new members
				await daoNodeTrustedVote(web3, rp, proposalID_1, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_1, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_2, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_2, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Current time
				timeCurrent = await getCurrentTime(web3);
				// Fast forward to voting periods finishing
				await increaseTime(web3, (await getDAOProposalEndTime(web3, rp, proposalID_1)) - timeCurrent + 2);
				// Proposal should be successful, lets execute it
				await daoNodeTrustedExecute(web3, rp, proposalID_1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedExecute(web3, rp, proposalID_2, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Member has now been invited to join, so lets do that
				await mintRPL(web3, rp, registeredNode1, rplBondAmount, guardian);
				await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode1, gas: gasLimit });
				await mintRPL(web3, rp, registeredNode2, rplBondAmount, guardian);
				await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode2, gas: gasLimit });

				// Join now
				await daoNodeTrustedMemberJoin(web3, rp, {
					from: registeredNode1,
					gas: gasLimit,
				});
				await daoNodeTrustedMemberJoin(web3, rp, {
					from: registeredNode2,
					gas: gasLimit,
				});
				// Add a small wait between member join and proposal
				await increaseTime(web3, 2);
				// Now registeredNodeTrusted2 wants to leave
				// Encode the calldata for the proposal
				const proposalCalldata3 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalLeave",
						type: "function",
						inputs: [{ type: "address", name: "_nodeAddress" }],
					},
					[registeredNodeTrusted2]
				);
				// Add the proposal
				const proposalID_3 = await daoNodeTrustedPropose(web3, rp, "hey guys, can I please leave the DAO?", proposalCalldata3, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Current time
				timeCurrent = await getCurrentTime(web3);
				// Now mine blocks until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID_3)) - timeCurrent + 2);
				// Now lets vote
				await daoNodeTrustedVote(web3, rp, proposalID_3, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_3, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_3, false, {
					from: registeredNode1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID_3, true, {
					from: registeredNode2,
					gas: gasLimit,
				});
				// Current time
				timeCurrent = await getCurrentTime(web3);
				// Fast forward to this voting period finishing
				await increaseTime(web3, (await getDAOProposalEndTime(web3, rp, proposalID_3)) - timeCurrent + 2);
				// Proposal should be successful, lets execute it
				await daoNodeTrustedExecute(web3, rp, proposalID_3, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Member can now leave and collect any RPL bond
				await daoNodeTrustedMemberLeave(web3, rp, registeredNodeTrusted2, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
			}
		);

		// Test various proposal states
		it(printTitle("registeredNodeTrusted1", "creates a proposal and verifies the proposal states as it passes and is executed"), async () => {
			// Add our 3rd member
			await setNodeTrusted(web3, rp, registeredNode1, "poolseapool", "node@home.com", guardian);
			// Pass some time so the next proposal isn't made at the same time the 3rd member joined
			await increaseTime(web3, 60);
			// Now registeredNodeTrusted2 wants to leave
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalInvite",
					type: "function",
					inputs: [
						{ type: "string", name: "_id" },
						{ type: "string", name: "_url" },
						{ type: "address", name: "_nodeAddress" },
					],
				},
				["SaaS_Provider", "test@sass.com", registeredNode2]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Verify the proposal is pending
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Pending, "Proposal state is not Pending");
			// Verify voting will not work while pending
			await shouldRevert(
				daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNode1,
					gas: gasLimit,
				}),
				"Member voted while proposal was pending",
				"Voting is not active for this proposal"
			);
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// // Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNode1,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			await shouldRevert(
				daoNodeTrustedVote(web3, rp, proposalID, false, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}),
				"Member voted after proposal has passed",
				"Proposal has passed, voting is complete and the proposal can now be executed"
			);
			// Verify the proposal is successful
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Succeeded, "Proposal state is not succeeded");
			// Proposal has passed, lets execute it now
			await daoNodeTrustedExecute(web3, rp, proposalID, {
				from: registeredNode1,
				gas: gasLimit,
			});
			// Verify the proposal has executed
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Executed, "Proposal state is not executed");
		});

		// Test various proposal states
		it(printTitle("registeredNodeTrusted1", "creates a proposal and verifies the proposal states as it fails after it expires"), async () => {
			// Add our 3rd member
			await setNodeTrusted(web3, rp, registeredNode1, "poolseapool", "node@home.com", guardian);
			await increaseTime(web3, 60);
			// Now registeredNodeTrusted2 wants to leave
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalInvite",
					type: "function",
					inputs: [
						{ type: "string", name: "_id" },
						{ type: "string", name: "_url" },
						{ type: "address", name: "_nodeAddress" },
					],
				},
				["SaaS_Provider", "test@sass.com", registeredNode2]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Verify the proposal is pending
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Pending, "Proposal state is not Pending");
			// Verify voting will not work while pending
			await shouldRevert(
				daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNode1,
					gas: gasLimit,
				}),
				"Member voted while proposal was pending",
				"Voting is not active for this proposal"
			);
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNode1,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, false, {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, false, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Fast forward to this voting period finishing
			await increaseTime(web3, (await getDAOProposalEndTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Verify the proposal is defeated
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Defeated, "Proposal state is not defeated");
			// Proposal has failed, can we execute it anyway?
			await shouldRevert(
				daoNodeTrustedExecute(web3, rp, proposalID, {
					from: registeredNode1,
					gas: gasLimit,
				}),
				"Executed defeated proposal",
				"Proposal has not succeeded, has expired or has already been executed"
			);
		});

		it(printTitle("registeredNodeTrusted1", "creates a proposal for registeredNode1 to join as a new member but cancels it before it passes"), async () => {
			// Add our 3rd member
			await setNodeTrusted(web3, rp, registeredNode3, "poolseapool_3", "node3@home.com", guardian);
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalInvite",
					type: "function",
					inputs: [
						{ type: "string", name: "_id" },
						{ type: "string", name: "_url" },
						{ type: "address", name: "_nodeAddress" },
					],
				},
				["SaaS_Provider", "test@sass.com", registeredNode1]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Cancel now before it passes
			await daoNodeTrustedCancel(web3, rp, proposalID, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
		});

		it(
			printTitle(
				"registeredNodeTrusted1",
				"creates a proposal for registeredNode1 to join as a new member, then attempts to again for registeredNode2 before cooldown has passed and that fails"
			),
			async () => {
				// Add our 3rd member so proposals can pass
				await setNodeTrusted(web3, rp, registeredNode3, "poolseapool_3", "node3@home.com", guardian);
				// Setup our proposal settings
				const proposalCooldownTime = 60 * 60;
				// Update now while in bootstrap mode
				await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsProposals", "proposal.cooldown.time", proposalCooldownTime, {
					from: guardian,
				});
				// Encode the calldata for the proposal
				const proposalCalldata = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider", "test@sass.com", registeredNode1]
				);
				// Add the proposal
				await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Encode the calldata for the proposal
				const proposalCalldata2 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite2",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider2", "test2@sass.com", registeredNode2]
				);
				// Add the proposal
				// @ts-ignore
				await shouldRevert(
					daoNodeTrustedPropose(web3, rp, "hey guys, can we add this other cool SaaS member please?", proposalCalldata2, {
						from: registeredNodeTrusted1,
						gas: gasLimit,
					}),
					"Add proposal before cooldown period passed",
					"Member has not waited long enough to make another proposal"
				);

				// Current block
				const timeCurrent = await getCurrentTime(web3);
				// Now wait until the cooldown period expires and proposal can be made again
				await increaseTime(web3, timeCurrent + proposalCooldownTime + 2);
				// Try again
				await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this other cool SaaS member please?", proposalCalldata2, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
			}
		);

		it(
			printTitle(
				"registeredNodeTrusted1",
				"creates a proposal for registeredNode1 to join as a new member, registeredNode2 tries to vote on it, but fails as they joined after it was created"
			),
			async () => {
				// Add our 3rd member so proposals can pass
				await setNodeTrusted(web3, rp, registeredNode3, "poolseapool_3", "node3@home.com", guardian);
				// Encode the calldata for the proposal
				const proposalCalldata = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider", "test@sass.com", registeredNode1]
				);
				// Add the proposal
				const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Now add a new member after that proposal was created
				await setNodeTrusted(web3, rp, registeredNode2, "poolseapool_2", "node2@home.com", guardian);
				// Current block
				const timeCurrent = await getCurrentTime(web3);
				// Now wait until the cooldown period expires and proposal can be made again
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
				// registeredNodeTrusted1 votes
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// registeredNode2 vote fails
				await shouldRevert(
					daoNodeTrustedVote(web3, rp, proposalID, true, {
						from: registeredNode2,
						gas: gasLimit,
					}),
					"Voted on proposal created before they joined",
					"Member cannot vote on proposal created before they became a member"
				);
			}
		);

		it(
			printTitle(
				"registeredNodeTrusted1",
				"creates a proposal to leave the DAO and receive their RPL bond refund, proposal is denied as it would be under the min members required for the DAO"
			),
			async () => {
				// Add our 3rd member so proposals can pass
				await setNodeTrusted(web3, rp, registeredNode3, "poolseapool_3", "node3@home.com", guardian);
				// Encode the calldata for the proposal
				const proposalCalldata = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalLeave",
						type: "function",
						inputs: [{ type: "address", name: "_nodeAddress" }],
					},
					[registeredNodeTrusted1]
				);
				// Add the proposal
				const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can I please leave the DAO?", proposalCalldata, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Current time
				const timeCurrent = await getCurrentTime(web3);
				// Now increase time until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
				// Now lets vote
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Fast forward to this voting period finishing
				await increaseTime(web3, (await getDAOProposalEndTime(web3, rp, proposalID)) - timeCurrent + 2);
				// Proposal should be successful, lets execute it
				await shouldRevert(
					daoNodeTrustedExecute(web3, rp, proposalID, {
						from: registeredNode2,
						gas: gasLimit,
					}),
					"Member proposal successful to leave DAO when they shouldnt be able too",
					"Member count will fall below min required"
				);
			}
		);

		it(
			printTitle(
				"registeredNodeTrusted1",
				"creates a proposal to kick registeredNodeTrusted2 with a 50% fine, it is successful and registeredNodeTrusted2 is kicked and receives 50% of their bond"
			),
			async () => {
				// Add our 3rd member so proposals can pass
				await setNodeTrusted(web3, rp, registeredNodeTrusted3, "poolseapool_3", "node3@home.com", guardian);
				await increaseTime(web3, 60);
				// Add our 3rd member
				await setNodeTrusted(web3, rp, registeredNode1, "poolseapool", "node@home.com", guardian);
				await increaseTime(web3, 60);
				// How much bond has registeredNodeTrusted2 paid?
				const registeredNodeTrusted2BondAmount = await rp.dao.node.trusted.node
					.getMemberRPLBondAmount(registeredNodeTrusted2)
					.then((value: any) => web3.utils.toBN(value));
				// How much to fine? 33%
				const registeredNodeTrusted2BondAmountFine = registeredNodeTrusted2BondAmount.div(web3.utils.toBN(3));
				// Encode the calldata for the proposal
				const proposalCalldata = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalKick",
						type: "function",
						inputs: [
							{ type: "address", name: "_nodeAddress" },
							{ type: "uint256", name: "_rplFine" },
						],
					},
					[registeredNodeTrusted2, registeredNodeTrusted2BondAmountFine.toString()]
				);
				// Get the RPL total supply
				const rplTotalSupply1 = await rp.tokens.rpl.totalSupply().then((value: any) => web3.utils.toBN(value));
				// Add the proposal
				const proposalID = await daoNodeTrustedPropose(
					web3,
					rp,
					"hey guys, this member hasn't logged on for weeks, lets boot them with a 33% fine!",
					proposalCalldata,
					{
						from: registeredNodeTrusted1,
						gas: gasLimit,
					}
				);
				// Current time
				const timeCurrent = await getCurrentTime(web3);
				// Now increase time until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
				// Now lets vote
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNode1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID, false, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				}); // Don't kick me
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNodeTrusted3,
					gas: gasLimit,
				});
				// Proposal has passed, lets execute it now
				await daoNodeTrustedExecute(web3, rp, proposalID, {
					from: registeredNode1,
					gas: gasLimit,
				});
				// Member should be kicked now, let's check their RPL balance has their 33% bond returned
				const rplBalance = await rp.tokens.rpl.balanceOf(registeredNodeTrusted2).then((value: any) => web3.utils.toBN(value));
				//console.log(web3.utils.fromWei(await rocketTokenRPL.balanceOf.call(registeredNodeTrusted2)));
				assert(
					registeredNodeTrusted2BondAmount.sub(registeredNodeTrusted2BondAmountFine).eq(rplBalance),
					"registeredNodeTrusted2 remaining RPL balance is incorrect"
				);
				assert((await getDAOMemberIsValid(web3, rp, registeredNodeTrusted2)) === false, "registeredNodeTrusted2 is still a member of the DAO");
				// The 33% fine should be burned
				const rplTotalSupply2 = await rp.tokens.rpl.totalSupply().then((value: any) => web3.utils.toBN(value));
				assert(rplTotalSupply1.sub(rplTotalSupply2).eq(registeredNodeTrusted2BondAmountFine), "RPL total supply did not decrease by fine amount");
			}
		);

		it(printTitle("registeredNode2", "is made a new member after a proposal is created, they fail to vote on that proposal"), async () => {
			// Add our 3rd member
			await setNodeTrusted(web3, rp, registeredNodeTrusted3, "poolseapool_3", "node3@home.com", guardian);
			await increaseTime(web3, 60);
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalLeave",
					type: "function",
					inputs: [{ type: "address", name: "_nodeAddress" }],
				},
				[registeredNodeTrusted1]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can I please leave the DAO?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Register new member now
			await setNodeTrusted(web3, rp, registeredNode2, "poolseapool", "node@home.com", guardian);
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// New member attempts to vote on proposal started before they joined, fails
			await shouldRevert(
				daoNodeTrustedVote(web3, rp, proposalID, true, {
					from: registeredNode2,
					gas: gasLimit,
				}),
				"Member voted on proposal they shouldn't be able too",
				"Member cannot vote on proposal created before they became a member"
			);
		});

		it(printTitle("registeredNodeTrusted2", "fails to execute a successful proposal after it expires"), async () => {
			// Add our 3rd member so proposals can pass
			await setNodeTrusted(web3, rp, registeredNodeTrusted3, "poolseapool_3", "node3@home.com", guardian);
			await increaseTime(web3, 60);
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalLeave",
					type: "function",
					inputs: [{ type: "address", name: "_nodeAddress" }],
				},
				[registeredNodeTrusted1]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can I please leave the DAO?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			// Fast forward to this voting period finishing and executing period expiring
			await increaseTime(web3, (await getDAOProposalExpires(web3, rp, proposalID)) - timeCurrent + 2);
			// Verify correct expired status
			assert((await getDAOProposalState(web3, rp, proposalID)) == proposalStates.Expired, "Proposal state is not Expired");
			// Execution should fail
			await shouldRevert(
				daoNodeTrustedExecute(web3, rp, proposalID, {
					from: registeredNode2,
					gas: gasLimit,
				}),
				"Member execute proposal after it had expired",
				"Proposal has not succeeded, has expired or has already been executed"
			);
		});

		it(printTitle("registeredNodeTrusted2", "checks to see if a proposal has expired after being successfully voted for, but not executed"), async () => {
			// Add our 3rd member so proposals can pass
			await setNodeTrusted(web3, rp, registeredNodeTrusted3, "poolseapool_3", "node3@home.com", guardian);
			await increaseTime(web3, 60);
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalLeave",
					type: "function",
					inputs: [{ type: "address", name: "_nodeAddress" }],
				},
				[registeredNodeTrusted1]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(web3, rp, "hey guys, can I please leave the DAO?", proposalCalldata, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			// Fast forward to this voting period finishing and executing period expiring
			await increaseTime(web3, (await getDAOProposalExpires(web3, rp, proposalID)) - timeCurrent + 2);
			// Execution should fail
			await shouldRevert(
				daoNodeTrustedExecute(web3, rp, proposalID, {
					from: registeredNode2,
					gas: gasLimit,
				}),
				"Member execute proposal after it had expired",
				"Proposal has not succeeded, has expired or has already been executed"
			);
			// Cancel should fail
			await shouldRevert(
				daoNodeTrustedCancel(web3, rp, proposalID, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}),
				"Member cancelled proposal after it had expired",
				"Proposal can only be cancelled if pending or active"
			);
		});

		it(printTitle("registeredNodeTrusted1", "challenges another members node to respond and it does successfully in the window required"), async () => {
			// Add a 3rd member
			await setNodeTrusted(web3, rp, registeredNode1, "poolseapool_3", "node2@home.com", guardian);
			// Update our challenge settings
			const challengeWindowTime = 60 * 60;
			const challengeCooldownTime = 60 * 60;
			// Update now while in bootstrap mode
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.window", challengeWindowTime, {
				from: guardian,
				gas: gasLimit,
			});
			await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.cooldown", challengeCooldownTime, {
				from: guardian,
				gas: gasLimit,
			});
			// Attempt to challenge a non-member
			await shouldRevert(
				daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode2, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}),
				"A non member was challenged",
				"Invalid trusted node"
			);
			// Challenge the 3rd member
			await daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Attempt to challenge again
			await shouldRevert(
				daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}),
				"Member was challenged again",
				"Member is already being challenged"
			);
			// Attempt to challenge another member before cooldown has passed
			await shouldRevert(
				daoNodeTrustedMemberChallengeMake(web3, rp, registeredNodeTrusted2, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}),
				"Member challenged another user before cooldown had passed",
				"You must wait for the challenge cooldown to pass before issuing another challenge"
			);
			// Have 3rd member respond to the challenge successfully
			await daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNode1, true, {
				from: registeredNode1,
				gas: gasLimit,
			});
			// Wait until the original initiator's cooldown window has passed and they attempt another challenge
			await increaseTime(web3, challengeCooldownTime + 2);
			await daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			// Fast forward to past the challenge window with the challenged node responding
			await increaseTime(web3, challengeWindowTime + 2);
			// Have 3rd member respond to the challenge successfully again, but after the challenge window has expired and before another member decides it
			await daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNode1, true, {
				from: registeredNode1,
				gas: gasLimit,
			});
		});

		it(
			printTitle("registeredNodeTrusted1", "challenges another members node to respond, they do not in the window required and lose their membership + bond"),
			async () => {
				// Add a 3rd member
				await setNodeTrusted(web3, rp, registeredNode1, "poolseapool_3", "node2@home.com", guardian);
				// Update our challenge settings
				const challengeWindowTime = 60 * 60;
				const challengeCooldownTime = 60 * 60;
				// Update now while in bootstrap mode
				await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.window", challengeWindowTime, {
					from: guardian,
					gas: gasLimit,
				});
				await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.cooldown", challengeCooldownTime, {
					from: guardian,
					gas: gasLimit,
				});
				// Try to challenge yourself
				await shouldRevert(
					daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
						from: registeredNode1,
						gas: gasLimit,
					}),
					"Member challenged themselves",
					"You cannot challenge yourself"
				);
				// Challenge the 3rd member
				await daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Attempt to decide a challenge on a member that hasn't been challenged
				await shouldRevert(
					daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNodeTrusted2, true, {
						from: registeredNodeTrusted1,
						gas: gasLimit,
					}),
					"Member decided challenge on member without a challenge",
					"Member hasn't been challenged or they have successfully responded to the challenge already"
				);
				// Have another member try to decide the result before the window passes, it shouldn't change and they should still be a member
				await shouldRevert(
					daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNode1, true, {
						from: registeredNodeTrusted2,
						gas: gasLimit,
					}),
					"Member decided challenge before refute window passed",
					"Refute window has not yet passed"
				);
				// Fast forward to past the challenge window with the challenged node responding
				await increaseTime(web3, challengeWindowTime + 2);
				// Decide the challenge now after the node hasn't responded in the challenge window
				await daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNode1, false, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
			}
		);

		it(
			printTitle(
				"registeredNode2",
				"as a regular node challenges a DAO members node to respond by paying ETH, they do not respond in the window required and lose their membership + bond"
			),
			async () => {
				// How much ETH is required for a regular node to challenge a DAO member
				const challengeCost = await rp.dao.node.trusted.settings.getChallengeCost();

				// Add a 3rd member
				await setNodeTrusted(web3, rp, registeredNode1, "poolseapool_3", "node2@home.com", guardian);
				await increaseTime(web3, 60);
				// Update our challenge settings
				const challengeWindowTime = 60 * 60;
				const challengeCooldownTime = 60 * 60;
				// Update now while in bootstrap mode
				await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.window", challengeWindowTime, {
					from: guardian,
					gas: gasLimit,
				});
				await setDAONodeTrustedBootstrapSetting(web3, rp, "poolseaDAONodeTrustedSettingsMembers", "members.challenge.cooldown", challengeCooldownTime, {
					from: guardian,
					gas: gasLimit,
				});
				// Attempt to challenge a non member
				await shouldRevert(
					daoNodeTrustedMemberChallengeMake(web3, rp, userOne, {
						from: registeredNode2,
						gas: gasLimit,
					}),
					"Challenged a non DAO member",
					"Invalid trusted node"
				);
				// Attempt to challenge as a non member
				await shouldRevert(
					daoNodeTrustedMemberChallengeMake(web3, rp, registeredNodeTrusted2, {
						from: userOne,
						gas: gasLimit,
					}),
					"Challenged a non DAO member",
					"Invalid node"
				);
				// Challenge the 3rd member as a regular node, should revert as we haven't paid to challenge
				await shouldRevert(
					daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
						from: registeredNode2,
						gas: gasLimit,
					}),
					"Regular node challenged DAO member without paying challenge fee",
					"Non DAO members must pay ETH to challenge a members node"
				);
				// Ok pay now to challenge
				await daoNodeTrustedMemberChallengeMake(web3, rp, registeredNode1, {
					value: challengeCost,
					from: registeredNode2,
					gas: gasLimit,
				});
				// Fast forward to past the challenge window with the challenged node responding
				await increaseTime(web3, challengeWindowTime + 2);
				// Decide the challenge now after the node hasn't responded in the challenge window
				await daoNodeTrustedMemberChallengeDecide(web3, rp, registeredNode1, false, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
			}
		);

		it(printTitle("registered2", "joins the DAO automatically as a member due to the min number of members falling below the min required"), async () => {
			// Attempt to join as a non node operator
			await shouldRevert(
				setDaoNodeTrustedMemberRequired(web3, rp, "poolseapool_emergency_node_op", "node2@home.com", {
					from: userOne,
					gas: gasLimit,
				}),
				"Regular node joined DAO without bond during low member mode",
				"Invalid node"
			);
			// Attempt to join without setting allowance for the bond
			await shouldRevert(
				setDaoNodeTrustedMemberRequired(web3, rp, "poolseapool_emergency_node_op", "node2@home.com", {
					from: registeredNode2,
					gas: gasLimit,
				}),
				"Regular node joined DAO without bond during low member mode",
				"Not enough allowance given to RocketDAONodeTrusted contract for transfer of RPL bond tokens"
			);
			// Get the DAO settings
			const daoNodeSettings = await rp.contracts.get("poolseaDAONodeTrustedSettingsMembers");
			// How much RPL is required for a trusted node bond?
			const rplBondAmount = web3.utils.fromWei(await daoNodeSettings.methods.getRPLBond().call());
			// We'll allow the DAO to transfer our RPL bond before joining
			const rocketTokenRPL = await rp.contracts.get("poolseaTokenRPL");
			const rocketDAONodeTrustedActions = await rp.contracts.get("poolseaDAONodeTrustedActions");
			const _amount = web3.utils.toWei(rplBondAmount.toString(), "ether");
			await mintRPL(web3, rp, registeredNode2, rplBondAmount, guardian);
			await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode2, gas: gasLimit });
			// Should just be 2 nodes in the DAO now which means a 3rd can join to make up the min count
			await setDaoNodeTrustedMemberRequired(web3, rp, "poolseapool_emergency_node_op", "node2@home.com", {
				from: registeredNode2,
				gas: gasLimit,
			});
		});

		it(printTitle("registered2", "attempt to auto join the DAO automatically and fails as the DAO has the min member count required"), async () => {
			// Add a 3rd member
			await setNodeTrusted(web3, rp, registeredNode1, "poolseapool_3", "node@home.com", guardian);
			// Get the DAO settings
			const daoNodeSettings = await rp.contracts.get("poolseaDAONodeTrustedSettingsMembers");
			// How much RPL is required for a trusted node bond?
			const rplBondAmount = web3.utils.fromWei(await daoNodeSettings.methods.getRPLBond().call());
			// We'll allow the DAO to transfer our RPL bond before joining
			const rocketTokenRPL = await rp.contracts.get("poolseaTokenRPL");
			const rocketDAONodeTrustedActions = await rp.contracts.get("poolseaDAONodeTrustedActions");
			const _amount = web3.utils.toWei(rplBondAmount.toString(), "ether");
			await mintRPL(web3, rp, registeredNode1, rplBondAmount, guardian);
			await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode1, gas: gasLimit });
			// Should just be 2 nodes in the DAO now which means a 3rd can join to make up the min count
			await shouldRevert(
				setDaoNodeTrustedMemberRequired(web3, rp, "poolseapool_emergency_node_op", "node2@home.com", {
					from: registeredNode2,
					gas: gasLimit,
				}),
				"Regular node joined DAO when not in low member mode",
				"Low member mode not engaged"
			);
		});

		/*** Upgrade Contacts & ABI *************/

		// Contracts
		it(printTitle("guardian", "can upgrade a contract in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaNodeManager", abi, rocketMinipoolManagerNew.options.address, {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("guardian", "can upgrade the upgrade contract"), async () => {
			const abi = await rp.contracts.abi("poolseaDAONodeTrustedUpgrade");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaDAONodeTrustedUpgrade", abi, rocketDAONodeTrustedUpgradeNew.options.address, {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("userOne", "cannot upgrade a contract in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaNodeManager", abi, rocketMinipoolManagerNew.options.address, {
					from: userOne,
					gas: gasLimit,
				}),
				"Random address upgraded a contract",
				"Account is not a temporary guardian"
			);
		});

		it(printTitle("guardian", "cannot upgrade a contract with an invalid address"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian adupgradedded a contract with an invalid address",
				"Invalid contract address"
			);
		});

		it(printTitle("guardian", "cannot upgrade a contract with an existing one"), async () => {
			const rocketStorage = await rp.contracts.get("poolseaStorage");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaNodeManager", [], rocketStorage.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian upgraded a contract with an existing contract",
				"Contract address is already in use"
			);
		});

		it(printTitle("guardian", "cannot upgrade a contract with an empty ABI"), async () => {
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaDAONodeTrustedUpgrade", "", rocketDAONodeTrustedUpgradeNew.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian upgraded a contract with an empty ABI",
				"Empty ABI is invalid"
			);
		});

		it(printTitle("guardian", "cannot upgrade a protected contract"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeContract", "poolseaVault", abi, rocketMinipoolManagerNew.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Upgraded a protected contract",
				"Cannot upgrade the vault"
			);
		});

		it(printTitle("guardian", "can add a contract in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addContract", "poolseaMinipoolManagerNew", abi, rocketMinipoolManagerNew.options.address, {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("guardian", "cannot add a contract with the same name as an existing one"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addContract", "poolseaStorage", abi, rocketMinipoolManagerNew.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian added a contract with the same name as an existing one",
				"Contract name is already in use"
			);
		});

		it(printTitle("guardian", "cannot add a contract with an existing address"), async () => {
			const rocketStorage = await rp.contracts.get("poolseaStorage");
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addContract", "poolseaNewContract", abi, rocketStorage.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Guardian added a contract with the same address as an existing one",
				"Contract address is already in use"
			);
		});

		it(printTitle("guardian", "cannot add a new contract with an invalid name"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addContract", "", abi, rocketMinipoolManagerNew.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Added a new contract with an invalid name",
				"Invalid contract name"
			);
		});

		it(printTitle("guardian", "cannot add a new contract with an empty ABI"), async () => {
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addContract", "poolseaNewContract", "", rocketMinipoolManagerNew.options.address, {
					from: guardian,
					gas: gasLimit,
				}),
				"Added a new contract with an empty ABI",
				"Empty ABI is invalid"
			);
		});

		it(printTitle("registeredNodeTrusted1", "creates a proposal to upgrade a network contract, it passes and is executed"), async () => {
			// Load contracts
			const rocketStorage = await rp.contracts.get("poolseaStorage");
			// Add a 3rd member
			await setNodeTrusted(web3, rp, registeredNode1, "poolseapool_3", "node2@home.com", guardian);
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			// Encode the calldata for the proposal
			const proposalCalldata = web3.eth.abi.encodeFunctionCall(
				{
					name: "proposalUpgrade",
					type: "function",
					inputs: [
						{ type: "string", name: "_type" },
						{ type: "string", name: "_name" },
						{ type: "string", name: "_contractAbi" },
						{ type: "address", name: "_contractAddress" },
					],
				},
				["upgradeContract", "poolseaNodeManager", compressABI(abi), rocketMinipoolManagerNew.options.address]
			);
			// Add the proposal
			const proposalID = await daoNodeTrustedPropose(
				web3,
				rp,
				"hey guys, we really should upgrade this contracts - here's a link to its audit reports https://link.com/audit",
				proposalCalldata,
				{
					from: registeredNodeTrusted1,
					gas: gasLimit,
				}
			);
			// Current time
			const timeCurrent = await getCurrentTime(web3);
			// Now increase time until the proposal is 'active' and can be voted on
			await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalID)) - timeCurrent + 2);
			// Now lets vote
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted1,
				gas: gasLimit,
			});
			await daoNodeTrustedVote(web3, rp, proposalID, true, {
				from: registeredNodeTrusted2,
				gas: gasLimit,
			});
			// Proposal has passed, lets execute it now and upgrade the contract
			await daoNodeTrustedExecute(web3, rp, proposalID, {
				from: registeredNode1,
			});
			// Lets check if the address matches the upgraded one now
			assert.equal(
				await rocketStorage.methods.getAddress(web3.utils.soliditySha3("contract.address", "poolseaNodeManager")).call(),
				rocketMinipoolManagerNew.options.address,
				"Contract address was not successfully upgraded"
			);
			assert.isTrue(
				await rocketStorage.methods.getBool(web3.utils.soliditySha3("contract.exists", rocketMinipoolManagerNew.options.address)).call(),
				"Contract address was not successfully upgraded"
			);
		});

		it(
			printTitle("registeredNodeTrusted1", "creates a proposal for registeredNode1 to join as a new member, member joins, is kicked, then cannot rejoin"),
			async () => {
				// Get the DAO settings
				const daoNodesettings = await rp.contracts.get("poolseaDAONodeTrustedSettingsMembers");
				// How much RPL is required for a trusted node bond?
				const rplBondAmount = web3.utils.fromWei(await daoNodesettings.methods.getRPLBond().call());
				// Add our 3rd member so proposals can pass
				await setNodeTrusted(web3, rp, registeredNodeTrusted3, "poolseapool_3", "node3@home.com", guardian);
				// New Member
				// Encode the calldata for the proposal
				const proposalCalldata1 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalInvite",
						type: "function",
						inputs: [
							{ type: "string", name: "_id" },
							{ type: "string", name: "_url" },
							{ type: "address", name: "_nodeAddress" },
						],
					},
					["SaaS_Provider1", "test@sass.com", registeredNode1]
				);
				// Add the proposal
				const proposalId1 = await daoNodeTrustedPropose(web3, rp, "hey guys, can we add this cool SaaS member please?", proposalCalldata1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Current time
				let timeCurrent = await getCurrentTime(web3);
				// Now increase time until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalId1)) - timeCurrent + 2);
				// Now lets vote for the new members
				await daoNodeTrustedVote(web3, rp, proposalId1, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalId1, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				// Current time
				timeCurrent = await getCurrentTime(web3);
				// Fast forward to voting periods finishing
				await increaseTime(web3, (await getDAOProposalEndTime(web3, rp, proposalId1)) - timeCurrent + 2);
				// Proposal should be successful, lets execute it
				await daoNodeTrustedExecute(web3, rp, proposalId1, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// Member has now been invited to join, so lets do that
				// We'll allow the DAO to transfer our RPL bond before joining
				const rocketTokenRPL = await rp.contracts.get("poolseaTokenRPL");
				const rocketDAONodeTrustedActions = await rp.contracts.get("poolseaDAONodeTrustedActions");
				const _amount = web3.utils.toWei(rplBondAmount.toString(), "ether");
				await mintRPL(web3, rp, registeredNode1, rplBondAmount, guardian);
				await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode1, gas: gasLimit });
				// Join now
				await daoNodeTrustedMemberJoin(web3, rp, {
					from: registeredNode1,
					gas: gasLimit,
				});
				// Add a small wait
				await increaseTime(web3, 2);
				// Check the member is now valid
				assert(await getDAOMemberIsValid(web3, rp, registeredNode1), "registeredNode1 is not a member of the DAO");
				// Now we kick the member
				const proposalCalldata2 = web3.eth.abi.encodeFunctionCall(
					{
						name: "proposalKick",
						type: "function",
						inputs: [
							{ type: "address", name: "_nodeAddress" },
							{ type: "uint256", name: "_rplFine" },
						],
					},
					[registeredNode1, "0"]
				);
				// Add the proposal
				const proposalId2 = await daoNodeTrustedPropose(
					web3,
					rp,
					"hey guys, this member hasn't logged on for weeks, lets boot them with a 33% fine!",
					proposalCalldata2,
					{
						from: registeredNodeTrusted1,
						gas: gasLimit,
					}
				);
				// Current time
				timeCurrent = await getCurrentTime(web3);
				// Now increase time until the proposal is 'active' and can be voted on
				await increaseTime(web3, (await getDAOProposalStartTime(web3, rp, proposalId2)) - timeCurrent + 2);
				// Now lets vote
				await daoNodeTrustedVote(web3, rp, proposalId2, true, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalId2, true, {
					from: registeredNodeTrusted2,
					gas: gasLimit,
				});
				await daoNodeTrustedVote(web3, rp, proposalId2, true, {
					from: registeredNodeTrusted3,
					gas: gasLimit,
				});
				// Proposal has passed, lets execute it now
				await daoNodeTrustedExecute(web3, rp, proposalId2, {
					from: registeredNodeTrusted1,
					gas: gasLimit,
				});
				// The new member has now been kicked
				assert((await getDAOMemberIsValid(web3, rp, registeredNode1)) === false, "registeredNode1 is still a member of the DAO");
				// They should not be able to rejoin
				await rocketTokenRPL.methods.approve(rocketDAONodeTrustedActions.options.address, _amount).send({ from: registeredNode1, gas: gasLimit });
				await shouldRevert(
					daoNodeTrustedMemberJoin(web3, rp, {
						from: registeredNode1,
						gas: gasLimit,
					}),
					"Member was able to join after being kicked",
					"This node has not been invited to join"
				);
			}
		);

		// ABIs - contract address field is ignored
		it(printTitle("guardian", "can upgrade a contract ABI in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeABI", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("guardian", "cannot upgrade a contract ABI to an identical one in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeABI", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
				from: guardian,
				gas: gasLimit,
			});

			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeABI", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Upgraded a contract ABI to an identical one",
				"ABIs are identical"
			);
		});

		it(printTitle("guardian", "cannot upgrade a contract ABI which does not exist"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeABI", "fooBarBaz", abi, "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Upgraded a contract ABI which did not exist",
				"ABI does not exist"
			);
		});

		it(printTitle("userOne", "cannot upgrade a contract ABI"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "upgradeABI", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
					from: userOne,
					gas: gasLimit,
				}),
				"Random address upgraded a contract ABI",
				"Account is not a temporary guardian"
			);
		});

		it(printTitle("guardian", "can add a contract ABI in bootstrap mode"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addABI", "poolseaNewFeature", abi, "0x0000000000000000000000000000000000000000", {
				from: guardian,
				gas: gasLimit,
			});
		});

		it(printTitle("guardian", "cannot add a new contract ABI with an invalid name"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addABI", "", abi, "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Added a new contract ABI with an invalid name",
				"Invalid ABI name"
			);
		});

		it(printTitle("guardian", "cannot add a new contract ABI with an empty ABI"), async () => {
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addABI", "poolseaNewFeatures", "", "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Added a new contract ABI with an empty ABI",
				"Empty ABI is invalid"
			);
		});

		it(printTitle("guardian", "cannot add a new contract ABI with an existing name"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addABI", "poolseaNodeManager", abi, "0x0000000000000000000000000000000000000000", {
					from: guardian,
					gas: gasLimit,
				}),
				"Added a new contract ABI with an existing name",
				"ABI name is already in use"
			);
		});

		it(printTitle("userOne", "cannot add a new contract ABI"), async () => {
			const abi = await rp.contracts.abi("poolseaMinipoolManager");
			await shouldRevert(
				setDaoNodeTrustedBootstrapUpgrade(web3, rp, "addABI", "poolseaNewFeature", abi, "0x0000000000000000000000000000000000000000", {
					from: userOne,
					gas: gasLimit,
				}),
				"Random address added a new contract ABI",
				"Account is not a temporary guardian"
			);
		});
	});
}
