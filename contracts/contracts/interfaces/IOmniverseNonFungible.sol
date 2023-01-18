// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IOmniverseTransaction.sol";

/**
 * @dev Interface of the omniverse non fungible token, which inherits {IOmniverseTransaction}
 */
interface IERCOmniverseNonFungible is IERCOmniverse {
    /**
     * @dev Returns the omniverse balance of a user `_pk`
     * @param _pk Omniverse account to be queried
     */
    function omniverseBalanceOf(bytes calldata _pk) external view returns (uint256);

    /**
     * @dev Returns the owner of a token `tokenId`
     * @param _tokenId Omniverse token id to be queried
     */
    function omniverseOwnerOf(uint256 _tokenId) external view returns (bytes memory);
}