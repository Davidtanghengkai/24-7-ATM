// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OverseasLedger {
    event OverseasRecorded(
        address indexed bankSigner,
        uint256 indexed bcUserID,
        uint256 amountCents,
        string refId
    );

    mapping(string => bool) private usedRefs;

    function recordOverseas(
        uint256 receiverBcUserID,
        uint256 amountCents,
        string memory ref
    ) external {
        require(receiverBcUserID > 0, "Invalid receiverBcUserID");
        require(amountCents > 0, "Amount must be > 0");
        require(bytes(ref).length > 0, "Reference required");
        require(!usedRefs[ref], "Reference already used");

        usedRefs[ref] = true;
        emit OverseasRecorded(msg.sender, receiverBcUserID, amountCents, ref);
    }
}
