// Imports
import {assert} from 'chai';
import Web3 from 'web3';
import RocketPool from '../../rocketpool/rocketpool';
import {SendOptions} from 'web3-eth-contract';
import {mineBlocks} from "../_utils/evm";


// Get the current inflation period in blocks
export async function rplInflationIntervalBlocksGet(web3: Web3, rp: RocketPool, options: SendOptions) {
    // Load contracts
    const rocketTokenRPL = await rp.contracts.get('rocketTokenRPL');
    return await rocketTokenRPL.methods.getInflationIntervalBlocks().call();
};


export interface Claim {
    blockInterval: number,
    blockStart: number,
    blockClaim: number,
    yearlyInflationTarget: number
}

// Claim the inflation after a set amount of blocks have passed
export async function rplClaimInflation(web3: Web3, rp: RocketPool, config: Claim, options: SendOptions, tokenAmountToMatch: number = 0) {

    // Load contracts
    const rocketTokenRPL = await rp.contracts.get('rocketTokenRPL');
    const rocketVault = await rp.contracts.get('rocketVault');

    // Get the previously last inflation calculated block
    const blockIntervalLastCalc = web3.utils.toBN(await rocketTokenRPL.methods.getInflationCalcBlock().call());

    // Get data about the current inflation
    function getInflationData() {
        return Promise.all([
            web3.eth.getBlockNumber(),
            rocketTokenRPL.methods.totalSupply().call(),
            rocketTokenRPL.methods.getInflationIntervalStartBlock().call(),
            rocketTokenRPL.methods.getInlfationIntervalsPassed().call(),
            rocketTokenRPL.methods.balanceOf(rocketVault.options.address).call().then((value: any) => web3.utils.toBN(value)),
            rocketVault.methods.balanceOfToken('rocketRewardsPool', rocketTokenRPL.options.address).call().then((value: any) => web3.utils.toBN(value)),
        ]).then(
            ([currentBlock, tokenTotalSupply, inflationStartBlock, inflationIntervalsPassed, rocketVaultBalanceRPL, rocketVaultInternalBalanceRPL]) =>
                ({currentBlock, tokenTotalSupply, inflationStartBlock, inflationIntervalsPassed, rocketVaultBalanceRPL, rocketVaultInternalBalanceRPL})
        );
    }

    // Get initial data
    let inflationData1 = await getInflationData();
    //console.log(inflationData1.currentBlock, web3.utils.fromWei(inflationData1.tokenTotalSupply), inflationData1.inflationStartBlock.toString(), web3.utils.fromWei(inflationData1.rocketVaultBalanceRPL), web3.utils.fromWei(inflationData1.rocketVaultInternalBalanceRPL));

    // Starting amount of total supply
    let totalSupplyStart = Number(web3.utils.fromWei(inflationData1.tokenTotalSupply));

    // Some expected data results based on the passed parameters
    let expectedInflationLastCalcBlock = Number(blockIntervalLastCalc) == 0 && config.blockStart < config.blockClaim ? config.blockStart : Number(blockIntervalLastCalc);
    let expectedInflationIntervalsPassed = Math.floor((config.blockClaim - expectedInflationLastCalcBlock) / config.blockInterval);
    let expectedInflationDaily = (1 + config.yearlyInflationTarget) ** (1 / (365));
    // How much inflation to use based on intervals passed
    let expectedInflationAmount = expectedInflationDaily;
    for(let i=1; i < expectedInflationIntervalsPassed; i++) {
        expectedInflationAmount = (expectedInflationAmount * expectedInflationDaily);
    }
    // How many tokens to be epected minted
    let expectedTokensMinted = (expectedInflationAmount * totalSupplyStart) - totalSupplyStart;


    // Get the current block so we can calculate how many blocks to mine to make it to the claim block
    let blockCurrent = await web3.eth.getBlockNumber();
    // Blocks to process as passing
    let blocksToSimulatePassing = config.blockClaim - blockCurrent;
    // Process the blocks now to simulate blocks passing (nned to minus 1 block as the 'inflationMintTokens' tx triggers a new block with ganache which is equal to the claim block)
    await mineBlocks(web3, blocksToSimulatePassing - 1);
    // Claim tokens now
    await rocketTokenRPL.methods.inflationMintTokens().send(options);


    // Get inflation data
    let inflationData2 = await getInflationData();
    //console.log(inflationData2.currentBlock, web3.utils.fromWei(inflationData2.tokenTotalSupply), inflationData2.inflationStartBlock.toString(), web3.utils.fromWei(inflationData2.rocketVaultBalanceRPL), web3.utils.fromWei(inflationData2.rocketVaultInternalBalanceRPL));

    // Ending amount of total supply
    let totalSupplyEnd = Number(web3.utils.fromWei(inflationData2.tokenTotalSupply));

    // console.log('RESULT', expectedInflationIntervalsPassed, expectedTokensMinted.toFixed(4), (totalSupplyEnd - totalSupplyStart).toFixed(4));

    // Verify the minted amount is correct based on inflation rate etc
    assert(expectedTokensMinted.toFixed(4) == (totalSupplyEnd - totalSupplyStart).toFixed(4), 'Incorrect amount of minted tokens expected');
    // Verify the minted tokens are now stored in Rocket Vault on behalf of Rocket Rewards Pool
    assert(inflationData2.rocketVaultInternalBalanceRPL.eq(inflationData2.rocketVaultBalanceRPL), 'Incorrect amount of tokens stored in Rocket Vault for Rocket Rewards Pool');
    // Are we verifying an exact amount of tokens given as a required parameter on this pass?
    if(tokenAmountToMatch) assert(Number(tokenAmountToMatch).toFixed(4) == Number(totalSupplyEnd).toFixed(4), 'Given token amount does not match total supply made');


}
