// Imports
import Web3 from 'web3';
import RocketPool from '../../rocketpool/rocketpool';
import NodeContract from '../../rocketpool/node/node-contract';
import { makeDepositInput } from '../../utils/casper';
import { registerNode } from './node-scenarios';
import { setNodeTimezone, setNodeRewardsAddress } from './node-scenarios';
import { reserveNodeDeposit, cancelNodeDepositReservation, completeNodeDeposit } from './node-scenarios';

// Tests
export default function runNodeTests(web3: Web3, rp: RocketPool): void {
    describe('Node', (): void => {


        // Accounts
        let owner: string;


        // Node details
        let nodeOwnerAddress: string;
        let nodeContractAddress: string;
        let nodeContract: NodeContract;


        // Setup
        before(async () => {

            // Get accounts
            let accounts: string[] = await web3.eth.getAccounts();
            owner = accounts[0];

        });


        // Node registration
        describe('Registration', (): void => {

            it('Can register a node', async () => {
                [nodeOwnerAddress, nodeContractAddress] = await registerNode(web3, rp, {timezone: 'foo/bar', owner});
                nodeContract = await rp.node.getContract(nodeContractAddress);
            });

        });


        // Node settings
        describe('Settings', (): void => {

            it('Can set the node\'s timezone location', async () => {
                await setNodeTimezone(rp, {timezone: 'bar/baz', from: nodeOwnerAddress});
            });

            it('Can set the node\'s rewards address', async () => {
                await setNodeRewardsAddress(nodeContract, {rewardsAddress: '0x1111111111111111111111111111111111111111', from: nodeOwnerAddress});
            });

        });


        // Node deposits
        describe('Deposits', (): void => {

            it('Can make a deposit reservation', async () => {
                await reserveNodeDeposit(nodeContract, {durationId: '3m', depositInput: makeDepositInput(web3), from: nodeOwnerAddress});
            });

            it('Can cancel a deposit reservation', async () => {
                await cancelNodeDepositReservation(nodeContract, {from: nodeOwnerAddress});
            });

            it('Can complete a deposit', async () => {
                await reserveNodeDeposit(nodeContract, {durationId: '3m', depositInput: makeDepositInput(web3), from: nodeOwnerAddress});
                await completeNodeDeposit(nodeContract, {from: nodeOwnerAddress, value: web3.utils.toWei('16', 'ether')});
            });

        });


        // RPL ratio
        describe('RPL', (): void => {

            it('Can get the current RPL ratio', async () => {
                // :TODO: check values after node deposits made
                let rplRatio = await rp.node.getRPLRatio('3m');
            });

            it('Can get the current RPL requirement for an amount', async () => {
                // :TODO: check values after node deposits made
                let [rplRequired, rplRatio] = await rp.node.getRPLRequired(web3.utils.toWei('1', 'ether'), '3m');
            });

        });


    });
};
