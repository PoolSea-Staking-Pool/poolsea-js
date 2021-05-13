// Imports
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core';
import { Contract, SendOptions } from 'web3-eth-contract';
import Contracts from '../contracts/contracts';
import { ConfirmationHandler, handleConfirmations } from '../../utils/transaction';


/**
 * Rocket Pool DAO Proposals
 */
class DAOProposal {


    // Constructor
    public constructor(private web3: Web3, private contracts: Contracts) {}


    // Contract accessors
    private get rocketDAOProposal(): Promise<Contract> {
        return this.contracts.get('rocketDAOProposal');
    }


    /**
     * Getters
     */

    // Get the total of DAO Proposals
    public getTotal(): Promise<number> {
        return this.rocketDAOProposal.then((rocketDAOProposal: Contract): Promise<number> => {
            return rocketDAOProposal.methods.getTotal().call();
        });
    }


    // Get the state of a DAO Proposal
    public getState(proposalID: number): Promise<number> {
        return this.rocketDAOProposal.then((rocketDAOProposal: Contract): Promise<number> => {
            return rocketDAOProposal.methods.getState(proposalID).call();
        });
    }


    // Get the number of votes for DAO Proposal
    public getVotesFor(proposalID: number): Promise<number> {
        return this.rocketDAOProposal.then((rocketDAOProposal: Contract): Promise<number> => {
            return rocketDAOProposal.methods.getVotesFor(proposalID).call();
        });
    }


    // Get the number of required votes for DAO Proposal
    public getVotesRequired(proposalID: number): Promise<number> {
        return this.rocketDAOProposal.then((rocketDAOProposal: Contract): Promise<number> => {
            return rocketDAOProposal.methods.getVotesRequired(proposalID).call();
        });
    }



    /**
     * Mutators - Public
     */



}


// Exports
export default DAOProposal;
