const Wallet = require("../../model/walletModel");
const WalletHistory = require("../../model/walletHistory");
const walletHistory = require("../../model/walletHistory");
const httpStatus = require("../../utils/httpStatus");

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const wallet = (await Wallet.findOne({ user_id: userId })) || {
      balance: 0,
    };
    const transactions = await WalletHistory.find({ wallet_id: wallet._id })
      .sort({ transaction_date: -1 })
      .skip(skip)
      .limit(limit);
    const totalWallet = await walletHistory.countDocuments({
      wallet_id: wallet._id,
    });
    const totalPages = Math.ceil(totalWallet / limit);

    res.render("user/wallet", {
      wallet,
      transactions,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

module.exports = { getWallet };
