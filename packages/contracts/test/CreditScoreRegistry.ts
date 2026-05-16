import { expect } from "chai";
import { network } from "hardhat";

describe("CreditScoreRegistry", function () {
  it("records a Wavy-backed score from an authorized scorer", async function () {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const owner = signers[0]!;
    const subject = signers[1]!;
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner.address
    ]);
    const recordScore = registry.getFunction("recordScore");

    await recordScore(
      subject.address,
      12,
      91,
      1,
      "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19",
      "analysis-001",
      "arkangeles"
    );

    const getScore = registry.getFunction("getScore");
    const record = await getScore(subject.address);

    expect(record.subject).to.equal(subject.address);
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
    const registry = await ethers.deployContract("CreditScoreRegistry", [
      owner.address
    ]);
    const recordScore = registry
      .connect(outsider)
      .getFunction("recordScore");

    await expect(
      recordScore(
        subject.address,
        40,
        62,
        0,
        "0x3f611b8f5df6801241d60c58e5e774e3fa6c57d9e9a6b842cf617ec1fa82cf19",
        "analysis-002",
        "bankaool"
      )
    ).to.be.revertedWithCustomError(registry, "NotScorer");
  });
});
