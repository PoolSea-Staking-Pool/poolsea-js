// Imports
import Web3 from "web3";
import RocketPool from "../../rocketpool/rocketpool";
import { takeSnapshot, revertSnapshot } from "../_utils/evm";
import { setDAOProtocolBootstrapSetting, setDaoProtocolBootstrapModeDisabled, setDAOProtocolBootstrapSettingMulti } from "./scenario-dao-protocol-bootstrap";
import { shouldRevert } from "../_utils/testing";
import { printTitle } from "../_utils/formatting";

// Tests
export default function runDAOProtocolTests(web3: Web3, rp: RocketPool) {
  describe("DAO Protocol", () => {
    // settings
    const gasLimit: number = 8000000;

    // Accounts
    let guardian: string;
    let userOne: string;

    // State snapshotting
    let suiteSnapshotId: string, testSnapshotId: string;
    before(async () => {
      suiteSnapshotId = await takeSnapshot(web3);
    });
    after(async () => {
      await revertSnapshot(web3, suiteSnapshotId);
    });
    beforeEach(async () => {
      testSnapshotId = await takeSnapshot(web3);
    });
    afterEach(async () => {
      await revertSnapshot(web3, testSnapshotId);
    });

    // Setup
    before(async () => {
      // Get accounts
      [guardian, userOne] = await web3.eth.getAccounts();
    });

    // Update a setting
    it(printTitle("userOne", "fails to update a setting as they are not the guardian"), async () => {
      await shouldRevert(
        setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsAuction", "auction.lot.create.enabled", true, {
          from: userOne,
          gas: gasLimit,
        }),
        "User updated bootstrap setting",
        "Account is not a temporary guardian"
      );
    });

    // Update multiple settings
    it(printTitle("userOne", "fails to update multiple settings as they are not the guardian"), async () => {
      // Fails to change multiple settings
      await shouldRevert(
        setDAOProtocolBootstrapSettingMulti(
          web3,
          rp,
          ["rocketDAOProtocolSettingsAuction", "rocketDAOProtocolSettingsDeposit", "rocketDAOProtocolSettingsInflation"],
          ["auction.lot.create.enabled", "deposit.minimum", "rpl.inflation.interval.blocks"],
          [true, web3.utils.toWei("2"), 400],
          {
            from: userOne,
            gas: gasLimit,
          }
        ),
        "User updated bootstrap setting",
        "Account is not a temporary guardian"
      );
    });

    // Verify each setting contract is enabled correctly. These settings are tested in greater detail in the relevant contracts
    it(printTitle("guardian", "updates a setting in each settings contract while bootstrap mode is enabled"), async () => {
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsAuction", "auction.lot.create.enabled", true, {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsDeposit", "deposit.minimum", web3.utils.toWei("2"), {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsInflation", "rpl.inflation.interval.blocks", 400, {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsMinipool", "minipool.submit.withdrawable.enabled", true, {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsNetwork", "network.submit.prices.enabled", true, {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsRewards", "rpl.rewards.claim.period.blocks", 100, {
        from: guardian,
        gas: gasLimit,
      });
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsInflation", "network.reth.deposit.delay", 500, {
        from: guardian,
        gas: gasLimit,
      });
    });

    // Verify each setting contract is enabled correctly. These settings are tested in greater detail in the relevent contracts
    it(printTitle("guardian", "updates multiple settings at once while bootstrap mode is enabled"), async () => {
      // Set via bootstrapping
      await setDAOProtocolBootstrapSettingMulti(
        web3,
        rp,
        ["rocketDAOProtocolSettingsAuction", "rocketDAOProtocolSettingsDeposit", "rocketDAOProtocolSettingsInflation"],
        ["auction.lot.create.enabled", "deposit.minimum", "rpl.inflation.interval.blocks"],
        [true, web3.utils.toWei("2"), 400],
        {
          from: guardian,
          gas: gasLimit,
        }
      );
    });

    // Update a setting, then try again
    it(printTitle("guardian", "updates a setting, then fails to update a setting again after bootstrap mode is disabled"), async () => {
      // Set via bootstrapping
      await setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsAuction", "auction.lot.create.enabled", true, {
        from: guardian,
        gas: gasLimit,
      });
      // Disable bootstrap mode
      await setDaoProtocolBootstrapModeDisabled(web3, rp, {
        from: guardian,
        gas: gasLimit,
      });
      // Attempt to change a setting again
      await shouldRevert(
        setDAOProtocolBootstrapSetting(web3, rp, "rocketDAOProtocolSettingsAuction", "auction.lot.create.enabled", true, {
          from: guardian,
          gas: gasLimit,
        }),
        "Guardian updated bootstrap setting after mode disabled",
        "Bootstrap mode not engaged"
      );
    });

    // Update multiple settings, then try again
    it(printTitle("guardian", "updates multiple settings, then fails to update multiple settings again after bootstrap mode is disabled"), async () => {
      // Set via bootstrapping
      await setDAOProtocolBootstrapSettingMulti(
        web3,
        rp,
        ["rocketDAOProtocolSettingsAuction", "rocketDAOProtocolSettingsDeposit", "rocketDAOProtocolSettingsInflation"],
        ["auction.lot.create.enabled", "deposit.minimum", "rpl.inflation.interval.blocks"],
        [true, web3.utils.toWei("2"), 400],
        {
          from: guardian,
          gas: gasLimit,
        }
      );
      // Disable bootstrap mode
      await setDaoProtocolBootstrapModeDisabled(web3, rp, {
        from: guardian,
        gas: gasLimit,
      });
      // Attempt to change a setting again
      await shouldRevert(
        setDAOProtocolBootstrapSettingMulti(
          web3,
          rp,
          ["rocketDAOProtocolSettingsAuction", "rocketDAOProtocolSettingsDeposit", "rocketDAOProtocolSettingsInflation"],
          ["auction.lot.create.enabled", "deposit.minimum", "rpl.inflation.interval.blocks"],
          [true, web3.utils.toWei("2"), 400],
          {
            from: guardian,
            gas: gasLimit,
          }
        ),
        "Guardian updated bootstrap setting after mode disabled",
        "Bootstrap mode not engaged"
      );
    });
  });
}
