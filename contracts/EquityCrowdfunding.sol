// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title EquityCrowdfunding
 * @dev A smart contract for managing equity crowdfunding projects.
 * This contract allows project creators to raise funds, investors to invest in projects,
 * and handles the repayment process.
 */
contract EquityCrowdfunding is Ownable, ReentrancyGuard {
	using Address for address;
	using Math for uint256;
	/**
	 * @dev Error thrown when invalid fee percentages are provided.
	 * @param fixedProjectFeePercentage The fee percentage for fixed projects
	 * @param flexibleSuccessfulProjectFeePercentage The fee percentage for successful flexible projects
	 * @param flexibleUnSuccessfulProjectFeePercentage The fee percentage for unsuccessful flexible projects
	 * @param investorFeePercentage The fee percentage for investors
	 * @param gatewayFeePercentage The gateway fee percentage
	 */
	error InvalidFeesPercentage(
		uint256 fixedProjectFeePercentage,
		uint256 flexibleSuccessfulProjectFeePercentage,
		uint256 flexibleUnSuccessfulProjectFeePercentage,
		uint256 investorFeePercentage,
		uint256 gatewayFeePercentage
	);

	error InvalidSecondaryMarketFees(
		uint256 sellerProcessingFeesPercentage,
		uint256 sellerSuccessFeesPercentage,
		uint256 buyerProcessingFeesPercentage
	);

	/**
	 * @dev Error thrown when a non-accredited investor tries to invest in a project for accredited investors only.
	 * @param investor The address of the investor
	 * @param isAccreditedInvestor Boolean indicating if the investor is accredited
	 */
	error NotAccreditedInvestor(address investor, bool isAccreditedInvestor);


	error InvalidRequestedGoalAmount(uint256 requested, uint256 min, uint256 max);

	/**
	 * @dev Struct representing a crowdfunding project.
	 */
	struct Project {
		address creator; //0
		string name; //1
		uint256 endDate; //2
		InvestmentDealType dealType; //3
		uint256 avaliableShare; //4
		uint256 pricePerShare; //5
		uint256 minInvestmentValue; //6
		uint256 maxInvestmentValue; //7
		uint256 requestedFunding; //8
		uint256 fundingReceived; //9
		uint256 remainingRepaymentAmount; //10
		uint256 repaymentInstallmentAmount; //11
		uint256 interestRate; //12
		uint256 termLength; //13
		uint256 repaymentDate; //14
		bool isFixedProject; //15
		bool isForAccreditedInvestor; //16
		ProjectStatus projectStatus; //17
		RepaymentFrequency repaymentFrequency; //18
	}

	/**
	 * @dev Struct representing an investor in a project.
	 */
	struct Investor {
		uint256 amountInvested;
		uint256 claimedInvestment;
		bool isAccreditedInvestor;
		uint256 purchasedShare;
	}

	struct OnSellDetail {
		uint216 numberOfSharesOnSell;
		uint216 numberOfSharesSold;
		uint256 pricePerShare;
		uint256 projectId;
		uint256 sellTimeStamp;
		address seller;
		SellStatus status;
	}

	/**
	 * @dev Enum representing the status of a project.
	 */
	enum ProjectStatus {
		Active,
		Inactive,
		Successful,
		Unsuccessful,
		Pending
	}

	/**
	 * @dev Enum representing the frequency of repayments.
	 */
	enum RepaymentFrequency {
		Yearly,
		Quarterly,
		Monthly,
		Daily
	}

	enum InvestmentDealType {
		Debt, //0
		Equity //1
	}

	enum SellStatus {
		UnderReview, //0
		Approve, //1
		Rejected, //2
		Sold, //3
		Closed //4
	}

	// Mappings to store project and investor data
	mapping(uint256 projectId => Project project) public projects; // projectId => Project
	mapping(uint256 => mapping(address => Investor)) public projectInvestors; // projectId => investorAddress => Investor
	mapping(uint256 => address[]) public projectInvestorsList; // projectId => investorAddress[];
	mapping(uint256 => mapping(address => bool)) private hasInvested; // projectId => investorAddress => hasInvested
	mapping(uint256 => mapping(address => bool)) public hasClaimInvestment; // projectId => creatorAddress => hasClaimedInvestment
	mapping(uint256 => mapping(address => bool)) public hasClaimRepayment; // projectId => investorAddress => hasClaimedRepayment
	mapping(uint256 => mapping(address => uint256))
		public remainingInstallmentsToClaim; //  projectId => investorAddress => remainingInstallmentsToClaim;
	mapping(address => uint256) public earnings;
	mapping(address => uint256) public investorRefundAmount; // projectId => investorAddress => refundAmount
	mapping(uint160 => OnSellDetail) public onSellDetails; // referenceId => OnsellDetail
	mapping(address => mapping(uint160 => uint256)) public sellerEarnings;

	bool private _isSellerSuccessFeesEnable;
	bool private _isAutoApproveEnable;

	// Private variables for fee calculations
	uint256 private _fixedProjectFeePercentage;
	uint256 private _fixedProjectFeeAmount;
	uint256 private _flexibleSuccesfulProjectFeePercentage;
	uint256 private _flexibleSuccessfulProjectFeeAmount;
	uint256 private _flexibleUnSuccessfulProjectFeePercentage;
	uint256 private _flexibleUnsuccessfulProjectFeeAmount;
	uint256 private _investorFeePercentage;
	uint256 private _investorFeeAmount;
	uint256 private _gatewayFeePercentage;
	uint256 private _gatewayFeeAmount;
	uint256 private _sellerSuccessFeesPercentage;
	uint256 private _sellerProcessingFeesPercentage;
	uint256 private _buyerProcessingFeesPercentage;
	uint256 private _revertBackShareSellRequest = 90 days;
	uint256 private _projectId;
	uint256 private _minDays = 1 days;
	uint256 private _maxDays = 365 days;
	uint256 private _minRequestAmount = 31820000000000000 wei;
	uint256 private _maxRequestAmount = 2968690000000000000000 wei;
	uint256 private _minProjectInvestment = 31820000000000000 wei;
	uint256 private _maxProjectInvestment = 2968690000000000000000 wei;
	uint256 private _minTermLength = 5;
	uint256 private _maxTermLength = 15;
	uint256 private _minInterestRate = 1000;
	uint256 private _maxInterestRate = 4500;

	address private _defender;

	/**
	 * @dev Emitted when a new investment project is created.
	 * @param creator Address of the project creator
	 * @param projectId Unique identifier of the project
	 * @param requestedFunding Amount of funding requested for the project
	 * @param startDate Start date of the project
	 * @param endDate End date of the project
	 * @param repaymentFrequency Frequency of repayments for the project
	 */
	event InvestmentProjectCreated(
		address creator,
		string projectName,
		uint256 projectId,
		uint256 requestedFunding,
		uint256 startDate,
		uint256 endDate,
		RepaymentFrequency repaymentFrequency
	);

	/**
	 * @dev Emitted when a project's status is updated.
	 * @param projectId Unique identifier of the project
	 * @param projectStatus New status of the project
	 */
	event ProjectStatusUpdated(uint256 projectId, ProjectStatus projectStatus);

	/**
	 * @dev Emitted when platform fees are updated.
	 * @param _fixedProjectFeePercentage New fixed project fee percentage
	 * @param _fixedProjectFeeAmount New fixed project fee amount
	 * @param _flexibleSuccessfulProjectFeePercentage New flexible successful project fee percentage
	 * @param _flexibleSuccessfulProjectFeeAmount New flexible successful project fee amount
	 * @param _flexibleUnSuccessfulProjectFeePercentage New flexible unsuccessful project fee percentage
	 * @param _flexibleUnsuccessfulProjectFeeAmount New flexible unsuccessful project fee amount
	 * @param _investorFeePercentage New investor fee percentage
	 * @param _investorFeeAmount New investor fee amount
	 * @param _gatewayFeePercentage New gateway fee percentage
	 * @param _gatewayFeeAmount New gateway fee amount
	 */
	event PlateformFeesUpdated(
		uint256 _fixedProjectFeePercentage,
		uint256 _fixedProjectFeeAmount,
		uint256 _flexibleSuccessfulProjectFeePercentage,
		uint256 _flexibleSuccessfulProjectFeeAmount,
		uint256 _flexibleUnSuccessfulProjectFeePercentage,
		uint256 _flexibleUnsuccessfulProjectFeeAmount,
		uint256 _investorFeePercentage,
		uint256 _investorFeeAmount,
		uint256 _gatewayFeePercentage,
		uint256 _gatewayFeeAmount
	);

	event SecondarySettingUpdated(
		bool isSellerSuccessFeesEnable,
		uint256 sellerSuccessFeesPercentage,
		uint256 sellerProcessingFeesPercentage,
		uint256 buyerProcessingFeesPercentage,
		uint256 revertBackShareSellRequest,
		bool isAutoApproveShares
	);

	/**
	 * @dev Emitted when an investment is made.
	 * @param investor Address of the investor
	 * @param projectId Unique identifier of the project
	 * @param purchasedShares No. of shares purchased
	 * @param investmentAmount Amount invested
	 */
	event InvestmentMade(
		address indexed investor,
		uint256 projectId,
		uint256 investmentAmount,
		uint256 purchasedShares,
		uint256 contractSignatureTimeStamp
	);

	/**
	 * @dev Emitted when a repayment is processed.
	 * @param projectId Unique identifier of the project
	 * @param amount Amount repaid
	 * @param nextRepaymentDate Date of the next repayment
	 */
	event RepaymentProcessed(
		uint256 projectId,
		uint256 amount,
		uint256 nextRepaymentDate
	);

	/**
	 * @dev Emitted when refund has initiated by admin
	 * @param projectId Unique identifier of the project
	 * @param to Address of account claiming refund.
	 * @param amount Amount of refund claimed.
	 */

	event RefundInitiated(uint256 projectId, address to, uint256 amount);

	/**
	 * @dev Emitted when refund has claimed
	 * @param projectId Unique identifier of the project
	 * @param to Address of account claiming refund.
	 * @param amount Amount of refund claimed.
	 */

	event WithdrawRefund(
		uint256 indexed projectId,
		address indexed to,
		uint256 indexed amount
	);

	/**
	 * @dev Emitted when investor claimed repayment.
	 * @param projectId Unique identifier of the project
	 * @param withDrawer Address of the account claiming earnings
	 * @param amount Amount of earnings claimed
	 */
	event ClaimedRepayment(
		uint256 projectId,
		address indexed withDrawer,
		uint256 amount
	);

	/**
	 * @dev Emitted when earnings are claimed.
	 * @param withDrawer Address of the account claiming earnings
	 * @param amount Amount of earnings claimed
	 */
	event ClaimedEarnings(address indexed withDrawer, uint256 amount);

	/**
	 * @dev Emitted when an investment is claimed by the project creator.
	 * @param projectId Unique identifier of the project
	 * @param creator Address of the project creator
	 * @param amount Amount claimed
	 */
	event InvestmentClaimed(uint256 projectId, address creator, uint256 amount);

	// Event emitted when the defender address is updated.
	// @param defender The new address assigned to the defender role.
	event DefenderUpdated(address defender);

	// Event emitted when the valid range for end days is updated.
	// @param minDays The new minimum allowable number of end days.
	// @param maxDays The new maximum allowable number of end days.
	event UpdatedEndDaysRange(uint256 minDays, uint256 maxDays);

	// Event emitted when the range for interest rates is updated.
	// @param minIntrestRate The new minimum allowable interest rate.
	// @param maxInterestRate The new maximum allowable interest rate.
	event UpdatedInterestRateRange(
		uint256 minIntrestRate,
		uint256 maxInterestRate
	);

	// Event emitted when the range for term lengths is updated.
	// @param minTermLength The new minimum allowable term length (e.g., in days).
	// @param maxTermLength The new maximum allowable term length (e.g., in days).
	event UpdatedTermLengthRange(uint256 minTermLength, uint256 maxTermLength);

	// Event emitted when the limits for investment amounts are updated.
	// @param minInvestmentAmount The new minimum allowable investment amount.
	// @param maxInvestmentAmount The new maximum allowable investment amount.
	event UpdatedInvestmentAmountLimit(
		uint256 minInvestmentAmount,
		uint256 maxInvestmentAmount
	);

	/**
	 *  Event emitted when the limits for request amounts are updated.
	 * 	 minInvestmentAmount The new minimum allowable request amount
	 *  maxInvestmentAmount The new maximum allowable investment amount.
	 */
	event UpdatedRequestAmountLimit(
		uint256 minRequestAmount,
		uint256 maxRequestAmount
	);

	event OnSell(
		uint160 referenceId,
		uint216 numberofShareOnSell,
		uint256 pricePerShare,
		uint256 projectId,
		address seller,
		SellStatus status
	);

	event ShareSold(
		uint160 referenceId,
		uint216 shareQuantitySold,
		uint256 projectId,
		address buyer,
		SellStatus status
	);

	event ShareReverted(
		uint160 referenceId,
		uint216 shareReverted,
		uint256 projectId,
		SellStatus status
	);

	event ChangeSellStatus(uint160 referenceId, SellStatus status);

	/**
	 * @dev Constructor to initialize the contract with fee structures and defender address.
	 * @param fixedProjectFeePercentage Fee percentage for fixed projects
	 * @param fixedProjectFeeAmount Fixed fee amount for projects
	 * @param flexibleSuccessfulProjectFeePercentage Fee percentage for successful flexible projects
	 * @param flexibleSuccessfulProjectFeeAmount Fee amount for successful flexible projects
	 * @param flexibleUnSuccessfulProjectFeePercentage Fee percentage for unsuccessful flexible projects
	 * @param flexibleUnsuccessfulProjectFeeAmount Fee amount for unsuccessful flexible projects
	 * @param investorFeePercentage Fee percentage for investors
	 * @param investorFeeAmount Fixed fee amount for investors
	 * @param gatewayFeePercentage Gateway fee percentage
	 * @param gatewayFeeAmount Fixed gateway fee amount
	 * @param defender Address of the defender role
	 */
	constructor(
		uint256 fixedProjectFeePercentage,
		uint256 fixedProjectFeeAmount,
		uint256 flexibleSuccessfulProjectFeePercentage,
		uint256 flexibleSuccessfulProjectFeeAmount,
		uint256 flexibleUnSuccessfulProjectFeePercentage,
		uint256 flexibleUnsuccessfulProjectFeeAmount,
		uint256 investorFeePercentage,
		uint256 investorFeeAmount,
		uint256 gatewayFeePercentage,
		uint256 gatewayFeeAmount,
		uint256 sellerSuccessFeesPercentage,
		uint256 sellerProcessingFeesPercentage,
		uint256 buyerProcessingFeesPercentage,
		address defender
	) Ownable(_msgSender()) {
		require(defender != address(0), "invalid defender address");

		if (
			fixedProjectFeePercentage > 10000 ||
			flexibleSuccessfulProjectFeePercentage > 10000 ||
			flexibleUnSuccessfulProjectFeePercentage > 10000 ||
			investorFeePercentage > 10000 ||
			gatewayFeePercentage > 10000
		)
			revert InvalidFeesPercentage(
				fixedProjectFeePercentage,
				flexibleSuccessfulProjectFeePercentage,
				flexibleUnSuccessfulProjectFeePercentage,
				investorFeePercentage,
				gatewayFeePercentage
			);

		if (
			sellerProcessingFeesPercentage > 10000 ||
			sellerSuccessFeesPercentage > 10000 ||
			buyerProcessingFeesPercentage > 10000
		)
			revert InvalidSecondaryMarketFees(
				sellerProcessingFeesPercentage,
				sellerSuccessFeesPercentage,
				buyerProcessingFeesPercentage
			);

		_fixedProjectFeePercentage = fixedProjectFeePercentage;
		_fixedProjectFeeAmount = fixedProjectFeeAmount;
		_flexibleSuccesfulProjectFeePercentage = flexibleSuccessfulProjectFeePercentage;
		_flexibleSuccessfulProjectFeeAmount = flexibleSuccessfulProjectFeeAmount;
		_flexibleUnSuccessfulProjectFeePercentage = flexibleUnSuccessfulProjectFeePercentage;
		_flexibleUnsuccessfulProjectFeeAmount = flexibleUnsuccessfulProjectFeeAmount;
		_investorFeePercentage = investorFeePercentage;
		_investorFeeAmount = investorFeeAmount;
		_gatewayFeePercentage = gatewayFeePercentage;
		_gatewayFeeAmount = gatewayFeeAmount;
		_sellerSuccessFeesPercentage = sellerSuccessFeesPercentage;
		_sellerProcessingFeesPercentage = sellerProcessingFeesPercentage;
		_buyerProcessingFeesPercentage = buyerProcessingFeesPercentage;
		_isAutoApproveEnable = false;
		_isSellerSuccessFeesEnable = true;
		_defender = defender;
	}

	/**
	 * @dev Modifier to restrict access to owner and defender.
	 */
	modifier onlyOwnerAndDefender() {
		require(
			_msgSender() == owner() || _msgSender() == _defender,
			"Caller is not the owner or defender"
		);
		_;
	}

	/**
	 * @dev Creates a new crowdfunding project.
	 * @param creator Address of the project creator
	 * @param name Name of the project
	 * @param endDate End date of the funding period
	 * @param minInvestmentValue Minimum investment amount allowed
	 * @param maxInvestmentValue Maximum investment amount allowed
	 * @param requestedFunding Total funding requested for the project
	 * @param interestRate Interest rate for repayments
	 * @param termLength Length of the repayment term
	 * @param repaymentDate Date when repayments start
	 * @param isFixedProject Whether the project is fixed or flexible funding
	 * @param isForAccreditedInvestor Whether the project is only for accredited investors
	 * @param repaymentFrequency Frequency of repayments
	 */
	function createProject(
		address creator,
		string memory name,
		InvestmentDealType dealType,
		uint256 avaliableShare,
		uint256 endDate,
		uint256 minInvestmentValue,
		uint256 maxInvestmentValue,
		uint256 requestedFunding,
		uint256 interestRate,
		uint256 termLength,
		uint256 repaymentDate,
		bool isFixedProject,
		bool isForAccreditedInvestor,
		RepaymentFrequency repaymentFrequency
	) external onlyOwner {
		require(creator != address(0), "Invalid creator address");
		if(
			requestedFunding < _minRequestAmount ||
				requestedFunding > _maxRequestAmount
			
		) 
		revert InvalidRequestedGoalAmount(requestedFunding, _minRequestAmount, _maxRequestAmount);
		require(
			minInvestmentValue >= _minProjectInvestment,
			"Invalid minimum investment value"
		);
		require(
			_maxProjectInvestment < requestedFunding
				? maxInvestmentValue <= _maxProjectInvestment
				: maxInvestmentValue <= requestedFunding,
			"Invalid max investment value"
		);
		require(
			endDate >= (block.timestamp + _minDays) &&
				endDate <= (block.timestamp + _maxDays),
			"Invalid end date"
		);
		uint256 pricePerShare = 0;
		if (dealType == InvestmentDealType.Debt) {
			require(
				interestRate >= _minInterestRate &&
					interestRate <= _maxInterestRate,
				"Invalid interest rate"
			);
			require(
				termLength >= _minTermLength && termLength <= _maxTermLength,
				"Invalid term length"
			);

			require(
				repaymentDate >= endDate + 30 days,
				"invalid repayment date"
			);
		} else {
			require(avaliableShare > 0, "Shares should be more than 0");
			pricePerShare = requestedFunding / avaliableShare;
		}

		_projectId++;
		projects[_projectId] = Project(
			creator,
			name,
			endDate,
			dealType,
			avaliableShare,
			pricePerShare,
			minInvestmentValue,
			maxInvestmentValue,
			requestedFunding,
			0,
			0,
			0,
			interestRate,
			termLength,
			repaymentDate,
			isFixedProject,
			isForAccreditedInvestor,
			ProjectStatus.Active,
			repaymentFrequency
		);

		emit InvestmentProjectCreated(
			creator,
			name,
			_projectId,
			requestedFunding,
			block.timestamp,
			endDate,
			repaymentFrequency
		);
	}

	/**
	 * @notice Allows an investor to contribute funds to a specified project.
	 * @dev Investors send Ether to fund a project. The function verifies whether the investor meets accreditation requirements and checks the investment limits.
	 *      This function also tracks individual investments and sets the project status to "Successful" if the funding goal is reached.
	 * @param projectId The ID of the project to invest in.
	 * @param isAccreditedInvestor Boolean indicating whether the investor is accredited (required for certain projects).
	 * @param contractSignatureTimeStamp The timestamp of contract that signed by investor.
	 * @custom:require The project must exist.
	 * @custom:require The investor cannot be the project creator.
	 * @custom:require The project must be active and within its funding deadline.
	 * @custom:require The investment amount must meet the project's minimum and maximum investment limits.
	 * @custom:require If the project is for accredited investors, the investor must be accredited.
	 * @custom:revert NotAccreditedInvestor Raised if a non-accredited investor tries to invest in a project restricted to accredited investors.
	 * @custom:emit InvestmentMade Emitted when a successful investment is made.
	 * @custom:emit ProjectStatusUpdated Emitted if the project reaches its funding goal and becomes successful.
	 */
	function investInProject(
		uint256 projectId,
		uint256 purchaseShare,
		bool isAccreditedInvestor,
		uint256 contractSignatureTimeStamp
	) external payable nonReentrant {
		// Load the project and investor data into memory.
		Project storage project = projects[projectId];
		Investor storage investor = projectInvestors[projectId][_msgSender()];

		// Ensure that the project exists.
		require(project.creator != address(0), "Project does not exist");

		// Prevent the project creator from investing in their own project.
		require(
			_msgSender() != project.creator,
			"Project creator is not allowed to invest"
		);
		// Ensure the project is active and within the funding period.

		require(
			project.projectStatus == ProjectStatus.Active &&
				block.timestamp <= project.endDate,
			"Project is not active or closed"
		);

		// Capture the investment amount sent with the transaction.
		uint256 investmentAmount = msg.value;

		// Verify that the investment amount is within the allowed range.
		require(
			investmentAmount >= project.minInvestmentValue,
			"Investment is below minimum value"
		);
		require(
			investmentAmount <= project.maxInvestmentValue,
			"Investment is above maximum value"
		);

		// If the project is restricted to accredited investors, enforce accreditation.
		if (project.isForAccreditedInvestor) {
			if (!isAccreditedInvestor)
				revert NotAccreditedInvestor(_msgSender(), isAccreditedInvestor);
		}

		if (project.dealType == InvestmentDealType.Equity) {
			require(purchaseShare > 0, "Invalid purchase shares given.");
			require(project.avaliableShare > 0, "No more shares avaliable");
			require(
				purchaseShare <= project.avaliableShare,
				"Requested shares are unable"
			);
			uint256 expectedCost = purchaseShare * project.pricePerShare;
			require(
				msg.value >= expectedCost,
				"Invalid amount for total purchase share"
			);
		}

		// If the investor hasn't invested before, add them to the project's investor list.
		if (!hasInvested[projectId][_msgSender()]) {
			projectInvestorsList[projectId].push(_msgSender()); // Track first-time investors
			hasInvested[projectId][_msgSender()] = true; // Mark the investor as having invested
		}

		project.avaliableShare -= purchaseShare;
		// Update the investor's total investment and their accreditation status.
		investor.amountInvested += investmentAmount;
		investor.isAccreditedInvestor = isAccreditedInvestor;
		investor.purchasedShare += purchaseShare;

		// Update the total funding received by the project.
		project.fundingReceived += investmentAmount;

		// If the project's funding goal is met or exceeded, mark it as successful.
		if (project.fundingReceived >= project.requestedFunding) {
			setProjectStatusSuccessful(projectId);
		}

		// Emit an event indicating that the investment was made.
		emit InvestmentMade(
			_msgSender(),
			projectId,
			investmentAmount,
			purchaseShare,
			contractSignatureTimeStamp
		);
	}

	/**
	 * @notice Allows the project creator to claim the funds raised from a successful project.
	 * @dev The creator can claim the total investment minus the platform and gateway fees, but only after the project has met its criteria.
	 *      For fixed projects, the project must be successful. For flexible projects, the project must be either successful or the funding period must have ended.
	 * @param projectId The ID of the project for which the creator is claiming the funds.
	 * @custom:require Only the project creator can call this function.
	 * @custom:require For fixed projects, the project must have been marked as successful.
	 * @custom:require For flexible projects, the project must have ended or been marked as successful.
	 * @custom:require The investment must not have already been claimed.
	 * @custom:emit InvestmentClaimed Emitted when the project creator successfully claims the investment.
	 */
	function claimInvestment(uint256 projectId) external nonReentrant {
		// Load project data into memory
		Project storage project = projects[projectId];

		// Ensure the caller is the project creator
		require(_msgSender() == project.creator, "Only creator can claim");

		// Check the project status based on whether it's fixed or flexible
		if (project.isFixedProject) {
			require(
				project.projectStatus == ProjectStatus.Successful,
				"Project is unsuccessful"
			);
		} else {
			require(
				block.timestamp >= project.endDate ||
					project.projectStatus == ProjectStatus.Successful,
				"Project is open or unsuccessful"
			);
		}

		// Ensure the investment has not already been claimed
		require(
			!hasClaimInvestment[projectId][_msgSender()],
			"Investment already claimed"
		);

		// Calculate the total investment amount raised by the project
		uint256 totalInvestment = project.fundingReceived;

		// Calculate platform and gateway fees
		uint256 adminCharges = calculatePlatformFees(
			project.fundingReceived,
			project.isFixedProject,
			project.projectStatus,
			projectInvestorsList[projectId].length
		) +
			calculateGatewayFee(
				project.fundingReceived,
				projectInvestorsList[projectId].length
			);

		// Calculate the withdrawable balance after deducting fees
		uint256 withdrawableBalance = totalInvestment - adminCharges;

		// Mark the investment as claimed for the creator
		hasClaimInvestment[projectId][_msgSender()] = true;

		if (project.dealType == InvestmentDealType.Debt) {
			// Set the remaining repayment amount including interest
			project.remainingRepaymentAmount =
				project.fundingReceived +
				(project.fundingReceived * project.interestRate) /
				10000;

			// Calculate the repayment installment amount for the project
			project.repaymentInstallmentAmount = calculateRepaymentInstallment(
				project.fundingReceived,
				project.interestRate,
				project.termLength
			);
		}

		// Record platform fees in the earnings
		earnings[owner()] += adminCharges;

		// Transfer the withdrawable balance to the project creator
		// payable(_msgSender()).transfer(withdrawableBalance);
		Address.sendValue(payable(_msgSender()), withdrawableBalance);

		// Emit an event indicating the investment has been claimed
		emit InvestmentClaimed(projectId, _msgSender(), withdrawableBalance);
	}

	/**
	 * @notice Allows the project creator to make a repayment installment to the investors.
	 * @dev The function checks if the repayment date has passed, and if the project creator has claimed the investment. It processes the repayment,
	 *      updates the remaining repayment amount, and adjusts the next repayment date. Investors' claims are updated based on the repayment.
	 * @param projectId The ID of the project for which the repayment installment is being processed.
	 * @custom:require The caller must be the project creator.
	 * @custom:require The repayment date must be due.
	 * @custom:require The project creator must have claimed the investment before processing repayments.
	 * @custom:require There must be a remaining repayment amount.
	 * @custom:require The repayment amount (msg.value) must be greater than or equal to the required installment amount.
	 * @custom:emit RepaymentProcessed Emitted when a repayment installment is successfully processed.
	 */
	function processRepaymentInstallment(
		uint256 projectId
	) external payable nonReentrant {
		// Load project data into memory
		Project storage project = projects[projectId];

		// Ensure that the caller is the project creator
		require(_msgSender() == project.creator, "Only creator can process");

		require(
			project.dealType == InvestmentDealType.Debt,
			"Repayment allows for only for dept project."
		);

		// Ensure the repayment date has passed or is due
		require(
			block.timestamp >= project.repaymentDate,
			"Repayment is not due yet"
		);

		// Ensure the project creator has claimed the initial investment
		require(
			hasClaimInvestment[projectId][_msgSender()],
			"Project creator has not claimed investment yet"
		);

		// Ensure there is a remaining repayment balance
		require(project.remainingRepaymentAmount > 0, "No remaining repayment");

		// Ensure the repayment amount is sufficient
		require(
			msg.value >= project.repaymentInstallmentAmount,
			"Repayment amount is insufficient"
		);

		// Deduct the installment amount from the remaining repayment balance
		project.remainingRepaymentAmount -= project.repaymentInstallmentAmount;

		// Update the repayment date to the next scheduled repayment date
		project.repaymentDate = getNextPaymentDate(
			project.repaymentDate,
			project.repaymentFrequency
		);

		uint256 arrayLength = projectInvestorsList[projectId].length;

		// Update each investor's claim status and increment their available installments to claim
		for (uint256 i = 0; i < arrayLength; i++) {
			remainingInstallmentsToClaim[projectId][
				projectInvestorsList[projectId][i]
			]++;
			hasClaimInvestment[projectId][
				projectInvestorsList[projectId][i]
			] = false;
		}

		// Emit an event indicating the repayment has been processed
		emit RepaymentProcessed(
			projectId,
			project.repaymentInstallmentAmount,
			project.repaymentDate
		);
	}

	function putShareOnSell(
		uint160 referenceId,
		uint216 numberOfShareOnSell,
		uint256 pricePerShare,
		uint256 projectId
	) external {
		Project storage project = projects[projectId];
		Investor storage investor = projectInvestors[projectId][_msgSender()];
		OnSellDetail storage sellDetail = onSellDetails[referenceId];

		require(
			!isSellRequestExists(referenceId),
			"Sell Request already exists"
		);
		require(project.creator != address(0), "Project not exists");
		require(
			project.dealType == InvestmentDealType.Equity,
			"Project deal type is not equity"
		);
		require(
			investor.purchasedShare > 0,
			"Insufficent share quantity of sell"
		);
		require(
			numberOfShareOnSell <= investor.purchasedShare,
			"Requested shares are unavaliable"
		);
		investor.purchasedShare -= numberOfShareOnSell;
		sellDetail.seller = _msgSender();
		sellDetail.numberOfSharesOnSell = numberOfShareOnSell;
		sellDetail.pricePerShare = pricePerShare;
		sellDetail.projectId = projectId;
		sellDetail.sellTimeStamp = block.timestamp;
		sellDetail.status = _isAutoApproveEnable
			? SellStatus.Approve
			: SellStatus.UnderReview;

		emit OnSell(
			referenceId,
			numberOfShareOnSell,
			pricePerShare,
			projectId,
			_msgSender(),
			sellDetail.status
		);
	}

	function buyShare(
		uint160 referenceId,
		uint216 shareQuantity
	) external payable nonReentrant {
		OnSellDetail storage sellDetails = onSellDetails[referenceId];
		Project storage project = projects[sellDetails.projectId];
		Investor storage investor = projectInvestors[sellDetails.projectId][
			_msgSender()
		];

		require(isSellRequestExists(referenceId), "Sell Request not exists");
		require(
			sellDetails.status == SellStatus.Approve,
			"Sell not active yet"
		);
		require(
			_msgSender() != project.creator,
			"Project Owner cannot buys shares"
		);
		require(
			shareQuantity <= sellDetails.numberOfSharesOnSell,
			"No share Avaliable for shares"
		);

		uint256 totalPurchaseAmount = shareQuantity * sellDetails.pricePerShare;

		uint256 buyerProcessingFees = calculateBuyerProcessingFees(
			totalPurchaseAmount
		);

		require(
			msg.value >= totalPurchaseAmount + buyerProcessingFees,
			"Insufficent amount to buy shares"
		);

		sellDetails.numberOfSharesOnSell -= shareQuantity;
		sellDetails.numberOfSharesSold += shareQuantity;

		if (sellDetails.numberOfSharesOnSell == 0) {
			sellDetails.status = SellStatus.Sold;
		}

		sellerEarnings[sellDetails.seller][referenceId] += totalPurchaseAmount;

		earnings[owner()] += buyerProcessingFees;

		investor.purchasedShare += shareQuantity;
		investor.amountInvested += totalPurchaseAmount;

		emit ShareSold(
			referenceId,
			shareQuantity,
			sellDetails.projectId,
			_msgSender(),
			sellDetails.status
		);
	}

	function withSoldShareEarnings(uint160 referenceId) external nonReentrant {
		OnSellDetail storage sellDetail = onSellDetails[referenceId];
		uint256 totalPurchaseAmount = sellerEarnings[_msgSender()][referenceId];

		require(isSellRequestExists(referenceId), "Sell Request is not exist");

		require(
			sellDetail.seller == _msgSender(),
			"You are unauthorized seller."
		);

		require(
			sellDetail.status == SellStatus.Sold,
			"Your sell is active currently"
		);
		require(totalPurchaseAmount > 0, "No earning to withdraw.");

		uint256 processingFees = calculateSellerProcessingFees(
			totalPurchaseAmount
		);

		uint256 successFees = _isSellerSuccessFeesEnable
			? calculateSellerSuccessFees(totalPurchaseAmount)
			: 0;

		uint256 adminCharges = processingFees + successFees;

		uint256 withdrawableAmount = totalPurchaseAmount - adminCharges;

		sellerEarnings[_msgSender()][referenceId] = 0;
		earnings[owner()] += adminCharges;

		Address.sendValue(payable(_msgSender()), withdrawableAmount);
	}

	/**
	 * @notice Allows an investor to withdraw their share of the repayment for a project.
	 *
	 * This function enables investors to claim their repayment share based on the number of
	 * installments they are entitled to receive from the project. The withdrawal process
	 * automatically deducts platform fees before transferring the remaining balance to the investor.
	 *
	 * @param projectId The ID of the project for which the investor is claiming their repayment.
	 *
	 * @custom:require The caller must be an investor in the project.
	 * @custom:require The investor must not have already claimed their repayment for the current installment.
	 * @custom:require The investor must have at least one installment left to claim.
	 *
	 * @dev The function is marked as `nonReentrant` to prevent reentrancy attacks during fund transfers.
	 *
	 * @custom:emit ClaimedRepayment Emitted when the investor successfully withdraws their repayment.
	 */
	function withdrawRepayment(uint256 projectId) external nonReentrant {
		// Load the project and investor data into memory
		Project storage project = projects[projectId];
		Investor storage investor = projectInvestors[projectId][_msgSender()];

		// Ensure the caller is an investor in the project
		require(hasInvested[projectId][_msgSender()], "you are not an Investor");

		// Ensure the investor has not already claimed this repayment installment
		require(
			!hasClaimInvestment[projectId][_msgSender()],
			"you have already claimed your amount"
		);

		// Ensure the investor has at least one installment to claim
		require(
			remainingInstallmentsToClaim[projectId][_msgSender()] > 0,
			"you have already claimed your amount"
		);

		// Calculate the investor's share of the repayment installment
		uint256 investorShare = calculateInvestmentRepaymentShare(
			project.fundingReceived,
			investor.amountInvested,
			project.repaymentInstallmentAmount
		) * remainingInstallmentsToClaim[projectId][_msgSender()];
		// Calculate the platform fees (admin charges) for the investor
		uint256 adminCharges = calculateInvestorFee(investorShare) *
			remainingInstallmentsToClaim[projectId][_msgSender()];

		// Calculate the withdrawable balance for the investor after deducting admin charges
		uint256 withdrawableBalance = investorShare - adminCharges;
		// Mark the investment claim as completed for this installment
		hasClaimInvestment[projectId][_msgSender()] = true;

		// Reset the remaining installments for the investor
		remainingInstallmentsToClaim[projectId][_msgSender()] = 0;

		// Add the admin charges to the platform owner's earnings
		earnings[owner()] += adminCharges;

		// Transfer the withdrawable balance to the investor
		Address.sendValue(payable(_msgSender()), withdrawableBalance);

		// Emit an event indicating the earnings were claimed
		emit ClaimedRepayment(projectId, _msgSender(), withdrawableBalance);
	}

	/**
	 * @notice Sets the platform fees for various project types and investor fees.
	 * @dev This function can only be called by the contract owner. It updates the fee parameters used
	 * for fixed and flexible projects as well as the fees for investors and gateways.
	 *
	 * The fee percentages are capped at 100% (represented as 10000 to handle two decimal places).
	 * If any fee percentage exceeds this limit, the transaction will revert with an InvalidFeesPercentage error.
	 *
	 * @param fixedProjectFeePercentage The percentage fee for fixed projects, represented in basis points (10000 = 100%).
	 * @param fixedProjectFeeAmount The fixed amount fee for fixed projects.
	 * @param flexibleSuccessfulProjectFeePercentage The percentage fee for successful flexible projects, represented in basis points (10000 = 100%).
	 * @param flexibleSuccessfulProjectFeeAmount The fixed amount fee for successful flexible projects.
	 * @param flexibleUnSuccessfulProjectFeePercentage The percentage fee for unsuccessful flexible projects, represented in basis points (10000 = 100%).
	 * @param flexibleUnsuccessfulProjectFeeAmount The fixed amount fee for unsuccessful flexible projects.
	 * @param investorFeePercentage The percentage fee charged to investors, represented in basis points (10000 = 100%).
	 * @param investorFeeAmount The fixed amount fee charged to investors.
	 * @param gatewayFeePercentage The percentage fee charged by the payment gateway, represented in basis points (10000 = 100%).
	 * @param gatewayFeeAmount The fixed amount fee charged by the payment gateway.
	 *
	 * @custom:require The caller must be the contract owner.
	 * @custom:require None of the fee percentages can exceed 10000 (100%).
	 *
	 * @custom:emit PlateformFeesUpdated Emitted when the platform fees are successfully updated.
	 */
	function setPlatformFees(
		uint256 fixedProjectFeePercentage,
		uint256 fixedProjectFeeAmount,
		uint256 flexibleSuccessfulProjectFeePercentage,
		uint256 flexibleSuccessfulProjectFeeAmount,
		uint256 flexibleUnSuccessfulProjectFeePercentage,
		uint256 flexibleUnsuccessfulProjectFeeAmount,
		uint256 investorFeePercentage,
		uint256 investorFeeAmount,
		uint256 gatewayFeePercentage,
		uint256 gatewayFeeAmount
	) external onlyOwner {
		if (
			fixedProjectFeePercentage > 10000 ||
			flexibleSuccessfulProjectFeePercentage > 10000 ||
			flexibleUnSuccessfulProjectFeePercentage > 10000 ||
			investorFeePercentage > 10000 ||
			gatewayFeePercentage > 10000
		) {
			revert InvalidFeesPercentage(
				fixedProjectFeePercentage,
				flexibleSuccessfulProjectFeePercentage,
				flexibleUnSuccessfulProjectFeePercentage,
				investorFeePercentage,
				gatewayFeePercentage
			);
		}

		_fixedProjectFeePercentage = fixedProjectFeePercentage;
		_fixedProjectFeeAmount = fixedProjectFeeAmount;
		_flexibleSuccesfulProjectFeePercentage = flexibleSuccessfulProjectFeePercentage;
		_flexibleSuccessfulProjectFeeAmount = flexibleSuccessfulProjectFeeAmount;
		_flexibleUnSuccessfulProjectFeePercentage = flexibleUnSuccessfulProjectFeePercentage;
		_flexibleUnsuccessfulProjectFeeAmount = flexibleUnsuccessfulProjectFeeAmount;
		_investorFeePercentage = investorFeePercentage;
		_investorFeeAmount = investorFeeAmount;
		_gatewayFeeAmount = gatewayFeeAmount;
		_gatewayFeePercentage = gatewayFeePercentage;

		emit PlateformFeesUpdated(
			fixedProjectFeePercentage,
			fixedProjectFeeAmount,
			flexibleSuccessfulProjectFeePercentage,
			flexibleSuccessfulProjectFeeAmount,
			flexibleUnSuccessfulProjectFeePercentage,
			flexibleUnsuccessfulProjectFeeAmount,
			investorFeePercentage,
			investorFeeAmount,
			gatewayFeePercentage,
			gatewayFeeAmount
		);
	}

	function setSecondaryMarketFees(
		bool isSellerSuccessFeesEnable,
		uint256 sellerSuccessFeesPercentage,
		uint256 sellerProcessingFeesPercentage,
		uint256 buyerProcessingFeesPercentage,
		uint256 revertBackShareSellRequest,
		bool isAutoApproveShares
	) external onlyOwner {
		require(
			sellerSuccessFeesPercentage <= 10000 ||
				sellerSuccessFeesPercentage > 0,
			"Provide seller success fees between 0% to 100%"
		);

		require(
			sellerProcessingFeesPercentage <= 1000 ||
				sellerProcessingFeesPercentage > 0,
			"Provide seller processing fees between 0% to 100%"
		);

		require(
			buyerProcessingFeesPercentage <= 1000 ||
				buyerProcessingFeesPercentage > 0,
			"Provide buyer processing fees between 0% to 100%"
		);

		_isSellerSuccessFeesEnable = isSellerSuccessFeesEnable;
		_sellerSuccessFeesPercentage = sellerSuccessFeesPercentage;
		_sellerProcessingFeesPercentage = sellerProcessingFeesPercentage;
		_buyerProcessingFeesPercentage = buyerProcessingFeesPercentage;
		_revertBackShareSellRequest = revertBackShareSellRequest;
		_isAutoApproveEnable = isAutoApproveShares;

		emit SecondarySettingUpdated(
			isSellerSuccessFeesEnable,
			sellerSuccessFeesPercentage,
			sellerProcessingFeesPercentage,
			buyerProcessingFeesPercentage,
			revertBackShareSellRequest,
			isAutoApproveShares
		);
	}

	function revertRemainingShare(
		uint160 referenceId
	) external onlyOwnerAndDefender {
		OnSellDetail storage sellDetail = onSellDetails[referenceId];
		Investor storage investor = projectInvestors[sellDetail.projectId][
			sellDetail.seller
		];

		require(isSellRequestExists(referenceId), "Sell Request is not exist");

		require(
			sellDetail.status == SellStatus.Approve,
			"Sell is completed or not active yet"
		);

		require(
			block.timestamp >=
				(sellDetail.sellTimeStamp + _revertBackShareSellRequest),
			"Sell is not Ended"
		);

		sellDetail.status = SellStatus.Closed;
		investor.purchasedShare += sellDetail.numberOfSharesOnSell;

		emit ShareReverted(
			referenceId,
			sellDetail.numberOfSharesOnSell,
			sellDetail.projectId,
			SellStatus.Closed
		);
	}

	function approveSellRequest(uint160 referenceId) external onlyOwner {
		OnSellDetail storage sellDetail = onSellDetails[referenceId];

		require(isSellRequestExists(referenceId), "Sell Request is not exist");

		require(
			sellDetail.status == SellStatus.UnderReview,
			"Sell is not in under review state."
		);

		sellDetail.status = SellStatus.Approve;

		emit ChangeSellStatus(referenceId, sellDetail.status);
	}

	function rejectSellRequest(uint160 referenceId) external onlyOwner {
		OnSellDetail storage sellDetail = onSellDetails[referenceId];
		Investor storage investor = projectInvestors[sellDetail.projectId][
			sellDetail.seller
		];

		require(isSellRequestExists(referenceId), "Sell Request is not exist");

		require(
			sellDetail.status == SellStatus.UnderReview ||
				sellDetail.status == SellStatus.Approve,
			"Sell is not in under review or approved state."
		);

		require(
			sellDetail.numberOfSharesSold == 0,
			"Cannot reject sell request "
		);

		investor.purchasedShare += sellDetail.numberOfSharesOnSell;

		sellDetail.status = SellStatus.Rejected;

		emit ChangeSellStatus(referenceId, sellDetail.status);
	}

	/**
	 * @notice Allows the contract owner to set the status of a project to inactive.
	 *
	 * This function updates the status of a specified project to "Inactive."
	 * It ensures that the project exists and is currently active before changing its status.
	 *
	 * @param projectId The ID of the project to be set as inactive.
	 *
	 * @custom:require The caller must be the contract owner.
	 * @custom:require The project must exist (i.e., it must have a valid creator address).
	 * @custom:require The project must be currently active; otherwise, it cannot be set to inactive.
	 *
	 * @dev The function only allows the owner to change the project status to inactive,
	 * ensuring that unauthorized users cannot alter project states.
	 *
	 * @custom:emit ProjectStatusUpdated Emitted when the project status is successfully updated to inactive.
	 */
	function setProjectStatusInactive(uint256 projectId) external onlyOwner {
		Project storage project = projects[projectId];

		// Ensure the project exists by checking if it has a valid creator address
		require(project.creator != address(0), "Project does not exist");

		// Ensure the project is currently active before setting it to inactive
		require(
			project.projectStatus == ProjectStatus.Active,
			"Project is already successful/unsuccessful/Inactive"
		);

		// Set the project status to inactive
		project.projectStatus = ProjectStatus.Inactive;

		// Emit an event to indicate that the project status has been updated
		emit ProjectStatusUpdated(projectId, project.projectStatus);
	}

	/**
	 * @notice Sets the status of a project to "Unsuccessful".
	 * @dev This function can only be called by the contract owner or defender. It updates the project's
	 * status to Unsuccessful if the project is still Active, the current block timestamp is
	 * greater than or equal to the project's end date, and the funding received is less than
	 * the requested funding amount.
	 *
	 * @param projectId The ID of the project whose status is being updated.
	 *
	 * @custom:require The caller must be the contract owner or a designated defender.
	 * @custom:require The project must currently be in the Active status.
	 * @custom:require The current timestamp must be greater than or equal to the project's end date.
	 * @custom:require The project must have received less funding than requested.
	 *
	 * @custom:emit ProjectStatusUpdated Emitted when the project status is successfully updated to Unsuccessful.
	 */
	function setProjectStatusUnsuccessful(
		uint256 projectId
	) external onlyOwnerAndDefender {
		Project storage project = projects[projectId];

		// Ensure the project exists by checking if it has a valid creator address
		require(project.creator != address(0), "Project does not exist");

		require(
			project.projectStatus == ProjectStatus.Active,
			"Project is successful/unsuccessful/inactive"
		);

		require(
			block.timestamp >= project.endDate,
			"Unable to set project status before time"
		);



		if (project.isFixedProject && project.fundingReceived > 0) {

			uint256 arrayLength = projectInvestorsList[projectId].length;
			for (
				uint256 i = 0;
				i < arrayLength;
				i++
			) {
				investorRefundAmount[
					projectInvestorsList[projectId][i]
				] += projectInvestors[projectId][
					projectInvestorsList[projectId][i]
				].amountInvested;

				project.fundingReceived -= projectInvestors[projectId][
					projectInvestorsList[projectId][i]
				].amountInvested;

				if (project.dealType == InvestmentDealType.Equity) {
					project.avaliableShare += projectInvestors[projectId][
						projectInvestorsList[projectId][i]
					].purchasedShare;

					projectInvestors[projectId][
						projectInvestorsList[projectId][i]
					].purchasedShare = 0;
				}
				hasInvested[projectId][
					projectInvestorsList[projectId][i]
				] = false;
				emit RefundInitiated(
					projectId,
					projectInvestorsList[projectId][i],
					investorRefundAmount[projectInvestorsList[projectId][i]]
				);
			}
		}

		project.projectStatus = ProjectStatus.Unsuccessful;
		emit ProjectStatusUpdated(projectId, project.projectStatus);
	}

	function withdrawRefund(uint256 projectId) external nonReentrant {
		Project storage project = projects[projectId];

		require(
			project.isFixedProject &&
				project.projectStatus == ProjectStatus.Unsuccessful,
			"Invalid project"
		);
		require(
			investorRefundAmount[_msgSender()] > 0,
			"Already withdraw refund"
		);

		uint256 refundAmount = investorRefundAmount[_msgSender()];

		investorRefundAmount[_msgSender()] = 0;

		Address.sendValue(payable(_msgSender()), refundAmount);
		emit WithdrawRefund(projectId, _msgSender(), refundAmount);
	}

	/**
	 * @notice Refund Investment to investor , if it meets the necessary conditions.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - The project status should be in "Active".
	 * - Ensuring that investor has invested in respective project.
	 * - Refund amount shouldn't be more then invested amount.
	 *
	 * @param projectId The unique identifier of the project.
	 * @param investor Wallet address of an investor.
	 * @param refundAmount Amount that needed
	 *
	 * Emits a {RefundInitiated} upon successful refund investment.
	 */

	function refundInvestment(
		uint256 projectId,
		address investor,
		uint256 refundAmount
	) external onlyOwner nonReentrant {
		Project storage project = projects[projectId];

		require(
			project.projectStatus == ProjectStatus.Active,
			"Refunds apply only to active projects."
		);

		require(
			hasInvested[projectId][investor],
			"No investment found for given investment address."
		);

		require(
			refundAmount <=
				projectInvestors[projectId][investor].amountInvested,
			"Insufficent investment amount"
		);

		projectInvestors[projectId][investor].amountInvested -= refundAmount;

		investorRefundAmount[investor] += refundAmount;

		project.fundingReceived -= refundAmount;

		if (project.dealType == InvestmentDealType.Equity) {
			uint256 shares = refundAmount / project.pricePerShare;
			projectInvestors[projectId][investor].purchasedShare -= shares;
			project.avaliableShare += shares;
		}

		investorRefundAmount[investor] += refundAmount;

		if (projectInvestors[projectId][investor].amountInvested == 0) {
			hasInvested[projectId][investor] = false;
			removeInvestor(projectId, investor);
		}

		emit RefundInitiated(projectId, investor, refundAmount);
	}

	/**
	 * @notice Sets the status of a specified project to "Active" if it meets the necessary conditions.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - The project must exist, validated by the presence of a creator address.
	 * - The project's current status must be `Inactive`.
	 * - The current timestamp must not exceed the project's end date.
	 * @param projectId The unique identifier of the project to activate.
	 *
	 * Emits a {ProjectStatusUpdated} event upon successful status update.
	 */
	function setProjectStatusActive(uint256 projectId) external onlyOwner {
		Project storage project = projects[projectId];

		// Ensure the project exists by checking if it has a valid creator address
		require(project.creator != address(0), "Project does not exist");

		// Verify the project is currently inactive
		require(
			project.projectStatus == ProjectStatus.Inactive ||
				project.projectStatus == ProjectStatus.Pending,
			"Project is already in successful/ unsuccessful/ active"
		);

		// Ensure the current time is within the project's valid timeframe
		require(
			block.timestamp <= project.endDate,
			"Unable to set project status after ending"
		);

		// Set the project status to active
		project.projectStatus = ProjectStatus.Active;

		// Emit an event to signal the project status update
		emit ProjectStatusUpdated(projectId, project.projectStatus);
	}

	/**
	 * @notice Sets the status of a specified project to "Pending" if it meets the necessary conditions.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - The project must exist, validated by the presence of a creator address.
	 * - The project's current status must be `Active`.
	 * - The current timestamp must not exceed the project's end date.
	 * @param projectId The unique identifier of the project to activate.
	 *
	 * Emits a {ProjectStatusUpdated} event upon successful status update.
	 */
	function setProjectStatusPending(uint256 projectId) external onlyOwner {
		Project storage project = projects[projectId];

		// Ensure the project exists by checking if it has a valid creator address
		require(project.creator != address(0), "Project does not exist");

		// Verify the project is currently active
		require(
			project.projectStatus == ProjectStatus.Active,
			"Project is not in active state"
		);

		// Verify the project is not having any investments
		require(project.fundingReceived == 0, "Project has active investors");

		// Ensure the current time is within the project's valid timeframe
		require(
			block.timestamp <= project.endDate,
			"Unable to set project status after ending"
		);

		// Set the project status to pending
		project.projectStatus = ProjectStatus.Pending;

		// Emit an event to signal the project status update
		emit ProjectStatusUpdated(projectId, project.projectStatus);
	}

	/**
	 * @notice Sets the range for project end dates in days.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - `minDays` must be non-negative.
	 * - `minDays` must be less than `maxDays`.
	 * @param minDays The minimum number of days for a project's end date.
	 * @param maxDays The maximum number of days for a project's end date.
	 *
	 * Updates the `_minDays` and `_maxDays` state variables, converting the input days into seconds.
	 */
	function setEndDaysRange(
		uint256 minDays,
		uint256 maxDays
	) external onlyOwner {
		// Ensure minimum days is non-negative
		require(minDays >= 0, "Invalid minimum end date");

		// Ensure minDays is less than maxDays
		require(
			minDays < maxDays,
			"Minimum days must be less than maximum days"
		);

		// Set the minimum and maximum days in seconds
		_minDays = (minDays * 1 days);
		_maxDays = (maxDays * 1 days);

		emit UpdatedEndDaysRange(_minDays, _maxDays);
	}

	/**
	 * @notice Sets the range for the project term length.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - `minTermLength` must be non-negative.
	 * - `minTermLength` must be less than `maxTermLength`.
	 * @param minTermLength The minimum allowable term length for a project, in the chosen unit (e.g., days or months).
	 * @param maxTermLength The maximum allowable term length for a project, in the chosen unit.
	 *
	 * Updates the `_minTermLength` and `_maxTermLength` state variables to define a valid range.
	 */
	function setTermLengthRange(
		uint256 minTermLength,
		uint256 maxTermLength
	) external onlyOwner {
		// Ensure the minimum term length is non-negative
		require(minTermLength >= 0, "Invalid minimum term length");

		// Ensure the minimum term length is less than the maximum term length
		require(
			minTermLength < maxTermLength,
			"Minimum term length must be less than maximum term length"
		);

		// Update the minimum and maximum term length variables
		_minTermLength = minTermLength;
		_maxTermLength = maxTermLength;

		emit UpdatedInterestRateRange(_minTermLength, _maxInterestRate);
	}

	/**
	 * @notice Sets the range for permissible interest rates.
	 * @dev This function can only be called by the contract owner.
	 * Requirements:
	 * - Both `minIR` and `maxIR` must be within 0% and 100%, represented by values between 0 and 10000 (basis points).
	 * - `minIR` must be less than or equal to `maxIR`.
	 * @param minIR The minimum allowable interest rate, represented in basis points (where 10000 = 100%).
	 * @param maxIR The maximum allowable interest rate, represented in basis points (where 10000 = 100%).
	 *
	 * Updates `_minInterestRate` and `_maxInterestRate` state variables with the specified range.
	 */
	function setInterestRateRange(
		uint256 minIR,
		uint256 maxIR
	) external onlyOwner {
		// Ensure both minimum and maximum interest rates are within 100%
		require(
			minIR <= 10000 && maxIR <= 10000,
			"Minimum Interest rate must be less than 100%"
		);

		// Ensure interest rates are non-negative
		require(
			minIR >= 0 && maxIR >= 0,
			"Interest rate must be greater than 0%"
		);

		// Ensure minimum interest rate does not exceed the maximum
		require(
			minIR <= maxIR,
			"Interest rate must be less than maximum interest rate"
		);

		// Set the minimum and maximum interest rate variables
		_minInterestRate = minIR;
		_maxInterestRate = maxIR;
		emit UpdatedInterestRateRange(_minInterestRate, _maxInterestRate);
	}

	/**
	 * @notice Updates the address of the defender who has special privileges within the contract.
	 *
	 * This function allows the contract owner to set a new defender address. The defender is
	 * typically granted specific permissions or roles to manage certain functionalities within
	 * the contract. It is essential to ensure that the new defender address is valid and not
	 * a zero address.
	 *
	 * @param defender The address of the new defender to be set.
	 *
	 * @custom:require The defender address must not be the zero address (0x0).
	 *
	 * @dev This function can only be called by the contract owner, ensuring that only
	 * authorized personnel can change the defender's address. This is important for maintaining
	 * the security and integrity of the contract's administrative functions.
	 */
	function updateDefender(address defender) external onlyOwner {
		// Ensure the defender address is valid and not zero
		require(defender != address(0), "Defender cannot be zero address");

		// Update the defender address
		_defender = defender;

		emit DefenderUpdated(defender);
	}

	/**
	 * @notice Allows the contract owner to withdraw their accumulated earnings from the platform.
	 *
	 * This function enables the owner to transfer their withdrawable earnings from the
	 * platform to their account. It ensures that the owner cannot withdraw if there are
	 * no earnings available, thus preventing unnecessary transactions.
	 *
	 * @custom:require The owner must have a withdrawable balance greater than zero.
	 *
	 * @dev This function is protected against reentrancy attacks using the
	 * nonReentrant modifier, ensuring that the withdrawal process cannot be interrupted
	 * or manipulated by external calls. The earnings are set to zero after the transfer
	 * to prevent double withdrawals.
	 *
	 * @custom:emit ClaimedEarnings Emitted when the owner successfully withdraws their earnings.
	 */
	function withdrawEarning() external onlyOwner nonReentrant {
		// Retrieve the owner's withdrawable earnings
		uint256 withdrawableBalance = earnings[owner()];

		// Ensure there are earnings available to withdraw
		require(withdrawableBalance > 0, "No earnings to withdraw");

		// Reset the owner's earnings to zero
		earnings[owner()] = 0;

		// Transfer the withdrawable balance to the owner
		Address.sendValue(payable(owner()), withdrawableBalance);

		// Emit an event indicating the earnings were withdrawn
		emit ClaimedEarnings(_msgSender(), withdrawableBalance);
	}

	/**
	 * @notice Sets the minimum and maximum investment amount limits for the project.
	 * @dev This function can only be called by the contract owner.
	 * @param minInvestmentAmt The new minimum allowable investment amount.
	 * @param maxInvestmentAmt The new maximum allowable investment amount.
	 */

	function setInvestmentAmtLimit(
		uint256 minInvestmentAmt,
		uint256 maxInvestmentAmt
	) external onlyOwner {
		require(
			minInvestmentAmt < maxInvestmentAmt,
			"Invalid minimum investment amount"
		);

		// Update the minimum project investment amount.
		_minProjectInvestment = minInvestmentAmt;

		_maxProjectInvestment = maxInvestmentAmt;

		emit UpdatedInvestmentAmountLimit(minInvestmentAmt, maxInvestmentAmt);
	}

	function setGoalAmountLimit(
		uint256 minAmount,
		uint256 maxAmount
	) external onlyOwner {
		require(minAmount < maxAmount, "Invalid goal minimum goal amount");

		_minRequestAmount = minAmount;
		_maxRequestAmount = maxAmount;

		emit UpdatedRequestAmountLimit(_minRequestAmount, _maxRequestAmount);
	}

	/**
	 * @notice Retrieves the current platform fee structure.
	 *
	 * This function allows anyone to view the platform's fee amounts and percentages
	 * for different types of projects and investor fees. It provides transparency
	 * regarding the fees that will be applied to projects and investor earnings.
	 *
	 * @return fixedProjectFeeAmount The fixed fee amount for project creators.
	 * @return fixedProjectFeePercentage The percentage fee charged on fixed projects.
	 * @return flexibleSuccessfulProjectFeeAmount The fee amount for successful flexible projects.
	 * @return flexibleSuccessfulProjectFeePercentage The percentage fee for successful flexible projects.
	 * @return flexibleUnsuccessfulProjectFeeAmount The fee amount for unsuccessful flexible projects.
	 * @return flexibleUnsuccessfulProjectFeePercentage The percentage fee for unsuccessful flexible projects.
	 * @return investorFeeAmount The fee amount charged to investors.
	 * @return investorFeePercentage The percentage fee charged to investors.
	 * @return gatewayFeeAmount The payment gateway fee amount.
	 * @return gatewayFeePercentage The percentage fee charged by the payment gateway.
	 *
	 * @dev This function is marked as `view`, meaning it does not modify the state
	 * of the contract and can be called without gas costs.
	 */
	function getPlatformFees()
		external
		view
		returns (
			uint256 fixedProjectFeeAmount,
			uint256 fixedProjectFeePercentage,
			uint256 flexibleSuccessfulProjectFeeAmount,
			uint256 flexibleSuccessfulProjectFeePercentage,
			uint256 flexibleUnsuccessfulProjectFeeAmount,
			uint256 flexibleUnsuccessfulProjectFeePercentage,
			uint256 investorFeeAmount,
			uint256 investorFeePercentage,
			uint256 gatewayFeeAmount,
			uint256 gatewayFeePercentage
		)
	{
		return (
			_fixedProjectFeeAmount,
			_fixedProjectFeePercentage,
			_flexibleSuccessfulProjectFeeAmount,
			_flexibleSuccesfulProjectFeePercentage,
			_flexibleUnsuccessfulProjectFeeAmount,
			_flexibleUnSuccessfulProjectFeePercentage,
			_investorFeeAmount,
			_investorFeePercentage,
			_gatewayFeeAmount,
			_gatewayFeePercentage
		);
	}

	/**
	 * @notice Calculates the next payment date based on the current date and repayment frequency.
	 *
	 * This function determines when the next payment is due based on the specified frequency
	 * (yearly, quarterly, monthly, or daily) and the current date provided as input.
	 *
	 * @param _currentDate The current date in UNIX timestamp format.
	 * @param _frequency The repayment frequency determining the interval for the next payment.
	 * @return uint256 The calculated timestamp for the next payment date.
	 *
	 * @dev The repayment frequency should be one of the defined enums:
	 * RepaymentFrequency.Yearly, RepaymentFrequency.Quarterly,
	 * RepaymentFrequency.Monthly, or a daily frequency.
	 */
	function getNextPaymentDate(
		uint256 _currentDate,
		RepaymentFrequency _frequency
	) public pure returns (uint256) {
		if (_frequency == RepaymentFrequency.Yearly) {
			return _currentDate + 365 days;
		} else if (_frequency == RepaymentFrequency.Quarterly) {
			return _currentDate + 91 days;
		} else if (_frequency == RepaymentFrequency.Monthly) {
			return _currentDate + 30 days;
		} else {
			return _currentDate + 1 days;
		}
	}

	/**
	 * @notice Calculates the platform fees based on the project funding received.
	 *
	 * This function computes the total platform fees for a given project based on
	 * whether it is a fixed or flexible project, its status, and the number of investors involved.
	 *
	 * @param fundingReceived The total amount of funding received for the project.
	 * @param _isFixedProject A boolean indicating if the project is fixed or flexible.
	 * @param projectStatus The current status of the project (Successful or Unsuccessful).
	 * @param investorCount The number of investors involved in the project.
	 * @return uint256 The total platform fee calculated based on the parameters provided.
	 *
	 * @dev The function distinguishes between fixed and flexible projects to apply the
	 * appropriate fee structure and calculates the total fees accordingly.
	 */
	function calculatePlatformFees(
		uint256 fundingReceived,
		bool _isFixedProject,
		ProjectStatus projectStatus,
		uint256 investorCount
	) public view returns (uint256) {
		uint256 platformPercentage;
		uint256 platformAmount;

		if (_isFixedProject) {
			platformPercentage = _fixedProjectFeePercentage;
			platformAmount = _fixedProjectFeeAmount;
		} else {
			if (projectStatus == ProjectStatus.Successful) {
				platformPercentage = _flexibleSuccesfulProjectFeePercentage;
				platformAmount = _flexibleSuccessfulProjectFeeAmount;
			} else {
				platformPercentage = _flexibleUnSuccessfulProjectFeePercentage;
				platformAmount = _flexibleUnsuccessfulProjectFeeAmount;
			}
		}

		uint256 platformfee = ((fundingReceived * platformPercentage) / 10000) +
			(platformAmount * investorCount);

		return platformfee;
	}

	/**
	 * @notice Calculates the gateway fee based on funding received and the number of investors.
	 *
	 * This function computes the total gateway fee for a project based on the funding
	 * amount received and the number of investors involved. The fee is calculated
	 * as a percentage of the funding received plus a fixed fee per investor.
	 *
	 * @param fundingReceived The total amount of funding received for the project.
	 * @param investorCount The number of investors participating in the project.
	 * @return uint256 The total gateway fee calculated for the project.
	 *
	 * @dev The gateway fee percentage and fixed amount are retrieved from the contract's state variables.
	 */
	function calculateGatewayFee(
		uint256 fundingReceived,
		uint256 investorCount
	) public view returns (uint256) {
		uint256 gatewayFee = ((fundingReceived * _gatewayFeePercentage) /
			10000) + (_gatewayFeeAmount * investorCount);

		return gatewayFee;
	}

	/**
	 * @notice Calculates the fee charged to investors based on their share amount.
	 *
	 * This function computes the total investor fee that will be deducted from an
	 * investor's share based on the share amount and the defined investor fee percentage.
	 * It includes both a variable fee calculated as a percentage of the share amount
	 * and a fixed fee per investor.
	 *
	 * @param investorShareAmount The amount of the investor's share for which the fee is being calculated.
	 * @return uint256 The total fee charged to the investor.
	 *
	 * @dev The investor fee percentage and fixed amount are retrieved from the contract's state variables.
	 */
	function calculateInvestorFee(
		uint256 investorShareAmount
	) public view returns (uint256) {
		uint256 investorFee = ((investorShareAmount * _investorFeePercentage) /
			10000) + _investorFeeAmount;
		return investorFee;
	}

	function calculateSellerProcessingFees(
		uint256 totalPurchaseAmount
	) public view returns (uint256 sellerProcessingFees) {
		uint256 processingFees = (totalPurchaseAmount *
			_sellerProcessingFeesPercentage) / 10000;
		return (processingFees);
	}

	function calculateSellerSuccessFees(
		uint256 totalPurchaseAmount
	) public view returns (uint256 sellerSuccessFees) {
		uint256 successFees = (totalPurchaseAmount *
			_sellerSuccessFeesPercentage) / 10000;
		return (successFees);
	}

	function calculateBuyerProcessingFees(
		uint256 totalPurchaseAmount
	) public view returns (uint256 buyerProcessingFees) {
		uint256 processingFees = (totalPurchaseAmount *
			_buyerProcessingFeesPercentage) / 10000;
		return (processingFees);
	}

	/**
	 * @notice Returns the total number of investors in a given project.
	 * @dev This function returns the length of the `projectInvestorsList` array,
	 * which keeps track of all investors who have invested in a specific project.
	 * @param projectId The unique identifier of the project for which the investor count is being retrieved.
	 * @return The number of unique investors in the specified project.
	 */
	function getInvestorCount(uint256 projectId) public view returns (uint256) {
		return projectInvestorsList[projectId].length;
	}

	/**
	 * @notice Calculates the repayment installment amount based on funding received, interest rate, and term length.
	 *
	 * This function determines the amount to be repaid in each installment
	 * based on the total funding received, the interest rate, and the
	 * duration of the repayment term. It calculates the total amount
	 * owed and divides it by the number of installments (term length).
	 *
	 * @param fundingReceived The total amount of funding received for the project.
	 * @param interestRate The interest rate applicable to the funding, represented in basis points (1/100th of a percent).
	 * @param termLength The duration of the repayment term in installments.
	 * @return uint256 The calculated repayment installment amount.
	 *
	 * @dev The interest rate is divided by 10,000 to convert it from basis points to a decimal fraction.
	 */
	function calculateRepaymentInstallment(
		uint256 fundingReceived,
		uint256 interestRate,
		uint256 termLength
	) public pure returns (uint256) {
		uint256 repaymentAmount = (fundingReceived +
			((fundingReceived * interestRate) / 10000)) / termLength;

		return repaymentAmount;
	}

	/**
	 * @notice Calculates the investor's share of the repayment installment based on their investment amount.
	 *
	 * This function determines how much an investor should receive from a repayment
	 * installment based on the total funding of the project and the amount the
	 * investor has contributed. It calculates the investor's percentage share
	 * of the total funding and applies that percentage to the repayment installment amount.
	 *
	 * @param totalFunding The total amount of funding received for the project.
	 * @param investmentAmount The amount invested by the individual investor.
	 * @param repaymentInstallmentAmount The amount to be repaid in the current installment.
	 * @return uint256 The calculated share of the repayment installment for the investor.
	 *
	 * @dev The function computes the percentage of the total funding that the
	 * investor's contribution represents, and then multiplies that percentage
	 * by the repayment installment amount. The percentage calculation is
	 * adjusted to handle two decimal places using a base of 10000.
	 */
	function calculateInvestmentRepaymentShare(
		uint256 totalFunding,
		uint256 investmentAmount,
		uint256 repaymentInstallmentAmount
	) public pure returns (uint256) {
		
		// uint256 percentage = (investmentAmount * 10000) / totalFunding; // Using 10000 to handle two decimal places
		uint256 percentage = Math.mulDiv(investmentAmount, 10000, totalFunding); // Using 10000 to handle two decimal places
		uint256 investorShare = Math.mulDiv(repaymentInstallmentAmount, percentage ,
			10000);
		return investorShare; // This will return the percentage multiplied by 100 (for 2 decimal precision)
	}

	/**
	 * @notice Updates the status of the project to Successful.
	 *
	 * This function changes the project status to Successful and emits an event
	 * indicating the status change. It is a private function that can only
	 * be called internally within the contract.
	 *
	 * @param projectId The ID of the project whose status is being updated.
	 *
	 * @dev This function sets the project status to Successful without
	 * performing any additional checks, as it is expected to be called
	 * only in appropriate contexts (e.g., after verifying project conditions).
	 */
	function setProjectStatusSuccessful(uint256 projectId) private {
		Project storage project = projects[projectId];
		project.projectStatus = ProjectStatus.Successful;
		emit ProjectStatusUpdated(projectId, project.projectStatus);
	}

	function removeInvestor(uint256 projectId, address investor) private {
		address[] storage investors = projectInvestorsList[projectId];
		uint256 length = investors.length;
		bool found = false;

		for (uint256 i = 0; i < length; i++) {
			if (investors[i] == investor) {
				found = true;

				// Replace the current element with the last one if order doesn't matter
				investors[i] = investors[length - 1];
				investors.pop(); // Remove the last element
				break;
			}
		}

		require(found, "Investor not found in the project");
	}

	/**
	 * @notice Retrieves the valid range for project end dates.
	 * @return minDays The minimum allowed end date for a project, in seconds.
	 * @return maxDays The maximum allowed end date for a project, in seconds.
	 */
	function getEndDaysRange()
		external
		view
		returns (uint256 minDays, uint256 maxDays)
	{
		return (_minDays, _maxDays);
	}

	/**
	 * @notice Retrieves the valid range for project term lengths.
	 * @return minTermLength The minimum allowed term length for a project.
	 * @return maxTermLength The maximum allowed term length for a project.
	 */
	function getTermLengthRange()
		external
		view
		returns (uint256 minTermLength, uint256 maxTermLength)
	{
		return (_minTermLength, _maxTermLength);
	}

	/**
	 * @notice Retrieves the valid range for project interest rates.
	 * @return minInterestRate The minimum allowed interest rate for a project, represented in basis points (1/100th of a percent).
	 * @return maxInterestRate The maximum allowed interest rate for a project, represented in basis points.
	 */
	function getInterestRate()
		external
		view
		returns (uint256 minInterestRate, uint256 maxInterestRate)
	{
		return (_minInterestRate, _maxInterestRate);
	}

	/**
	 * @notice Retrieves the minimum and maximum investment value limits for projects.
	 * @return minInvestmentValue The minimum allowed investment value for a project.
	 * @return maxInvestmentValue The maximum allowed investment value for a project.
	 */
	function getInvestmentValueLimit()
		external
		view
		returns (uint256 minInvestmentValue, uint256 maxInvestmentValue)
	{
		return (_minProjectInvestment, _maxProjectInvestment);
	}

	function getGoalAmountLimit()
		external
		view
		returns (uint256 minGoalAmount, uint256 maxGoalAmount)
	{
		return (_minRequestAmount, _maxRequestAmount);
	}

	function getDefenderAddress() external view returns (address) {
		return _defender;
	}

	function isSellRequestExists(
		uint160 referenceId
	) internal view returns (bool) {
		return onSellDetails[referenceId].seller != address(0);
	}

	// Receive Ether function to handle plain Ether transfers
	receive() external payable {
		// You can add logic here or leave it empty
	}
}