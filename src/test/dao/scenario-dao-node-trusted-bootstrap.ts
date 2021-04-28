// Imports
import {assert} from 'chai';
import Web3 from 'web3';
import {SendOptions} from 'web3-eth-contract';
import RocketPool from '../../rocketpool/rocketpool';
import {compressABI, decompressABI} from '../_utils/contract';
import {AbiItem} from 'web3-utils';


export async function setDaoNodeTrustedBootstrapMember(web3: Web3, rp: RocketPool, _id: string, _email: string, _nodeAddress: string, options: SendOptions) {

    // Load contracts
    const rocketDAONodeTrusted = await rp.contracts.get('rocketDAONodeTrusted');

    // Get data about the tx
    function getTxData() {
        return Promise.all([
            rocketDAONodeTrusted.methods.getMemberID(_nodeAddress).call(),
        ]).then(
            ([memberID]) =>
                ({memberID})
        );
    }

    // Capture data
    let ds1 = await getTxData();

    // Set gas price
    let gasPrice = web3.utils.toBN(web3.utils.toWei('20', 'gwei'));
    options.gasPrice = gasPrice.toString();
    options.gas = 1000000;

    // Set as a bootstrapped member
    await rocketDAONodeTrusted.methods.bootstrapMember(_id, _email, _nodeAddress).send(options);

    // Capture data
    let ds2 = await getTxData();

    // Check ID has been recorded
    assert(ds2.memberID == _id, 'Member was not invited to join correctly');

}


// // Change a trusted node DAO setting while bootstrap mode is enabled
export async function setDAONodeTrustedBootstrapSetting(web3: Web3, rp: RocketPool, _settingContractInstance: string, _settingPath:string, _value: any, options: SendOptions) {

    // Load contracts
    const rocketDAONodeTrusted = await rp.contracts.get('rocketDAONodeTrusted');
    const rocketDAONodeTrustedSettingsContract = await rp.contracts.get(_settingContractInstance);

    // Get data about the tx
    function getTxData() {
        return Promise.all([
            rocketDAONodeTrustedSettingsContract.methods.getSettingUint(_settingPath).call(),
            rocketDAONodeTrustedSettingsContract.methods.getSettingBool(_settingPath).call()
        ]).then(
            ([settingUintValue, settingBoolValue]) =>
                ({
                    settingUintValue: web3.utils.toBN(settingUintValue),
                    settingBoolValue: settingBoolValue
                })
        );
    }

    // Capture data
    let ds1 = await getTxData();
    //console.log(Number(ds1.settingValue));

    // Set as a bootstrapped setting. detect type first, can be a number, string or bn object
    if(typeof(_value) == 'number' || typeof(_value) == 'string' || typeof(_value) == 'object') await rocketDAONodeTrusted.methods.bootstrapSettingUint(_settingContractInstance, _settingPath, _value).send(options);
    if(typeof(_value) == 'boolean') await rocketDAONodeTrusted.methods.bootstrapSettingBool(_settingContractInstance, _settingPath, _value).send(options);

    // Capture data
    let ds2 = await getTxData();

    // Check it was updated
    if(typeof(_value) == 'number' || typeof(_value) == 'string') await assert(ds2.settingUintValue.eq(web3.utils.toBN(_value)), 'DAO node trusted uint256 setting not updated in bootstrap mode');
    if(typeof(_value) == 'boolean')  await assert(ds2.settingBoolValue == _value, 'DAO node trusted boolean setting not updated in bootstrap mode');


}


// Disable bootstrap mode
export async function setDaoNodeTrustedBootstrapModeDisabled(web3: Web3, rp: RocketPool, options: SendOptions) {

    // Load contracts
    const rocketDAONodeTrusted = await rp.contracts.get('rocketDAONodeTrusted');

    // Get data about the tx
    function getTxData() {
        return Promise.all([
            rocketDAONodeTrusted.methods.getBootstrapModeDisabled().call(),
        ]).then(
            ([bootstrapmodeDisabled]) =>
                ({bootstrapmodeDisabled})
        );
    }

    // Capture data
    let ds1 = await getTxData();

    // Set as a bootstrapped member
    await rocketDAONodeTrusted.methods.bootstrapDisable(true).send(options);

    // Capture data
    let ds2 = await getTxData();

    // Check ID has been recorded
    assert(ds2.bootstrapmodeDisabled == true, 'Bootstrap mode was not disabled');
}


// The trusted node DAO can also upgrade contracts + abi if consensus is reached
export async function setDaoNodeTrustedBootstrapUpgrade(web3: Web3, rp: RocketPool, _type:string, _name:string, _abi:AbiItem[], _contractAddress: string, options: SendOptions) {

    // Load contracts
    const [
        rocketStorage,
        rocketDAONodeTrusted,
    ] = await Promise.all([
        await rp.contracts.get('rocketStorage'),
        await rp.contracts.get('rocketDAONodeTrusted'),
    ]);

    // Add test method to ABI
    let testAbi = _abi.slice();
    testAbi.push({
        "constant": true,
        "inputs": [],
        "name": "testMethod",
        "outputs": [{
            "name": "",
            "type": "uint8"
        }],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
    });
    let compressedAbi = compressABI(testAbi);

    // Get contract data
    function getContractData() {
        return Promise.all([
            rocketStorage.methods.getAddress(web3.utils.soliditySha3('contract.address', _name)).call(),
            rocketStorage.methods.getString(web3.utils.soliditySha3('contract.abi', _name)).call(),
        ]).then(
            ([address, abi]) =>
                ({address, abi})
        );
    }
    function getContractAddressData(_contractAddress: string) {
        return Promise.all([
            rocketStorage.methods.getBool(web3.utils.soliditySha3('contract.exists', _contractAddress)).call(),
            rocketStorage.methods.getString(web3.utils.soliditySha3('contract.name', _contractAddress)).call(),
        ]).then(
            ([exists, name]) =>
                ({exists, name})
        );
    }

    // Get initial contract data
    let contract1 = await getContractData();

    // console.log(_type, _name, _contractAddress);

    // Set gas price
    let gasPrice = web3.utils.toBN(web3.utils.toWei('20', 'gwei'));
    options.gasPrice = gasPrice.toString();
    options.gas = 1000000;

    // Upgrade contract
    await rocketDAONodeTrusted.methods.bootstrapUpgrade(_type, _name, compressedAbi, _contractAddress).send(options);

    // Get updated contract data
    let contract2 = await getContractData();
    let [oldContractData, newContractData] = await Promise.all([
        getContractAddressData(contract1.address),
        getContractAddressData(contract2.address),
    ]);

    // Initialise new contract from stored data
    let newContract = new web3.eth.Contract(decompressABI(contract2.abi), contract2.address);

    // Check different assertions based on upgrade type
    if(_type == 'upgradeContract') {
        // Check contract details
        assert.equal(contract2.address, _contractAddress, 'Contract address was not successfully upgraded');
        assert.notEqual(newContract.methods.testMethod().call(), undefined, 'Contract ABI was not successfully upgraded');
        assert.isFalse(oldContractData.exists, 'Old contract address exists flag was not unset');
        assert.equal(oldContractData.name, '', 'Old contract address name was not unset');
        assert.isTrue(newContractData.exists, 'New contract exists flag was not set');
        assert.notEqual(newContractData.name, '', 'New contract name was not set');
    }
    if(_type == 'addContract') {
        // Check contract details
        assert.equal(contract2.address, _contractAddress, 'Contract address was not set');
        assert.notEqual(newContract.methods.testMethod().call(), undefined, 'Contract ABI was not set');
        assert.isTrue(newContractData.exists, 'New contract exists flag was not set');
        assert.notEqual(newContractData.name, '', 'New contract name was not set');
    }
    if(_type == 'upgradeABI' || _type == 'addABI') {
        // Check ABI details
        let contractAbi = await rocketStorage.methods.getString(web3.utils.soliditySha3('contract.abi', _name)).call();
        let contract = new web3.eth.Contract(decompressABI(contractAbi), '0x0000000000000000000000000000000000000000');
        assert.notEqual(contract.methods.testMethod().call(), undefined, 'Contract ABI was not set');
    }


}


// A registered node attempting to join as a member due to low DAO member count
export async function setDaoNodeTrustedMemberRequired(web3: Web3, rp: RocketPool, _id: string, _email: string, options: SendOptions) {

    // Load contracts
    const rocketDAONodeTrusted =  await rp.contracts.get('rocketDAONodeTrusted');
    const rocketVault =  await rp.contracts.get('rocketVault');
    const rocketTokenRPL =  await rp.contracts.get('rocketTokenRPL');

    // Get data about the tx
    function getTxData() {
        return Promise.all([
            rocketDAONodeTrusted.methods.getMemberCount().call(),
            rocketTokenRPL.methods.balanceOf(options.from).call(),
            rocketVault.methods.balanceOfToken('rocketDAONodeTrustedActions', rocketTokenRPL.options.address).call(),
        ]).then(
            ([memberTotal, rplBalanceBond, rplBalanceVault]) =>
                ({
                    memberTotal: web3.utils.toBN(memberTotal),
                    rplBalanceBond: web3.utils.toBN(rplBalanceBond),
                    rplBalanceVault: web3.utils.toBN(rplBalanceVault)
                })
        );
    }

    // Capture data
    let ds1 = await getTxData();
    //console.log('Member Total', Number(ds1.memberTotal), web3.utils.fromWei(ds1.rplBalanceBond), web3.utils.fromWei(ds1.rplBalanceVault));

    // Set gas price
    let gasPrice = web3.utils.toBN(web3.utils.toWei('20', 'gwei'));
    options.gasPrice = gasPrice.toString();
    options.gas = 1000000;

    // Add a new proposal
    await rocketDAONodeTrusted.methods.memberJoinRequired(_id, _email).send(options);

    // Capture data
    let ds2 = await getTxData();
    //console.log('Member Total', Number(ds2.memberTotal), web3.utils.fromWei(ds2.rplBalanceBond), web3.utils.fromWei(ds2.rplBalanceVault));

    // Check member count has increased
    assert(ds2.memberTotal.eq(ds1.memberTotal.add(web3.utils.toBN(1))), 'Member count has not increased');
    assert(ds2.rplBalanceVault.eq(ds1.rplBalanceVault.add(ds1.rplBalanceBond)), 'RocketVault address does not contain the correct RPL bond amount');
}
