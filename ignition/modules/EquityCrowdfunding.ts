// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';
import {ethers} from 'hardhat';

const _fixedProjectFeePercentage = 600;
const _fixedProjectFeeAmount = ethers.parseEther('0.00006');
const _flexibleSuccessfulProjectFeePercentage = 600;
const _flexibleSuccessfulProjectFeeAmount = ethers.parseEther('0.00006');
const _flexibleUnSuccessfulProjectFeePercentage = 600;
const _flexibleUnsuccessfulProjectFeeAmount = ethers.parseEther('0.00006');
const _investorFeePercentage = 600;
const _investorFeeAmount = ethers.parseEther('0.00006');
const _gatewayFeePercentage = 600;
const _gatewayFeeAmount = ethers.parseEther('0.00006');
const _defenderAddress = ethers.getAddress('0xD21fE1c94C374031415ED69e9E538528A964Ef3E'); // POL (Amoy)
// const _defenderAddress = ethers.getAddress('0xfc46157dC00Fc68Bb8335e4b129e624fE27376b0'); // ETH (Holesky)

const EquityCrowdfundingModule = buildModule(
	'EquityCrowdfundingModule',
	(m) => {
		const fixedProjectFeePercentage = m.getParameter(
			'fixedProjectFeePercentage',
			_fixedProjectFeePercentage
		);
		const fixedProjectFeeAmount = m.getParameter(
			'fixedProjectFeeAmount',
			_fixedProjectFeeAmount
		);
		const flexibleSuccessfulProjectFeePercentage = m.getParameter(
			'flexibleSuccessfulProjectFeePercentage',
			_flexibleSuccessfulProjectFeePercentage
		);
		const flexibleSuccessfulProjectFeeAmount = m.getParameter(
			'flexibleSuccessfulProjectFeeAmount',
			_flexibleSuccessfulProjectFeeAmount
		);
		const flexibleunUnSuccessfulProjectFeePercentage = m.getParameter(
			'flexibleUnSuccessfulProjectFeePercentage',
			_flexibleUnSuccessfulProjectFeePercentage
		);
		const flexibleUnsuccessfulProjectFeeAmount = m.getParameter(
			'flexibleUnsuccessfulProjectFeeAmount',
			_flexibleUnsuccessfulProjectFeeAmount
		);
		const investorFeePercentage = m.getParameter(
			'investorFeePercentage',
			_investorFeePercentage
		);
		const investorFeeAmount = m.getParameter(
			'investorFeeAmount',
			_investorFeeAmount
		);
		const gatewayFeePercentage = m.getParameter(
			'gatewayFeePercentage',
			_gatewayFeePercentage
		);
		const gatewayFeeAmount = m.getParameter(
			'gatewayFeeAmount',
			_gatewayFeeAmount
		);
		const defenderAddress = m.getParameter(
			'defender',
			_defenderAddress
		);

		const equityCrowdfunding = m.contract('EquityCrowdfunding', [
			fixedProjectFeePercentage,
			fixedProjectFeeAmount,
			flexibleSuccessfulProjectFeePercentage,
			flexibleSuccessfulProjectFeeAmount,
			flexibleunUnSuccessfulProjectFeePercentage,
			flexibleUnsuccessfulProjectFeeAmount,
			investorFeePercentage,
			investorFeeAmount,
			gatewayFeePercentage,
			gatewayFeeAmount,
			defenderAddress,
		]);
		return {equityCrowdfunding};
	}
);

export default EquityCrowdfundingModule;
