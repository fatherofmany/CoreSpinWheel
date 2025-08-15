import { useEffect, useState } from "react";
import { ethers } from "ethers";

const useWallet = () => {
  const [wallet, setWallet] = useState({
    address: null,
    provider: null,
    signer: null,
    connected: false,
  });

  // Core Chain configuration
  const coreChain = {
    chainId: '0x45C', // 1116 in hex
    chainName: 'Core DAO',
    nativeCurrency: {
      name: 'Core',
      symbol: 'CORE',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.coredao.org/'],
    blockExplorerUrls: ['https://scan.coredao.org'],
  };

  // -------------------------------------------------
// Core Testnet configuration
const coreTestnet = {
  chainId: '0x45B',          // 1114 in hex
  chainName: 'Core Testnet',
  nativeCurrency: { name: 'tCORE', symbol: 'tCORE', decimals: 18 },
  rpcUrls: ['https://rpc.test2.btcs.network'],
  blockExplorerUrls: ['https://scan.test2.btcs.network'],
};
// -------------------------------------------------

  const switchToCoreChain = async (useTestnet = false) => {
  const chain = useTestnet ? coreTestnet : coreChain;
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [chain],
    });
  } catch (err) {
    console.error('Failed to switch network:', err);
    throw err;
  }
};

  const connectWallet = async (useTestnet = false) => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      console.log("Requesting account access...");
      
      // FORCE MetaMask popup - this MUST trigger the popup
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      console.log("Accounts received:", accounts);
      
      if (accounts.length === 0) {
        alert("No accounts found. Please unlock MetaMask.");
        return;
      }
      
      console.log("Switching to Core network...");
      
      // Switch to Core chain FIRST before getting balance
      await switchToCoreChain(useTestnet);
      
      console.log("Creating provider...");
      
      // ETHERS V6 SYNTAX - BrowserProvider instead of Web3Provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log("Connected to address:", address);

      // Wait a bit for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Get real balance from Core network
        const balance = await provider.getBalance(address);
        const balanceInCore = parseFloat(ethers.formatEther(balance));
        console.log("Balance fetched:", balanceInCore);

        setWallet({
          address,
          provider,
          signer,
          connected: true,
          balance: balanceInCore
        });
      } catch (balanceError) {
        console.error("Balance fetch failed, but wallet connected:", balanceError);
        // Set wallet as connected even if balance fails
        setWallet({
          address,
          provider,
          signer,
          connected: true,
          balance: 0 // Default to 0 if balance fetch fails
        });
      }

      console.log("Wallet fully connected:", address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      if (err.code === 4001) {
        alert("Connection rejected. Please try again and approve the connection.");
      } else if (err.code === -32002) {
        alert("Connection request pending. Please check MetaMask.");
      } else {
        alert("Failed to connect wallet: " + err.message);
      }
    }
  };

  const disconnectWallet = () => {
    setWallet({
      address: null,
      provider: null,
      signer: null,
      connected: false,
    });
  };

  return { ...wallet, connectWallet, disconnectWallet };
};

export default useWallet;