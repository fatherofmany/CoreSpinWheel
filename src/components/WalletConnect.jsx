import React from "react";
import useWallet from "../hooks/useWallet";

const WalletConnect = () => {
  const { connectWallet, address, connected } = useWallet();

  return (
    <div>
      {connected ? (
        <p className="text-green-600">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletConnect;
