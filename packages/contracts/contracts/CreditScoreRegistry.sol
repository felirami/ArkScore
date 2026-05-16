// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CreditScoreRegistry
/// @author ArkScore
/// @notice Stores Wavy Node-backed institutional credit decisions by hashed wallet subject on Avalanche Fuji.
contract CreditScoreRegistry {
    enum InstitutionalDecision {
        ReviewRequired,
        ApproveIFCEquityIssuance,
        ApproveBankaoolLoan,
        Decline
    }

    struct ScoreRecord {
        bytes32 subjectHash;
        uint8 wavyRiskScore;
        uint8 compositeCreditScore;
        InstitutionalDecision decision;
        bytes32 wavyEvidenceHash;
        string wavyAnalysisId;
        string institution;
        uint256 updatedAt;
        address submitter;
    }

    /// @notice Address allowed to transfer ownership and manage authorized score submitters.
    address public owner;

    /// @notice Returns whether an address is authorized to submit score records.
    mapping(address scorer => bool authorized) public isScorer;
    mapping(bytes32 subjectHash => ScoreRecord record) private records;
    /// @notice Returns whether a hashed subject has a stored score record.
    mapping(bytes32 subjectHash => bool exists) public hasScore;

    /// @notice Emitted when registry ownership changes.
    /// @param previousOwner Previous owner address.
    /// @param newOwner New owner address.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice Emitted when an owner authorizes or revokes a score submitter.
    /// @param scorer Address whose score-submitter status changed.
    /// @param authorized True when the scorer is authorized.
    event ScorerUpdated(address indexed scorer, bool indexed authorized);
    /// @notice Emitted when an authorized scorer stores a Wavy-backed score.
    /// @param subjectHash Privacy-preserving hash of the scored wallet subject.
    /// @param wavyRiskScore Raw Wavy Node risk score on a 0-100 scale.
    /// @param compositeCreditScore ArkScore composite credit score on a 0-100 scale.
    /// @param decision Institutional decision bucket derived from the score.
    /// @param wavyEvidenceHash Hash of the off-chain score evidence.
    /// @param wavyAnalysisId Wavy Node analysis identifier for traceability.
    /// @param institution Institution or product context for the decision.
    /// @param submitter Authorized scorer that stored the record.
    event ScoreRecorded(
        bytes32 indexed subjectHash,
        uint8 wavyRiskScore,
        uint8 compositeCreditScore,
        InstitutionalDecision decision,
        bytes32 indexed wavyEvidenceHash,
        string wavyAnalysisId,
        string institution,
        address indexed submitter
    );

    error NotOwner();
    error NotScorer();
    error InvalidAddress();
    error InvalidSubjectHash();
    error InvalidScore();
    error MissingScore();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyScorer() {
        if (!isScorer[msg.sender]) revert NotScorer();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();

        owner = initialOwner;
        isScorer[initialOwner] = true;

        emit OwnershipTransferred(address(0), initialOwner);
        emit ScorerUpdated(initialOwner, true);
    }

    /// @notice Transfers owner privileges and authorizes the new owner as a scorer.
    /// @param newOwner Address that will become the registry owner.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();

        address previousOwner = owner;
        owner = newOwner;
        isScorer[newOwner] = true;

        emit OwnershipTransferred(previousOwner, newOwner);
        emit ScorerUpdated(newOwner, true);
    }

    /// @notice Updates whether an address can submit score records.
    /// @param scorer Address to authorize or revoke.
    /// @param authorized True to authorize the scorer, false to revoke it.
    function setScorer(address scorer, bool authorized) external onlyOwner {
        if (scorer == address(0)) revert InvalidAddress();

        isScorer[scorer] = authorized;

        emit ScorerUpdated(scorer, authorized);
    }

    /// @notice Stores or overwrites the latest Wavy-backed score for a hashed subject.
    /// @param subjectHash Privacy-preserving hash of the scored wallet subject.
    /// @param wavyRiskScore Raw Wavy Node risk score on a 0-100 scale.
    /// @param compositeCreditScore ArkScore composite credit score on a 0-100 scale.
    /// @param decision Institutional decision bucket derived from the score.
    /// @param wavyEvidenceHash Hash of the off-chain score evidence.
    /// @param wavyAnalysisId Wavy Node analysis identifier for traceability.
    /// @param institution Institution or product context for the decision.
    function recordScore(
        bytes32 subjectHash,
        uint8 wavyRiskScore,
        uint8 compositeCreditScore,
        InstitutionalDecision decision,
        bytes32 wavyEvidenceHash,
        string calldata wavyAnalysisId,
        string calldata institution
    ) external onlyScorer {
        if (subjectHash == bytes32(0)) revert InvalidSubjectHash();
        if (wavyRiskScore > 100 || compositeCreditScore > 100) revert InvalidScore();

        records[subjectHash] = ScoreRecord({
            subjectHash: subjectHash,
            wavyRiskScore: wavyRiskScore,
            compositeCreditScore: compositeCreditScore,
            decision: decision,
            wavyEvidenceHash: wavyEvidenceHash,
            wavyAnalysisId: wavyAnalysisId,
            institution: institution,
            updatedAt: block.timestamp,
            submitter: msg.sender
        });
        hasScore[subjectHash] = true;

        emit ScoreRecorded(
            subjectHash,
            wavyRiskScore,
            compositeCreditScore,
            decision,
            wavyEvidenceHash,
            wavyAnalysisId,
            institution,
            msg.sender
        );
    }

    /// @notice Reads the latest stored score for a hashed subject.
    /// @param subjectHash Privacy-preserving hash of the scored wallet subject.
    /// @return record Stored score record.
    function getScore(bytes32 subjectHash) external view returns (ScoreRecord memory record) {
        if (!hasScore[subjectHash]) revert MissingScore();
        return records[subjectHash];
    }
}
