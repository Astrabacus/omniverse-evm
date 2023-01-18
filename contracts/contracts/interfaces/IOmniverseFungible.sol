// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IOmniverseTransaction.sol";

/**
 * @dev Interface of the omniverse fungible token, which inherits {IOmniverseTransaction}
 */
interface IERCOmniverseFungible is IERCOmniverse {
    /**
     * @dev Returns the omniverse balance of a user `_pk`
     * @param _pk Omniverse account to be queried
     */
    function omniverseBalanceOf(bytes calldata _pk) external view returns (uint256);
}