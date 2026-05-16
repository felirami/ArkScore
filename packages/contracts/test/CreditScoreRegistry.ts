import { expect } from "chai";
import { network } from "hardhat";

const evidenceHash =
  "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19";
const secondEvidenceHash =
  "0x9cd61637c3ec2a9ac59e9bd37f8b9d52b9edb60968e37b7f940647c83509ac9c";

describe("CreditScoreRegistry", function () {
  async function deployRegistry() {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const owner = signers[0]!;
    const subject = signers[1]!;
    const scorer = signers[2]!;
    const outsider = signers[3]!;
    const subjectHash = ethers.keccak256(
      ethers.solidityPacked(["address"], [subject.address]),
    );
    const otherSubjectHash = ethers.keccak256(
      ethers.solidityPacked(["address"], [outsider.address]),
    );
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner.address,
    ]);

    return {
      ethers,
      owner,
      subject,
      scorer,
      outsider,
      subjectHash,
      otherSubjectHash,
      registry,
    };
  }

  it("records a Wavy-backed score from an authorized scorer", async function () {
    const { owner, subjectHash, registry } = await deployRegistry();
    const recordScore = registry.getFunction("recordScore");

    await expect(
      recordScore(
        subjectHash,
        12,
        91,
        1,
        evidenceHash,
        "analysis-001",
        "arkangeles",
      ),
    )
      .to.emit(registry, "ScoreRecorded")
      .withArgs(
        subjectHash,
        12,
        91,
        1,
        evidenceHash,
        "analysis-001",
        "arkangeles",
        owner.address,
      );

    const getScore = registry.getFunction("getScore");
    const hasScore = registry.getFunction("hasScore");
    const record = await getScore(subjectHash);

    expect(await hasScore(subjectHash)).to.equal(true);
    expect(record.subjectHash).to.equal(subjectHash);
    expect(record.wavyRiskScore).to.equal(12);
    expect(record.compositeCreditScore).to.equal(91);
    expect(record.decision).to.equal(1);
    expect(record.wavyEvidenceHash).to.equal(evidenceHash);
    expect(record.wavyAnalysisId).to.equal("analysis-001");
    expect(record.institution).to.equal("arkangeles");
    expect(record.updatedAt).to.be.greaterThan(0);
    expect(record.submitter).to.equal(owner.address);
  });

  it("overwrites an existing subject score with the latest Wavy evidence", async function () {
    const { owner, scorer, subjectHash, registry } = await deployRegistry();
    const setScorer = registry.getFunction("setScorer");
    const ownerRecordScore = registry.getFunction("recordScore");

    await ownerRecordScore(
      subjectHash,
      12,
      91,
      1,
      evidenceHash,
      "analysis-001",
      "arkangeles",
    );
    await setScorer(scorer.address, true);

    const scorerRecordScore = registry
      .connect(scorer)
      .getFunction("recordScore");
    await scorerRecordScore(
      subjectHash,
      67,
      45,
      0,
      secondEvidenceHash,
      "analysis-002",
      "bankaool",
    );

    const getScore = registry.getFunction("getScore");
    const record = await getScore(subjectHash);

    expect(record.subjectHash).to.equal(subjectHash);
    expect(record.wavyRiskScore).to.equal(67);
    expect(record.compositeCreditScore).to.equal(45);
    expect(record.decision).to.equal(0);
    expect(record.wavyEvidenceHash).to.equal(secondEvidenceHash);
    expect(record.wavyAnalysisId).to.equal("analysis-002");
    expect(record.institution).to.equal("bankaool");
    expect(record.submitter).to.equal(scorer.address);
    expect(record.submitter).not.to.equal(owner.address);
  });

  it("manages institutional scorers through the owner account", async function () {
    const { scorer, outsider, subjectHash, otherSubjectHash, registry } =
      await deployRegistry();
    const setScorer = registry.getFunction("setScorer");
    const isScorer = registry.getFunction("isScorer");

    await expect(setScorer(scorer.address, true))
      .to.emit(registry, "ScorerUpdated")
      .withArgs(scorer.address, true);
    expect(await isScorer(scorer.address)).to.equal(true);

    const scorerRecordScore = registry
      .connect(scorer)
      .getFunction("recordScore");
    await scorerRecordScore(
      subjectHash,
      22,
      83,
      2,
      evidenceHash,
      "analysis-004",
      "bankaool",
    );

    await expect(setScorer(scorer.address, false))
      .to.emit(registry, "ScorerUpdated")
      .withArgs(scorer.address, false);
    expect(await isScorer(scorer.address)).to.equal(false);

    await expect(
      scorerRecordScore(
        otherSubjectHash,
        22,
        83,
        2,
        evidenceHash,
        "analysis-005",
        "bankaool",
      ),
    ).to.be.revertedWithCustomError(registry, "NotScorer");

    const outsiderSetScorer = registry
      .connect(outsider)
      .getFunction("setScorer");
    await expect(
      outsiderSetScorer(outsider.address, true),
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });

  it("transfers ownership and authorizes the new owner as a scorer", async function () {
    const { owner, scorer, subjectHash, registry } = await deployRegistry();
    const transferOwnership = registry.getFunction("transferOwnership");
    const ownerGetter = registry.getFunction("owner");
    const isScorer = registry.getFunction("isScorer");

    await expect(transferOwnership(scorer.address))
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(owner.address, scorer.address)
      .and.to.emit(registry, "ScorerUpdated")
      .withArgs(scorer.address, true);

    expect(await ownerGetter()).to.equal(scorer.address);
    expect(await isScorer(scorer.address)).to.equal(true);

    const scorerRecordScore = registry
      .connect(scorer)
      .getFunction("recordScore");
    await scorerRecordScore(
      subjectHash,
      8,
      96,
      1,
      evidenceHash,
      "analysis-006",
      "arkangeles",
    );
  });

  it("blocks unapproved scorers", async function () {
    const { outsider, subjectHash, registry } = await deployRegistry();
    const recordScore = registry.connect(outsider).getFunction("recordScore");

    await expect(
      recordScore(
        subjectHash,
        40,
        62,
        0,
        evidenceHash,
        "analysis-002",
        "bankaool",
      ),
    ).to.be.revertedWithCustomError(registry, "NotScorer");
  });

  it("rejects an empty subject hash", async function () {
    const { ethers, registry } = await deployRegistry();
    const recordScore = registry.getFunction("recordScore");

    await expect(
      recordScore(
        ethers.ZeroHash,
        10,
        88,
        1,
        evidenceHash,
        "analysis-003",
        "arkangeles",
      ),
    ).to.be.revertedWithCustomError(registry, "InvalidSubjectHash");
  });

  it("rejects scores outside the 0-100 scale", async function () {
    const { subjectHash, registry } = await deployRegistry();
    const recordScore = registry.getFunction("recordScore");

    await expect(
      recordScore(
        subjectHash,
        101,
        88,
        1,
        evidenceHash,
        "analysis-007",
        "arkangeles",
      ),
    ).to.be.revertedWithCustomError(registry, "InvalidScore");

    await expect(
      recordScore(
        subjectHash,
        10,
        101,
        1,
        evidenceHash,
        "analysis-008",
        "arkangeles",
      ),
    ).to.be.revertedWithCustomError(registry, "InvalidScore");
  });

  it("rejects missing score reads", async function () {
    const { subjectHash, registry } = await deployRegistry();
    const getScore = registry.getFunction("getScore");

    await expect(getScore(subjectHash)).to.be.revertedWithCustomError(
      registry,
      "MissingScore",
    );
  });

  it("rejects invalid owner and scorer addresses", async function () {
    const { ethers, scorer, registry } = await deployRegistry();
    const factory = await ethers.getContractFactory("CreditScoreRegistry");
    const setScorer = registry.getFunction("setScorer");
    const transferOwnership = registry.getFunction("transferOwnership");
    const outsiderTransferOwnership = registry
      .connect(scorer)
      .getFunction("transferOwnership");

    await expect(
      factory.deploy(ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(factory, "InvalidAddress");
    await expect(
      setScorer(ethers.ZeroAddress, true),
    ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    await expect(
      transferOwnership(ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    await expect(
      outsiderTransferOwnership(scorer.address),
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });
});
