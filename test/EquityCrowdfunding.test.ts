import {expect, should} from 'chai';
import {assertNormalize, ContractTransactionReceipt, Signer} from 'ethers';
import {ethers} from 'hardhat';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
	EquityCrowdfunding,
	EquityCrowdfunding__factory,
} from '../typechain-types/index';

describe('Equity Crowdfunding', function () {
	async function deployEquityCrowdfunding() {
		const [
			owner,
			creator1,
			creator2,
			investor1,
			investor2,
			investor3,
			investor4,
			defender,
			defender2,
		] = await ethers.getSigners();
		const EquityCrowdfunding = await ethers.getContractFactory(
			'EquityCrowdfunding'
		);
		const equityCrowdfunding = await EquityCrowdfunding.deploy(
			500,
			ethers.parseUnits('1000', 'wei'),
			1500,
			ethers.parseUnits('1000', 'wei'),
			2000,
			ethers.parseUnits('1000', 'wei'),
			200,
			ethers.parseUnits('1000', 'wei'),
			200,
			ethers.parseUnits('1000', 'wei'),
			100,
			500,
			1000,
			defender
		);

		return {
			equityCrowdfunding,
			owner,
			creator1,
			creator2,
			investor1,
			investor2,
			investor3,
			investor4,
			defender,
			defender2,
		};
	}

	describe('Equity Crowdfunding Deployment', function () {
		let EquityCrowdfunding: EquityCrowdfunding__factory, defender: Signer;

		beforeEach(async function () {
			[defender] = await ethers.getSigners();
			EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);
		});

		it('Should not deploy the contract when defender address is zero address', async function () {
			await expect(
				EquityCrowdfunding.deploy(
					500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					ethers.ZeroAddress
				)
			).to.be.revertedWith('invalid defender address');
		});

		it('Should not deploy the contract when fixed project percentage is greater than 100%', async function () {
			await expect(
				EquityCrowdfunding.deploy(
					11500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			).to.be.revertedWithCustomError(
				EquityCrowdfunding,
				'InvalidFeesPercentage'
			);
		});

		it('Should not deploy the contract when flexible Successful percentage is greater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);
			await expect(
				EquityCrowdfunding.deploy(
					500,
					ethers.parseUnits('1000', 'wei'),
					11500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			).to.be.revertedWithCustomError(
				EquityCrowdfunding,
				'InvalidFeesPercentage'
			);
		});

		it('Should not deploy the contract when flexible unsuccessful percentage is greater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);
			await expect(
				EquityCrowdfunding.deploy(
					500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					10001,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			).to.be.revertedWithCustomError(
				EquityCrowdfunding,
				'InvalidFeesPercentage'
			);
		});

		it('Should not deploy the contract when investor fee percentage is greater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);
			await expect(
				EquityCrowdfunding.deploy(
					500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					20000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			).to.be.revertedWithCustomError(
				EquityCrowdfunding,
				'InvalidFeesPercentage'
			);
		});

		it('Should not deploy the contract whne gateway fee percentage is greator than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);

			await expect(
				EquityCrowdfunding.deploy(
					500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					20000,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			).to.be.revertedWithCustomError(
				EquityCrowdfunding,
				'InvalidFeesPercentage'
			);
		});

		it('Should not deploy the contract when all fees percentage is greater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);
			await expect(
				EquityCrowdfunding.deploy(
					50000, // Invalid fixed project percentage
					ethers.parseUnits('1000', 'wei'),
					15000, // Flexible successful project percentage
					ethers.parseUnits('1000', 'wei'),
					20000, // Flexible unsuccessful project percentage
					ethers.parseUnits('1000', 'wei'),
					20000, // Investor fee percentage (greater than 100%)
					ethers.parseUnits('1000', 'wei'),
					20000,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					1000,
					defender
				)
			)
				.to.be.revertedWithCustomError(
					EquityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(50000, 15000, 20000, 20000, 20000);
		});

		it('Should not deploy the contract when sell processing fees persentage is greator than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);

			await expect(
				EquityCrowdfunding.deploy(
					1000, // Invalid fixed project percentage
					ethers.parseUnits('1000', 'wei'),
					1000, // Flexible successful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Flexible unsuccessful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Investor fee percentage (greater than 100%)
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					100,
					50000,
					1000,
					defender
				)
			)
				.to.be.revertedWithCustomError(
					EquityCrowdfunding,
					'InvalidSecondaryMarketFees'
				)
				.withArgs(50000, 100, 1000);
		});

		it('should not deploy contract when seller success fee is greater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);

			await expect(
				EquityCrowdfunding.deploy(
					1000, // Invalid fixed project percentage
					ethers.parseUnits('1000', 'wei'),
					1000, // Flexible successful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Flexible unsuccessful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Investor fee percentage (greater than 100%)
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					12000,
					500,
					1000,
					defender
				)
			)
				.to.be.revertedWithCustomError(
					EquityCrowdfunding,
					'InvalidSecondaryMarketFees'
				)
				.withArgs(500, 12000, 1000);
		});

		it('Should not deploy the contract when buyer processing fee is grater than 100%', async function () {
			const EquityCrowdfunding = await ethers.getContractFactory(
				'EquityCrowdfunding'
			);

			await expect(
				EquityCrowdfunding.deploy(
					1000, // Invalid fixed project percentage
					ethers.parseUnits('1000', 'wei'),
					1000, // Flexible successful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Flexible unsuccessful project percentage
					ethers.parseUnits('1000', 'wei'),
					2000, // Investor fee percentage (greater than 100%)
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					100,
					500,
					10002,
					defender
				)
			)
				.to.be.revertedWithCustomError(
					EquityCrowdfunding,
					'InvalidSecondaryMarketFees'
				)
				.withArgs(500, 100, 10002);
		});

		it('Should deploy contract successfully', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();
			expect(equityCrowdfunding.target).to.be.not.undefined;
		});
	});

	describe('Create Investment Project', function () {
		it('Should not create investment project when the "msg.sender" is not an owner', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const investmentDealType = 0;
			const avaliableShare = 0;
			const endDate = currentEpoch + 86400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 500;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(creator1)
					.createProject(
						creator1.address,
						'Project A',
						investmentDealType,
						avaliableShare,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'OwnableUnauthorizedAccount'
				)
				.withArgs(await creator1.getAddress());
		});
		it('Should not create investment project when creator address is address of zero', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400;
			const investmentDealType = 0;
			const avaliableShare = 0;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 500;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						ethers.ZeroAddress,
						'Project A',
						investmentDealType,
						avaliableShare,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid creator address');
		});
		it('Should not create investment project when requested amount is lesser than minimun investment project limit', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400;
			const investmentDealType = 0;
			const avaliableShare = 0;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.01');
			const requestedFunding = ethers.parseEther('0.01');
			const interestRate = 500;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						investmentDealType,
						avaliableShare,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid requested goal amount');
		});
		it('Should not create investment project when requested amount is lesser than maximun investment project limit', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400;
			const investmentDealType = 0;
			const avaliableShare = 0;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('3000');
			const interestRate = 500;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						investmentDealType,
						avaliableShare,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid requested goal amount');
		});
		it('should not create investment project when endDate is lesser then minimum end date range', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const minDays = 5 * 24 * 60 * 60;
			const maxDays = 365 * 24 * 60 * 60;

			await equityCrowdfunding
				.connect(owner)
				.setEndDaysRange(minDays, maxDays);

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 3 * 24 * 60 * 60;
			const minInvestmentValue = ethers.parseEther('0.32');
			const maxInvestmentValue = ethers.parseEther('1');
			const requestedFunding = ethers.parseEther('1');
			const interestRate = 1000;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid end date');
		});
		it('Should not create investment project when endDate is same as current date or previous date', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch;
			const minInvestmentValue = ethers.parseEther('0.32');
			const maxInvestmentValue = ethers.parseEther('1');
			const requestedFunding = ethers.parseEther('1');
			const interestRate = 1000;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid end date');
		});
		it('Should not create investment project when minInvestment is lesser than predefine minimum investment', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 88400;
			const minInvestmentValue = ethers.parseEther('0.0006');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate + 100,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid minimum investment value');
		});
		it('should not create investment project when maxInvestment is greater than maximum Project Investment', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			await equityCrowdfunding
				.connect(owner)
				.setInvestmentAmtLimit(
					ethers.parseEther('0.3'),
					ethers.parseEther('1')
				);

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.3');
			const maxInvestmentValue = ethers.parseEther('2');
			const requestedFunding = ethers.parseEther('2968');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate + 100,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid max investment value');
		});
		it('Should not create investment project when maxInvestment is greater than requested goal investment', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.3');
			const maxInvestmentValue = ethers.parseEther('2');
			const requestedFunding = ethers.parseEther('1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await expect(
				equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate + 100,
						false,
						false,
						3
					)
			).to.be.revertedWith('Invalid max investment value');
		});

		describe('Debt', function () {
			it('Should not create investment project when interest rate is greater than 45%', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 87400;
				const minInvestmentValue = ethers.parseEther('0.06');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 4600;
				const termLength = 15;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = endDate + 86400 * 30;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							0,
							0,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							3
						)
				).to.be.revertedWith('Invalid interest rate');
			});

			it('Should not create investment project when interest rate is lesser  than 5%', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 87400;
				const minInvestmentValue = ethers.parseEther('0.06');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 100;
				const termLength = 15;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = endDate + 86400 * 30;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							0,
							0,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							3
						)
				).to.be.revertedWith('Invalid interest rate');
			});

			it('Should not create investment project when term length is greater than 15', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 87400;
				const minInvestmentValue = ethers.parseEther('0.06');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 1000;
				const termLength = 16;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = endDate + 86400 * 30;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							0,
							0,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							3
						)
				).to.be.revertedWith('Invalid term length');
			});

			it('Should not create investment project when term length is lesser than 5', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 87400;
				const minInvestmentValue = ethers.parseEther('0.06');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 1000;
				const termLength = 4;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = endDate + 86400 * 30;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							0,
							0,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							3
						)
				).to.be.revertedWith('Invalid term length');
			});

			it('Should not create investment project when repayment date is within 1 month', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();
				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 87400;
				const minInvestmentValue = ethers.parseEther('0.06');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 1500;
				const termLength = 15;
				const twentyDaysInSeconds = 20 * 24 * 60 * 60;
				// currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = currentEpoch + twentyDaysInSeconds;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							0,
							0,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							3
						)
				).to.be.revertedWith('invalid repayment date');
			});

			it('Should create investment project and emit event Investment project created', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000); //
				const endDate = currentEpoch + 86400 * 3;
				const minInvestmentValue = ethers.parseEther('0.05');
				const maxInvestmentValue = ethers.parseEther('0.1');
				const requestedFunding = ethers.parseEther('0.1');
				const interestRate = 1300;
				const termLength = 15;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = endDate + 86400 * 30;

				const createProjectTx = await equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						0,
						0,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						3
					);

				expect(createProjectTx)
					.to.be.emit(equityCrowdfunding, 'InvestmentProjectCreated')
					.withArgs(
						creator1,
						'Project A',
						1,
						requestedFunding,
						endDate,
						repaymentDate + 100,
						3
					);
			});
		});

		describe('Equity', function () {
			it('Should not create investment project if avaliable shares is Zero', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000);
				const InvestmentDealType = 1;
				const avaliableShare = 0;
				const endDate = currentEpoch + 86400 * 3;
				const minInvestmentValue = ethers.parseEther('0.5');
				const maxInvestmentValue = ethers.parseEther('1');
				const requestedFunding = ethers.parseEther('1');
				const interestRate = 0;
				const termLength = 0;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = 0;

				await expect(
					equityCrowdfunding
						.connect(owner)
						.createProject(
							creator1.address,
							'Project A',
							InvestmentDealType,
							avaliableShare,
							endDate,
							minInvestmentValue,
							maxInvestmentValue,
							requestedFunding,
							interestRate,
							termLength,
							repaymentDate,
							false,
							false,
							0
						)
				).to.be.revertedWith('Shares should be more than 0');
			});

			it('Should create equity investment project with event investment project created', async function () {
				const {
					equityCrowdfunding,
					owner,
					creator1,
					creator2,
					investor1,
				} = await deployEquityCrowdfunding();

				const currentEpoch = Math.floor(Date.now() / 1000);
				const InvestmentDealType = 1;
				const avaliableShare = 40;
				const endDate = currentEpoch + 86400 * 3;
				const minInvestmentValue = ethers.parseEther('0.5');
				const maxInvestmentValue = ethers.parseEther('1');
				const requestedFunding = ethers.parseEther('1');
				const interestRate = 0;
				const termLength = 0;
				const currentDate = new Date();
				currentDate.setMonth(currentDate.getMonth() + 1);
				const repaymentDate = 0;

				const createProjectTx = await equityCrowdfunding
					.connect(owner)
					.createProject(
						creator1.address,
						'Project A',
						InvestmentDealType,
						avaliableShare,
						endDate,
						minInvestmentValue,
						maxInvestmentValue,
						requestedFunding,
						interestRate,
						termLength,
						repaymentDate,
						false,
						false,
						0
					);

				expect(createProjectTx)
					.to.be.emit(equityCrowdfunding, 'InvestmentProjectCreated')
					.withArgs(
						creator1.address,
						'Project A',
						1,
						requestedFunding,
						Math.floor(Date.now() / 1000),
						endDate,
						0
					);
			});
		});
	});

	describe('Invest in Investment Project', async function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			creator2: Signer,
			investor1: Signer,
			investor2: Signer,
			defender: Signer;

		beforeEach(async function () {
			({
				equityCrowdfunding,
				owner,
				creator1,
				creator2,
				investor1,
				investor2,
				defender,
			} = await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400 * 3;
			const minInvestmentValue = ethers.parseEther('0.05');
			const maxInvestmentValue = ethers.parseEther('1');
			const requestedFunding = ethers.parseEther('1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);
		});

		it('Should be reverted if project id is not exist', async function () {
			expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						2,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.0001'),
						}
					)
			).to.be.revertedWith('Project dest not exist');
		});

		it('Should be reverted if creator tries to invest in its own project', async function () {
			expect(
				equityCrowdfunding
					.connect(creator1)
					.investInProject(
						1,
						0,
						true,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.0001'),
						}
					)
			).to.be.revertedWith('Project creator is not allow to invest');
		});

		it('Should be reverted if investor tries to invest after closeing date of project', async function () {
			await ethers.provider.send('evm_increaseTime', [5 * 86400]); // Increase time by 2 days
			await ethers.provider.send('evm_mine');

			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						1,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.05'),
						}
					)
			).to.be.revertedWith('Project is not active or closed');
		});

		it('Should be reverted if investor tries to iinvest less than minimum investment value', async function () {
			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						1,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.0001'),
						}
					)
			).to.be.revertedWith('Investment is below minimum value');
		});

		it('Should be reverted if investor tries to invest more than maximum investment value', async function () {
			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						1,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('1.00001'),
						}
					)
			).to.be.revertedWith('Investment is above maximum value');
		});

		it('Should be reverted if non-accredited investor tries to invest in a accredited project', async function () {
			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400 * 3;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project B',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					true,
					3
				);

			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						2,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.06'),
						}
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'NotAccreditedInvestor'
				)
				.withArgs(investor1.getAddress(), false);
		});

		it('Should allow an accredited investor to invest in an accredited-only project', async function () {
			const currentEpoch = Math.floor(Date.now() / 1000);
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			// Create an accredited-only project
			await equityCrowdfunding.connect(owner).createProject(
				await creator1.getAddress(),
				'Accredited Project',
				0,
				0,
				endDate,
				minInvestmentValue,
				maxInvestmentValue,
				requestedFunding,
				interestRate,
				termLength,
				repaymentDate + 100,
				false,
				true, // isForAccreditedInvestor set to true
				3
			);

			const projectId = 2; // Assuming this is the second project created
			const investmentAmount = ethers.parseEther('0.1');

			// Invest as an accredited investor
			const investTx = await equityCrowdfunding
				.connect(investor1)
				.investInProject(
					projectId,
					0,
					true,
					Math.floor(Date.now() / 1000),
					{value: investmentAmount}
				);

			// Check if the transaction was successful
			await expect(investTx).to.not.be.reverted;

			// Verify that the investment was recorded correctly
			const projectAfterInvestment = await equityCrowdfunding.projects(
				projectId
			);
			expect(projectAfterInvestment.fundingReceived).to.equal(
				investmentAmount
			);

			const investorInfo = await equityCrowdfunding.projectInvestors(
				projectId,
				await investor1.getAddress()
			);
			expect(investorInfo.amountInvested).to.equal(investmentAmount);
			expect(investorInfo.isAccreditedInvestor).to.be.true;

			// Check if the event was emitted correctly
			await expect(investTx)
				.to.emit(equityCrowdfunding, 'InvestmentMade')
				.withArgs(
					await investor1.getAddress(),
					projectId,
					investmentAmount,
					0,
					Math.floor(Date.now() / 1000)
				);
		});

		it('Should allow if accredited investor tries to invest in a non- accredited project', async function () {
			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 88400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project B',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);

			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						2,
						0,
						true,
						Math.floor(Date.now() / 1000),
						{
							value: ethers.parseEther('0.006'),
						}
					)
			).to.be.not.revertedWith('Not accredited investor');
		});

		it('Should deduct invested amount from investor and deposit it into the contract', async function () {
			const projectId = 1; // First project created
			const investmentAmount = ethers.parseEther('0.1');

			// Get initial balances
			const initialInvestorBalance = await ethers.provider.getBalance(
				investor1.getAddress()
			);
			const initialContractBalance = await ethers.provider.getBalance(
				equityCrowdfunding.target
			);

			// Invest in the project
			const investTx = await equityCrowdfunding
				.connect(investor1)
				.investInProject(
					projectId,
					0,
					false,
					Math.floor(Date.now() / 1000),
					{value: investmentAmount}
				);
			const receipt = await investTx.wait();
			const gasUsed =
				(receipt as ContractTransactionReceipt).gasUsed *
				(receipt as ContractTransactionReceipt).gasPrice;

			// Get final balances
			const finalInvestorBalance = await ethers.provider.getBalance(
				investor1.getAddress()
			);
			const finalContractBalance = await ethers.provider.getBalance(
				equityCrowdfunding.target
			);

			// Calculate expected investor balance
			const expectedInvestorBalance =
				initialInvestorBalance - investmentAmount - gasUsed;

			// Verify investor's balance decreased by investment amount plus gas fees
			expect(finalInvestorBalance).to.equal(expectedInvestorBalance);

			// Verify contract's balance increased by investment amount
			expect(finalContractBalance).to.equal(
				initialContractBalance + investmentAmount
			);

			// Verify project's fundingReceived is updated
			const project = await equityCrowdfunding.projects(projectId);
			expect(project.fundingReceived).to.equal(investmentAmount);

			// Verify investor's record in the contract
			const investorInfo = await equityCrowdfunding.projectInvestors(
				projectId,
				investor1.getAddress()
			);
			expect(investorInfo.amountInvested).to.equal(investmentAmount);
		});

		it('Should increase investor count when a new investor invests', async function () {
			const initialInvestorCount =
				await equityCrowdfunding.getInvestorCount(1);

			// Investor1 invests
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, true, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.06'),
				});

			const updatedInvestorCount =
				await equityCrowdfunding.getInvestorCount(1);
			expect(updatedInvestorCount).to.equal(
				Number(initialInvestorCount) + 1
			);

			// Investor1 invests again (no change in count)
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, true, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.06'),
				});

			const finalInvestorCount =
				await equityCrowdfunding.getInvestorCount(1);
			expect(finalInvestorCount).to.equal(updatedInvestorCount);

			// Investor2 invests (count should increase)
			await equityCrowdfunding
				.connect(investor2)
				.investInProject(1, 0, true, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.06'),
				});

			const finalInvestorCountAfterSecondInvestor =
				await equityCrowdfunding.getInvestorCount(1);
			expect(finalInvestorCountAfterSecondInvestor).to.equal(
				Number(updatedInvestorCount) + 1
			);
		});

		it('Should change project status to "Successful" if funding goal is reached', async function () {
			const projectId = 1; // First project created
			const investmentAmount = ethers.parseEther('1');

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: investmentAmount,
				});

			const project = await equityCrowdfunding.projects(1);

			expect(project[17]).to.be.equal(2);
		});

		it('Should emit event "ProjectStatusUpdated" once funding goal is reached', async function () {
			const projectId = 1; // First project created
			const investmentAmount = ethers.parseEther('1');
			await expect(
				equityCrowdfunding
					.connect(investor1)
					.investInProject(
						1,
						0,
						false,
						Math.floor(Date.now() / 1000),
						{value: investmentAmount}
					)
			)
				.to.be.emit(equityCrowdfunding, 'ProjectStatusUpdated')
				.withArgs(1, 2);
		});

		it('Should emit event when investor invests value in a project successfully', async function () {
			const investInProjectTx = await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, true, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.6'),
				});

			await expect(investInProjectTx)
				.to.be.emit(equityCrowdfunding, 'InvestmentMade')
				.withArgs(
					investor1.getAddress(),
					1,
					ethers.parseEther('0.6'),
					0,
					Math.floor(Date.now() / 1000)
				);
		});
	});

	describe('Claim Investment', function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			investor1: Signer;

		beforeEach(async function () {
			({equityCrowdfunding, owner, creator1, investor1} =
				await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400 * 3;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const currentDate = new Date();
			const interestRate = 1300;
			const termLength = 15;
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project B',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					true,
					false,
					3
				);
		});

		it('Should revert, if function caller is not a creator of a particular project', async function () {
			await expect(
				equityCrowdfunding.connect(investor1).claimInvestment(1)
			).to.be.revertedWith('Only creator can claim');
		});

		it('Should revert, if project is fixed and it is unsuccessful', async function () {
			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(2)
			).to.be.revertedWith('Project is unsuccessful');
		});

		it('Should not revert, if project is successful and creator claims investment', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});
			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(2)
			).to.be.not.revertedWith('Project is unsuccessful');
		});

		it('Should revert, if creator is trying to claim investment of flexible project (unsuccessful) before end time', async function () {
			const initproject = await equityCrowdfunding.projects(1);

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.06'),
				});

			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(1)
			).to.be.revertedWith('Project is open or unsuccessful');
		});

		it('Should not revert, if creator is trying to claim investment of flexible project (unsuccessful) after end time', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.06'),
				});

			await ethers.provider.send('evm_increaseTime', [5 * 87400]);

			await ethers.provider.send('evm_mine');

			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(1)
			).to.be.not.revertedWith('Project is open or unsuccessful');
		});

		it('Should not revert, if creator is trying to claim investment of flexible project (successful) after end time', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(1)
			).to.be.not.revertedWith('Project is open or unsuccessful');
		});

		it('Should revert, if Creator tries to claim investment of a project second time', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await equityCrowdfunding.connect(creator1).claimInvestment(1);

			await expect(
				equityCrowdfunding.connect(creator1).claimInvestment(1)
			).to.be.revertedWith('Investment already claimed');
		});

		it('Should deduct admin fee of (Flexible Successful project ) properly', async function () {
			const adminFees = await equityCrowdfunding.getPlatformFees();

			const beforeCreatorBalance = await ethers.provider.getBalance(
				creator1.getAddress()
			);

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			const claimTx = await equityCrowdfunding
				.connect(creator1)
				.claimInvestment(1);
			const receipt = await claimTx.wait();

			const gasUsed =
				(receipt as ContractTransactionReceipt).gasUsed *
				(receipt as ContractTransactionReceipt).gasPrice;

			const afterCreatorBalance = await ethers.provider.getBalance(
				creator1.getAddress()
			);
			const project = await equityCrowdfunding.projects(1);
			const fundingReceived = project[9];

			const platformFee =
				(fundingReceived * adminFees[3]) / 10000n +
				adminFees[2] * (await equityCrowdfunding.getInvestorCount(1));

			const gatewayFeeAmount =
				(fundingReceived * adminFees[9]) / 10000n +
				adminFees[8] * (await equityCrowdfunding.getInvestorCount(1));

			const creatorEarnings =
				fundingReceived - (platformFee + gatewayFeeAmount + gasUsed);

			const expectedCreatorBalance =
				beforeCreatorBalance + creatorEarnings;

			expect(afterCreatorBalance).to.be.equal(expectedCreatorBalance);
		});

		it('Should emit event after claiming investment successfully', async function () {
			const adminFees = await equityCrowdfunding.getPlatformFees();

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			const claimTx = await equityCrowdfunding
				.connect(creator1)
				.claimInvestment(1);

			const project = await equityCrowdfunding.projects(1);
			const fundingReceived = project[9];

			const platformFee =
				(fundingReceived * adminFees[3]) / 10000n +
				adminFees[2] * (await equityCrowdfunding.getInvestorCount(1));

			const gatewayFeeAmount =
				(fundingReceived * adminFees[9]) / 10000n +
				adminFees[8] * (await equityCrowdfunding.getInvestorCount(1));

			const creatorEarnings =
				fundingReceived - (platformFee + gatewayFeeAmount);

			await expect(claimTx)
				.to.be.emit(equityCrowdfunding, 'InvestmentClaimed')
				.withArgs(1, creator1.getAddress(), creatorEarnings);
		});
	});

	describe('Set PlateFrom Fees', async function () {
		it('Should reverted if "msg.sender" is not a sender', async function () {
			const {equityCrowdfunding, owner, creator1, creator2, investor1} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(creator1)
					.setPlatformFees(
						1000,
						ethers.parseEther('0.0004'),
						1000,
						ethers.parseEther('0.0004'),
						1000,
						ethers.parseEther('0.0004'),
						1000,
						ethers.parseEther('0.0004'),
						1000,
						ethers.parseEther('0.0004')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'OwnableUnauthorizedAccount'
				)
				.withArgs(await creator1.getAddress());
		});

		it('Should not set platform fees, when fixed project percentage is greater than 100% ', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						11500,
						ethers.parseUnits('1000', 'wei'),
						1500,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei'),
						200,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(11500, 1500, 2000, 200, 2000);
		});

		it('Should not set platform fees, when flexible Successful percentage is greater than 100%', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						1500,
						ethers.parseUnits('1000', 'wei'),
						11500,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei'),
						200,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(1500, 11500, 2000, 200, 2000);
		});

		it('Should not set platform fees, when flexible Unsuccessful percentage is greater than 100%', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						1500,
						ethers.parseUnits('1000', 'wei'),
						1500,
						ethers.parseUnits('1000', 'wei'),
						21000,
						ethers.parseUnits('1000', 'wei'),
						200,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(1500, 1500, 21000, 200, 2000);
		});

		it('Should not set platform fees, when investor percentage is greater than 100%', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						1500,
						ethers.parseUnits('1000', 'wei'),
						1500,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei'),
						11100,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(1500, 1500, 2000, 11100, 2000);
		});

		it('Should not set paltform fees, when gateway fee percentage is grater than 100%', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						1500,
						ethers.parseUnits('1000', 'wei'),
						1500,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei'),
						2000,
						ethers.parseUnits('1000', 'wei'),
						11100,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(1500, 1500, 2000, 2000, 11100);
		});

		it('Should not set platform fees, when all fees percentage are greaer than 100%', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			await expect(
				equityCrowdfunding
					.connect(owner)
					.setPlatformFees(
						10001,
						ethers.parseUnits('1000', 'wei'),
						10001,
						ethers.parseUnits('1000', 'wei'),
						20000,
						ethers.parseUnits('1000', 'wei'),
						20000,
						ethers.parseUnits('1000', 'wei'),
						20000,
						ethers.parseUnits('1000', 'wei')
					)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'InvalidFeesPercentage'
				)
				.withArgs(10001, 10001, 20000, 20000, 20000);
		});

		it('Should set platform successfully and emit event', async function () {
			const {equityCrowdfunding, owner} =
				await deployEquityCrowdfunding();

			const setPlatformFeesTx = await equityCrowdfunding
				.connect(owner)
				.setPlatformFees(
					1500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					1000,
					ethers.parseUnits('1000', 'wei')
				);

			expect(setPlatformFeesTx)
				.to.be.emit(equityCrowdfunding, 'PlateformFeesUpdated')
				.withArgs(
					1500,
					ethers.parseUnits('1000', 'wei'),
					1500,
					ethers.parseUnits('1000', 'wei'),
					2000,
					ethers.parseUnits('1000', 'wei'),
					200,
					ethers.parseUnits('1000', 'wei'),
					1000,
					ethers.parseUnits('1000', 'wei')
				);
		});
	});

	describe('Update Project Status to Inactive', function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			creator2: Signer,
			investor1: Signer;

		beforeEach(async function () {
			({equityCrowdfunding, owner, creator1, creator2, investor1} =
				await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400 * 3;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);
		});

		it('Should reverted if owner is not a caller', async function () {
			await expect(
				equityCrowdfunding.connect(creator1).setProjectStatusInactive(1)
			)
				.to.be.revertedWithCustomError(
					equityCrowdfunding,
					'OwnableUnauthorizedAccount'
				)
				.withArgs(creator1.getAddress());
		});

		it('Should reverted if project is not exist in contract', async function () {
			await expect(
				equityCrowdfunding.connect(owner).setProjectStatusInactive(2)
			).to.be.revertedWith('Project does not exist');
		});

		it('should reverted if project is not active', async function () {
			await equityCrowdfunding.connect(owner).setProjectStatusInactive(1);
			await expect(
				equityCrowdfunding.connect(owner).setProjectStatusInactive(1)
			).to.be.revertedWith(
				'Project is already successful/unsuccessful/Inactive'
			);
		});

		it('Should be emit event after setting project status to inactive successfully', async function () {
			const setprojectStatusInactive = await equityCrowdfunding
				.connect(owner)
				.setProjectStatusInactive(1);

			await expect(setprojectStatusInactive)
				.to.be.emit(equityCrowdfunding, 'ProjectStatusUpdated')
				.withArgs(1, 1);
		});
	});

	describe('Update Project Status to Unsuccessful', function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			defender: Signer;

		beforeEach(async function () {
			({equityCrowdfunding, owner, creator1, defender} =
				await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 86400 * 3;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);
		});

		it('Should reverted if owner is not a caller', async function () {
			await expect(
				equityCrowdfunding
					.connect(creator1)
					.setProjectStatusUnsuccessful(1)
			).to.be.revertedWith('Caller is not the owner or defender');
		});

		it('Should reverted if project is not exist in contract', async function () {
			await expect(
				equityCrowdfunding
					.connect(defender)
					.setProjectStatusUnsuccessful(2)
			).to.be.revertedWith('Project does not exist');
		});

		it('should reverted if project is not active', async function () {
			await equityCrowdfunding.connect(owner).setProjectStatusInactive(1);
			await expect(
				equityCrowdfunding.connect(owner).setProjectStatusInactive(1)
			).to.be.revertedWith(
				'Project is already successful/unsuccessful/Inactive'
			);
		});

		it('should reverted if project is not active', async function () {
			await equityCrowdfunding.connect(owner).setProjectStatusInactive(1);
			await expect(
				equityCrowdfunding
					.connect(owner)
					.setProjectStatusUnsuccessful(1)
			).to.be.revertedWith('Project is successful/unsuccessful/inactive');
		});

		it('Should revert, if update status before end date of project', async function () {
			await expect(
				equityCrowdfunding
					.connect(defender)
					.setProjectStatusUnsuccessful(1)
			).to.be.revertedWith('Unable to set project status before time');
		});

		it('Should not revert, if owner tries to updata project status', async function () {
			await expect(
				equityCrowdfunding
					.connect(owner)
					.setProjectStatusUnsuccessful(1)
			).to.be.not.revertedWith('Caller is not the owner or defender');
		});

		it('Should be emit event after setting project status to unsuccessful successfully', async function () {
			await ethers.provider.send('evm_increaseTime', [5 * 86400]); // Increase time by 2 days
			await ethers.provider.send('evm_mine');

			await expect(
				equityCrowdfunding
					.connect(defender)
					.setProjectStatusUnsuccessful(1)
			).to.be.emit(equityCrowdfunding, 'ProjectStatusUpdated');
		});
	});

	describe('Update Defender', function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			defender: Signer,
			defender2: Signer;
		beforeEach(async function () {
			({equityCrowdfunding, owner, creator1, defender, defender2} =
				await loadFixture(deployEquityCrowdfunding));
		});
		it('Should revert, if caller is not a owner', async function () {
			await expect(
				equityCrowdfunding.connect(creator1).updateDefender(defender2)
			).to.be.revertedWithCustomError(
				equityCrowdfunding,
				'OwnableUnauthorizedAccount'
			);
		});

		it('Should revet, if defender address is zero address', async function () {
			await expect(
				equityCrowdfunding
					.connect(owner)
					.updateDefender(ethers.ZeroAddress)
			).to.be.revertedWith('Defender cannot be zero address');
		});

		it('Should emit event onec address is updated', async function () {
			await expect(
				equityCrowdfunding.connect(owner).updateDefender(defender2)
			).to.be.emit(equityCrowdfunding, 'DefenderUpdated');
		});
	});

	describe('Withdraw Earning', async function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			investor1: Signer;

		beforeEach(async function () {
			({equityCrowdfunding, owner, investor1, creator1} =
				await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);
		});

		it('Should revert, if caller is not a owner', async function () {
			await expect(
				equityCrowdfunding.connect(creator1).withdrawEarning()
			).to.be.revertedWithCustomError(
				equityCrowdfunding,
				'OwnableUnauthorizedAccount'
			);
		});

		it('Should revert, if admin earning is zero', async function () {
			await expect(
				equityCrowdfunding.connect(owner).withdrawEarning()
			).to.be.revertedWith('No earnings to withdraw');
		});

		it('Should transfer amount to owners', async function () {
			const adminFees = await equityCrowdfunding.getPlatformFees();

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await equityCrowdfunding.connect(creator1).claimInvestment(1);

			const project = await equityCrowdfunding.projects(1);
			const fundingReceived = project[9];

			const platformFee =
				(fundingReceived * adminFees[3]) / 10000n +
				adminFees[2] * (await equityCrowdfunding.getInvestorCount(1));

			const gatewayFeeAmount =
				(fundingReceived * adminFees[9]) / 10000n +
				adminFees[8] * (await equityCrowdfunding.getInvestorCount(1));

			const beforeOwnerBalance = await ethers.provider.getBalance(
				owner.getAddress()
			);

			const withdrawTx = await equityCrowdfunding
				.connect(owner)
				.withdrawEarning();

			const receipt = await withdrawTx.wait();

			const gasUsed =
				(receipt as ContractTransactionReceipt).gasUsed *
				(receipt as ContractTransactionReceipt).gasPrice;

			const afterOwnerBalance = await ethers.provider.getBalance(
				owner.getAddress()
			);
			const expectedAdminEarnings =
				platformFee + gatewayFeeAmount - gasUsed;

			expect(await equityCrowdfunding.earnings(owner)).to.be.equal(0);

			expect(afterOwnerBalance).to.be.equal(
				beforeOwnerBalance + expectedAdminEarnings
			);

			expect(withdrawTx)
				.to.be.emit(equityCrowdfunding, 'ClaimedEarnings')
				.withArgs(owner.getAddress, platformFee + gatewayFeeAmount);
		});
	});

	describe('Process Repayment Installment', async function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			investor1: Signer;
		beforeEach(async function () {
			({equityCrowdfunding, owner, investor1, creator1} =
				await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					3
				);

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project B',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					2
				);

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			// await ethers.provider.send('evm_increaseTime', [2 * 86400]); // Increase time by 2 days
			// await ethers.provider.send('evm_mine');

			await equityCrowdfunding.connect(creator1).claimInvestment(1);
		});

		it('Should revert, if caller is not a project creator', async function () {
			await expect(
				equityCrowdfunding
					.connect(investor1)
					.processRepaymentInstallment(2)
			).to.be.revertedWith('Only creator can process');
		});

		it('Should revert, if creator tries to process  repayment installment before the repayment date', async function () {
			await expect(
				equityCrowdfunding
					.connect(creator1)
					.processRepaymentInstallment(1)
			).to.be.revertedWith('Repayment is not due yet');
		});

		it('Should revert, if creator tries to process repayment installment before calim investment', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await expect(
				equityCrowdfunding
					.connect(creator1)
					.processRepaymentInstallment(2)
			).to.be.revertedWith(
				'Project creator has not claimed investment yet'
			);
		});

		it('Should revert, if there is no repayment installment to process', async function () {
			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.06');
			const maxInvestmentValue = ethers.parseEther('0.1');
			const requestedFunding = ethers.parseEther('0.1');
			const interestRate = 1300;
			const termLength = 5;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project C',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					2
				);

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(3, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await equityCrowdfunding.connect(creator1).claimInvestment(3);

			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');
			const project = await equityCrowdfunding.projects(3);

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(3, {
					value: project[8],
				}); // 1

			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(3, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				}); //2

			await ethers.provider.send('evm_increaseTime', [31 * 86400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(3, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				}); //3

			await ethers.provider.send('evm_increaseTime', [31 * 86400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(3, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				}); //4

			await ethers.provider.send('evm_increaseTime', [31 * 86400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(3, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				}); //5

			await ethers.provider.send('evm_increaseTime', [31 * 86400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			await expect(
				equityCrowdfunding
					.connect(creator1)
					.processRepaymentInstallment(3, {
						value: project[8],
					})
			).to.be.revertedWith('No remaining repayment');
		});

		it('Should reverted if creator tries to process repayment installment less then repayment amount', async function () {
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.1'),
				});

			await equityCrowdfunding.connect(creator1).claimInvestment(2);

			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			const project = await equityCrowdfunding
				.connect(creator1)
				.projects(2);

			const repaymentAmount =
				await equityCrowdfunding.calculateRepaymentInstallment(
					project[6],
					project[9],
					project[10]
				);

			await expect(
				equityCrowdfunding
					.connect(creator1)
					.processRepaymentInstallment(2, {
						value: ethers.parseEther('0.0001'),
					})
			).to.be.revertedWith('Repayment amount is insufficient');
		});

		it('Should deduct amount from creator Balance and emit event after processing repayment installment', async function () {
			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');

			const project = await equityCrowdfunding
				.connect(creator1)
				.projects(1);

			const beforeCreatorBalance = await ethers.provider.getBalance(
				creator1.getAddress()
			);

			const processInstallmentTx = await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(1, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				});

			const receipt = await processInstallmentTx.wait();

			const gasUsed =
				(receipt as ContractTransactionReceipt).gasUsed *
				(receipt as ContractTransactionReceipt).gasPrice;

			const expectedBalance = beforeCreatorBalance - project[8] - gasUsed;

			const afterCreatorBalance = await ethers.provider.getBalance(
				creator1.getAddress()
			);

			expect(afterCreatorBalance).to.equal(expectedBalance);

			expect(processInstallmentTx)
				.to.be.emit(equityCrowdfunding, 'RepaymentProcessed')
				.withArgs(1, project[8], project[11]);
		});
	});

	describe('Withdraw Repayment', function () {
		let equityCrowdfunding: EquityCrowdfunding,
			owner: Signer,
			creator1: Signer,
			investor1: Signer,
			investor2: Signer,
			investor3: Signer,
			investor4: Signer;
		beforeEach(async function () {
			({
				equityCrowdfunding,
				owner,
				creator1,
				investor1,
				investor2,
				investor3,
				investor4,
			} = await loadFixture(deployEquityCrowdfunding));

			const currentEpoch = Math.floor(Date.now() / 1000); //
			const endDate = currentEpoch + 87400;
			const minInvestmentValue = ethers.parseEther('0.05');
			const maxInvestmentValue = ethers.parseEther('1');
			const requestedFunding = ethers.parseEther('1');
			const interestRate = 1300;
			const termLength = 15;
			const currentDate = new Date();
			currentDate.setMonth(currentDate.getMonth() + 1);
			const repaymentDate = endDate + 86400 * 30;

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project A',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					1
				);

			await equityCrowdfunding
				.connect(owner)
				.createProject(
					creator1.getAddress(),
					'Project B',
					0,
					0,
					endDate,
					minInvestmentValue,
					maxInvestmentValue,
					requestedFunding,
					interestRate,
					termLength,
					repaymentDate + 100,
					false,
					false,
					0
				);

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor2)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor3)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor4)
				.investInProject(1, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});

			await equityCrowdfunding
				.connect(investor1)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor1)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor3)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});
			await equityCrowdfunding
				.connect(investor4)
				.investInProject(2, 0, false, Math.floor(Date.now() / 1000), {
					value: ethers.parseEther('0.25'),
				});

			await equityCrowdfunding.connect(creator1).claimInvestment(1);

			await equityCrowdfunding.connect(creator1).claimInvestment(2);

			await ethers.provider.send('evm_increaseTime', [31 * 87400]); // Increase time by 31 days

			await ethers.provider.send('evm_mine');
			const project = await equityCrowdfunding.projects(1);
			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(1, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				});

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(2, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				});
		});
		it('Should reverted, if non-investor tries to clainm repayment of project', async function () {
			await expect(
				equityCrowdfunding.connect(creator1).withdrawRepayment(1)
			).to.be.revertedWith('you are not an Investor');
		});

		it('Should revert, if investor tries to claim repayment twice', async function () {
			await equityCrowdfunding.connect(investor1).withdrawRepayment(1);

			await expect(
				equityCrowdfunding.connect(investor1).withdrawRepayment(1)
			).to.be.revertedWith('you have already claimed your amount');
		});

		it('Should add repayment amount to investor balance', async function () {
			const beforeInvestorBalance = await ethers.provider.getBalance(
				investor1.getAddress()
			);

			const project = await equityCrowdfunding.projects(1);

			const platFormFee = await equityCrowdfunding.getPlatformFees();

			const projectInvestors = await equityCrowdfunding.projectInvestors(
				1,
				investor1.getAddress()
			);

			const withdrawTx = await equityCrowdfunding
				.connect(investor1)
				.withdrawRepayment(1);

			const receipt = await withdrawTx.wait();

			const gasUsed =
				(receipt as ContractTransactionReceipt).gasUsed *
				(receipt as ContractTransactionReceipt).gasPrice;

			const percentage = (projectInvestors[0] * 10000n) / project[9];

			const investorShare = (project[11] * percentage) / 10000n;

			const adminCharge =
				(investorShare * platFormFee[7]) / 10000n + platFormFee[6];

			const expectedWithdrawableAmt =
				investorShare - adminCharge - gasUsed;

			const expectedBalance =
				beforeInvestorBalance + expectedWithdrawableAmt;

			const afterInvestorBalance = await ethers.provider.getBalance(
				investor1.getAddress()
			);

			expect(afterInvestorBalance).to.be.equal(expectedBalance);
		});

		it('Should emit event after withdrawal', async function () {
			const project = await equityCrowdfunding.projects(2);
			await ethers.provider.send('evm_increaseTime', [365 * 86400]);

			await ethers.provider.send('evm_mine');

			await equityCrowdfunding
				.connect(creator1)
				.processRepaymentInstallment(2, {
					value: ethers.parseUnits(String(project[8]), 'wei'),
				});

			const platFormFee = await equityCrowdfunding.getPlatformFees();

			const projectInvestors = await equityCrowdfunding.projectInvestors(
				2,
				investor1.getAddress()
			);

			const withdrawRepaymentTx = await equityCrowdfunding
				.connect(investor1)
				.withdrawRepayment(2);

			const percentage = (projectInvestors[0] * 10000n) / project[9];

			const investorShare = ((project[11] * percentage) / 10000n) * 2n;

			const adminCharge =
				((investorShare * platFormFee[7]) / 10000n + platFormFee[6]) *
				2n;

			const expectedWithdrawableAmt = investorShare - adminCharge;
			await expect(withdrawRepaymentTx)
				.to.be.emit(equityCrowdfunding, 'ClaimedRepayment')
				.withArgs(2, investor1, expectedWithdrawableAmt);
		});
	});
});
