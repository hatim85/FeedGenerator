require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks:{
    filecoin:{
      url:`https://api.calibration.node.glif.io/rpc/v1`,
      chainId:314159,
      accounts:[process.env.PRIVATE_KEY]
    }
  }
};
