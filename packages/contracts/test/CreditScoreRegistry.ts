import { expect } from "chai";
import { network } from "hardhat";

describe("CreditScoreRegistry", function () {
  it("records a Wavy-backed score from an authorized scorer", async function () {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const owner = signers[0]!;
    const subject = signers[1]!;
    const subjectHash = ethers.keccak256(
      ethers.solidityPacked(["address"], [subject.address]),
    );
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner.address,
    ]);
    const recordScore = registry.getFunction("recordScore");

    await recordScore(
      subjectHash,
      12,
      91,
      1,
      "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19",
      "analysis-001",
      "arkangeles",
    );

    const getScore = registry.getFunction("getScore");
    const record = await getScore(subjectHash);

    expect(record.subjectHash).to.equal(subjectHash);
    expect(record.wavyRiskScore).to.equal(12);
    expect(record.compositeCreditScore).to.equal(91);
    expect(record.decision).to.equal(1);
    expect(record.wavyAnalysisId).to.equal("analysis-001");
    expect(record.institution).to.equal("arkangeles");
  });

  it("blocks unapproved scorers", async function () {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const owner = signers[0]!;
    const subject = signers[1]!;
    const outsider = signers[2]!;
    const subjectHash = ethers.keccak256(
      ethers.solidityPacked(["address"], [subject.address]),
    );
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner.address,
    ]);
    const recordScore = registry.connect(outsider).getFunction("recordScore");

    await expect(
      recordScore(
        subjectHash,
        40,
        62,
        0,
        "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19",
        "analysis-002",
        "bankaool",
      ),
    ).to.be.revertedWithCustomError(registry, "NotScorer");
  });

  it("rejects an empty subject hash", async function () {
    const { ethers } = await network.create();
    const [owner] = await ethers.getSigners();
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner!.address,
    ]);
    const recordScore = registry.getFunction("recordScore");

    await expect(
      recordScore(
        ethers.ZeroHash,
        10,
        88,
        1,
        "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19",
        "analysis-003",
        "arkangeles",
      ),
    ).to.be.revertedWithCustomError(registry, "InvalidSubjectHash");
  });
});
