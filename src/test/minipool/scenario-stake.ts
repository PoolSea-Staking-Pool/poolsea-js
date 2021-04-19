// Imports
import { assert } from 'chai';
import Web3 from 'web3';
import { SendOptions } from 'web3-eth-contract';
import RocketPool from '../../rocketpool/rocketpool';
import MinipoolContract from '../../rocketpool/minipool/minipool-contract';
import { getValidatorPubkey, getValidatorSignature, getDepositDataRoot } from '../_utils/beacon';


// Stake a minipool
export async function stake(web3: Web3, rp: RocketPool, minipool: MinipoolContract, validatorPubkey: Buffer, withdrawalCredentials: string, options: SendOptions) {

    // Load contracts
    const rocketMinipoolManager = await rp.contracts.get('rocketMinipoolManager');
    const rocketDAOProtocolSettingsMinipool = await rp.contracts.get('rocketDAOProtocolSettingsMinipool');

    // Get parameters
    let launchBalance = await rocketDAOProtocolSettingsMinipool.methods.getLaunchBalance().call().then((value: any) => web3.utils.toBN(value));

    // Get minipool withdrawal credentials
    if (!withdrawalCredentials) withdrawalCredentials = await minipool.contract.methods.getWithdrawalCredentials().call();

    // Get validator deposit data
    let depositData = {
        pubkey: validatorPubkey,
        withdrawalCredentials: Buffer.from(withdrawalCredentials.substr(2), 'hex'),
        amount: BigInt(32000000000), // gwei
        signature: getValidatorSignature(),
    };
    let depositDataRoot = getDepositDataRoot(depositData);

    // Get minipool details
    function getMinipoolDetails() {
        return Promise.all([
            minipool.contract.methods.getStatus().call().then((value: any) => web3.utils.toBN(value)),
            web3.eth.getBalance(minipool.contract.options.address).then((value: any) => web3.utils.toBN(value)),
        ]).then(
            ([status, balance]) =>
                ({status, balance})
        );
    }

    // Get initial minipool details & minipool by validator pubkey
    let [details1, validatorMinipool1] = await Promise.all([
        getMinipoolDetails(),
        rocketMinipoolManager.methods.getMinipoolByPubkey(validatorPubkey).call(),
    ]);

    // Stake
    await minipool.contract.methods.stake(depositData.pubkey, depositData.signature, depositDataRoot).send(options);

    // Get updated minipool details & minipool by validator pubkey
    let [details2, validatorMinipool2] = await Promise.all([
        getMinipoolDetails(),
        rocketMinipoolManager.methods.getMinipoolByPubkey(validatorPubkey).call(),
    ]);

    // Check minpool details
    const staking = web3.utils.toBN(2);
    assert(!details1.status.eq(staking), 'Incorrect initial minipool status');
    assert(details2.status.eq(staking), 'Incorrect updated minipool status');
    assert(details2.balance.eq(details1.balance.sub(launchBalance)), 'Incorrect updated minipool ETH balance');

    // Check minipool by validator pubkey
    assert.equal(validatorMinipool1, '0x0000000000000000000000000000000000000000', 'Incorrect initial minipool by validator pubkey');
    assert.equal(validatorMinipool2, minipool.address, 'Incorrect updated minipool by validator pubkey');

}

