export const SUPPORTED_CURRENCIES = [
  
   
  {
    address: '0x0000000000000000000000000000000000000000', // Zero address for native token
    symbol: 'CORE',
    name: 'Core Token',
    decimals: 18,
    isNative: true,
    isTestnet: true,
    exchangeRate: 1
  },
  {
    address: '0x6576E38AaeCEB7986Da94129d7563cd1AFF692fe',
    symbol: 'tCORE',
    name: 'Test Core Token',
    decimals: 18,
    isNative: false,
    isTestnet: true,
    exchangeRate: 1
  },
  {
    symbol: 'STCORE',
    name: 'Staked Core',
    contractAddress: '0xb3A8F0f0da9ffC65318aA39E55079796093029AD',
    decimals: 18,
  },
  {
    symbol: 'USDT',
    name: 'USDT',
    contractAddress: '0xBb4DF61B0e9F7b81Dee3b3D04602C67B3f3e9d61',
    decimals: 18,
  },
  {
    symbol: 'USDC',
    name: 'USDC',
    contractAddress: '0xDualCoreAddress',
    decimals: 18,
  },
];
