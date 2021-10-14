// Imports
import Web3 from "web3";
import { TransactionReceipt } from "web3-core";
import { Contract, SendOptions } from "web3-eth-contract";
import Contracts from "../../../contracts/contracts";
import { ConfirmationHandler, handleConfirmations } from "../../../../utils/transaction";

/**
 * Rocket Pool DAO Trusted Node Proposals
 */
class DAONodeTrustedProposals {
	/**
	 * Create a new DAONodeTrustedProposals instance.
	 *
	 * @param web3 A valid Web3 instance
	 * @param contracts A Rocket Pool contract manager instance
	 */
	public constructor(private web3: Web3, private contracts: Contracts) {}

	// Contract accessors
	private get rocketDAONodeTrustedProposals(): Promise<Contract> {
		return this.contracts.get("rocketDAONodeTrustedProposals");
	}

	/**
	 * Getters
	 */

	/**
	 * Mutators - Public
	 */
	// Make a Proposal to the DAO
	public propose(message: string, payload: string, options?: SendOptions, onConfirmation?: ConfirmationHandler): Promise<TransactionReceipt> {
		return this.rocketDAONodeTrustedProposals.then((rocketDAONodeTrustedProposals: Contract): Promise<TransactionReceipt> => {
			return handleConfirmations(rocketDAONodeTrustedProposals.methods.propose(message, payload).send(options), onConfirmation);
		});
	}

	// Vote on an existing DAO Proposal
	public vote(proposalID: number, vote: boolean, options?: SendOptions, onConfirmation?: ConfirmationHandler): Promise<TransactionReceipt> {
		return this.rocketDAONodeTrustedProposals.then((rocketDAONodeTrustedProposals: Contract): Promise<TransactionReceipt> => {
			return handleConfirmations(rocketDAONodeTrustedProposals.methods.vote(proposalID, vote).send(options), onConfirmation);
		});
	}

	// Execute an existing DAO Proposal
	public execute(proposalID: number, options?: SendOptions, onConfirmation?: ConfirmationHandler): Promise<TransactionReceipt> {
		return this.rocketDAONodeTrustedProposals.then((rocketDAONodeTrustedProposals: Contract): Promise<TransactionReceipt> => {
			return handleConfirmations(rocketDAONodeTrustedProposals.methods.execute(proposalID).send(options), onConfirmation);
		});
	}

	// Cancel an existing DAO Proposal
	public cancel(proposalID: number, options?: SendOptions, onConfirmation?: ConfirmationHandler): Promise<TransactionReceipt> {
		return this.rocketDAONodeTrustedProposals.then((rocketDAONodeTrustedProposals: Contract): Promise<TransactionReceipt> => {
			return handleConfirmations(rocketDAONodeTrustedProposals.methods.cancel(proposalID).send(options), onConfirmation);
		});
	}
}

// Exports
export default DAONodeTrustedProposals;
