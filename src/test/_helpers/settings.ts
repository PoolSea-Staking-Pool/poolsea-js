// Imports
import { SendOptions } from "web3-eth-contract";
import RocketPool from "../../rocketpool/rocketpool";

// Deposit settings
export async function getDepositSetting(rp: RocketPool, setting: string) {
	const rocketDAOProtocolSettingsDeposit = await rp.contracts.get("poolseaDAOProtocolSettingsDeposit");
	const value = await rocketDAOProtocolSettingsDeposit.methods["get" + setting]().call();
	return value;
}

export async function setDepositSetting(rp: RocketPool, setting: string, value: any, options: SendOptions) {
	const rocketDAOProtocolSettingsDeposit = await rp.contracts.get("poolseaDAOProtocolSettingsDeposit");
	await rocketDAOProtocolSettingsDeposit.methods["set" + setting](value).send(options);
}

// Minipool settings
export async function getMinipoolSetting(rp: RocketPool, setting: string) {
	const rocketDAOProtocolSettingsMinipool = await rp.contracts.get("poolseaDAOProtocolSettingsMinipool");
	const value = await rocketDAOProtocolSettingsMinipool.methods["get" + setting]().call();
	return value;
}

export async function setMinipoolSetting(rp: RocketPool, setting: string, value: any, options: SendOptions) {
	const rocketDAOProtocolSettingsMinipool = await rp.contracts.get("poolseaDAOProtocolSettingsMinipool");
	await rocketDAOProtocolSettingsMinipool.methods["set" + setting](value).send(options);
}

// Network settings
export async function getNetworkSetting(rp: RocketPool, setting: string) {
	const rocketDAOProtocolSettingsNetwork = await rp.contracts.get("poolseaDAOProtocolSettingsNetwork");
	const value = await rocketDAOProtocolSettingsNetwork.methods["get" + setting]().call();
	return value;
}

export async function setNetworkSetting(rp: RocketPool, setting: string, value: any, options: SendOptions) {
	const rocketDAOProtocolSettingsNetwork = await rp.contracts.get("poolseaDAOProtocolSettingsNetwork");
	await rocketDAOProtocolSettingsNetwork.methods["set" + setting](value).send(options);
}

// Node settings
export async function getNodeSetting(rp: RocketPool, setting: string) {
	const rocketDAOProtocolSettingsNode = await rp.contracts.get("poolseaDAOProtocolSettingsNode");
	const value = await rocketDAOProtocolSettingsNode.methods["get" + setting]().call();
	return value;
}

export async function setNodeSetting(rp: RocketPool, setting: string, value: any, options: SendOptions) {
	const rocketDAOProtocolSettingsNode = await rp.contracts.get("poolseaDAOProtocolSettingsNode");
	await rocketDAOProtocolSettingsNode.methods["set" + setting](value).send(options);
}
