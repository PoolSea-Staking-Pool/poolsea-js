// Imports
import { assert } from 'chai';
import Web3 from 'web3';
import { SendOptions } from 'web3-eth-contract';
import RocketPool from '../../rocketpool/rocketpool';

// Set the address the DAO can receive rewards at
export async function getRewardsDAOTreasuryBalance(web3: Web3, rp: RocketPool, options: SendOptions) {
    // Load contracts
    const rocketVault = await rp.contracts.get('rocketVault');
    const rocketTokenRPL = await rp.contracts.get('rocketTokenRPL');
    return rocketVault.methods.balanceOfToken('rocketClaimDAO', rocketTokenRPL.options.address).call();
}

// Set the address the DAO can receive rewards at
export async function rewardsClaimDAO(web3: Web3, rp: RocketPool, options: SendOptions) {
    // Load contracts
    const rocketVault = await rp.contracts.get('rocketVault');
    const rocketClaimTrustedNode = await rp.contracts.get('rocketClaimTrustedNode');
    const rocketRewardsPool = await rp.contracts.get('rocketRewardsPool');
    const rocketTokenRPL = await rp.contracts.get('rocketTokenRPL');

    // Call the mint function on RPL to mint any before we begin so we have accurate figures to work with
    if(await rocketTokenRPL.methods.getInflationIntervalsPassed().call() > 0) await rocketTokenRPL.methods.inflationMintTokens().call();

    // Get data about the tx
    function getTxData() {
        return Promise.all([
            rocketRewardsPool.methods.getClaimIntervalsPassed().call(),
            rocketRewardsPool.methods.getClaimIntervalBlockStart().call(),
            rocketRewardsPool.methods.getRPLBalance().call(),
            rocketRewardsPool.methods.getClaimingContractPerc('rocketClaimDAO').call(),
            rocketRewardsPool.methods.getClaimingContractAllowance('rocketClaimDAO').call().then((value: any) => web3.utils.toBN(value)),
            rocketRewardsPool.methods.getClaimingContractTotalClaimed('rocketClaimDAO').call().then((value: any) => web3.utils.toBN(value)),
            rocketRewardsPool.methods.getClaimIntervalRewardsTotal().call(),
            rocketVault.methods.balanceOfToken('rocketClaimDAO', rocketTokenRPL.options.address).call().then((value: any) => web3.utils.toBN(value)),
        ]).then(
            ([intervalsPassed, intervalBlockStart, poolRPLBalance, daoClaimPerc, daoClaimAllowance, daoContractClaimTotal, intervalRewardsTotal, daoRewardsAddressBalance]) =>
                ({intervalsPassed, intervalBlockStart, poolRPLBalance, daoClaimPerc, daoClaimAllowance, daoContractClaimTotal, intervalRewardsTotal, daoRewardsAddressBalance})
        );
    }

    // Capture data
    let ds1 = await getTxData();

    // Perform tx
    await rocketClaimTrustedNode.methods.claim().send(options);

    // Capture data
    let ds2 = await getTxData();

    //console.log(Number(ds1.intervalsPassed), Number(ds1.intervalBlockStart), Number(web3.utils.fromWei(ds1.daoClaimAllowance)).toFixed(4), Number(web3.utils.fromWei(ds1.daoClaimPerc)), (Number(web3.utils.fromWei(ds1.daoClaimPerc)) * Number(web3.utils.fromWei((ds1.intervalRewardsTotal)))).toFixed(4));
    //console.log(Number(ds2.intervalsPassed), Number(ds2.intervalBlockStart), Number(web3.utils.fromWei(ds2.daoClaimAllowance)).toFixed(4), Number(web3.utils.fromWei(ds2.daoClaimPerc)), (Number(web3.utils.fromWei(ds2.daoClaimPerc)) * Number(web3.utils.fromWei((ds2.intervalRewardsTotal)))).toFixed(4));

    // Verify the claim allowance is correct
    assert(Number(web3.utils.fromWei(ds2.daoClaimAllowance)).toFixed(4) == Number(Number(web3.utils.fromWei(ds2.daoClaimPerc)) * Number(web3.utils.fromWei((ds2.intervalRewardsTotal)))).toFixed(4), 'Contract claim amount total does not equal the expected claim amount');
    // Should be 1 collect per interval
    assert(ds2.daoContractClaimTotal.eq(ds2.daoClaimAllowance), "Amount claimed exceeds allowance for interval");
    // Now test various outcomes depending on if a claim interval happened or not
    if(Number(ds1.intervalBlockStart) < Number(ds2.intervalBlockStart)) {
        // Dao can only receive rewards on the first claim of a claim period
        assert(ds2.daoRewardsAddressBalance.eq(ds1.daoRewardsAddressBalance.add(ds2.daoContractClaimTotal)), "DAO rewards address does not contain the correct balance");
    }else{
        // Claim interval has not passed, dao should not have claimed anything
        assert(ds2.daoRewardsAddressBalance.eq(ds1.daoRewardsAddressBalance), "DAO rewards address balance has changed on same interval claim");
    }

};


