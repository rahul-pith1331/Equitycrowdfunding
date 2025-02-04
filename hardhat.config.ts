import {HardhatUserConfig} from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-contract-sizer';
import 'hardhat-abi-exporter';
import 'solidity-coverage';
import 'dotenv/config';
const config: HardhatUserConfig = {
	// defaultNetwork: "sepolia",

	networks: {
		holesky: {
			url: `https://holesky.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [process.env.WALLET_PRIVATE_KEY as string],
		},
		amoy: {
			url: `https://polygon-amoy.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [process.env.WALLET_PRIVATE_KEY as string],
		},
	},
	solidity: {
		version: '0.8.20',
		settings: {
			evmVersion: 'istanbul',

			optimizer: {
				enabled: true,
				runs: 200,
			},
			viaIR: true,
		},
	},

	abiExporter: {
		path: './abi/', // Directory where the ABI files will be exported
		runOnCompile: true, // Automatically export ABI on compilation
		clear: true, // Clear old ABI files before export
		flat: true, // Flatten the output (no directory structure)
		only: [], // Specify contracts or leave empty for all
		spacing: 4, // Add spacing to the JSON ABI (for readability)
		format: 'json', // Export format (json or minimal)
	},
	contractSizer: {
		alphaSort: true, // Sort contract names alphabetically
		disambiguatePaths: false, // Disambiguate paths in the output
		runOnCompile: true, // Automatically run contract size analysis on compilation
		strict: true, // Throw an error if contract size exceeds the limit
		// : ['EquityCrowdfunding'], // Specify contracts or leave empty for all
	},
	gasReporter: {
		enabled: true,
		currency: 'USD',
		coinmarketcap: process.env.COINMARKETCAP_API_KEY,
		token: 'ETH',
		gasPrice: 20,
	},
};
export default config;
