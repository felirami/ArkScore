// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CreditScoreRegistry
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

    address public owner;

    mapping(address scorer => bool authorized) public isScorer;
    mapping(bytes32 subjectHash => ScoreRecord record) private records;
    mapping(bytes32 subjectHash => bool exists) public hasScore;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ScorerUpdated(address indexed scorer, bool authorized);
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

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();

        address previousOwner = owner;
        owner = newOwner;
        isScorer[newOwner] = true;

        emit OwnershipTransferred(previousOwner, newOwner);
        emit ScorerUpdated(newOwner, true);
    }

    function setScorer(address scorer, bool authorized) external onlyOwner {
        if (scorer == address(0)) revert InvalidAddress();

        isScorer[scorer] = authorized;

        emit ScorerUpdated(scorer, authorized);
    }

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

    function getScore(bytes32 subjectHash) external view returns (ScoreRecord memory record) {
        if (!hasScore[subjectHash]) revert MissingScore();
        return records[subjectHash];
    }
}
