function validateWalletID(walletID) {
  return /^0x\w{40}$/.test(walletID);
}
module.exports = {
  validateWalletID,
};
