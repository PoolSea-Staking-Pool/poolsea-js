import Web3 from "web3";
import Contracts from "../contracts/contracts";
/**
 * Rocket Pool Node Settings Manager
 */
declare class NodeSettings {
    private web3;
    private contracts;
    /**
     * Create a new Node Settings instance.
     *
     * @param web3 A valid Web3 instance
     * @param contracts A Rocket Pool contract manager instance
     */
    constructor(web3: Web3, contracts: Contracts);
    /**
     * Private accessor use to retrieve the related contract
     * @returns a Promise<Contract\> with a web3.eth.contract instance of the rocketDAOProtocolSettingsNode contract
     */
    private get rocketDAOProtocolSettingsNode();
    /**
     * Return if node registrations are currently enabled
     * @returns a Promise<boolean\> that resolves to a boolean representing if node registrations are enabled
     *
     * @example using Typescript
     * ```ts
     * const enabled = rp.settings.node.getRegistrationEnabled().then((val: boolean) => { val };
     * ```
     */
    getRegistrationEnabled(): Promise<boolean>;
    /**
     * Return if node deposits are currently enabled
     * @returns a Promise<boolean\> that resolves to a boolean representing if node deposits are enabled
     *
     * @example using Typescript
     * ```ts
     * const enabled = rp.settings.node.getDepositEnabled().then((val: boolean) => { val };
     * ```
     */
    getDepositEnabled(): Promise<boolean>;
}
export default NodeSettings;
