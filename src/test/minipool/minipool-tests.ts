// Imports
import {assert} from 'chai';
import Web3 from 'web3';
import RocketPool from '../../rocketpool/rocketpool';
import MinipoolContract from '../../rocketpool/minipool/minipool-contract';
import {takeSnapshot, revertSnapshot, mineBlocks} from '../_utils/evm';
import {createMinipool, getMinipoolMinimumRPLStake, stakeMinipool} from '../_helpers/minipool';
import {close} from './scenario-close';
import {dissolve} from './scenario-dissolve';
import {refund } from './scenario-refund';
import {stake} from './scenario-stake';
import {withdrawValidatorBalance} from './scenario-withdraw-validator-balance';
import {withdraw} from './scenario-withdraw';
import {nodeStakeRPL, setNodeTrusted, setNodeWithdrawalAddress} from '../_helpers/node';
import {setDAOProtocolBootstrapSetting} from '../dao/scenario-dao-protocol-bootstrap';
import {userDeposit} from '../_helpers/deposit';
import {mintRPL} from '../_helpers/tokens';
import {printTitle} from '../_utils/formatting';
import {shouldRevert} from '../_utils/testing';
import {getValidatorPubkey} from '../_utils/beacon';

// Tests
export default function runMinipoolTests(web3: Web3, rp: RocketPool) {
    describe('Minipool', () => {

        // settings
        const gasLimit: number = 8000000;


        // Accounts
        let owner: string;
        let node: string;
        let nodeWithdrawalAddress: string;
        let trustedNode: string;
        let dummySwc: string;
        let random: string;

        // Minipool validator keys
        const stakingMinipoolPubkey = getValidatorPubkey();
        const withdrawableMinipoolPubkey = getValidatorPubkey();


        // State snapshotting
        let suiteSnapshotId: string, testSnapshotId: string;
        before(async () => { suiteSnapshotId = await takeSnapshot(web3); });
        after(async () => { await revertSnapshot(web3, suiteSnapshotId); });
        beforeEach(async () => { testSnapshotId = await takeSnapshot(web3); });
        afterEach(async () => { await revertSnapshot(web3, testSnapshotId); });


        // Setup
        let launchTimeout = 20;
        let withdrawalDelay = 20;
        let initializedMinipool: MinipoolContract;
        let prelaunchMinipool: MinipoolContract;
        let prelaunchMinipool2: MinipoolContract;
        let stakingMinipool: MinipoolContract;
        let withdrawableMinipool: MinipoolContract;
        let dissolvedMinipool: MinipoolContract;
        let withdrawalBalance = web3.utils.toWei('36', 'ether');
        let withdrawableMinipoolStartBalance = web3.utils.toWei('32', 'ether');
        let withdrawableMinipoolEndBalance = web3.utils.toWei('36', 'ether');
        before(async () => {

            // Get accounts
            [owner, node, nodeWithdrawalAddress, trustedNode, dummySwc, random] = await web3.eth.getAccounts();

            // Register node & set withdrawal address
            await rp.node.registerNode('Australia/Brisbane', {from: node, gas: gasLimit});
            await setNodeWithdrawalAddress(web3, rp, node, nodeWithdrawalAddress, {from: node, gas: gasLimit});

            // Register trusted node
            await rp.node.registerNode('Australia/Brisbane', {from: trustedNode, gas: gasLimit});
            await setNodeTrusted(web3, rp, trustedNode, 'saas_1', 'node@home.com', owner);

            // Set settings
            await setDAOProtocolBootstrapSetting(web3, rp, 'rocketDAOProtocolSettingsMinipool', 'minipool.launch.timeout', launchTimeout, {from: owner, gas: gasLimit});
            await setDAOProtocolBootstrapSetting(web3, rp, 'rocketDAOProtocolSettingsMinipool', 'minipool.withdrawal.delay', withdrawalDelay, {from: owner});

            // Make user deposit to refund first prelaunch minipool
            let refundAmount = web3.utils.toWei('16', 'ether');
            await userDeposit(web3, rp, {from: random, value: refundAmount, gas: gasLimit});

            // Stake RPL to cover minipools
            let minipoolRplStake = await getMinipoolMinimumRPLStake(web3, rp);
            let rplStake = minipoolRplStake.mul(web3.utils.toBN(6));
            await mintRPL(web3, rp, owner, node, rplStake);
            await nodeStakeRPL(web3, rp, rplStake, {from: node, gas: gasLimit});

            // Create minipools
            prelaunchMinipool = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('32', 'ether'), gas: gasLimit}) as MinipoolContract);
            prelaunchMinipool2 = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('32', 'ether'), gas: gasLimit}) as MinipoolContract);
            stakingMinipool = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('32', 'ether'), gas: gasLimit}) as MinipoolContract);
            withdrawableMinipool = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('32', 'ether'), gas: gasLimit}) as MinipoolContract);
            initializedMinipool = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('16', 'ether'), gas: gasLimit}) as MinipoolContract);
            dissolvedMinipool = (await createMinipool(web3, rp, {from: node, value: web3.utils.toWei('16', 'ether'), gas: gasLimit}) as MinipoolContract);

            // Stake minipools
            await stakeMinipool(web3, rp, stakingMinipool, stakingMinipoolPubkey, {from: node, gas: gasLimit});
            await stakeMinipool(web3, rp, withdrawableMinipool, withdrawableMinipoolPubkey, {from: node, gas: gasLimit});

            // Set minipool to withdrawable
            await rp.minipool.submitMinipoolWithdrawable(withdrawableMinipool.address, withdrawableMinipoolStartBalance, withdrawableMinipoolEndBalance, {from: trustedNode, gas: gasLimit});

            // Dissolve minipool
            await dissolvedMinipool.dissolve({from: node, gas: gasLimit});

            // Check minipool statuses
            let initializedStatus = await initializedMinipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            let prelaunchStatus = await prelaunchMinipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            let prelaunch2Status = await prelaunchMinipool2.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            let stakingStatus = await stakingMinipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            let withdrawableStatus = await withdrawableMinipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            let dissolvedStatus = await dissolvedMinipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value));
            assert(initializedStatus.eq(web3.utils.toBN(0)), 'Incorrect initialized minipool status');
            assert(prelaunchStatus.eq(web3.utils.toBN(1)), 'Incorrect prelaunch minipool status');
            assert(prelaunch2Status.eq(web3.utils.toBN(1)), 'Incorrect prelaunch minipool status');
            assert(stakingStatus.eq(web3.utils.toBN(2)), 'Incorrect staking minipool status');
            assert(withdrawableStatus.eq(web3.utils.toBN(3)), 'Incorrect withdrawable minipool status');
            assert(dissolvedStatus.eq(web3.utils.toBN(4)), 'Incorrect dissolved minipool status');

            // Check minipool refund balances
            let prelaunchRefundBalance = await prelaunchMinipool.contract.methods.getNodeRefundBalance().call().then((value: any) => web3.utils.toBN(value));
            let prelaunch2RefundBalance = await prelaunchMinipool2.contract.methods.getNodeRefundBalance().call().then((value: any) => web3.utils.toBN(value));
            assert(prelaunchRefundBalance.eq(web3.utils.toBN(refundAmount)), 'Incorrect prelaunch minipool refund balance');
            assert(prelaunch2RefundBalance.eq(web3.utils.toBN(0)), 'Incorrect prelaunch minipool refund balance');

        });


        //
        // General
        //

        it(printTitle('random address', 'cannot send ETH to non-payable minipool delegate methods'), async () => {

            // Attempt to send ETH to view method
            await shouldRevert(prelaunchMinipool.contract.methods.getStatus().send({
                from: random,
                value: web3.utils.toWei('1', 'ether'),
                gas: gasLimit,
            }), 'Sent ETH to a non-payable minipool delegate view method', '');

            // Attempt to send ETH to mutator method
            await shouldRevert(refund(web3, rp, prelaunchMinipool, {
                from: node,
                value: web3.utils.toWei('1', 'ether'),
                gas: gasLimit
            }), 'Sent ETH to a non-payable minipool delegate mutator method', '');

        });

        it(printTitle('minipool', 'has correct withdrawal credentials'), async () => {

            // Withdrawal credentials settings
            const withdrawalPrefix = '01';
            const padding = '0000000000000000000000';

            // Get minipool withdrawal credentials
            let withdrawalCredentials = await initializedMinipool.contract.methods.getWithdrawalCredentials().call();

            // Check withdrawal credentials
            let expectedWithdrawalCredentials = ('0x' + withdrawalPrefix + padding + initializedMinipool.address.substr(2));
            assert.equal(withdrawalCredentials.toLowerCase(), expectedWithdrawalCredentials.toLowerCase(), 'Invalid minipool withdrawal credentials');

        });

        //
        // Refund
        //
        it(printTitle('node operator', 'can refund a refinanced node deposit balance'), async () => {

            // Refund from minipool with refund balance
            await refund(web3, rp, prelaunchMinipool, {
                from: node,
                gas: gasLimit
            });

        });

        it(printTitle('node operator', 'cannot refund with no refinanced node deposit balance'), async () => {

            // Refund
            await refund(web3, rp, prelaunchMinipool, {from: node, gas: gasLimit});

            // Attempt refund from minipools with no refund balance
            await shouldRevert(refund(web3, rp, prelaunchMinipool, {
                from: node,
                gas: gasLimit
            }), 'Refunded from a minipool which was already refunded from', 'No amount of the node deposit is available for refund');

            await shouldRevert(refund(web3, rp, prelaunchMinipool2, {
                from: node,
                gas: gasLimit
            }), 'Refunded from a minipool with no refund balance', 'No amount of the node deposit is available for refund');

        });

        //
        // Dissolve
        //
        it(printTitle('node operator', 'can dissolve their own minipools'), async () => {

            // Dissolve minipools
            await dissolve(web3, rp, initializedMinipool, {
                from: node,
                gas: gasLimit
            });
            await dissolve(web3, rp, prelaunchMinipool, {
                from: node,
                gas: gasLimit
            });

        });

        it(printTitle('node operator', 'cannot dissolve their own staking minipools'), async () => {

            // Attempt to dissolve staking minipool
            await shouldRevert(dissolve(web3, rp, stakingMinipool, {
                from: node,
                gas: gasLimit
            }), 'Dissolved a staking minipool', 'The minipool can only be dissolved while initialized or in prelaunch');

        });

        it(printTitle('random address', 'can dissolve a timed out minipool at prelaunch'), async () => {

            // Time prelaunch minipool out
            await mineBlocks(web3, launchTimeout);

            // Dissolve prelaunch minipool
            await dissolve(web3, rp, prelaunchMinipool, {
                from: random,
                gas: gasLimit
            });

        });

        it(printTitle('random address', 'cannot dissolve a minipool which is not at prelaunch'), async () => {

            // Time prelaunch minipool out
            await mineBlocks(web3, launchTimeout);

            // Attempt to dissolve initialized minipool
            await shouldRevert(dissolve(web3, rp, initializedMinipool, {
                from: random,
                gas: gasLimit
            }), 'Random address dissolved a minipool which was not at prelaunch', 'The minipool can only be dissolved by its owner unless it has timed out');

        });

        it(printTitle('random address', 'cannot dissolve a minipool which has not timed out'), async () => {

            // Attempt to dissolve prelaunch minipool
            await shouldRevert(dissolve(web3, rp, prelaunchMinipool, {
                from: random,
            }), 'Random address dissolved a minipool which has not timed out', 'The minipool can only be dissolved by its owner unless it has timed out');

        });

        //
        // Stake
        //
        it(printTitle('node operator', 'can stake a minipool at prelaunch'), async () => {

            // Stake prelaunch minipool
            await stake(web3, rp, prelaunchMinipool, getValidatorPubkey(), "", {
                from: node,
                gas: gasLimit
            });

        });

        it(printTitle('node operator', 'cannot stake a minipool which is not at prelaunch'), async () => {

            // Attempt to stake initialized minipool
            await shouldRevert(stake(web3, rp, initializedMinipool, getValidatorPubkey(), "", {
                from: node,
                gas: gasLimit
            }), 'Staked a minipool which was not at prelaunch', 'The minipool can only begin staking while in prelaunch');

        });


        it(printTitle('node operator', 'cannot stake a minipool with a reused validator pubkey'), async () => {

            // Get pubkey
            let pubkey = getValidatorPubkey();

            // Stake prelaunch minipool
            await stake(web3, rp, prelaunchMinipool, pubkey, "", {from: node, gas: gasLimit});

            // Attempt to stake second prelaunch minipool with same pubkey
            await shouldRevert(stake(web3, rp, prelaunchMinipool2, pubkey, "", {
                from: node,
                gas: gasLimit
            }), 'Staked a minipool with a reused validator pubkey', 'Validator pubkey is already in use');

        });

        it(printTitle('node operator', 'cannot stake a minipool with incorrect withdrawal credentials'), async () => {

            // Get withdrawal credentials
            let invalidWithdrawalCredentials = '0x1111111111111111111111111111111111111111111111111111111111111111';

            // Attempt to stake prelaunch minipool
            await shouldRevert(stake(web3, rp, prelaunchMinipool, getValidatorPubkey(), invalidWithdrawalCredentials, {
                from: node,
                gas: gasLimit
            }), 'Staked a minipool with incorrect withdrawal credentials', 'Transaction reverted silently');

        });


        it(printTitle('random address', 'cannot stake a minipool'), async () => {

            // Attempt to stake prelaunch minipool
            await shouldRevert(stake(web3, rp, prelaunchMinipool, getValidatorPubkey(), "", {
                from: random,
                gas: gasLimit
            }), 'Random address staked a minipool', 'Invalid minipool owner');

        });


        //
        // Withdraw
        //

        it(printTitle('node operator', 'can withdraw a withdrawable minipool after withdrawal delay'), async () => {

            // Wait for withdrawal delay
            await mineBlocks(web3, withdrawalDelay);

            // Withdraw withdrawable minipool
            await withdraw(web3, rp, withdrawableMinipool, {
                from: node,
                gas: gasLimit
            });

        });

        it(printTitle('node operator', 'cannot withdraw a minipool which is not withdrawable'), async () => {

            // Wait for withdrawal delay
            await mineBlocks(web3, withdrawalDelay);

            // Attempt to withdraw staking minipool
            await shouldRevert(withdraw(web3, rp, stakingMinipool, {
                from: node,
                gas: gasLimit
            }), 'Withdrew a minipool which was not withdrawable', 'The minipool can only be withdrawn from while withdrawable');

        });

        it(printTitle('node operator', 'cannot withdraw a withdrawable minipool twice'), async () => {

            // Wait for withdrawal delay
            await mineBlocks(web3, withdrawalDelay);

            // Withdraw withdrawable minipool
            await withdraw(web3, rp, withdrawableMinipool, {
                from: node,
                gas: gasLimit
            });

            // Attempt to withdraw withdrawable minipool again
            await shouldRevert(withdraw(web3, rp, withdrawableMinipool, {
                from: node,
                gas: gasLimit
            }), 'Withdrew a minipool twice', 'The minipool has already been withdrawn from');

        });

        it(printTitle('node operator', 'cannot withdraw a withdrawable minipool before withdrawal delay'), async () => {

            // Attempt to withdraw withdrawable minipool
            await shouldRevert(withdraw(web3, rp, withdrawableMinipool, {
                from: node,
                gas: gasLimit
            }), 'Withdrew a minipool before withdrawal delay', 'The minipool cannot be withdrawn from until after the withdrawal delay period');

        });


        it(printTitle('random address', 'cannot withdraw a minipool'), async () => {

            // Wait for withdrawal delay
            await mineBlocks(web3, withdrawalDelay);

            // Attempt to withdraw withdrawable minipool
            await shouldRevert(withdraw(web3, rp, withdrawableMinipool, {
                from: random,
                gas: gasLimit
            }), 'Random address withdrew a minipool', 'Invalid minipool owner');

        });


        //
        // Withdraw validator balance
        //
        it(printTitle('system withdrawal contract', 'can send validator balance to a withdrawable minipool'), async () => {

            // Send validator balance
            await withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit
            });

        });

        it(printTitle('system withdrawal contract', 'cannot send validator balance to a minipool which is not withdrawable'), async () => {

            // Attempt to send validator balance
            await shouldRevert(withdrawValidatorBalance(web3, rp, stakingMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit
            }), 'Sent validator balance to a minipool which was not withdrawable', 'The minipool\'s validator balance can only be sent while withdrawable');

        });

        it(printTitle('system withdrawal contract', 'cannot send validator balance to a withdrawable minipool twice'), async () => {

            // Send validator balance
            await withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit
            });

            // Attempt to send validator balance again
            await shouldRevert(withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit
            }), 'Sent validator balance to a minipool twice', 'The minipool\'s validator balance has already been sent');

        });

        it(printTitle('system withdrawal contract', 'cannot send validator balance to a withdrawable minipool while processing withdrawals is disabled'), async () => {

            // Disable processing withdrawals
            await setDAOProtocolBootstrapSetting(web3, rp, 'rocketDAOProtocolSettingsNetwork', 'network.process.withdrawals.enabled', false, {from: owner});

            // Attempt to send validator balance
            await shouldRevert(withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit,
            }), 'Sent validator balance to a minipool while processing withdrawals was disabled', 'Processing withdrawals is currently disabled');

        });

        it(printTitle('random address', 'can send validator balance to a withdrawable minipool in one transaction'), async () => {

            // Send validator balance
            await withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: withdrawalBalance,
                gas: gasLimit
            });

        });

        it(printTitle('random address', 'can send validator balance to a withdrawable minipool across multiple transactions'), async () => {

            // Get tx amount (half of withdrawal balance)
            let amount = web3.utils.toBN(withdrawalBalance).div(web3.utils.toBN(2));

            // Send initial tx
            await withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: amount,
                gas: gasLimit,
            }, false);

            // Send final tx
            await withdrawValidatorBalance(web3, rp, withdrawableMinipool, {
                from: random,
                value: amount,
                gas: gasLimit
            });

        });


        //
        // Close
        //
        it(printTitle('node operator', 'can close a dissolved minipool'), async () => {

            // Close dissolved minipool
            await close(web3, rp, dissolvedMinipool, {
                from: node,
                gas: gasLimit
            });

        });


        it(printTitle('node operator', 'cannot close a minipool which is not dissolved'), async () => {

            // Attempt to close staking minipool
            await shouldRevert(close(web3, rp, stakingMinipool, {
                from: node,
                gas: gasLimit,
            }), 'Closed a minipool which was not dissolved', 'The minipool can only be closed while dissolved');

        });


        it(printTitle('random address', 'cannot close a dissolved minipool'), async () => {

            // Attempt to close dissolved minipool
            await shouldRevert(close(web3, rp, dissolvedMinipool, {
                from: random,
                gas: gasLimit,
            }), 'Random address closed a minipool', 'Invalid minipool owner');

        });


    });
};
